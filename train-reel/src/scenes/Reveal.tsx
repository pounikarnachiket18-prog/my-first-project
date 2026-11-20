import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F, KIND_COLOR } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop, useT } from "../ui";

const S = T.reveal;

const Mic: React.FC = () => (
  <svg width={260} height={340} viewBox="0 0 260 340">
    <rect x={80} y={20} width={100} height={170} rx={50} fill="#C9D2EA" />
    {new Array(5).fill(0).map((_, i) => (
      <line key={i} x1={92} y1={60 + i * 24} x2={168} y2={60 + i * 24} stroke="#8E9AC0" strokeWidth={6} strokeLinecap="round" />
    ))}
    <path d="M50 140 Q50 250 130 250 Q210 250 210 140" fill="none" stroke="#C9D2EA" strokeWidth={14} strokeLinecap="round" />
    <rect x={122} y={250} width={16} height={50} fill="#C9D2EA" />
    <rect x={70} y={298} width={120} height={16} rx={8} fill="#C9D2EA" />
  </svg>
);

const Computer: React.FC<{ on: number }> = ({ on }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={330} height={300} viewBox="0 0 330 300">
      <rect x={20} y={10} width={290} height={200} rx={20} fill="#1C2A52" stroke="#4C64A8" strokeWidth={6} />
      <rect x={40} y={30} width={250} height={160} rx={10} fill="#07102A" />
      {/* stitched clip bars on screen */}
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          {[0, 1, 2].map((c) => {
            const k = Math.floor(random(`k${r}${c}`) * 3);
            const col = [C.teal, C.yellow, C.coral][k];
            const w = 40 + random(`w${r}${c}`) * 30;
            return <rect key={c} x={56 + c * 76} y={48 + r * 34} width={w * on} height={20} rx={6} fill={col} opacity={0.4 + 0.6 * ((frame / 6 + r + c) % 3 < 1 ? 1 : 0.5)} />;
          })}
        </g>
      ))}
      <rect x={140} y={210} width={50} height={40} fill="#2A3B6E" />
      <rect x={90} y={248} width={150} height={18} rx={9} fill="#2A3B6E" />
      <circle cx={290} cy={196} r={6} fill={frame % 20 < 10 ? C.teal : "#0F5"} />
    </svg>
  );
};

const CLIPS: { t: string; k: string }[] = [
  { t: "Yatrigan, kripya dhyan dein", k: "phrase" },
  { t: "Gaadi sankhya", k: "phrase" },
  { t: "platform sankhya", k: "phrase" },
  { t: "par aa rahi hai", k: "phrase" },
  { t: "der se chal rahi hai", k: "phrase" },
  { t: "Rajdhani Express", k: "name" },
  { t: "Howrah", k: "name" },
  { t: "Chennai", k: "name" },
  { t: "New Delhi", k: "name" },
  ...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => ({ t: d, k: "num" })),
];

const ClipTile: React.FC<{ t: string; k: string; i: number }> = ({ t, k, i }) => {
  const p = usePop(S.tilesStart + i * S.tileStep, 12, 200);
  const col = KIND_COLOR[k];
  const small = k === "num";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 18px",
        borderRadius: 16,
        background: `${col}1F`,
        border: `3px solid ${col}`,
        color: C.cream,
        fontFamily: F.sans,
        fontWeight: 700,
        fontSize: small ? 36 : 30,
        opacity: p,
        transform: `translateY(${(1 - p) * 120}px) scale(${0.5 + 0.5 * p})`,
      }}
    >
      <svg width={34} height={30}>
        {[0, 1, 2, 3, 4].map((b) => {
          const h = 8 + random(`${t}${b}`) * 22;
          return <rect key={b} x={b * 7} y={(30 - h) / 2} width={4} height={h} rx={2} fill={col} />;
        })}
      </svg>
      {t}
    </div>
  );
};

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const slash = useT(S.slash, 12);
  const toComp = useT(S.computer - 10, 18);
  const comp = usePop(S.computer);

  return (
    <AbsoluteFill>
      <NightBg glow="#22305E" />
      <Tag text="THE SECRET" />

      {/* Phase 1: mic + "nobody is speaking live" */}
      <div style={{ position: "absolute", top: 360, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - toComp, transform: `scale(${1 - 0.3 * toComp})` }}>
        <div style={{ position: "relative" }}>
          <Mic />
          <svg width={260} height={340} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={20} y1={20} x2={20 + 220 * slash} y2={20 + 300 * slash} stroke={C.red} strokeWidth={22} strokeLinecap="round" />
          </svg>
        </div>
        <PopLine start={6} size={110} style={{ marginTop: 40 }}>
          Nobody is <Hi c={C.red}>speaking live.</Hi>
        </PopLine>
      </div>

      {/* Phase 2: computer + clip library */}
      <div style={{ position: "absolute", top: 340, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: comp, transform: `translateY(${(1 - comp) * 80}px)` }}>
        <Computer on={comp} />
        <div style={{ fontFamily: F.sans, fontWeight: 700, color: C.muted, fontSize: 36, marginTop: 6 }}>Announcement computer</div>
      </div>

      <div style={{ position: "absolute", top: 720, left: 50, right: 50, display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
        {frame >= S.tilesStart - 2 && CLIPS.map((c, i) => <ClipTile key={i} t={c.t} k={c.k} i={i} />)}
      </div>

      <div style={{ position: "absolute", top: 1330, left: 50, right: 50 }}>
        <PopLine start={S.cap} size={88}>
          Just a library of <Hi>pre-recorded clips</Hi>
        </PopLine>
      </div>
      {/* legend */}
      <div style={{ position: "absolute", top: 1570, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 36, opacity: interpolate(frame, [S.cap + 10, S.cap + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {[
          ["phrases", C.teal],
          ["numbers", C.yellow],
          ["names", C.coral],
        ].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.cream }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: c }} />
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
