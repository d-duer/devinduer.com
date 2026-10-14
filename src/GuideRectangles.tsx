/* eslint-disable react/no-unknown-property */
import React, { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Triplet } from "@react-three/cannon";
import { Edges } from "@react-three/drei";
import { DoubleSide } from "three";

// a placement aid: click the floor to stand a see-through rectangle the size
// of the sheet there, facing the camera with its bottom edge where you clicked,
// to judge how big things look at that spot against the background photo.
// each click also logs the spot so it can be copied into the code
export const GuideRectangles = ({
  floorY,
  floorRotation,
  size: [width, height],
}: {
  floorY: number;
  floorRotation: Triplet;
  size: [number, number];
}) => {
  const [spots, setSpots] = useState<Triplet[]>([]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // only when the floor is the nearest clickable thing, so clicks on the
    // sheet or a nail in front of it don't also drop a rectangle
    if (e.intersections[0]?.object !== e.object) return;
    const spot: Triplet = [e.point.x, e.point.y, e.point.z];
    console.log(
      "guide rectangle at",
      spot.map((v) => Math.round(v * 100) / 100),
    );
    setSpots((s) => [...s, spot]);
  };

  return (
    <>
      {/* catches clicks on the floor. drei's grid only looks endless (it's
          stretched on the gpu), so it can't be clicked itself */}
      <mesh
        position={[0, floorY, 0]}
        rotation={floorRotation}
        visible={false}
        onClick={onClick}
      >
        <boxGeometry args={[100000, 0.001, 100000]} />
      </mesh>
      {spots.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + height / 2, z]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.25}
            side={DoubleSide}
            depthWrite={false}
          />
          <Edges color="#00e5ff" />
        </mesh>
      ))}
    </>
  );
};
