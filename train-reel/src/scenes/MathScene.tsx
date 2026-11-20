import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop, useT } from "../ui";

const S = T.math;

const LINES: [string, string, string][] = [
  ["", "13,000+", " trains every day"],
  ["×", "arriving / leaving", " / late / cancelled"],
  ["×", "platform", " 1, 2, 3…"],
  ["×", "every delay", " — 5 min to 5 hrs"],
  ["×", "3+ languages", " per station"],
];

const Line: React.FC<{ i: number }> = ({ i }) => {
  const p = usePop(S.lines[i]);
  const [op, hi, rest] = LINES[i];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        fontFamily: F.sans,
        fontWeight: 900,
        fontSize: 54,
        color: C.cream,
        opacity: p,
        transform: `translateX(${(1 - p) * -140}px)`,
      }}
    >
      <span style={{ width: 50, color: C.red, fontSize: 64 }}>{op}</span>
      <span>
        <Hi>{hi}</Hi>
        <span style={{ color: C.muted }}>{rest}</span>
      </span>
    </div>
  );
};

const Bar: React.FC<{ y: number; label: string; sub: string; w: number; color: string; start: number; cross?: boolean }> = ({ y, label, sub, w, color, start, cross }) => {
  const t = useT(start, 26);
  const p = usePop(start);
  const frame = useCurrentFrame();
  const xT = interpolate(frame, [start + 30, start + 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: y, left: 70, width: 940, opacity: p }}>
      <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 40, color: C.cream, marginBottom: 12 }}>
        {label} <span style={{ color, fontSize: 34 }}>{sub}</span>
      </div>
      <div style={{ position: "relative", height: 56 }}>
        <div style={{ position: "absolute", height: 56, width: w * t, borderRadius: 14, background: color, boxShadow: `0 0 40px ${color}77` }} />
        {cross && (
          <div style={{ position: "absolute", top: 24, height: 10, left: -10, width: (w + 20) * xT, background: C.cream, borderRadius: 5, transform: "rotate(-2deg)" }} />
        )}
      </div>
    </div>
  );
};

export const MathScene: React.FC = () => {
  const frame = useCurrentFrame();
  const eq = usePop(S.equals);
  const ct = interpolate(frame, S.counter, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const n = Math.floor(Math.pow(ct, 3) * 9_800_000 + ct * 1000);
  const done = frame >= S.counter[1];
  const boom = usePop(S.counter[1], 8, 260);
  const shake = done ? Math.sin(frame * 3) * 10 * Math.max(0, 1 - (frame - S.counter[1]) / 10) : 0;

  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <NightBg glow="#2A1E4E" />
      <Tag text="WHY NOT RECORD FULL SENTENCES?" color={C.coral} />
      <div style={{ position: "absolute", top: 370, left: 90, display: "flex", flexDirection: "column", gap: 16 }}>
        {LINES.map((_, i) => (
          <Line key={i} i={i} />
        ))}
      </div>

      <div style={{ position: "absolute", top: 880, left: 0, right: 0, textAlign: "center", opacity: eq }}>
        <div style={{ fontFamily: F.display, fontSize: done ? 140 * (0.8 + 0.2 * boom) : 120, color: done ? C.red : C.cream, textShadow: done ? `0 0 50px ${C.red}` : "none", lineHeight: 1 }}>
          = {done ? "MILLIONS" : n.toLocaleString("en-IN")}
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: C.muted, marginTop: 10 }}>of possible sentences</div>
      </div>

      <Bar y={1160} label="Record every sentence" sub="— impossible" w={940} color={C.red} start={S.vs} cross />
      <Bar y={1310} label="Record the pieces" sub="— a few thousand clips" w={170} color={C.teal} start={S.vs + 18} />

      <div style={{ position: "absolute", top: 1480, left: 60, right: 60 }}>
        <PopLine start={S.vs + 40} size={70}>
          Record once. <Hi c={C.teal}>Reuse forever.</Hi>
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
