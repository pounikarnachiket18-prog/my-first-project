import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F, KIND_COLOR } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop } from "../ui";

const S = T.stitch;

export const playSchedule = () => {
  let t = S.playStart;
  return S.blocks.map((b) => {
    const from = t;
    t += b.play;
    const gapFrom = t;
    t += S.gap;
    return { from, to: gapFrom, gapTo: t };
  });
};
const SCHED = playSchedule();

const Block: React.FC<{ i: number }> = ({ i }) => {
  const frame = useCurrentFrame();
  const b = S.blocks[i];
  const start = S.blocksStart + i * S.blockStep;
  const p = usePop(start, 12, 210);
  const col = KIND_COLOR[b.kind];
  const sc = SCHED[i];
  const playing = frame >= sc.from && frame < sc.to;
  const played = frame >= sc.to;
  const flyY = (1 - p) * 700;
  const flyX = (1 - p) * (random(`bx${i}`) - 0.5) * 600;
  return (
    <div
      style={{
        padding: "16px 24px",
        borderRadius: 18,
        background: playing ? col : `${col}26`,
        border: `4px solid ${col}`,
        color: playing ? C.night : C.cream,
        fontFamily: F.sans,
        fontWeight: 900,
        fontSize: b.kind === "num" ? 52 : 40,
        lineHeight: 1.1,
        opacity: p * (played && !playing ? 0.75 : 1),
        transform: `translate(${flyX}px, ${flyY}px) scale(${playing ? 1.1 : 1}) rotate(${(1 - p) * 20}deg)`,
        boxShadow: playing ? `0 0 50px ${col}` : "none",
      }}
    >
      {b.text}
    </div>
  );
};

const Joint: React.FC<{ i: number }> = ({ i }) => {
  const frame = useCurrentFrame();
  const start = S.blocksStart + (i + 1) * S.blockStep;
  const p = usePop(start + 3);
  const sc = SCHED[i];
  const active = frame >= sc.to && frame < sc.gapTo;
  return (
    <div style={{ display: "flex", alignItems: "center", opacity: p, transform: `scale(${active ? 1.6 : 1})` }}>
      <svg width={26} height={70}>
        <line x1={7} y1={8} x2={7} y2={62} stroke={active ? C.red : `${C.red}99`} strokeWidth={5} strokeLinecap="round" />
        <line x1={19} y1={8} x2={19} y2={62} stroke={active ? C.red : `${C.red}99`} strokeWidth={5} strokeLinecap="round" />
      </svg>
    </div>
  );
};

/** Horizontal "audio timeline" with playhead. */
const Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const total = SCHED[SCHED.length - 1].gapTo - S.playStart;
  const W = 960;
  const show = usePop(S.playStart - 14);
  const head = interpolate(frame, [S.playStart, S.playStart + total], [0, W], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 1240, left: 60, opacity: show, transform: `translateY(${(1 - show) * 40}px)` }}>
      <svg width={W} height={170} style={{ overflow: "visible" }}>
        <rect x={0} y={20} width={W} height={110} rx={14} fill="#0A1230" stroke="#2A3F78" strokeWidth={3} />
        {SCHED.map((sc, i) => {
          const b = S.blocks[i];
          const x1 = ((sc.from - S.playStart) / total) * W;
          const x2 = ((sc.to - S.playStart) / total) * W;
          const g2 = ((sc.gapTo - S.playStart) / total) * W;
          const col = KIND_COLOR[b.kind];
          const bars = Math.max(2, Math.round((x2 - x1) / 9));
          return (
            <g key={i}>
              {new Array(bars).fill(0).map((_, k) => {
                const env = Math.sin(Math.PI * ((k + 0.5) / bars)) ** 0.5;
                const h = 12 + env * 80 * (0.4 + 0.6 * random(`tb${i}${k}`));
                const bx = x1 + ((x2 - x1) * (k + 0.5)) / bars;
                return <rect key={k} x={bx - 2.5} y={75 - h / 2} width={5} height={h} rx={2.5} fill={col} opacity={bx < head ? 1 : 0.35} />;
              })}
              {i < SCHED.length - 1 && (
                <rect x={x2 + 1} y={26} width={Math.max(2, g2 - x2 - 2)} height={98} fill={C.red} opacity={head > x2 && head < g2 ? 0.75 : 0.22} />
              )}
            </g>
          );
        })}
        <line x1={head} y1={6} x2={head} y2={144} stroke="#fff" strokeWidth={4} />
        <circle cx={head} cy={6} r={9} fill="#fff" />
        <text x={0} y={168} fill={C.muted} fontFamily="Inter" fontWeight={700} fontSize={26}>
          ▶ what you hear
        </text>
        <text x={W} y={168} fill={C.red} fontFamily="Inter" fontWeight={900} fontSize={26} textAnchor="end">
          ■ = silence between clips
        </text>
      </svg>
    </div>
  );
};

export const Stitch: React.FC = () => {
  return (
    <AbsoluteFill>
      <NightBg glow="#1A2D5E" />
      <Tag text="HOW IT'S BUILT" />
      <div style={{ position: "absolute", top: 350, left: 60, right: 60 }}>
        <PopLine start={6} size={80}>
          The computer <Hi>stitches</Hi> clips into a sentence
        </PopLine>
      </div>
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 50,
          right: 50,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          rowGap: 22,
          columnGap: 6,
        }}
      >
        {S.blocks.map((_, i) => (
          <React.Fragment key={i}>
            <Block i={i} />
            {i < S.blocks.length - 1 && <Joint i={i} />}
          </React.Fragment>
        ))}
      </div>
      <Timeline />
      <div style={{ position: "absolute", top: 1470, left: 60, right: 60 }}>
        <PopLine start={S.cap + 40} size={58} font={F.sans} weight={900}>
          Every <Hi c={C.red}>gap</Hi> = a joint between two recordings
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
