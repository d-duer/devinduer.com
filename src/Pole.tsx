/* eslint-disable react/no-unknown-property */
import React, { forwardRef, useMemo } from "react";
import type { Triplet } from "@react-three/cannon";
import { useCylinder } from "@react-three/cannon";
import { useLoader } from "@react-three/fiber";
import { Mesh, RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";
import { GROUP_COLLIDE } from "./collisionGroups";

export const POLE_RADIUS = 1;

// the pole's physics body sits at its middle, not its base
export const poleCenter = (base: Triplet, height: number): Triplet => [
  base[0],
  base[1] + height / 2,
  base[2],
];

// a static vertical pole standing with its base at `base`, `height` tall
export const Pole = forwardRef<Mesh, { base?: Triplet; height: number }>(
  ({ base = [0, 0, 0], height }, fwdRef) => {
    const [ref] = useCylinder(
      () => ({
        args: [POLE_RADIUS, POLE_RADIUS, height, 16],
        type: "Static",
        position: poleCenter(base, height),
        collisionFilterGroup: GROUP_COLLIDE,
        collisionFilterMask: GROUP_COLLIDE,
      }),
      fwdRef,
      // rebuild the physics body when the pole moves or resizes; it only reads
      // its position when it's created
      [...base, height],
    );

    const loaded = useLoader(
      TextureLoader,
      `${process.env.PUBLIC_URL}/poleTexture.jpg`,
    );
    const texture = useMemo(() => {
      const t = loaded.clone();
      t.colorSpace = SRGBColorSpace;
      // the square image wraps once around; repeat it up the pole so the wood
      // keeps its proportions instead of stretching
      t.wrapT = RepeatWrapping;
      t.repeat.set(1, height / (2 * Math.PI * POLE_RADIUS));
      t.needsUpdate = true;
      return t;
    }, [loaded, height]);

    return (
      <mesh ref={ref} castShadow receiveShadow>
        {/* starting the wrap half a turn round puts the texture's seam at the
            back, away from the camera */}
        <cylinderGeometry
          args={[POLE_RADIUS, POLE_RADIUS, height, 16, 1, false, Math.PI]}
        />
        <meshStandardMaterial map={texture} />
      </mesh>
    );
  },
);
Pole.displayName = "Pole";
