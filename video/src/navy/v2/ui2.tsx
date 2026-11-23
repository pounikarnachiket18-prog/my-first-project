import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "../world";
import { clamp01, lerp } from "../engine";
import { IndianFlag } from "../ui";
import timeline from "./timeline.json";

const SECTIONS = [
  { label: "TAKE-OFF", color: C.cyan, scenes: ["hook", "imagine", "runway", "skijump", "catapult"], dash: 0 },
  { label: "LANDING", color: C.orange, scenes: ["landing"], dash: 1 },
  { label: "TWIST", color: C.cyan, scenes: ["twist"], dash: 2 },
  { label: "BACKUP", color: "#e9eef5", scenes: ["backup"], dash: 3 },
  { label: "INS VIKRANT", color: "#e9eef5", scenes: ["finale"], dash: 4 },
];

const ShipIcon: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M0 18 L6 30 L132 30 L150 10 L152 6 L138 12 L8 14 Z" fill="#3c4859" />
    <path d="M6 14 L138 12 L152 6" stroke="#6f7d91" strokeWidth={2} fill="none" />
    <rect x={88} y={2} width={16} height={11} fill="#566377" />
    <rect x={92} y={-6} width={7} height={8} fill="#566377" />
    <line x1={96} y1={-6} x2={96} y2={-16} stroke="#aab4c2" strokeWidth={1.5} />
    <rect x={96.5} y={-16} width={10} height={2.3} fill={C.saffron} />
    <rect x={96.5} y={-13.7} width={10} height={2.3} fill="#fff" />
    <rect x={96.5} y={-11.4} width={10} height={2.3} fill={C.green} />
    <line x1={10} y1={22} x2={10 + 130 * p} y2={22} stroke={C.cyan} strokeWidth={3} strokeLinecap="round" />
  </g>
);

/** top bar; hidden during the cold open */
export const HUD2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const sc = timeline.scenes.find((s) => t >= s.start && t < s.end) ?? timeline.scenes[timeline.scenes.length - 1];
  const sec = SECTIONS.find((s) => s.scenes.includes(sc.id));
  const coldEnd = Math.round(timeline.scenes[0].end * fps);
  const intro = interpolate(f, [coldEnd, coldEnd + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(t, [timeline.lines[timeline.lines.length - 1].t0 - 0.2, timeline.lines[timeline.lines.length - 1].t0 + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (!sec || intro * outro <= 0) return null;
  const p = clamp01(t / timeline.duration);
  const y = 236;
  return (
    <g opacity={intro * outro}>
      <rect x={48} y={y} width={984} height={80} rx={14} fill="rgba(10,15,23,0.72)" stroke="rgba(255,255,255,0.07)" />
      <ShipIcon x={76} y={y + 28} p={p} />
      <text x={262} y={y + 50} fill={sec.color} fontFamily="Inter" fontWeight={700} fontSize={26} letterSpacing={4}>{sec.label}</text>
      <IndianFlag x={262 + sec.label.length * 22 + 22} y={y + 26} w={42} t={f} amp={0.6} pole={false} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={790 + i * 46} y={y + 38} width={36} height={4} rx={2}
          fill={i === sec.dash ? sec.color : i < sec.dash ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)"} />
      ))}
    </g>
  );
};

// words that stay accented after they are spoken
const KEY = /^(vikrant|tejas|ski-jump|hook|catapult|runway|second|full|power|controlled|crash|nausena|bharat|taaqat|taar|taaron|steel|block|ramp|landing|twist)/i;

/** Hinglish captions: chunk pops in, active word cyan + springs, key words keep an accent. Inside the Instagram safe area. */
export const Captions2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const chunk = timeline.captions.find((c) => t >= c.t0 - 0.05 && t < c.t1);
  if (!chunk) return null;
  const chars = chunk.words.reduce((a, w) => a + w.text.length + 1, 0);
  const fs = Math.min(56, Math.floor(800 / (chars * 0.56)));
  const k = clamp01((t - chunk.t0 + 0.05) / 0.16);
  const pop = 1 - Math.pow(1 - k, 3);
  return (
    <div style={{ position: "absolute", left: 60, width: 920, top: 1300, display: "flex", justifyContent: "center", opacity: pop, transform: `translateY(${(1 - pop) * 14}px) scale(${lerp(0.9, 1, pop)})` }}>
      <div style={{ display: "flex", gap: fs * 0.28, padding: `${fs * 0.26}px ${fs * 0.48}px ${fs * 0.34}px`, borderRadius: 14, background: "rgba(7,11,18,0.72)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)", fontFamily: "Inter", fontWeight: 700, fontSize: fs, lineHeight: 1.15, whiteSpace: "nowrap" }}>
        {chunk.words.map((w, i) => {
          const active = t >= w.t0 && t < w.t1;
          const done = t >= w.t1;
          const key = KEY.test(w.text);
          const wk = active ? clamp01((t - w.t0) / Math.max(0.05, w.t1 - w.t0)) : 0;
          const spring = active ? 1 + 0.1 * Math.sin(clamp01((t - w.t0) / 0.18) * Math.PI) : 1;
          const color = active ? C.cyan : done ? (key ? "#9fe2ff" : "#ffffff") : "rgba(255,255,255,0.40)";
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", color, transform: `scale(${spring})`, paddingBottom: 8, backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.22) 60%, transparent 0)", backgroundSize: "16px 3px", backgroundRepeat: "repeat-x", backgroundPosition: "0 100%" }}>
              {w.text}
              {active && <span style={{ position: "absolute", left: 0, bottom: -1, height: 5, borderRadius: 3, width: `${lerp(30, 100, wk)}%`, background: C.cyan, boxShadow: `0 0 12px ${C.cyan}` }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
};
