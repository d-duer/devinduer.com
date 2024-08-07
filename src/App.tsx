/* eslint-disable react/no-unknown-property */
import React from "react";
import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Boundary1, Boundary2, Boundary3, Boundary4 } from "./boundary";
import "./App.css";
import { Plane } from "./Plane";
import { Cursor } from "./CursorStuff";
//import { MY_CAMERA_HELPER } from './CameraHelper'
import { PhyBox } from "./Phybox";
import {
  instructionsStyleMobile,
  instructionsStyleDesktop,
  linksChildrenStyleDesktop,
  linksChildrenStyleMobile,
  linksParentStyleDesktop,
  linksParentStyleMobile,
  instructionsTextStyleMobile,
  instructionsTextStyleDesktop,
} from "./Styles";
import { IsMobile } from "./Ismobile";

function App() {
  const isMobile = IsMobile();

  return (
    <>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      ></meta>
      <Canvas shadows dpr={[1, 2]} gl={{ alpha: false }}>
        <color attach="background" args={["lightblue"]} />
        <PerspectiveCamera
          makeDefault
          rotation={[Math.PI * 1.5, 0, 0]}
          position={[0, 10, 0]}
          aspect={9}
        />
        {/* <OrbitControls /> */}
        {/* <MY_CAMERA_HELPER /> */}
        {/* <ambientLight /> */}
        <spotLight
          position={[-2, 10, -2]}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <Physics gravity={[0, -11, 0]}>
          {/*<Debug color="black" scale={1.1}> */}
          {/*right*/}
          <Boundary1 />
          {/*left*/}
          <Boundary2 />
          {/*top*/}
          <Boundary3
            position={[0, -2, -4]}
            rotation={[0, Math.PI * 1.5, Math.PI * -1.4]}
          />
          {/*bottom*/}
          <Boundary4
            position={[0, -2, 4]}
            rotation={[0, Math.PI * 1.5, Math.PI * 1.4]}
          />
          <Plane position={[0, -2.5, 0]} />
          {/* <PhySphere position={[2, 5, 0]} /> */}
          <PhyBox position={[0.1, 4, 0]} />
          {/* <Bowl args={[geometry]}/> */}
          <Cursor />
          {/*</Debug>*/}
        </Physics>
      </Canvas>
      <div
        style={isMobile ? instructionsStyleMobile : instructionsStyleDesktop}
      >
        <pre
          style={
            isMobile
              ? instructionsTextStyleMobile
              : instructionsTextStyleDesktop
          }
        >
          * Grab the cube!
        </pre>
        <pre
          style={
            isMobile
              ? instructionsTextStyleMobile
              : instructionsTextStyleDesktop
          }
        >
          {" "}
          Throw it around!
        </pre>
      </div>
      <div style={isMobile ? linksParentStyleMobile : linksParentStyleDesktop}>
        <div
          style={
            isMobile ? linksChildrenStyleMobile : linksChildrenStyleDesktop
          }
        >
          <a
            href="https://www.linkedin.com/in/devinduer/"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
              alt="Linkedin Logo"
            />
          </a>
        </div>
        <div>
          <div
            style={
              isMobile ? linksChildrenStyleMobile : linksChildrenStyleDesktop
            }
          >
            <a
              href="https://github.com/d-duer/devinduer.com"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
                alt="Github Logo"
              />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
