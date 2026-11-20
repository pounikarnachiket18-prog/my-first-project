import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Speaker, usePop } from "../ui";
import { Track, Train, trainWidth } from "../Train";

const S = T.outro;
const SCALE = 0.55;
const COACHES = 5;
const RAIL_Y = 1330;

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const W = trainWidth(COACHES) * SCALE;
  const startX = 1050 - W;
  const t = Math.max(0, frame - S.depart);
  const dist = 0.09 * t * t; // accelerating departure
  const x = startX + dist;
  const cta = usePop(S.cta);
  const words = ["word…", "by…", "word."];

  return (
    <AbsoluteFill>
      <NightBg />
      <Track y={RAIL_Y} wireY={RAIL_Y - 230} />
      <Train coaches={COACHES} distance={dist} x={x} y={RAIL_Y} scale={SCALE} />
      <Speaker x={40} y={800} scale={0.7} ringsFrom={S.chime} ringsUntil={S.chime + 50} />

      <div style={{ position: "absolute", top: 300, left: 50, right: 50 }}>
        <PopLine start={S.words[0]} size={70} font={F.sans} weight={900} color={C.muted}>
          So those pauses?
        </PopLine>
        <PopLine start={S.words[1]} size={92} style={{ marginTop: 18 }}>
          That's a computer <Hi>building a sentence</Hi>
        </PopLine>
        <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 20 }}>
          {words.map((w, i) => (
            <PopLine key={i} start={S.words[2 + i]} size={120} from="scale">
              <Hi c={i === 1 ? C.teal : C.yellow}>{w}</Hi>
            </PopLine>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1530,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: cta,
          transform: `translateY(${(1 - cta) * 40}px)`,
        }}
      >
        <div
          style={{
            fontFamily: F.sans,
            fontWeight: 900,
            fontSize: 44,
            color: C.night,
            background: C.yellow,
            padding: "20px 40px",
            borderRadius: 999,
            boxShadow: `0 0 ${30 + 20 * Math.sin(frame / 5)}px ${C.yellow}88`,
          }}
        >
          Follow for more everyday mysteries
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 34, color: C.muted, marginTop: 20, opacity: interpolate(frame, [S.cta + 14, S.cta + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          Share with someone who hears this daily
        </div>
      </div>
    </AbsoluteFill>
  );
};
