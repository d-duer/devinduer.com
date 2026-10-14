/* eslint-disable react/no-unknown-property */
import React from "react";
import { Physics, type Triplet } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { Grid, PerspectiveCamera } from "@react-three/drei";
import { Color, Euler, Vector3 } from "three";
import "./App.css";
import { Pole, POLE_RADIUS } from "./Pole";
import { Cursor } from "./CursorStuff";
//import { MY_CAMERA_HELPER } from './CameraHelper'
import { VerletSheet, sheetSize } from "./VerletSheet";
import { GuideRectangles } from "./GuideRectangles";
import { SceneBackground } from "./SceneBackground";
import {
  BACKGROUND_URL,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_ROTATION,
} from "./photoAlign";
import { WindControls } from "./WindControls";
import { ToolPicker } from "./ToolPicker";
import {
  instructionsStyleMobile,
  instructionsStyleDesktop,
  linksChildrenStyleDesktop,
  linksChildrenStyleMobile,
  linksParentStyleDesktop,
  linksParentStyleMobile,
  instructionsTextStyleMobile,
  instructionsTextStyleDesktop,
  attributionStyleDesktop,
  attributionStyleMobile,
  backgroundAttributionStyleDesktop,
  backgroundAttributionStyleMobile,
} from "./Styles";
import { IsMobile } from "./Ismobile";

// the invisible floor the sheet lands on, well below the bottom of the view
const FLOOR_Y = -20;
// the pole's bottom and height, set on their own so moving the floor doesn't
// move it (it reaches from y -6 up to 7.5)
const POLE_BASE: Triplet = [0, -6, 0];
const POLE_HEIGHT = 100;
// how the floor is turned, as [x, y, z] angles in radians: y spins it flat,
// x and z tilt it. turns both the grid and the floor the sheet lands on
const FLOOR_ROTATION: Triplet = [0.05, 0, 0];
const FLOOR_NORMAL = new Vector3(0, 1, 0)
  .applyEuler(new Euler(...FLOOR_ROTATION))
  .toArray() as Triplet;
// a grid on the floor, as a guide for lining things up with the background
// photo; set to false to hide it
const SHOW_GRID = true;
// how far from the camera the grid fades out completely; under the camera's
// far limit (2000)
const GRID_FADE_DISTANCE = 500;
// sky and ground colors from three.js's webgl_lights_hemisphere example
const HEMI_SKY = new Color().setHSL(0.6, 1, 0.6);
const HEMI_GROUND = new Color().setHSL(0.095, 1, 0.75);
// the example's intensity is 2, but this three version (r153) still uses legacy
// lighting, which scales lights up by pi
const HEMI_INTENSITY = 2 / Math.PI;
// the example's sunlight: warm white, 3 (scaled for legacy lighting like the
// hemisphere light), shining down from up and to the left, in front
const SUN_COLOR = new Color().setHSL(0.1, 1, 0.95);
const SUN_INTENSITY = 3 / Math.PI;
// how far the sun's shadow reaches from the center of the scene. the example
// uses 50 for its much bigger scene, which would make these shadows blurry
const SUN_SHADOW_EXTENT = 10;
// the pole as the verlet sheet sees it, since the sheet isn't part of cannon
const POLE_COLLIDER = {
  x: POLE_BASE[0],
  z: POLE_BASE[2],
  radius: POLE_RADIUS,
  yMin: POLE_BASE[1],
  yMax: POLE_BASE[1] + POLE_HEIGHT,
};

