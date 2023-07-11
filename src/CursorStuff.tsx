import type { BoxProps, PlaneProps, SphereProps, Triplet, ConvexPolyhedronProps, TrimeshProps } from '@react-three/cannon'
import { Physics, useBox, useSphere, useSpring, usePlane, Debug, usePointToPointConstraint, useConvexPolyhedron, useTrimesh } from '@react-three/cannon'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import React, { forwardRef, useEffect, useRef, useState, createRef, useCallback, useMemo, useLayoutEffect } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { ThreeEvent, MeshStandardMaterialProps, MeshProps, BoxBufferGeometryProps } from '@react-three/fiber'
import { CameraHelper, Mesh, type Object3D } from 'three'
import type { BufferGeometry } from 'three'
import { Box, Sphere, OrbitControls, PerspectiveCamera, useHelper, useGLTF, Html } from '@react-three/drei'
import * as THREE from "three"
import { Boundary1, Boundary2, Boundary3, Boundary4 } from './boundary'
import { useMediaQuery } from 'usehooks-ts'
import backgroundDesktop from './backgroundDesktop.png'
import backgroundMobile from './backgroundMobile.png'
import george from './george512border.jpg'
import './App.css';
import {GROUP_COLLIDE, GROUP_CURSOR} from './collisionGroups'
import {Plane} from './Plane'

const cursor = createRef<Mesh>()

export const Cursor = () => {
  const [cursorref, api] = useSphere(() => (
    { args: [0.1], 
      collisionFilterGroup: GROUP_CURSOR, 
      collisionFilterMask: GROUP_CURSOR,
      position: [0, 0, 10000], 
      type: 'Static' 
    }), cursor)

  useFrame(({ mouse, viewport: { height, width } }) => {
    //x is left right, z is top bottom, y is towards and away from screen
    const x = mouse.x
    const y = 0.1
    const z = -(mouse.y)
    //api.position.set(x*9.2, y, z*4.7)
    api.position.set((x * width) / 2, y, (z * height) / 2)
  })

  return (
    <mesh ref={cursorref}>
      <sphereGeometry args={[0.1]} />
      <meshBasicMaterial fog={false} depthTest={false} transparent opacity={0.5} color='Black' />
    </mesh>
  )
}

export function useDragConstraint(child: RefObject<Object3D>) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0], maxForce: 0.7 })
  // TODO: make it so we can start the constraint with it disabled
  useEffect(() => void api.disable(), [])
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    //@ts-expect-error Investigate proper types here.
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  const onPointerUp = useCallback(() => api.disable(), [])
  return { onPointerDown, onPointerUp }
}