import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { usePreloadTextures } from "./useTex";

/** Full-frame WebGL stage for the planetary shots. Mounts the canvas only once textures are ready. */
export const SpaceStage: React.FC<{ children: React.ReactNode; background?: string }> = ({ children, background = "#000" }) => {
  const { width, height } = useVideoConfig();
  const ready = usePreloadTextures();
  if (!ready) return null;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      flat
      style={{ position: "absolute", inset: 0, background }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      camera={{ fov: 40, near: 0.01, far: 3000, position: [0, 0, 5] }}
    >
      {children}
    </ThreeCanvas>
  );
};