function App() {
  const isMobile = IsMobile();

  return (
    <>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      ></meta>
      <Canvas shadows dpr={[1, 2]} gl={{ alpha: false }}>
        <SceneBackground url={BACKGROUND_URL} />
        <PerspectiveCamera
          makeDefault
          // shared with photoAlign.ts, so objects placed with photoToWorld line
          // up with the background photo
          position={CAMERA_POSITION}
          rotation={CAMERA_ROTATION}
          fov={CAMERA_FOV}
          aspect={9}
        />
        {/* <OrbitControls /> */}
        {/* <MY_CAMERA_HELPER /> */}
        {/* <ambientLight /> */}
        {/* lights from above in the sky color and from below in the ground color */}
        <hemisphereLight
          args={[HEMI_SKY, HEMI_GROUND, HEMI_INTENSITY]}
          position={[0, 50, 0]}
        />
        <directionalLight
          args={[SUN_COLOR, SUN_INTENSITY]}
          position={[-1 * 30, 1.75 * 30, 1 * 30]}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-SUN_SHADOW_EXTENT}
          shadow-camera-right={SUN_SHADOW_EXTENT}
          shadow-camera-top={SUN_SHADOW_EXTENT}
          shadow-camera-bottom={-SUN_SHADOW_EXTENT}
          shadow-camera-far={200}
          shadow-bias={-0.0001}
        />
        <spotLight
          position={[-10, 10, -5]}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <Physics gravity={[0, -11, 0]}>
          {/*<Debug color="black" scale={1.1}> */}
          <Pole base={POLE_BASE} height={POLE_HEIGHT} />
          {SHOW_GRID && (
            // 1 unit cells and a heavier line every 5, fading out toward the
            // horizon. drei's "infinite" grid is really a square 1 + fadeDistance
            // across, so it's doubled (args) and kept under the camera
            // (followCamera) to put its edge past where it has fully faded
            <Grid
              args={[2, 2]}
              position={[0, FLOOR_Y, 0]}
              rotation={FLOOR_ROTATION}
              infiniteGrid
              followCamera
              cellSize={1}
              cellThickness={0.6}
              cellColor="#ffffff"
              sectionSize={5}
              sectionThickness={1.2}
              sectionColor="#ff4040"
              fadeDistance={GRID_FADE_DISTANCE}
            />
          )}
          {/* <PhySphere position={[2, 5, 0]} /> */}
          {/* flush against the front of the pole, nailed to it */}
          <VerletSheet
            position={[0.1, 3, POLE_RADIUS + 0.05]}
            nailed
            floorY={FLOOR_Y}
            floorNormal={FLOOR_NORMAL}
            cylinders={[POLE_COLLIDER]}
            nailTo={POLE_COLLIDER}
          />
          {/* <Bowl args={[geometry]}/> */}
          {SHOW_GRID && (
            <GuideRectangles
              floorY={FLOOR_Y}
              floorRotation={FLOOR_ROTATION}
              size={sheetSize(isMobile)}
            />
          )}
          <Cursor />
          {/*</Debug>*/}
        </Physics>
      </Canvas>
      <div
        style={isMobile ? instructionsStyleMobile : instructionsStyleDesktop}
      ></div>
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
      <ToolPicker isMobile={isMobile} />
      <WindControls isMobile={isMobile} />
      {/* credit for the pole's wood texture (public/poleTexture.jpg) */}
      <a
        href="https://www.magnific.com/free-vector/realistic-wood-texture-background_21337775.htm#fromView=search&page=4&position=8&uuid=8e68869b-7f5b-48a8-a586-e30ac2523aa2&track=ais_hybrid&query=wood"
        target="_blank"
        rel="noreferrer"
        style={isMobile ? attributionStyleMobile : attributionStyleDesktop}
      >
        Image by magnific
      </a>
      {/* credit for the background photo (public/background.jpg) */}
      <a
        href="https://www.magnific.com/free-photo/wide-shot-bike-road-playground-near-tall-trees_10110816.htm#fromView=search&page=3&position=25&uuid=8884581f-b0f9-4788-9978-2d00444af3cb&track=ais_hybrid&query=Suburban+street"
        target="_blank"
        rel="noreferrer"
        style={
          isMobile
            ? backgroundAttributionStyleMobile
            : backgroundAttributionStyleDesktop
        }
      >
        Image by wirestock on Magnific
      </a>
    </>
  );
}

export default App;
