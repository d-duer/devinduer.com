import { Euler, Vector3 } from "three";
import type { Triplet } from "@react-three/cannon";

// lines 3d positions up with spots in the background photo.
//
// the photo is drawn flat behind the scene, cropped to cover the window. on any
// window up to the photo's own shape (2560 / 1188, about 2.15:1) it shows its
// full height and crops the sides, and the camera's view is a fixed angle tall,
// so a pixel in the photo always lines up with the same direction from the
// camera, whatever the window size. that only holds while the camera below
// stays put, so the scene's camera is built from these same values.

export const CAMERA_POSITION: Triplet = [0, 2.8, 8];
export const CAMERA_ROTATION: Triplet = [0, 0, 0];
// vertical field of view, in degrees
export const CAMERA_FOV = 50;

export const BACKGROUND_URL = `${process.env.PUBLIC_URL}/background.jpg`;
// the photo's size in pixels; update these if the image is replaced
export const BACKGROUND_WIDTH = 2560;
export const BACKGROUND_HEIGHT = 1188;

// the 3d point that lines up with pixel (px, py) of the background photo (from
// its top-left corner), `depth` units in front of the camera along its view.
// pass the window's aspect (width / height) to also handle windows wider than
// the photo, where it crops its top and bottom instead of its sides
export const photoToWorld = (
  px: number,
  py: number,
  depth: number,
  screenAspect?: number,
): Triplet => {
  const imageAspect = BACKGROUND_WIDTH / BACKGROUND_HEIGHT;
  // how many photo pixels tall the window shows: all of it, unless the window
  // is wider than the photo
  const visibleHeight =
    screenAspect !== undefined && screenAspect > imageAspect
      ? BACKGROUND_WIDTH / screenAspect
      : BACKGROUND_HEIGHT;
  const halfHeight = visibleHeight / 2;
  const tan = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  // direction in the camera's own frame (it looks down -z), scaled so its
  // forward part is `depth`
  const direction = new Vector3(
    ((px - BACKGROUND_WIDTH / 2) / halfHeight) * tan * depth,
    ((BACKGROUND_HEIGHT / 2 - py) / halfHeight) * tan * depth,
    -depth,
  ).applyEuler(new Euler(...CAMERA_ROTATION));
  return [
    CAMERA_POSITION[0] + direction.x,
    CAMERA_POSITION[1] + direction.y,
    CAMERA_POSITION[2] + direction.z,
  ];
};
