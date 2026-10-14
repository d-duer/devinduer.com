/* eslint-disable react/no-unknown-property */
import React from "react";
import { useSphere, usePointToPointConstraint } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, createRef, useCallback } from "react";
import type { RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Mesh, Plane, Vector3, type Object3D } from "three";
import "./App.css";
import { GROUP_CURSOR } from "./collisionGroups";

const cursor = createRef<Mesh>();
// the cursor slides along this vertical plane through the middle of the arena
const cursorPlane = new Plane(new Vector3(0, 0, 1), 0);
const cursorPoint = new Vector3();

export const Cursor = () => {
  const [cursorref, api] = useSphere(
    () => ({
      args: [0.1],
      collisionFilterGroup: GROUP_CURSOR,
      collisionFilterMask: GROUP_CURSOR,
      position: [0, 0, 10000],
      type: "Static",
    }),
    cursor,
  );

  useFrame(({ mouse, camera, raycaster }) => {
    // project the mouse from the camera onto the cursor plane
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.ray.intersectPlane(cursorPlane, cursorPoint)) {
      api.position.set(cursorPoint.x, cursorPoint.y, cursorPoint.z);
    }
  });

  return (
    <mesh ref={cursorref}>
      <sphereGeometry args={[0.1]} />
      <meshBasicMaterial
        fog={false}
        depthTest={false}
        transparent
        opacity={0.5}
        color="Black"
      />
    </mesh>
  );
};

export function useDragConstraint(child: RefObject<Object3D>) {
  const [, , api] = usePointToPointConstraint(cursor, child, {
    pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
    maxForce: 0.7,
  });
  // TODO: make it so we can start the constraint with it disabled
  useEffect(() => void api.disable(), []);
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    //@ts-expect-error Investigate proper types here.
    e.target.setPointerCapture(e.pointerId);
    api.enable();
  }, []);
  const onPointerUp = useCallback(() => api.disable(), []);
  return { onPointerDown, onPointerUp };
}
