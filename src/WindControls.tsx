import React, { useState } from "react";
import { windSettings } from "./wind";
import {
  windControlsStyleDesktop,
  windControlsStyleMobile,
  windSliderLabelStyle,
  windCompassStyle,
  windCompassMapStyle,
  windVisualsRowStyle,
} from "./Styles";

type Setting = keyof typeof windSettings;

const SLIDERS: {
  key: Setting;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  { key: "speed", label: "Wind speed", min: 0, max: 500, step: 1, unit: "" },
  { key: "angle", label: "Direction", min: 0, max: 360, step: 1, unit: "°" },
  { key: "tilt", label: "Tilt", min: -90, max: 90, step: 1, unit: "°" },
];

const SPEED_MAX = SLIDERS[0].max;

// 0..1 for how bold to draw the wind arrows, on a log scale so everyday
// speeds still show clearly on a slider that goes up to SPEED_MAX
const windStrength = (speed: number) =>
  Math.log1p(speed) / Math.log1p(SPEED_MAX);

// a top-down map of the wind around the pole, with the camera's side at the
// bottom: the arrow blows in from upwind, showing only the direction (the tilt
// has its own view, TiltGauge), and fades out as the wind calms
const WindCompass = ({ speed, angle }: typeof windSettings) => {
  const a = (angle * Math.PI) / 180;
  // in this map +x is right and +y is toward the camera, matching angle's 0 and 90
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const head = 15;
  const tail = head + 28;
  const strength = windStrength(speed);

  return (
    <div style={windCompassStyle}>
      <svg viewBox="-50 -50 100 100" style={windCompassMapStyle}>
        <defs>
          <marker
            id="wind-arrowhead"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#9fd8ff" />
          </marker>
        </defs>
        <circle r="47" fill="none" stroke="rgba(255,255,255,0.25)" />
        {/* the pole */}
        <circle r="10" fill="#8B5A2B" />
        {speed > 0 && (
          <line
            x1={-dx * tail}
            y1={-dy * tail}
            x2={-dx * head}
            y2={-dy * head}
            stroke="#9fd8ff"
            strokeWidth={2 + 3 * strength}
            strokeOpacity={0.35 + 0.65 * strength}
            strokeLinecap="round"
            markerEnd="url(#wind-arrowhead)"
          />
        )}
      </svg>
    </div>
  );
};

// a side view of the wind's tilt: the pole stands on the ground, and the arrow
// blows in from the left at the tilt angle, level, rising from below, or
// coming down from above. faded like the compass as the wind calms
const TiltGauge = ({ speed, tilt }: typeof windSettings) => {
  const t = (tilt * Math.PI) / 180;
  // svg y points down, so upward tilt is negative y
  const dx = Math.cos(t);
  const dy = -Math.sin(t);
  const head = 10;
  const tail = 38;
  const strength = windStrength(speed);

  return (
    <div style={windCompassStyle}>
      <svg viewBox="-50 -50 100 100" style={windCompassMapStyle}>
        <defs>
          <marker
            id="tilt-arrowhead"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#9fd8ff" />
          </marker>
        </defs>
        {/* level guide, the ground and the pole */}
        <line
          x1="-46"
          y1="0"
          x2="46"
          y2="0"
          stroke="rgba(255,255,255,0.25)"
          strokeDasharray="3 3"
        />
        <line x1="-46" y1="44" x2="46" y2="44" stroke="rgba(255,255,255,0.6)" />
        <rect x="-5" y="-46" width="10" height="90" fill="#8B5A2B" />
        {speed > 0 && (
          <line
            x1={-dx * tail}
            y1={-dy * tail}
            x2={-dx * head}
            y2={-dy * head}
            stroke="#9fd8ff"
            strokeWidth={2 + 3 * strength}
            strokeOpacity={0.35 + 0.65 * strength}
            strokeLinecap="round"
            markerEnd="url(#tilt-arrowhead)"
          />
        )}
      </svg>
    </div>
  );
};

// on-screen sliders that change the wind live. they write straight into
// windSettings, which the cloth reads every frame
export const WindControls = ({ isMobile }: { isMobile: boolean }) => {
  const [values, setValues] = useState({ ...windSettings });

  const change = (key: Setting, value: number) => {
    windSettings[key] = value;
    setValues((v) => ({ ...v, [key]: value }));
  };

  return (
    <div
      className="wind-controls"
      style={isMobile ? windControlsStyleMobile : windControlsStyleDesktop}
    >
      <div style={windVisualsRowStyle}>
        <WindCompass {...values} />
        <TiltGauge {...values} />
      </div>
      {SLIDERS.map(({ key, label, min, max, step, unit }) => (
        <label key={key} style={windSliderLabelStyle}>
          <span>
            {label}: {Math.round(values[key] * 10) / 10}
            {unit}
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[key]}
            onChange={(e) => change(key, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  );
};
