import { useMediaQuery } from "usehooks-ts";

export function IsMobile(): boolean {
  const isMobile = !useMediaQuery("(min-aspect-ratio: 100/101)");
  return isMobile;
}

export default IsMobile;
