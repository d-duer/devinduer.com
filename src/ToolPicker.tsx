import React, { useState } from "react";
import { clearNails, toolSettings, type Tool } from "./tools";
import {
  toolPickerStyleDesktop,
  toolPickerStyleMobile,
  toolButtonStyle,
  toolButtonActiveStyle,
} from "./Styles";

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: "grab", label: "Grab" },
  { tool: "nail", label: "Nail" },
];

// switches what clicking on the sheet does: grab and drag it, or nail it to
// the pole where you click (writes straight into toolSettings, which the sheet
// reads on each click), plus a button to clear the added nails
export const ToolPicker = ({ isMobile }: { isMobile: boolean }) => {
  const [tool, setTool] = useState(toolSettings.tool);

  const choose = (next: Tool) => {
    toolSettings.tool = next;
    setTool(next);
  };

  return (
    <div
      className="tool-picker"
      style={isMobile ? toolPickerStyleMobile : toolPickerStyleDesktop}
    >
      {TOOLS.map(({ tool: t, label }) => (
        <button
          key={t}
          type="button"
          style={t === tool ? toolButtonActiveStyle : toolButtonStyle}
          onClick={() => choose(t)}
        >
          {label}
        </button>
      ))}
      {/* removes the nails you've added; the sheet keeps its original nail */}
      <button type="button" style={toolButtonStyle} onClick={clearNails}>
        Clear nails
      </button>
    </div>
  );
};
