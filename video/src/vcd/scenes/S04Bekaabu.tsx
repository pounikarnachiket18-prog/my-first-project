import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { NightWorld } from "../three/Outdoor";
import { Locomotive } from "../three/Locomotive";
import { Hero, Vignette } from "../overlays";
import { COLOR } from "../theme";

export const S04_DURATION = 90;

/** "Agar pilot so gaya... train bekaabu?" — "Bilkul nahi!" */
export const S04Bekaabu: React.FC = () => {
  const f = useCurrentFrame();
  const z = -52 + f * 0.3;
  return (
    <AbsoluteFill>
      <Stage cam={{ position: [2.6, 1.25, 0], target: [-0.4, 2.6, -40], fov: 50 }} fog={[50, 380]}>
        <NightWorld />
        <Locomotive z={z} distance={z} />
      </Stage>
      <Vignette />
      <Hero from={6} to={52} top={300} size={280} color={COLOR.coral} weight={700}>
        ?
      </Hero>
      <Hero from={12} to={52} top={610} size={104}>
        Bekaabu?
      </Hero>
      <Hero from={56} top={420} size={52} weight={600}>
        Bilkul
      </Hero>
      <Hero from={60} top={480} size={170} color={COLOR.gold}>
        Nahi!
      </Hero>
    </AbsoluteFill>
  );
};
