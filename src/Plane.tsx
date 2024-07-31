/* eslint-disable react/no-unknown-property */
import React from "react";
import type { PlaneProps } from "@react-three/cannon";
import { usePlane } from "@react-three/cannon";
import { useLoader } from "@react-three/fiber";
import { forwardRef } from "react";
import { Mesh } from "three";
import * as THREE from "three";
import backgroundDesktop from "./assets/backgroundDesktop.png";
import backgroundMobile from "./assets/backgroundMobile.png";
import "./App.css";
import { IsMobile } from "./Ismobile";
import { GROUP_COLLIDE, GROUP_CURSOR } from "./collisionGroups";

export const Plane = forwardRef<Mesh, PlaneProps>((props, fwdRef) => {
  const isMobile = IsMobile();
  const [planeref] = usePlane(
    () => ({
      collisionFilterGroup: GROUP_COLLIDE,
      collisionFilterMask: GROUP_COLLIDE,
      rotation: [-Math.PI / 2, 0, 0],
      ...props,
    }),
    fwdRef,
  );

  const backgroundImage = useLoader(
    THREE.TextureLoader,
    IsMobile() ? backgroundMobile : backgroundDesktop,
  );
  //const backgroundImage = useLoader(THREE.TextureLoader, george)

  return (
    <mesh ref={planeref} receiveShadow>
      <planeGeometry args={[isMobile ? 3.69 : 11.8, isMobile ? 7.74 : 7.8]} />
      <meshStandardMaterial map={backgroundImage} />
    </mesh>
  );
});