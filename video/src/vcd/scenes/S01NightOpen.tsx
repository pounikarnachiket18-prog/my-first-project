import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { NightWorld } from "../three/Outdoor";
import { Locomotive } from "../three/Locomotive";
import { COLOR, FONT, mix, ramp } from "../theme";
import { Vignette } from "../overlays";

export const S01_DURATION = 60;

/** 03:00 AM — empty line at night, a headlight far away. */
export const S01NightOpen: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 0, S01_DURATION, 0, 1);
  const trainZ = -230 + f * 1.0;
  return (
    <AbsoluteFill>
      <Stage cam={{ position: mix([-4.2, 1.8, 22], [-4.0, 1.75, 17], t), target: [0.2, 2.6, -150], fov: 55 }} fog={[60, 420]}>
        <NightWorld />
        <Locomotive z={trainZ} distance={trainZ} />
      </Stage>
      <Vignette />
      <div
        style={{
          position: "absolute",
          top: 210,
          left: 0,
          right: 0,
          textAlign: "center",
          color: COLOR.ink,
          fontFamily: FONT.clock,
          opacity: ramp(f, 2, 14),
          translate: `0 ${ramp(f, 2, 18, 24, 0)}px`,
        }}
      >
        <div style={{ fontFamily: FONT.label, fontWeight: 600, fontSize: 50, letterSpacing: 6 }}>RAAT</div>
        <div style={{ fontSize: 132, fontWeight: 500, letterSpacing: 4, lineHeight: 1.05 }}>03:00 AM</div>
      </div>
    </AbsoluteFill>
  );
};
