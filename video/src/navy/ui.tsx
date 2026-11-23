import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "./world";
import { clamp01, lerp } from "./engine";
import timeline from "./timeline.json";

// ---------------- 2D waving Indian flag ----------------
export const IndianFlag: React.FC<{ x: number; y: number; w: number; t: number; amp?: number; pole?: boolean }> = ({ x, y, w, t, amp = 1, pole = true }) => {
  const h = (w * 2) / 3, N = 24;
  const off = (u: number) => Math.sin(u * 7 - t * 0.18) * h * 0.06 * u * amp;
  const band = (v0: number, v1: number) => {
    const top = Array.from({ length: N + 1 }, (_, i) => { const u = i / N; return `${x + u * w},${y + v0 * h + off(u)}`; });
    const bot = Array.from({ length: N + 1 }, (_, i) => { const u = 1 - i / N; return `${x + u * w},${y + v1 * h + off(u)}`; });
    return [...top, ...bot].join(" ");
  };
  const shade = Array.from({ length: N }, (_, i) => {
    const u = (i + 0.5) / N;
    const d = Math.cos(u * 7 - t * 0.18) * amp * u;
    return { x: x + (i / N) * w, o: d * 0.16 };
  });
  const cx = x + w / 2, cy = y + h / 2 + off(0.5), r = h * 0.15;
  return (
    <g>
      {pole && <rect x={x - w * 0.035} y={y - h * 0.15} width={w * 0.03} height={h * 2.4} rx={w * 0.015} fill="#cfd6e0" />}
      {pole && <circle cx={x - w * 0.02} cy={y - h * 0.15} r={w * 0.025} fill="#e2b84b" />}
      <polygon points={band(0, 1 / 3)} fill={C.saffron} />
      <polygon points={band(1 / 3, 2 / 3)} fill="#ffffff" />
      <polygon points={band(2 / 3, 1)} fill={C.green} />
      <g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.navy} strokeWidth={r * 0.12} />
        <circle cx={cx} cy={cy} r={r * 0.16} fill={C.navy} />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={C.navy} strokeWidth={r * 0.05} />;
        })}
      </g>
      {shade.map((s, i) => (
        <rect key={i} x={s.x} y={y + off((i + 0.5) / N) - 1} width={w / N + 0.6} height={h + 2} fill={s.o > 0 ? "#fff" : "#000"} opacity={Math.abs(s.o)} />
      ))}
    </g>
  );
};

// ---------------- HUD ----------------
const SECTIONS = [
  { label: "TAKE-OFF", color: C.cyan, scenes: ["hook"], dash: 0 },
  { label: "TAKE-OFF", color: C.cyan, scenes: ["imagine", "runway", "skijump", "compare"], dash: 1 },
  { label: "LANDING", color: C.orange, scenes: ["landing"], dash: 2 },
  { label: "TWIST", color: C.cyan, scenes: ["twist"], dash: 3 },
  { label: "BACKUP", color: "#e9eef5", scenes: ["backup"], dash: 4 },
];

const ShipIcon: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => (
  <g transform={`translate(${x},${y})`}>
    {/* side profile of a ski-jump carrier */}
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

export const HUD: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const sc = timeline.scenes.find((s) => t >= s.start && t < s.end) ?? timeline.scenes[timeline.scenes.length - 1];
  const sec = SECTIONS.find((s) => s.scenes.includes(sc.id))!;
  const p = clamp01(t / timeline.duration);
  const intro = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = 250;
  return (
    <g opacity={intro}>
      <rect x={48} y={y} width={984} height={84} rx={14} fill="rgba(13,19,29,0.86)" stroke="rgba(255,255,255,0.07)" />
      <ShipIcon x={76} y={y + 30} p={p} />
      <text x={262} y={y + 52} fill={sec.color} fontFamily="Inter" fontWeight={700} fontSize={27} letterSpacing={4}>{sec.label}</text>
      <IndianFlag x={448} y={y + 27} w={44} t={f} amp={0.6} pole={false} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={790 + i * 46} y={y + 40} width={36} height={4} rx={2}
          fill={i === sec.dash ? sec.color : i < sec.dash ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)"} />
      ))}
    </g>
  );
};

