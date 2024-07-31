import React, { useRef } from "react";
import { PerspectiveCamera, useHelper } from "@react-three/drei";
import * as THREE from "three";

export const MY_CAMERA_HELPER = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const camerad = useRef<any>();
  useHelper(camerad, THREE.CameraHelper);
  return (
    <>
      {/* <ambientLight intensity={1} /> */}
      <PerspectiveCamera
        ref={camerad}
        near={1}
        far={12}
        position={[0, 10, 0]}
        rotation={[Math.PI * 1.5, 0, 0]}
      ></PerspectiveCamera>
      <mesh>
        <boxGeometry />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  );
};
