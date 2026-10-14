/* eslint-disable react/no-unknown-property */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  FrontSide,
  Plane,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { Cloth, type Cylinder, type Vec3 } from "./verletCloth";
import { IsMobile } from "./Ismobile";
import { windAt } from "./wind";
import { onClearNails, toolSettings } from "./tools";
import { NailHeads, nailClickedPoint } from "./Nails";

// 13 x 17 square cells: the sides are in a 0.765 ratio (about letter paper),
// made of 442 triangles
const COLS = 13;
const ROWS = 17;
// the size of one grid cell, smaller on mobile
const sheetCell = (isMobile: boolean) => (isMobile ? 0.25 : 0.4) / 2;
// the sheet's width and height, for things that need to match it
export const sheetSize = (isMobile: boolean): [number, number] => [
  COLS * sheetCell(isMobile),
  ROWS * sheetCell(isMobile),
];
// more particles need more solver passes to stay as taut
const ITERATIONS = 40;
// how much the sheet resists folding: stiffer bending links (0..1) that also
// span 4 particles (0.8 across) instead of 2, to resist gentle curves too
const BEND_STIFFNESS = 0.6;
const BEND_REACH = 4;
// how far, in degrees, the sheet can swing around its nail, so strong wind or a
// hard drag can't flip it over the top and show its back. at 45 it stays
// flip-free in winds up to 20; past about 20 it's held at this limit, so even
// stronger winds look much the same
const SWING_LIMIT = 45;
// how far a grabbed point comes toward the camera (+z)
const GRAB_PULL = 1;
const STEP = 1 / 60;
// don't try to catch up more than this many steps after a stall (e.g. a hidden tab)
const MAX_STEPS_PER_FRAME = 4;
// the picture printed in the middle of the sheet, and how wide it is as a
// share of the sheet's width
const PICTURE_URL = `${process.env.PUBLIC_URL}/george512.jpg`;
const PICTURE_WIDTH = 0.7;
// pixels per cell in the sheet's printed texture
const TEXTURE_PX_PER_CELL = 68;

type VerletSheetProps = {
  // center of the sheet, which stands upright in the XY plane facing the camera
  position: Vec3;
  floorY?: number;
  // which way is up from the floor (a unit vector), to tilt it
  floorNormal?: Vec3;
  cylinders?: Cylinder[];
  // nail the sheet through the center of a triangle, one down from the top edge
  // in the middle column
  nailed?: boolean;
  // what the nail tool nails into (the pole): a click nails that point of the
  // sheet onto this cylinder's surface, straight out from its axis. without it,
  // nails hold the clicked point wherever it is in the air
  nailTo?: Cylinder;
};

