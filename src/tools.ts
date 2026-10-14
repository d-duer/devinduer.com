// what clicking on the sheet does, changed by the on-screen tool picker and
// read by the sheet on each click
export type Tool = "grab" | "nail";

export const toolSettings: { tool: Tool } = { tool: "grab" };

// a "clear nails" signal from the on-screen button to the sheet, which lives
// inside the 3d scene and listens for it
const clearNailsListeners = new Set<() => void>();

export const clearNails = () => clearNailsListeners.forEach((fn) => fn());

// listen for clearNails(); returns a function that stops listening
export const onClearNails = (fn: () => void) => {
  clearNailsListeners.add(fn);
  return () => {
    clearNailsListeners.delete(fn);
  };
};
