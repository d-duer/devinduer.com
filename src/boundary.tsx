import type { BoxProps } from '@react-three/cannon'
import { useBox } from '@react-three/cannon'
import { forwardRef } from 'react'
import type { MeshStandardMaterialProps } from '@react-three/fiber'
import { Mesh } from 'three'
import { Box } from '@react-three/drei'

const GROUP_COLLIDE = 2 ** 0

type BoundaryProps = BoxProps & Pick<MeshStandardMaterialProps, 'color'>

export const Boundary1 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [15, 0.01, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        // color: 'Blue',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[15, 0.01, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#00FF00" />
      </Box>
    );
})

export const Boundary2 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [15, 0.01, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        // color: 'Blue',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[15, 0.01, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#FF0000"/>
      </Box>
    );
})

export const Boundary3 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [15, 0.01, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        // color: 'Blue',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[15, 0.01, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#0000FF"/>
      </Box>
    );
})

export const Boundary4 = forwardRef<Mesh, BoundaryProps>((props, fwdRef) => {
    const [boundaryref] = useBox(() => (
      { 
        args: [15, 0.01, 20],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        type: 'Dynamic',
        // color: 'Blue',
        ...props 
      }), fwdRef);
  
    return (
      <Box receiveShadow castShadow
        args={[15, 0.01, 20]}
        ref={boundaryref}
      >
        <meshStandardMaterial color="#FFFF00"/>
      </Box>
    );
})