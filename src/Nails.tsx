/* eslint-disable react/no-unknown-property */
import React from "react";
import { Triangle, Vector3 } from "three";
import type { Cloth, Cylinder, Vec3 } from "./verletCloth";

// size of the marker drawn on each nail
const NAIL_HEAD_RADIUS = 0.04;

// the closest spot on the pole's surface to a point (in line with it and at its
// height, kept within the pole's length), just outside the surface by the
// cloth's thickness so the nail and the pole's collision don't fight
const onSurface = (
  pole: Cylinder,
  [x, y, z]: Vec3,
  thickness: number,
): Vec3 => {
  const dx = x - pole.x;
  const dz = z - pole.z;
  const d = Math.hypot(dx, dz);
  // straight toward the camera if the point is exactly on the axis
  const nx = d > 1e-9 ? dx / d : 0;
  const nz = d > 1e-9 ? dz / d : 1;
  const r = pole.radius + thickness;
  return [
    pole.x + nx * r,
    Math.min(Math.max(y, pole.yMin), pole.yMax),
    pole.z + nz * r,
  ];
};

// which way a nail's head faces: out from the pole's axis, or toward the
// camera when there's no pole
const headOut = ([x, , z]: Vec3, pole?: Cylinder): Vec3 => {
  if (!pole) return [0, 0, 1];
  const dx = x - pole.x;
  const dz = z - pole.z;
  const d = Math.hypot(dx, dz) || 1;
  return [dx / d, 0, dz / d];
};

// nail tool: nails the clicked point of the cloth (on triangle `t`) onto the
// pole's surface, or right where it is if there's no pole
export const nailClickedPoint = (
  cloth: Cloth,
  t: number | undefined,
  point: Vector3,
  pole?: Cylinder,
) => {
  if (t === undefined || !cloth.triangles[t]) return;
  const [a, b, c] = cloth.triangles[t].map((p) =>
    new Vector3().fromArray(cloth.pos, p * 3),
  );
  const weights = Triangle.getBarycoord(point, a, b, c, new Vector3());
  cloth.addNail(
    t,
    [weights.x, weights.y, weights.z],
    pole && onSurface(pole, [point.x, point.y, point.z], cloth.thickness),
  );
};

// a dark nail head on each nail, nudged outward to sit on top. clicking a
// removable one calls onRemove with its index; clicks on the others pass
// through to the sheet
export const NailHeads = ({
  positions,
  removable,
  pole,
  onRemove,
}: {
  positions: Vec3[];
  removable: boolean[];
  pole?: Cylinder;
  onRemove?: (index: number) => void;
}) => (
  <>
    {positions.map((at, i) => {
      const [ox, , oz] = headOut(at, pole);
      return (
        <group
          key={i}
          position={[
            at[0] + ox * NAIL_HEAD_RADIUS,
            at[1],
            at[2] + oz * NAIL_HEAD_RADIUS,
          ]}
          onPointerDown={
            removable[i]
              ? (e) => {
                  // keep the click from also grabbing or nailing the sheet
                  e.stopPropagation();
                  onRemove?.(i);
                }
              : undefined
          }
        >
          <mesh>
            <sphereGeometry args={[NAIL_HEAD_RADIUS, 12, 8]} />
            <meshStandardMaterial
              color="#333333"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
        </group>
      );
    })}
  </>
);
