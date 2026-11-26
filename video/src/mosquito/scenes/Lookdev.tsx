/** Look-development turntable for checking anatomy and materials. */
import React from "react";
import { Stage, Shot } from "../core/Stage";
import { Mosquito } from "../models/Mosquito";

export const Lookdev: React.FC<{ view?: "side" | "front" | "top" | "macro" }> = ({ view = "side" }) => {
  const shot = (t: number): Shot => {
    const a = t * 0.6;
    const views: Record<string, Shot> = {
      side: { pos: [2.4 * Math.cos(a), 0.5, 2.4 * Math.sin(a)], target: [0, -0.05, 0], fov: 30, aperture: 0 },
      front: { pos: [0.6, 0.25, 2.2], target: [0, -0.05, 0.1], fov: 30, aperture: 0 },
      top: { pos: [0.01, 2.6, 0.01], target: [0, 0, 0], fov: 30, aperture: 0 },
      macro: { pos: [0.35, 0.1, 0.72], target: [0, -0.02, 0.25], fov: 30, aperture: 0.02, maxBlur: 30 },
    };
    return { ...views[view], grade: { exposure: 1.1, vignette: 0.4 }, bloom: { strength: 0.25, radius: 0.5, threshold: 0.9 } };
  };
  return (
    <Stage from={0} shot={shot} env="lab" bg="#0a1218">
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 4, 3]} intensity={2.4} castShadow />
      <directionalLight position={[-3, 1, -3]} intensity={3} color="#6fd6ff" />
      <pointLight position={[0, -1, 2]} intensity={2} color="#ffb070" />
      <Mosquito wingBlur={() => 0} wingPhase={(t) => t * 0.6} />
    </Stage>
  );
};
