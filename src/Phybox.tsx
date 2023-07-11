import type { BoxProps } from '@react-three/cannon'
import { Physics, useBox } from '@react-three/cannon'
import { forwardRef, useState } from 'react'
import { Mesh } from 'three'
import { Box } from '@react-three/drei'
import { GROUP_COLLIDE } from './collisionGroups'
import { useDragConstraint } from './CursorStuff'
import { IsMobile } from './Ismobile'

export const PhyBox = forwardRef<Mesh, BoxProps>((props, fwdRef) => {
    const [windowChanged] = useState("")
    const isMobile = IsMobile()
    const [boxref, api] = useBox(() => (
      {  
        args: [isMobile ? 0.5:0.7, isMobile ? 0.5:0.7, isMobile ? 0.5:0.7],
        collisionFilterGroup: GROUP_COLLIDE, 
        collisionFilterMask: GROUP_COLLIDE,
        mass: 1.5, 
        ...props 
      }), fwdRef);
    const bind = useDragConstraint(boxref)
  
    //need to make this only happen on window resize
    api.position.set(0.1, 4, 0)
    api.velocity.set(0,0,0)
  
    return (
      <Box receiveShadow castShadow
        args={[IsMobile() ? 0.5:0.7, IsMobile() ? 0.5:0.7, IsMobile() ? 0.5:0.7]}
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