// a 2.6 x 3.4 (1.63 x 2.13 on mobile) cloth of 442 triangles simulated with verlet
// integration on the main thread, outside of cannon
export const VerletSheet = ({
  position,
  floorY,
  floorNormal,
  cylinders,
  nailed = false,
  nailTo,
}: VerletSheetProps) => {
  const isMobile = IsMobile();
  const cell = sheetCell(isMobile);

  const cloth = useMemo(
    () =>
      new Cloth({
        cols: COLS,
        rows: ROWS,
        cell,
        center: position,
        nails: nailed ? [[Math.floor(COLS / 2), 2, 0]] : [],
        floorY,
        floorNormal,
        cylinders,
        iterations: ITERATIONS,
        bendStiffness: BEND_STIFFNESS,
        bendReach: BEND_REACH,
        swingLimit: SWING_LIMIT,
      }),
    // rebuild only when the layout changes, like on a switch to mobile
    [cell, ...position, nailed, ...(floorNormal ?? [])],
  );

  // keep colliding with the pole where it is now, without rebuilding the cloth
  useEffect(() => cloth.setCylinders(cylinders ?? []), [cloth, cylinders]);

  // non-indexed so each triangle is shaded flat by its own angle
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const count = cloth.triangles.length * 3;
    geo.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(count * 3), 3),
    );
    // each particle's spot on the printed texture, from its place in the grid,
    // so the picture moves and folds with the cloth
    const uvs = cloth.triangles.flatMap((tri) =>
      tri.flatMap((p) => {
        const col = p % (COLS + 1);
        const row = Math.floor(p / (COLS + 1));
        return [col / COLS, 1 - row / ROWS];
      }),
    );
    geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    return geo;
  }, [cloth]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // what's printed on the sheet: white, with the picture centered on it
  const picture = useLoader(TextureLoader, PICTURE_URL);
  const printed = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = COLS * TEXTURE_PX_PER_CELL;
    canvas.height = ROWS * TEXTURE_PX_PER_CELL;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const image = picture.image as HTMLImageElement;
      const w = canvas.width * PICTURE_WIDTH;
      const h = (w * image.height) / image.width;
      ctx.drawImage(
        image,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h,
      );
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [picture]);
  useEffect(() => () => printed.dispose(), [printed]);

  const elapsed = useRef(0);
  // while dragging: the plane the cursor moves the grabbed point along, the
  // offset between where the sheet was clicked and the grabbed particle, the
  // depth it was clicked at, and how far it has been pulled toward the camera
  const drag = useRef<{
    plane: Plane;
    offset: Vector3;
    clickZ: number;
    pull: number;
  } | null>(null);
  const hit = useMemo(() => new Vector3(), []);

  useFrame(({ pointer, camera, raycaster, clock }, delta) => {
    if (drag.current) {
      // ease the grabbed point toward the camera, so the sheet lifts off a little
      drag.current.pull +=
        (GRAB_PULL - drag.current.pull) * Math.min(delta * 15, 1);
      drag.current.plane.constant = -(drag.current.clickZ + drag.current.pull);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(drag.current.plane, hit)) {
        hit.add(drag.current.offset);
        cloth.moveGrab([hit.x, hit.y, hit.z]);
      }
    }

    elapsed.current = Math.min(
      elapsed.current + delta,
      STEP * MAX_STEPS_PER_FRAME,
    );
    cloth.wind = windAt(clock.elapsedTime);
    while (elapsed.current >= STEP) {
      cloth.step(STEP);
      elapsed.current -= STEP;
    }

    const attr = geometry.getAttribute("position") as Float32BufferAttribute;
    const out = attr.array as Float32Array;
    cloth.triangles.forEach((tri, t) => {
      tri.forEach((p, k) => {
        out.set(cloth.pos.subarray(p * 3, p * 3 + 3), (t * 3 + k) * 3);
      });
    });
    attr.needsUpdate = true;
    // flat per-triangle normals, so the lights shade each triangle by its angle
    geometry.computeVertexNormals();
    // raycasting culls by the bounding sphere, so keep it up to date for clicks
    geometry.computeBoundingSphere();
  });

  // where the nails are, redrawn whenever one is added
  const [nails, setNails] = useState(() => cloth.nailPositions());
  useEffect(() => setNails(cloth.nailPositions()), [cloth]);
  // the clear nails button removes every added nail, keeping the original one
  useEffect(
    () =>
      onClearNails(() => {
        cloth.clearAddedNails();
        setNails(cloth.nailPositions());
      }),
    [cloth],
  );

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (toolSettings.tool === "nail") {
      nailClickedPoint(cloth, e.faceIndex, e.point, nailTo);
      setNails(cloth.nailPositions());
      return;
    }
    //@ts-expect-error Investigate proper types here.
    e.target.setPointerCapture(e.pointerId);
    const i = cloth.nearest([e.point.x, e.point.y, e.point.z]);
    const particle = new Vector3().fromArray(cloth.pos, i * 3);
    drag.current = {
      // a plane facing the camera through the clicked point
      plane: new Plane(new Vector3(0, 0, 1), -e.point.z),
      offset: particle.clone().sub(e.point),
      clickZ: e.point.z,
      pull: 0,
    };
    cloth.grab(i, [particle.x, particle.y, particle.z]);
  };
  const onPointerUp = () => {
    drag.current = null;
    cloth.release();
  };
  // let go on any release, cancel or lost focus anywhere in the window too, so a
  // drag can't get stuck when the pointer-up never reaches the sheet
  useEffect(() => {
    const release = () => {
      drag.current = null;
      cloth.release();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [cloth]);

  return (
    <>
      <mesh
        geometry={geometry}
        frustumCulled={false}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <meshStandardMaterial map={printed} side={FrontSide} />
      </mesh>
      {/* the back is blank and a little darker, like the back of a print */}
      <mesh
        geometry={geometry}
        frustumCulled={false}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <meshStandardMaterial color="#cccccc" side={BackSide} />
      </mesh>
      {/* only the original nail can be clicked off */}
      <NailHeads
        positions={nails}
        removable={cloth.nailIsOriginal()}
        pole={nailTo}
        onRemove={(i) => {
          cloth.removeNail(i);
          setNails(cloth.nailPositions());
        }}
      />
    </>
  );
};
