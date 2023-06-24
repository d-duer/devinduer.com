import type { BoxProps, PlaneProps, SphereProps, Triplet, ConvexPolyhedronProps, TrimeshProps } from '@react-three/cannon'
import { Physics, useBox, useSphere, useSpring, usePlane, Debug, usePointToPointConstraint, useConvexPolyhedron, useTrimesh } from '@react-three/cannon'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import React, { forwardRef, useEffect, useRef, useState, createRef, useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import type { ThreeEvent, MeshStandardMaterialProps, MeshProps, BoxBufferGeometryProps } from '@react-three/fiber'
import { CameraHelper, Mesh, type Object3D } from 'three'
import type { BufferGeometry } from 'three'
import { Box, Sphere, OrbitControls, PerspectiveCamera, useHelper, useGLTF } from '@react-three/drei'
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Geometry } from "three-stdlib/deprecated/Geometry";
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'
import { Boundary1, Boundary2, Boundary3, Boundary4 } from './boundary'
import { useMediaQuery } from 'usehooks-ts'

const cursor = createRef<Mesh>()
const GROUP_COLLIDE = 2 ** 0
const GROUP_CURSOR = 2 ** 1

type BowlGLTF = GLTF & {
  materials: {}
  nodes: {
    bowl: Mesh & {
      geometry: BufferGeometry & { index: ArrayLike<number> }
    }
  }
}

const Bowl = forwardRef<Mesh, TrimeshProps>((props, fwdRef) => {
  const {
    nodes: {
      bowl: { geometry },
    },
  } = useGLTF('./assets/bowl.glb') as BowlGLTF
  const {
    attributes: {
      position: { array: vertices },
      
    },
    index: { array: indices },
  } = geometry

  const [bowlref] = useTrimesh(() => ({
      collisionFilterGroup: GROUP_COLLIDE, 
      collisionFilterMask: GROUP_COLLIDE,
      type: 'Dynamic',
      args: [vertices, indices],
      mass: 1,
    }), fwdRef
    // useRef<Mesh>(null),
  )

  return (
    <mesh
      ref={bowlref}
      geometry={geometry}
      args={[geometry]}
    >
      <meshStandardMaterial color={'white'} />
    </mesh>
  )
})

function useDragConstraint(child: RefObject<Object3D>) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0], maxForce: 0.7 })
  // TODO: make it so we can start the constraint with it disabled
  useEffect(() => void api.disable(), [])
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    console.log('pointer down')
    e.stopPropagation()
    //@ts-expect-error Investigate proper types here.
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  const onPointerUp = useCallback(() => api.disable(), [])
  return { onPointerDown, onPointerUp }
}

