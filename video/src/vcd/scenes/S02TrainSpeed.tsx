import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { NightWorld } from "../three/Outdoor";
import { Locomotive } from "../three/Locomotive";
import { Speed, Vignette } from "../overlays";

export const S02_DURATION = 60;

/** The loco thunders past at 110 km/h. Camera tracks alongside. */
export const S02TrainSpeed: React.FC = () => {
  const f = useCurrentFrame();
  const z = f * 1.0;
  return (
    <AbsoluteFill>
      <Stage cam={{ position: [8.5, 2.6, z + 13 - f * 0.08], target: [0, 2.7, z - 5], fov: 52 }} fog={[60, 380]}>
        <NightWorld />
        <Locomotive z={z} distance={z * 1.8} />
      </Stage>
      <Vignette />
      <Speed value={110} top={230} from={14} boxed />
    </AbsoluteFill>
  );
};