// ---------------- Captions (Hinglish, word highlight) ----------------
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const chunk = timeline.captions.find((c) => t >= c.t0 - 0.05 && t < c.t1);
  if (!chunk) return null;
  const chars = chunk.words.reduce((a, w) => a + w.text.length + 1, 0);
  const fs = Math.min(54, Math.floor(880 / (chars * 0.56)));
  const appear = clamp01((t - chunk.t0 + 0.05) / 0.12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1440, display: "flex", justifyContent: "center", opacity: appear, transform: `translateY(${(1 - appear) * 10}px)` }}>
      <div style={{ display: "flex", gap: fs * 0.3, padding: `${fs * 0.28}px ${fs * 0.5}px ${fs * 0.36}px`, borderRadius: 12, background: "rgba(9,14,22,0.78)", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "Inter", fontWeight: 700, fontSize: fs, lineHeight: 1.15, whiteSpace: "nowrap" }}>
        {chunk.words.map((w, i) => {
          const active = t >= w.t0 && t < w.t1;
          const done = t >= w.t1;
          const k = active ? clamp01((t - w.t0) / Math.max(0.05, w.t1 - w.t0)) : 0;
          return (
            <span key={i} style={{ position: "relative", color: active ? C.cyan : done ? "#fff" : "rgba(255,255,255,0.42)", paddingBottom: 8, backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.25) 60%, transparent 0)", backgroundSize: "16px 3px", backgroundRepeat: "repeat-x", backgroundPosition: "0 100%" }}>
              {w.text}
              {active && <span style={{ position: "absolute", left: 0, bottom: -1, height: 5, borderRadius: 3, width: `${lerp(30, 100, k)}%`, background: C.cyan }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------- Side-view illustration cards ----------------
const TejasSide: React.FC<{ x: number; y: number; s: number; rot?: number; burner?: number; hook?: number; t: number }> = ({ x, y, s, rot = 0, burner = 0, hook = 0, t }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    {burner > 0 && (
      <g filter="url(#glow)">
        <path d={`M-2 -1 L${-14 - burner * 26 * (0.85 + 0.15 * Math.sin(t))} 0 L-2 3 Z`} fill={C.cyan} opacity={0.9} />
        <path d={`M-2 0 L${-6 - burner * 10} 1 L-2 2 Z`} fill="#fff" />
      </g>
    )}
    {hook > 0 && <line x1={14} y1={4} x2={14 - 12 * hook} y2={4 + 10 * hook} stroke={C.orange} strokeWidth={1.6} />}
    <path d="M100 1 L90 -1.5 L80 -4.5 L70 -6 L60 -4 L30 -4 L20 -4 L8 -24 L2 -24 L0 -4 L-2 -2 L-2 3 L20 4.5 L58 4.5 L66 6.5 L84 3.5 Z" fill={C.jet} />
    <path d="M30 2 L62 2 L52 6 L26 6 Z" fill={C.jetDark} />
    <path d="M78 -4.4 L70 -6 L62 -4.2 Z" fill="#2a3a4f" />
    <line x1={30} y1={4.5} x2={30} y2={9} stroke="#6b7789" strokeWidth={1.2} />
    <line x1={74} y1={4.2} x2={74} y2={9} stroke="#6b7789" strokeWidth={1.2} />
    <circle cx={40} cy={-1} r={2.2} fill={C.saffron} /><circle cx={40} cy={-1} r={1.4} fill="#fff" /><circle cx={40} cy={-1} r={0.6} fill={C.green} />
  </g>
);

export const SideCard: React.FC<{ kind: "catapult" | "skijump" | "hook" | "burner"; x: number; y: number; w: number; h: number; p: number; t: number; opacity?: number; caption?: string }> = ({ kind, x, y, w, h, p, t, opacity = 1, caption }) => {
  const id = `clip-${kind}-${x}-${y}`;
  const sea = h * 0.78;
  const deckY = h * 0.62;
  let jet: React.ReactNode = null;
  let deck: React.ReactNode = null;
  let extra: React.ReactNode = null;
  const s = w / 340;
  if (kind === "skijump") {
    const rampX = w * 0.58, endX = w * 0.74, rampH = h * 0.1;
    deck = <path d={`M-10 ${deckY} L${rampX} ${deckY} Q${endX - 10} ${deckY} ${endX} ${deckY - rampH} L${endX} ${sea} L-10 ${sea} Z`} fill="#4a5567" />;
    // trajectory
    const traj = (u: number): [number, number, number] => {
      if (u < 0.55) { const k = Math.pow(u / 0.55, 2); return [w * 0.08 + k * (rampX - w * 0.08), deckY - 3 * s, 0]; }
      if (u < 0.7) { const k = (u - 0.55) / 0.15; const xx = lerp(rampX, endX, k); return [xx, deckY - rampH * k * k - 3 * s, -14 * k]; }
      const k = (u - 0.7) / 0.3; return [lerp(endX, w * 1.05, k), deckY - rampH - 3 * s - (h * 0.42) * (k * 0.8 + 0.2 * k * k) * 1, -14 - 6 * k];
    };
    const pts = Array.from({ length: 40 }, (_, i) => traj((i / 39) * p));
    extra = <polyline points={pts.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="6 5" opacity={0.85} />;
    const [jx, jy, r] = traj(p);
    jet = <TejasSide x={jx - 50 * s * 0.85} y={jy - 6 * s} s={s * 0.85} rot={r} burner={1} t={t} />;
  } else if (kind === "catapult") {
    deck = <rect x={-10} y={deckY} width={w * 0.8} height={sea - deckY} fill="#4a5567" />;
    const u = Math.pow(Math.min(1, p / 0.6), 2);
    const jx = lerp(w * 0.06, w * 0.7, u) + (p > 0.6 ? (p - 0.6) * w * 1.2 : 0);
    const jy = deckY - 4 * s - (p > 0.6 ? (p - 0.6) * h * 0.6 : 0);
    extra = (
      <g>
        <line x1={w * 0.06} y1={deckY + 2} x2={w * 0.72} y2={deckY + 2} stroke={C.cyan} strokeWidth={3} opacity={0.8} filter="url(#glow)" />
        {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={w * 0.08 + i * 14 * s} cy={deckY - 8 - i * 3} r={(8 + i * 3) * s * Math.min(1, p * 3)} fill="#dfe7ef" opacity={0.25 * (1 - p)} />)}
      </g>
    );
    jet = <TejasSide x={jx - 60 * s} y={jy - 4 * s} s={s * 0.85} rot={p > 0.6 ? -8 : 0} t={t} />;
  } else if (kind === "hook") {
    deck = <rect x={-10} y={deckY} width={w + 20} height={sea - deckY} fill="#4a5567" />;
    const wires = [0.42, 0.52, 0.62].map((u) => w * u);
    const u = Math.min(1, p / 0.7);
    const jx = lerp(-w * 0.1, w * 0.52, u) - (p > 0.7 ? 0 : 0);
    const jy = lerp(h * 0.15, deckY - 4 * s, Math.min(1, u * 1.05));
    const caught = p > 0.7;
    extra = (
      <g>
        {wires.map((wx, i) => <circle key={i} cx={wx} cy={deckY} r={4} fill={caught && i === 1 ? C.orange : "#e8edf3"} />)}
        {caught && <path d={`M${wires[0] - 20} ${deckY} L${jx + 4 * s} ${deckY + 1} L${wires[2] + 20} ${deckY}`} stroke={C.orange} strokeWidth={2.5} fill="none" filter="url(#glow)" />}
      </g>
    );
    jet = <TejasSide x={jx - 20 * s} y={jy - 4 * s} s={s * 0.85} rot={caught ? 0 : 4} hook={1} t={t} />;
  } else {
    deck = <rect x={-10} y={deckY} width={w + 20} height={sea - deckY} fill="#4a5567" />;
    jet = <TejasSide x={w * 0.36} y={deckY - 8 * s} s={s * 0.9} burner={p} t={t * 0.9} />;
    extra = Array.from({ length: 5 }, (_, i) => (
      <path key={i} d={`M${w * 0.4 - 10 - i * 18} ${deckY - 14 + Math.sin(t * 0.4 + i) * 4} q -8 -6 -16 0`} stroke="rgba(56,198,255,0.4)" fill="none" strokeWidth={2} opacity={p} />
    ));
  }
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <clipPath id={id}><rect width={w} height={h} rx={12} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width={w} height={h} fill="#162233" />
        <rect width={w} height={sea} fill="url(#sky)" />
        <rect y={sea} width={w} height={h - sea} fill="#0d2234" />
        {Array.from({ length: 5 }, (_, i) => <line key={i} x1={((i * 97 + t * 2) % (w + 60)) - 30} y1={sea + 10 + i * 6} x2={((i * 97 + t * 2) % (w + 60)) + 10} y2={sea + 10 + i * 6} stroke="rgba(150,190,220,0.25)" strokeWidth={2} />)}
        {deck}
        {extra}
        {jet}
      </g>
      <rect width={w} height={h} rx={12} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
      {caption && <text x={w - 4} y={h + 30} textAnchor="end" fill="rgba(255,255,255,0.55)" fontFamily="JetBrains Mono" fontSize={20}>{caption}</text>}
    </g>
  );
};

export const SkyDef: React.FC = () => (
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1f3550" />
      <stop offset="1" stopColor="#3b5878" />
    </linearGradient>
  </defs>
);

// ---------------- Timer box ("lagbhag 2 s") ----------------
export const Timer: React.FC<{ x: number; y: number; p: number; show: number; color?: string }> = ({ x, y, p, show, color = C.orange }) => (
  <g transform={`translate(${x},${y})`} opacity={show}>
    <rect x={0} y={0} width={300} height={84} rx={10} fill="rgba(9,14,22,0.88)" stroke="rgba(255,255,255,0.08)" />
    <rect x={14} y={10} width={272} height={4} rx={2} fill="rgba(255,255,255,0.12)" />
    <rect x={14} y={10} width={272 * p} height={4} rx={2} fill={color} />
    <text x={150} y={62} textAnchor="middle" fill={p >= 1 ? "#fff" : "rgba(255,255,255,0.6)"} fontFamily="JetBrains Mono" fontSize={36} fontWeight={600}>
      lagbhag {(2 * p).toFixed(1)} s
    </text>
  </g>
);
