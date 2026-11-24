import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const UI = "Montserrat, sans-serif";
const FUN = "'Baloo 2', Montserrat, sans-serif";
const SAFFRON = "#FF9933";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ------------------------------------------------------------------ VO captions (karaoke, word pop)
export type VOPhrase = { from: number; to: number; text: string; hl?: string[] };

export const VOCaptions: React.FC<{ phrases: VOPhrase[] }> = ({ phrases }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = phrases.find((x) => frame >= x.from - 2 && frame < x.to + 6);
  if (!p) return null;
  const words = p.text.split(" ");
  const weights = words.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, "").length + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const span = (p.to - p.from) * 0.96;
  let acc = 0;
  const starts = weights.map((w) => {
    const s = p.from + (span * acc) / total;
    acc += w;
    return s;
  });
  const boxIn = spring({ frame: frame - p.from + 2, fps, config: { damping: 18, stiffness: 220 } });
  const out = interpolate(frame, [p.to + 1, p.to + 6], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 1420, left: 60, right: 60, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          transform: `translateY(${(1 - boxIn) * 30}px) scale(${0.94 + 0.06 * boxIn})`,
          background: "rgba(14,16,26,0.86)",
          borderRadius: 18,
          padding: "16px 26px 18px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 14px",
          maxWidth: 960,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        {words.map((w, i) => {
          const st = starts[i];
          const end = i + 1 < starts.length ? starts[i + 1] : p.to;
          const lit = frame >= st;
          const cur = frame >= st && frame < end + 2;
          const pop = spring({ frame: frame - st, fps, config: { damping: 11, stiffness: 260 } });
          const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
          const hl = p.hl?.some((h) => h.toLowerCase() === clean.toLowerCase());
          return (
            <span
              key={i}
              style={{
                fontFamily: UI,
                fontWeight: 900,
                fontSize: 54,
                lineHeight: 1.12,
                color: !lit ? "rgba(255,255,255,0.35)" : cur && hl ? "#111" : hl ? SAFFRON : "#FFF",
                background: cur && hl ? SAFFRON : "transparent",
                borderRadius: 8,
                padding: "0 6px",
                transform: `scale(${lit ? 0.85 + 0.15 * pop + (cur ? 0.06 : 0) : 0.92})`,
                display: "inline-block",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ stamp: slams in, shakes, flies out
export const Stamp: React.FC<{
  at: number;
  dur?: number;
  text: string;
  sub?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  ink?: string;
  rot?: number;
  burst?: boolean;
}> = ({ at, dur = 34, text, sub, x = 540, y = 640, size = 118, color = "#FFD400", ink = "#111", rot = -6, burst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - at;
  if (l < 0 || l > dur) return null;
  const s = spring({ frame: l, fps, config: { damping: 9, stiffness: 300, mass: 0.7 } });
  const scale = Math.max(0.88, 1 + (1 - s) * 1.6); // slam from 2.6x, small bounce, never collapses
  const o = interpolate(l, [0, 2, dur - 6, dur], [0, 1, 1, 0], clamp);
  const flyOut = interpolate(l, [dur - 6, dur], [0, -60], clamp);
  const shake = l < 10 ? Math.sin(l * 3.3) * (10 - l) * 0.8 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + flyOut,
        transform: `translate(-50%,-50%) translateX(${shake}px) rotate(${rot}deg) scale(${scale})`,
        opacity: o,
        textAlign: "center",
      }}
    >
      {burst && (
        <svg width={size * 7} height={size * 4} viewBox="-350 -200 700 400" style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) rotate(${l * 2}deg)`, zIndex: -1 }}>
          <polygon
            points={Array.from({ length: 28 }, (_, i) => {
              const a = (i / 28) * Math.PI * 2;
              const r = i % 2 ? 0.62 : 1;
              return `${Math.cos(a) * 330 * r},${Math.sin(a) * 190 * r}`;
            }).join(" ")}
            fill={SAFFRON}
            stroke="#111"
            strokeWidth={8}
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div
        style={{
          fontFamily: FUN,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 0.95,
          color,
          WebkitTextStroke: `${Math.round(size / 11)}px ${ink}`,
          paintOrder: "stroke fill",
          textShadow: `0 ${size / 12}px 0 ${ink}`,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
      {sub && (
        <div style={{ marginTop: 10, display: "inline-block", background: ink, color: "#FFF", fontFamily: UI, fontWeight: 900, fontSize: size * 0.28, letterSpacing: 4, padding: "6px 16px", borderRadius: 6 }}>{sub}</div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ icon pop with ring ripple
const PhoneIcon: React.FC<{ t: number }> = ({ t }) => (
  <svg width={200} height={260} viewBox="0 0 200 260">
    <rect x={30} y={10} width={140} height={240} rx={26} fill="#111" stroke="#FFF" strokeWidth={8} />
    <rect x={44} y={34} width={112} height={190} rx={10} fill="#5AB8FF" />
    {/* eyes = "watching" */}
    {[78, 122].map((cx) => (
      <g key={cx}>
        <ellipse cx={cx} cy={118} rx={20} ry={24} fill="#FFF" />
        <circle cx={cx + Math.sin(t / 6) * 7} cy={122} r={10} fill="#111" />
      </g>
    ))}
    <path d="M 76 176 Q 100 192 124 176" stroke="#111" strokeWidth={7} fill="none" strokeLinecap="round" />
  </svg>
);

const PinIcon: React.FC = () => (
  <svg width={170} height={230} viewBox="0 0 170 230">
    <path d="M 85 220 C 60 170 10 130 10 80 A 75 75 0 0 1 160 80 C 160 130 110 170 85 220 Z" fill="#FF3B30" stroke="#FFF" strokeWidth={8} />
    <circle cx={85} cy={80} r={28} fill="#FFF" />
  </svg>
);

const ChaiIcon: React.FC<{ t: number }> = ({ t }) => (
  <svg width={220} height={250} viewBox="0 0 220 250">
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M ${80 + i * 30} 90 q ${Math.sin(t / 5 + i) * 14} -25 0 -45 q ${-Math.sin(t / 5 + i) * 14} -20 0 -40`}
        stroke="#FFF"
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />
    ))}
    <path d="M 40 100 L 180 100 L 162 232 L 58 232 Z" fill="#F4F1EA" stroke="#111" strokeWidth={8} strokeLinejoin="round" />
    <rect x={48} y={110} width={124} height={44} fill="#B5651D" />
    <text x={110} y={208} fontFamily={FUN} fontWeight={800} fontSize={40} textAnchor="middle" fill="#111">
      चाय
    </text>
  </svg>
);

const RadarIcon: React.FC<{ t: number }> = ({ t }) => (
  <svg width={260} height={260} viewBox="-130 -130 260 260">
    {[0, 1, 2].map((i) => {
      const p = ((t / 30 + i / 3) % 1);
      return <circle key={i} r={30 + p * 95} fill="none" stroke="#3DDC97" strokeWidth={8} opacity={1 - p} />;
    })}
    <circle r={34} fill="#3DDC97" stroke="#111" strokeWidth={6} />
    <text y={12} fontFamily={UI} fontWeight={900} fontSize={34} textAnchor="middle" fill="#111">
      YOU
    </text>
  </svg>
);

export const IconPop: React.FC<{ at: number; dur?: number; kind: "phone" | "pin" | "chai" | "radar"; x: number; y: number; label?: string; labelColor?: string }> = ({
  at,
  dur = 60,
  kind,
  x,
  y,
  label,
  labelColor = SAFFRON,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - at;
  if (l < 0 || l > dur) return null;
  const s = spring({ frame: l, fps, config: { damping: 10, stiffness: 200 } });
  const o = interpolate(l, [dur - 8, dur], [1, 0], clamp);
  const bob = Math.sin(l / 6) * 6;
  const ring = (l % 24) / 24;
  return (
    <div style={{ position: "absolute", left: x, top: y + bob, transform: `translate(-50%,-50%) scale(${s})`, opacity: o, textAlign: "center" }}>
      <div style={{ position: "absolute", left: "50%", top: "45%", width: 260, height: 260, marginLeft: -130, marginTop: -130, borderRadius: "50%", border: `6px solid rgba(255,255,255,${0.7 * (1 - ring)})`, transform: `scale(${0.6 + ring * 0.9})` }} />
      {kind === "phone" && <PhoneIcon t={l} />}
      {kind === "pin" && <PinIcon />}
      {kind === "chai" && <ChaiIcon t={l} />}
      {kind === "radar" && <RadarIcon t={l} />}
      {label && (
        <div style={{ marginTop: 8, display: "inline-block", background: "#111", color: labelColor, fontFamily: UI, fontWeight: 900, fontSize: 34, letterSpacing: 3, padding: "8px 18px", borderRadius: 10, border: "3px solid #FFF" }}>{label}</div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ pills that slide in from the side
export const SlidePill: React.FC<{ at: number; dur?: number; text: string; y: number; from?: "left" | "right"; color?: string; icon?: string }> = ({
  at,
  dur = 70,
  text,
  y,
  from = "left",
  color = "#5AB8FF",
  icon,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - at;
  if (l < 0 || l > dur) return null;
  const s = spring({ frame: l, fps, config: { damping: 14, stiffness: 180 } });
  const o = interpolate(l, [dur - 6, dur], [1, 0], clamp);
  const dx = (1 - s) * (from === "left" ? -700 : 700);
  return (
    <div style={{ position: "absolute", top: y, width: "100%", display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ transform: `translateX(${dx}px)`, display: "flex", alignItems: "center", gap: 14, background: "rgba(14,16,26,0.9)", border: `4px solid ${color}`, borderRadius: 50, padding: "14px 30px", fontFamily: UI, fontWeight: 900, fontSize: 46, color: "#FFF" }}>
        {icon && <span style={{ width: 22, height: 22, borderRadius: 11, background: color, display: "inline-block" }} />}
        {text}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ counter that ticks up
export const Counter: React.FC<{ at: number; dur?: number; fromN: number; toN: number; tick: number; label: string; x: number; y: number; color?: string }> = ({
  at,
  dur = 80,
  fromN,
  toN,
  tick,
  label,
  x,
  y,
  color = "#5AB8FF",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - at;
  if (l < 0 || l > dur) return null;
  const s = spring({ frame: l, fps, config: { damping: 13, stiffness: 200 } });
  const n = Math.round(interpolate(l, [0, tick], [fromN, toN], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const done = l >= tick;
  const bump = done ? spring({ frame: l - tick, fps, config: { damping: 8, stiffness: 300 } }) : 0;
  const o = interpolate(l, [dur - 6, dur], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s * (1 + 0.12 * Math.sin(bump * Math.PI))})`, opacity: o, textAlign: "center" }}>
      <div style={{ fontFamily: UI, fontWeight: 900, fontSize: 170, lineHeight: 1, color: "#FFF", WebkitTextStroke: "10px #111", paintOrder: "stroke fill", textShadow: `0 10px 0 #111, 0 0 40px ${color}` }}>{n}</div>
      <div style={{ marginTop: 6, display: "inline-block", background: color, color: "#111", fontFamily: UI, fontWeight: 900, fontSize: 36, letterSpacing: 4, padding: "6px 18px", borderRadius: 8 }}>{label}</div>
    </div>
  );
};

// ------------------------------------------------------------------ whoosh transition (diagonal colour bars + flash)
export const Whoosh: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const l = frame - at + 6; // centred on the cut
  if (l < 0 || l > 14) return null;
  const p = l / 14;
  const bars = ["#FF9933", "#0F4C5C", "#FFFFFF"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {bars.map((c, i) => {
        const x = interpolate(p, [0, 1], [-1600 + i * 120, 1700 + i * 120], { easing: Easing.inOut(Easing.cubic) });
        return <div key={i} style={{ position: "absolute", top: -400, left: x, width: 260 - i * 70, height: 2800, background: c, opacity: i === 2 ? 0.9 : 1, transform: "rotate(18deg)" }} />;
      })}
      <AbsoluteFill style={{ background: "#FFF", opacity: interpolate(l, [5, 7, 10], [0, 0.35, 0], clamp) }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ punch zoom wrapper: tiny scale kicks on beats
export const PunchZoom: React.FC<{ beats: number[]; children: React.ReactNode }> = ({ beats, children }) => {
  const frame = useCurrentFrame();
  let k = 0;
  for (const b of beats) {
    const l = frame - b;
    if (l >= 0 && l < 14) k = Math.max(k, Math.sin((l / 14) * Math.PI) * (1 - l / 14));
  }
  return <AbsoluteFill style={{ transform: `scale(${1 + 0.06 * k})` }}>{children}</AbsoluteFill>;
};

export const RedFlash: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - at, [0, 2, 12], [0, 0.35, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(255,40,30,0) 30%, rgba(255,40,30,1) 100%)", opacity: o }} />;
};

export const ProgressBar: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "rgba(255,255,255,0.15)" }}>
      <div style={{ width: `${(frame / total) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${SAFFRON}, #FFD400)` }} />
    </div>
  );
};

// ------------------------------------------------------------------ end card CTA with tap
export const FollowCTA: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - at;
  if (l < 0) return null;
  const s = spring({ frame: l, fps, config: { damping: 12, stiffness: 160 } });
  const tapAt = 26;
  const tap = l >= tapAt ? spring({ frame: l - tapAt, fps, config: { damping: 10, stiffness: 300 } }) : 0;
  const followed = l >= tapAt + 3;
  const handX = interpolate(l, [8, tapAt], [260, 40], { ...clamp, easing: Easing.out(Easing.cubic) });
  const handY = interpolate(l, [8, tapAt], [220, 34], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ripple = l >= tapAt ? ((l - tapAt) % 30) / 30 : -1;
  return (
    <div style={{ position: "absolute", top: 1010, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${s})` }}>
      <div style={{ fontFamily: UI, fontWeight: 900, fontSize: 46, letterSpacing: 6, color: "#FFF", textShadow: "0 3px 12px rgba(0,0,0,0.6)", marginBottom: 22 }}>MINDSET MODE | EXPLAINERS</div>
      <div style={{ position: "relative" }}>
        {ripple >= 0 && <div style={{ position: "absolute", inset: -10, borderRadius: 60, border: `6px solid ${SAFFRON}`, transform: `scale(${1 + ripple * 0.35})`, opacity: 1 - ripple }} />}
        <div
          style={{
            transform: `scale(${1 - 0.08 * Math.sin(tap * Math.PI)})`,
            background: followed ? "#3DDC97" : SAFFRON,
            color: "#111",
            fontFamily: UI,
            fontWeight: 900,
            fontSize: 52,
            padding: "22px 64px",
            borderRadius: 60,
            border: "5px solid #111",
            boxShadow: "0 10px 0 #111",
          }}
        >
          {followed ? "FOLLOWING ✓" : "+ FOLLOW"}
        </div>
        {/* hand cursor */}
        <svg width={90} height={110} viewBox="0 0 90 110" style={{ position: "absolute", left: `calc(50% + ${handX}px)`, top: handY, transform: `scale(${1 - 0.12 * Math.sin(tap * Math.PI)})` }}>
          <path d="M 30 8 C 30 0 42 0 42 8 L 42 50 L 50 46 C 56 44 60 48 60 54 L 66 52 C 72 50 76 54 76 60 L 80 60 C 86 60 88 66 86 72 L 80 96 C 78 104 72 108 64 108 L 40 108 C 32 108 26 104 22 96 L 8 70 C 4 62 14 56 20 62 L 30 72 Z" fill="#FFF" stroke="#111" strokeWidth={5} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};
