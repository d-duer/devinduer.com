/* eslint-disable react/no-unknown-property */
import React, { useLayoutEffect, useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { SRGBColorSpace, TextureLoader } from "three";

// the scene's background image, scaled to cover the whole window without
// stretching (like css background-size: cover), cropping whichever sides spill over
export const SceneBackground = ({ url }: { url: string }) => {
  const loaded = useLoader(TextureLoader, url);
  const texture = useMemo(() => {
    const t = loaded.clone();
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [loaded]);
  const { width, height } = useThree((state) => state.size);

  useLayoutEffect(() => {
    const image = texture.image as { width: number; height: number };
    const imageAspect = image.width / image.height;
    const screenAspect = width / height;
    if (screenAspect > imageAspect) {
      // window is wider than the image: show its full width, crop top and bottom
      texture.repeat.set(1, imageAspect / screenAspect);
    } else {
      // window is taller: show its full height, crop the sides
      texture.repeat.set(screenAspect / imageAspect, 1);
    }
    texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
  }, [texture, width, height]);

  return <primitive attach="background" object={texture} />;
};
