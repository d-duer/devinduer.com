import type { BoxProps } from '@react-three/cannon'
import { useBox } from '@react-three/cannon'
import { forwardRef } from 'react'
import type { MeshStandardMaterialProps } from '@react-three/fiber'
import { Mesh } from 'three'
import { Box } from '@react-three/drei'

import {IsMobile} from './Ismobile'

const GROUP_COLLIDE = 2 ** 0

type BoundaryProps = BoxProps & Pick<MeshStandardMaterialProps, 'color'>

export const Boundary1 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const isMobile = IsMobile()

    const [boundaryref, api] = useBox(() => (
      { 
        args: [100, 0.0000000000001, 20],
        position:[isMobile ? 2:6,-2,0],
        rotation:[0,0,Math.PI*1.4],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        ...props 
      }), fwdRef);
  
    api.position.set(isMobile ? 2:6,-2,0)

    return (
      <Box receiveShadow castShadow
        args={[100, 0.0000000000001, 20]}
        position={[isMobile ? 2:6,-2,0]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#00FF00" />
      </Box>
    );
})

export const Boundary2 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const isMobile = IsMobile()

    const [boundaryref, api] = useBox(() => (
      { 
        args: [100, 0.0000000000001, 20],
        position:[isMobile ? -2:-6,-2,0],
        rotation:[0,0,Math.PI*-1.4],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        ...props 
      }), fwdRef);
  
    api.position.set(isMobile ? -2:-6,-2,0)  

    return (
      <Box receiveShadow castShadow
        args={[100, 0.0000000000001, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#FF0000"/>
      </Box>
    );
})

export const Boundary3 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [100, 0.0000000000001, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[100, 0.0000000000001, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#0000FF"/>
      </Box>
    );
})

export const Boundary4 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [100, 0.0000000000001, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[100, 0.0000000000001, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#FFFF00"/>
      </Box>
    );
})