import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, usePop } from "../ui";
import { Track, Train, trainWidth } from "../Train";

const S = T.title;
const SCALE = 0.38;
const RAIL_Y = 1450;

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const W = trainWidth(4) * SCALE;
  const dist = frame * 16;
  const x = -W + dist;
  const big = usePop(S.l3, 9, 160);
  const dots = ["", ".", "..", "..."][Math.floor(frame / 6) % 4];
  return (
    <AbsoluteFill>
      <NightBg glow="#1F2F66" />
      {/* giant ghost Devanagari word */}
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: F.deva,
          fontWeight: 700,
          fontSize: 330,
          color: "#ffffff08",
          transform: `translateX(${-frame * 1.5}px)`,
          whiteSpace: "nowrap",
        }}
      >
        ध्यान दें
      </div>
      <Track y={RAIL_Y} wireY={RAIL_Y - 160} />
      <Train coaches={4} distance={dist} x={x} y={RAIL_Y} scale={SCALE} />

      <div style={{ position: "absolute", top: 470, left: 50, right: 50 }}>
        <PopLine start={S.l1} size={64} font={F.sans} weight={900} color={C.muted}>
          Why do Indian railway announcements
        </PopLine>
        <PopLine start={S.l2} size={110} style={{ marginTop: 16 }}>
          come in
        </PopLine>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 250,
            lineHeight: 1,
            textAlign: "center",
            color: C.yellow,
            textShadow: `0 0 60px ${C.yellow}88`,
            opacity: big,
            transform: `scale(${interpolate(big, [0, 1], [2.2, 1])})`,
            letterSpacing: interpolate(frame, [S.l3, S.l3 + 60], [4, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          PAUSES
        </div>
        <PopLine start={S.l3 + 18} size={130} color={C.red} style={{ marginTop: -10 }}>
          <Hi c={C.red}>?{dots}</Hi>
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
