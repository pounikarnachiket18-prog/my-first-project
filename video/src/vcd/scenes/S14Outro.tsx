import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { NightWorld } from "../three/Outdoor";
import { Locomotive } from "../three/Locomotive";
import { Chip, Hero, Vignette } from "../overlays";
import { COLOR, FONT, mix, ramp } from "../theme";

export const S14_DURATION = 210;

/** "Train har minute puchhti hai: jaag rahe ho?" + call to action. */
export const S14Outro: React.FC<{ brand?: string }> = ({ brand = "HYPOEXPLAINED" }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = ramp(f, 0, S14_DURATION, 0, 1, (x) => x);
  const z = -64 + f * 0.07;
  const cam: CamSpec = { position: mix([1.0, 1.7, 0], [0.75, 1.65, -4], t), target: [0, 2.9, -46], fov: 46 };
  const roof = project([0, 5.0, z], cam, width, height);
  const bounce = Math.abs(Math.sin(f / 7)) * 26;
  return (
    <AbsoluteFill>
      <Stage cam={cam} fog={[50, 380]}>
        <NightWorld />
        <Locomotive z={z} distance={z} />
      </Stage>
      <Vignette />
      <Hero from={48} to={120} top={330} size={46} weight={600}>
        Train har minute puchhti hai
      </Hero>
      <Hero from={60} to={120} top={400} size={124} color={COLOR.gold}>
        Jaag rahe ho?
      </Hero>
      {f >= 122 ? (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FONT.label,
            fontWeight: 500,
            fontSize: 44,
            letterSpacing: 6,
            color: COLOR.ink,
            opacity: ramp(f, 122, 132),
          }}
        >
          {brand}
        </div>
      ) : null}
      <Chip from={126} top={380} size={80} color={COLOR.gold}>
        Comment karo
      </Chip>
      {f >= 136 ? (
        <svg
          width={70}
          height={110}
          viewBox="0 0 70 110"
          style={{
            position: "absolute",
            left: roof.x - 35,
            top: roof.y - 150 + bounce,
            opacity: interpolate(f, [136, 146], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }),
          }}
        >
          <rect x={27} y={0} width={16} height={66} rx={4} fill={COLOR.gold} />
          <polygon points="0,58 70,58 35,108" fill={COLOR.gold} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
