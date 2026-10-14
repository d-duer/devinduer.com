export const instructionsStyleDesktop = {
  fontSize: "2.5vh",
  color: "white",
  left: 50,
  top: 50,
  margin: "0px",
  position: "absolute",
} as const;

export const instructionsStyleMobile = {
  fontSize: "3vh",
  color: "white",
  left: 10,
  top: 10,
  margin: "0px",
  position: "absolute",
} as const;
//////////////////////////////////////////
export const instructionsTextStyleDesktop = {
  fontSize: "4vh",
  color: "white",
  margin: "0px",
} as const;

export const instructionsTextStyleMobile = {
  fontSize: "3vh",
  color: "white",
  margin: "0px",
} as const;
//////////////////////////////////////////
export const linksParentStyleDesktop = {
  position: "absolute",
  right: 50,
  top: 50,
  margin: 0,
  height: "14.4vh",
  width: "7vh",
} as const;

export const linksParentStyleMobile = {
  position: "absolute",
  right: 10,
  top: 10,
  margin: 0,
  height: "10.2vh",
  width: "5vh",
} as const;
//////////////////////////////////////////
export const linksChildrenStyleDesktop = {
  display: "inline-block",
  height: "7vh",
  width: "7vh",
  padding: ".1vh",
} as const;

export const linksChildrenStyleMobile = {
  display: "inline-block",
  height: "5vh",
  width: "5vh",
  padding: ".05vh",
} as const;
//////////////////////////////////////////
// small credit line in the bottom-right corner
export const attributionStyleDesktop = {
  position: "absolute",
  right: 50,
  bottom: 20,
  margin: 0,
  fontSize: "1.5vh",
  color: "white",
} as const;

export const attributionStyleMobile = {
  position: "absolute",
  right: 10,
  bottom: 10,
  margin: 0,
  fontSize: "1.5vh",
  color: "white",
} as const;

// the second credit line, just above the first
export const backgroundAttributionStyleDesktop = {
  ...attributionStyleDesktop,
  bottom: "calc(20px + 2.2vh)",
} as const;

export const backgroundAttributionStyleMobile = {
  ...attributionStyleMobile,
  bottom: "calc(10px + 2.2vh)",
} as const;
//////////////////////////////////////////
// wind sliders, bottom-left, on a dark backing so they read over the photo
export const windControlsStyleDesktop = {
  position: "absolute",
  left: 50,
  bottom: 20,
  display: "flex",
  flexDirection: "column",
  gap: "0.8vh",
  padding: "1vh 1.2vh",
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.45)",
  color: "white",
  fontFamily: "monospace",
  fontSize: "1.6vh",
} as const;

export const windControlsStyleMobile = {
  ...windControlsStyleDesktop,
  left: 10,
  bottom: 10,
  fontSize: "1.4vh",
} as const;

export const windSliderLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3vh",
} as const;

// the top-down wind map at the top of the wind panel
export const windCompassStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  alignSelf: "center",
} as const;

export const windCompassMapStyle = {
  width: "11vh",
  height: "11vh",
} as const;

// the top-down map and the side-on tilt view, next to each other
export const windVisualsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "1vh",
} as const;
//////////////////////////////////////////
// grab / nail tool picker, under the instructions in the top-left
export const toolPickerStyleDesktop = {
  position: "absolute",
  left: 50,
  top: "calc(50px + 11vh)",
  display: "flex",
  gap: "0.6vh",
  padding: "0.6vh",
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.45)",
} as const;

export const toolPickerStyleMobile = {
  ...toolPickerStyleDesktop,
  left: 10,
  top: "calc(10px + 8vh)",
} as const;

export const toolButtonStyle = {
  fontFamily: "monospace",
  fontSize: "1.8vh",
  padding: "0.5vh 1.4vh",
  borderRadius: 6,
  border: "1px solid rgba(255, 255, 255, 0.5)",
  background: "transparent",
  color: "white",
} as const;

export const toolButtonActiveStyle = {
  ...toolButtonStyle,
  background: "white",
  color: "black",
} as const;
