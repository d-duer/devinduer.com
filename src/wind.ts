import { Vector3 } from "three";
import type { Vec3 } from "./verletCloth";

// where the wind starts out blowing toward, before anyone moves the sliders
const START_DIRECTION = new Vector3(10, -10, -10).normalize();

// the wind's live settings, changed by the on-screen sliders and read every
// frame. speed is scaled by gust(), so the wind averages 0.6x it and gusts
// between 0 and about 1.3x. angle is the compass direction it blows toward in
// degrees (0 = right, 90 = toward the camera, 180 = left, 270 = away), and tilt
// is how far it blows up (positive) or down (negative), in degrees
export const windSettings = {
  speed: 5,
  angle:
    ((Math.atan2(START_DIRECTION.z, START_DIRECTION.x) * 180) / Math.PI + 360) %
    360,
  tilt: (Math.asin(START_DIRECTION.y) * 180) / Math.PI,
};

// overlapping slow, medium and quick waves, so gusts never repeat in an obvious
// rhythm; averages 0.6 and ranges from 0 (a lull) to about 1.3
const gust = (t: number) =>
  Math.max(
    0,
    0.6 +
      0.4 * Math.sin(0.9 * t) +
      0.25 * Math.sin(2.3 * t + 1.3) +
      0.15 * Math.sin(5.1 * t + 0.4),
  );

// the wind's velocity at a time in seconds
export const windAt = (time: number): Vec3 => {
  const { speed, angle, tilt } = windSettings;
  const a = (angle * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  const s = speed * gust(time);
  return [
    Math.cos(t) * Math.cos(a) * s,
    Math.sin(t) * s,
    Math.cos(t) * Math.sin(a) * s,
  ];
};
