import type { BoxProps, PlaneProps, SphereProps, Triplet, ConvexPolyhedronProps } from '@react-three/cannon'
import { Physics, useBox, useSphere, useSpring, usePlane, Debug, usePointToPointConstraint, useConvexPolyhedron } from '@react-three/cannon'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import React, { forwardRef, useEffect, useRef, useState, createRef, useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { CameraHelper, Mesh, type Object3D } from 'three'
import type { BufferGeometry } from 'three'
import { Box, OrbitControls, PerspectiveCamera, useHelper, useGLTF } from '@react-three/drei'
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Geometry } from "three-stdlib/deprecated/Geometry";
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'

useGLTF.preload('./assets/woodtable6.glb')

//import { Mesh } from "three";

/*const Box = forwardRef<Mesh, BoxProps>((props, fwdRef) => {
  const args: Triplet = [1, 1, 1]
  const [boxref] = useBox(
    () => ({
      args,
      linearDamping: 0.7,
      mass: 1,
      ...props,
    }),
    fwdRef,
  )
  return (
    <mesh ref={boxref}>
      <boxGeometry args={args} />
      <meshNormalMaterial />
    </mesh>
  )
})*/


const cursor = createRef<Mesh>()
const GROUP_COLLIDE = 2 ** 0
const GROUP_CURSOR = 2 ** 1

/*export function Table() {
  const gltf = useLoader(GLTFLoader,'./assets/woodtable6.glb');
  gltf.scene.traverse(function (child) {
    console.log(child);
  });

  useEffect(() => {
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.position.set(0, -3.5, 0);
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.material.envMapIntensity = 20;
      }
    });
  }, [gltf]);

  return (
      <primitive object={gltf.scene} />
  );
}*/

// Returns legacy geometry vertices, faces for ConvP
function toConvexProps(bufferGeometry: BufferGeometry): ConvexPolyhedronProps['args'] {
  const geo = new Geometry().fromBufferGeometry(bufferGeometry)
  // Merge duplicate vertices resulting from glTF export.
  // Cannon assumes contiguous, closed meshes to work
  geo.mergeVertices()
  return [geo.vertices.map((v) => [v.x, v.y, v.z]), geo.faces.map((f) => [f.a, f.b, f.c]), []]
}

type DiamondGLTF = GLTF & {
    nodes: { Cylinder: Mesh }
  materials: {}
}

/*function Diamond({ position, rotation }: ConvexPolyhedronProps) {
  console.log('hello1')
  //const geometry = new THREE.BufferGeometry()
  const { nodes: { Cylinder: { geometry }, }, } = useLoader(GLTFLoader,'./assets/woodtable6.glb') as DiamondGLTF;
  console.log('hello')
  const args = useMemo(() => toConvexProps(geometry), [geometry])
  const [ref] = useConvexPolyhedron(() => ({ args, mass: 100, position, rotation }), useRef<Mesh>(null))
  return (
    <mesh castShadow receiveShadow {...{ geometry, position, ref, rotation }}>
      <meshStandardMaterial wireframe color="white" />
    </mesh>
  )
}*/

function useDragConstraint(child: RefObject<Object3D>) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0], maxForce: 0.7 })
  // TODO: make it so we can start the constraint with it disabled
  useEffect(() => void api.disable(), [])
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    console.log('pointer down')
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  const onPointerUp = useCallback(() => api.disable(), [])
  return { onPointerDown, onPointerUp }
}

const Cursor = () => {
  const [cursorref, api] = useSphere(() => (
    { args: [0.01], 
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
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial fog={false} depthTest={false} transparent opacity={0.5} />
    </mesh>
  )
}

const Plane = forwardRef<Mesh, PlaneProps>((props, fwdRef) => {
  const [planeref] = usePlane(() => (
    { collisionFilterGroup: GROUP_COLLIDE,
      collisionFilterMask: GROUP_COLLIDE,
      rotation: [-Math.PI / 2, 0, 0],
     ...props 
    }), fwdRef)

  return (
    <mesh ref={planeref} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <shadowMaterial color="#171717" transparent opacity={0.4} />
    </mesh>
  )
})


const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const

const Dev_camera_Helper = () => {
  const camerad = useRef<any>()
  useHelper(camerad, THREE.CameraHelper)
  return (
    <>
      <ambientLight intensity={1} />
      <PerspectiveCamera ref={camerad} near={1} far={4} position={[0, 0, 0]} rotation={[Math.PI*1.5, 0, 0]}></PerspectiveCamera>
      <mesh>
        <boxGeometry />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  )
}

const PhyBox = forwardRef<Mesh, BoxProps>((props, fwdRef) => {
//function PhyBox(props:any) {
  const [boxref, api] = useBox(() => (
    { args: [1, 1, 1], 
      collisionFilterGroup: GROUP_COLLIDE, 
      collisionFilterMask: GROUP_COLLIDE,
      mass: 1, 
      ...props 
    }), fwdRef);
  const bind = useDragConstraint(boxref)

  return (
    <Box
      args={[1, 1, 1]}
      ref={boxref}
      {...bind}
      /*onClick={(event:any) => {
        //get normal, reverse direction
        const normal = event.face.normal.negate().multiplyScalar(3).toArray();
        normal[1] = normal[1]*0
        console.log(normal)
        api.applyLocalImpulse(normal, [0, 0, 0]); //apply directional force to center
      }}*/
    >
      <meshNormalMaterial />
    </Box>
  );
})

//const Ball = forwardRef<Mesh, SphereProps>((props, fwdRef) => {
//  
//  const [ballref, api ] = useSphere(() => (
//    { args: [0.5], 
//      mass: 1, 
//      type: 'Dynamic', 
//      ...props 
//    }), fwdRef)
//
//  return (
//    <mesh 
//      receiveShadow 
//      castShadow 
//      ref={ballref}
//          onClick={(event:any) => {
//        //get normal, reverse direction
//        const normal = event.face.normal.negate().multiplyScalar(3).toArray();
//        normal[1] = normal[1]*0
//        //console.log(normal)
//        console.log(event.face)
//        api.applyImpulse(normal, [0, 0, 0]);
//      }}
//      >
//      <sphereGeometry args={[0.5, 64, 64]} />
//      <meshNormalMaterial />
//    </mesh>
//  )
//})

function App() {

  return (
    <>
      <Canvas shadows dpr={[1, 2]} gl={{ alpha: false }} /*camera={{ rotation: [0,90,90], position: [-10, 5, 5], fov: 45 }}*/>
        <color attach="background" args={['lightblue']} />
        <PerspectiveCamera makeDefault rotation={[Math.PI*1.5, 0, 0]} position={[0,10,0]} />
        <OrbitControls />
        <Dev_camera_Helper />
        <ambientLight />
        <directionalLight position={[100, 100, 100]} castShadow shadow-mapSize={[2048, 2048]} />
        <Physics>
          <Debug color="black" scale={1.1}>
            <Plane position={[0, -2.5, 0]} />
            {/*<Ball position={[0.1, 5, 0]} />*/}
            <PhyBox position={[0.1, 4, 0]} />
            <Cursor />
          </Debug>
        </Physics>
      </Canvas>
      <div style={style}>
        <pre>* click to tighten constraint</pre>
      </div>
    </>
  )
}

export default App;