const Cursor = () => {
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

const Plane = forwardRef<Mesh, PlaneProps>((props, fwdRef) => {
  const [planeref] = usePlane(() => (
    { 
      collisionFilterGroup: GROUP_COLLIDE,
      collisionFilterMask: GROUP_COLLIDE,
      rotation: [-Math.PI / 2, 0, 0],
     ...props 
    }), fwdRef)

  return (
    <mesh ref={planeref} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      {/*<shadowMaterial color="#171717" />*/}
      <meshStandardMaterial />
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

const MY_CAMERA_HELPER = () => {
  const camerad = useRef<any>()
  useHelper(camerad, THREE.CameraHelper)
  return (
    <>
      {/* <ambientLight intensity={1} /> */}
      <PerspectiveCamera ref={camerad} near={1} far={12} position={[0, 10, 0]} rotation={[Math.PI*1.5, 0, 0]}></PerspectiveCamera>
      <mesh>
        <boxGeometry />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  )
}

const PhyBox = forwardRef<Mesh, BoxProps>((props, fwdRef) => {
  const isMobile = IsMobile()
  const [boxref, api] = useBox(() => (
    {  
      args: [isMobile ? 0.5:1, isMobile ? 0.5:1, isMobile ? 0.5:1],
      collisionFilterGroup: GROUP_COLLIDE, 
      collisionFilterMask: GROUP_COLLIDE,
      mass: 1.5, 
      ...props 
    }), fwdRef);
  const bind = useDragConstraint(boxref)

  return (
    <Box receiveShadow castShadow
      args={[IsMobile() ? 0.5:1, IsMobile() ? 0.5:1, IsMobile() ? 0.5:1]}
      ref={boxref}
      {...bind}
    >
      <meshBasicMaterial attach="material-0" color="#00FF00" />
      <meshBasicMaterial attach="material-1" color="#FF0000" />
      <meshBasicMaterial attach="material-2" color="#0000FF" />
      <meshBasicMaterial attach="material-3" color="#FFFF00" />
      <meshBasicMaterial attach="material-4" color="#FF00FF" />
      <meshBasicMaterial attach="material-5" color="#00FFFF" />
    </Box>
  );
})

const PhySphere = forwardRef<Mesh, SphereProps>((props, fwdRef) => {
  const [sphereref, api] = useSphere(() => (
    { args: [0.5], 
      collisionFilterGroup: GROUP_COLLIDE, 
      collisionFilterMask: GROUP_COLLIDE,
      mass: 1, 
      ...props 
    }), fwdRef);
  const bind = useDragConstraint(sphereref)

  return (
    <Sphere receiveShadow castShadow
      args={[0.5]}
      ref={sphereref}
      {...bind}
      
    >
    <meshStandardMaterial color="049ef4" metalness={1} emissive="963c3c"/>
    </Sphere>
  );
})

// type BoundaryProps = BoxProps & {
//   color?: string
// }

// type BoundaryProps = BoxProps & Pick<MeshStandardMaterialProps, 'color'>

// const Boundary = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
//     const [boundaryref] = useBox(() => (
//       { 
//         args: [15, 0.01, 20],
//         collisionFilterGroup: GROUP_COLLIDE, 
//         collisionFilterMask: GROUP_COLLIDE,
//         type: 'Dynamic',
//         // color: 'Blue',
//         ...props 
//       }), fwdRef);
  
//     return (
//       <Box receiveShadow castShadow
//         args={[15, 0.01, 20]}
//         ref={boundaryref}
//       >
//         <meshStandardMaterial />
//       </Box>
//     );
//   })
function IsMobile() {
  const isMobile = useMediaQuery('(max-width: 1500px)')
  return isMobile
}

function App() {

  return (
    <>
      <Canvas shadows dpr={[1, 2]} gl={{ alpha: false }} >
        <color attach="background" args={['lightblue']} />
        <PerspectiveCamera makeDefault rotation={[Math.PI*1.5, 0, 0]} position={[0,10,0]} aspect={9}/>
        {/* <OrbitControls />
        <MY_CAMERA_HELPER /> */}
        {/* <ambientLight /> */}
        <spotLight 
          position={[-2, 10, -2]} 
          castShadow 
          shadow-mapSize={[2048, 2048]} />
        <Physics gravity = {[0, -11, 0]}>
          {/* <Debug color="black" scale={1.1}> */}
            {/*right*/}
            <Boundary1 position={[IsMobile() ? 2:6,-2,0]} rotation={[0,0,Math.PI*1.4]} />
            {/*left*/}
            <Boundary2 position={[IsMobile() ? -2:-6,-2,0]} rotation={[0,0,Math.PI*-1.4]} />
            {/*top*/}
            <Boundary3 position={[0,-2,-4]} rotation={[0,Math.PI*1.5,Math.PI*-1.4]} />
            {/*bottom*/}
            <Boundary4 position={[0,-2,4]} rotation={[0,Math.PI*1.5,Math.PI*1.4]} />
            <Plane position={[0, -2.5, 0]} />
            {/* <PhySphere position={[2, 5, 0]} /> */}
            <PhyBox position={[0.1, 4, 0]} />
            {/* <Bowl args={[geometry]}/> */}
            <Cursor />
          {/* </Debug> */}
        </Physics>
      </Canvas>
      <div style={style}>
        <pre>* Grab the cube with the mouse!</pre>
      </div>
    </>
  )
}

export default App;
