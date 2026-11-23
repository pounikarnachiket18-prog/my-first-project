import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { brand, display, sans } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------------- Character name tag with leader line ---------------- */
export const NameTag: React.FC<{
  name: string;
  role: string;
  color: string;
  anchor: { x: number; y: number };
  tag: { x: number; y: number }; // centre of the tag pill
  from: number;
  to: number;
  minW?: number;
  minH?: number;
  hardOut?: boolean;
}> = ({ name, role, color, anchor, tag, from, to, minW = 120, minH = 62, hardOut }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const dot = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  const line = interpolate(f, [3, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pill = spring({ frame: f - 8, fps, config: { damping: 13, stiffness: 160 } });
  const out = hardOut ? 1 : interpolate(frame, [to - 8, to], [1, 0], clamp);
  const ring = (f % 30) / 30;
  const dx = tag.x - anchor.x;
  const dy = tag.y - anchor.y;
  const len = Math.hypot(dx, dy);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={720} height={1280} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={anchor.x}
          y1={anchor.y}
          x2={anchor.x + dx * line}
          y2={anchor.y + dy * line}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        <circle cx={anchor.x} cy={anchor.y} r={6 * dot} fill={color} />
        <circle cx={anchor.x} cy={anchor.y} r={6 + ring * 16} fill="none" stroke={color} strokeWidth={2} opacity={(1 - ring) * dot} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: tag.x,
          top: tag.y,
          transform: `translate(-50%, -50%) scale(${pill})`,
          minWidth: minW,
          minHeight: minH,
          padding: "6px 16px 7px",
          boxSizing: "border-box",
          borderRadius: 14,
          background: brand.ink,
          border: `2.5px solid ${color}`,
          boxShadow: `0 0 18px ${color}88, 0 8px 18px rgba(0,0,0,0.5)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          opacity: len > 0 ? 1 : 1,
        }}
      >
        <span style={{ fontFamily: display, fontSize: 38, letterSpacing: 3, color: brand.white, textShadow: `0 0 12px ${color}` }}>{name}</span>
        <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 9.5, letterSpacing: 2, color, marginTop: 3 }}>{role}</span>
      </div>
    </div>
  );
};

/* ---------------- Speed lines for the running-train shots ---------------- */
export const SpeedLines: React.FC<{ from: number; to: number; dir?: 1 | -1; intensity?: number }> = ({ from, to, dir = -1, intensity = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const fade = interpolate(frame, [from, from + 6, to - 6, to], [0, 1, 1, 0], clamp) * intensity;
  const lines = new Array(26).fill(0).map((_, i) => {
    const yBand = random(`sy${i}`) < 0.5 ? random(`y${i}`) * 330 : 880 + random(`y${i}`) * 380;
    const speed = 38 + random(`v${i}`) * 50;
    const len = 80 + random(`l${i}`) * 220;
    const span = 720 + len + 200;
    const x = ((random(`x${i}`) * span + frame * speed) % span) - len;
    const xx = dir < 0 ? 720 - x : x;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: xx - len / 2,
          top: yBand,
          width: len,
          height: 1.5 + random(`h${i}`) * 2,
          borderRadius: 2,
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))",
          opacity: 0.25 + random(`o${i}`) * 0.4,
        }}
      />
    );
  });
  return <div style={{ position: "absolute", inset: 0, opacity: fade, mixBlendMode: "screen" }}>{lines}</div>;
};

/* ---------------- Floating Zzz for the sleepy pilot ---------------- */
export const Zzz: React.FC<{ from: number; to: number; x: number; y: number }> = ({ from, to, x, y }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const life = 42;
        const t = (f - i * 12) / life;
        if (t < 0 || t > 1) return null;
        const size = 22 + i % 3 * 10;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: x + t * 60 + Math.sin(t * 6 + i) * 10,
              top: y - t * 120,
              fontFamily: display,
              fontSize: size,
              color: i % 2 ? brand.violetHot : brand.white,
              opacity: Math.sin(t * Math.PI),
              transform: `rotate(${-15 + t * 25}deg) scale(${0.6 + t * 0.6})`,
              textShadow: `0 0 10px ${brand.violet}`,
            }}
          >
            Z
          </span>
        );
      })}
    </div>
  );
};

/* ---------------- Ambient particles ---------------- */
export const Dust: React.FC<{ from: number; to: number; count?: number; color?: string }> = ({ from, to, count = 28, color = "255,240,210" }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const fade = interpolate(frame, [from, from + 8, to - 8, to], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade, mixBlendMode: "screen" }}>
      {new Array(count).fill(0).map((_, i) => {
        const bx = random(`dx${i}`) * 720;
        const by = random(`dy${i}`) * 1280;
        const r = 1.5 + random(`dr${i}`) * 4.5;
        const x = bx + noise2D(`nx${i}`, frame * 0.008, 0) * 60;
        const y = (by - frame * (0.3 + random(`ds${i}`) * 0.6) + 1280 * 4) % 1280;
        const tw = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(frame / 12 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${color},0.9), rgba(${color},0))`,
              opacity: tw,
              filter: r > 4 ? "blur(1.5px)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

export const Stars: React.FC<{ ranges: [number, number][] }> = ({ ranges }) => {
  const frame = useCurrentFrame();
  const active = ranges.find(([a, b]) => frame >= a && frame < b);
  if (!active) return null;
  const fade = interpolate(frame, [active[0], active[0] + 6], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade, mixBlendMode: "screen" }}>
      {new Array(40).fill(0).map((_, i) => {
        const x = random(`sx${i}`) * 720;
        const y = random(`syy${i}`) * 470;
        const r = 0.6 + random(`sr${i}`) * 1.4;
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(frame / (8 + random(`st${i}`) * 14) + i));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "#fff", opacity: tw * 0.8, boxShadow: "0 0 4px #cbd5ff" }} />;
      })}
    </div>
  );
};

/* ---------------- Cut flash / light sweep ---------------- */
export const CutFlash: React.FC<{ cuts: number[] }> = ({ cuts }) => {
  const frame = useCurrentFrame();
  const c = cuts.find((k) => frame >= k && frame < k + 9);
  if (c === undefined) return null;
  const f = frame - c;
  const p = interpolate(f, [0, 8], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const flash = interpolate(f, [0, 2, 8], [0.42, 0.22, 0], clamp);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 45%, rgba(255,255,255,${flash}), rgba(167,139,250,${flash * 0.6}) 60%, rgba(139,92,246,0) 100%)`, mixBlendMode: "screen" }} />
      <div
        style={{
          position: "absolute",
          top: -300,
          left: -400 + p * 1700,
          width: 220,
          height: 1900,
          transform: "rotate(18deg)",
          background: "linear-gradient(90deg, rgba(255,201,64,0), rgba(255,220,140,0.45), rgba(167,139,250,0.35), rgba(139,92,246,0))",
          mixBlendMode: "screen",
          opacity: 1 - p * 0.6,
          filter: "blur(8px)",
        }}
      />
    </>
  );
};

/* ---------------- Pulsing red alert edge ---------------- */
export const AlertEdge: React.FC<{ from: number; to: number; period: number; strength?: number }> = ({ from, to, period, strength = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const fade = interpolate(frame, [from, from + 5, to - 4, to], [0, 1, 1, 0], clamp);
  const pulse = Math.pow(0.5 + 0.5 * Math.cos(((frame - from) / period) * Math.PI * 2), 2);
  const a = (0.25 + 0.5 * pulse) * fade * strength;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxShadow: `inset 0 0 ${90 + pulse * 60}px rgba(255,40,60,${a}), inset 0 0 12px rgba(255,60,80,${a})`,
        background: `radial-gradient(circle at 50% 50%, rgba(255,0,30,0) 55%, rgba(255,20,50,${a * 0.45}) 100%)`,
      }}
    />
  );
};

/* ---------------- Film finish: vignette + grain ---------------- */
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const ox = Math.floor(random(`gx${frame}`) * 200);
  const oy = Math.floor(random(`gy${frame}`) * 200);
  const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>"
  ).replace(/%2523/g, "%23")}")`;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(6,3,18,0.45) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: grain, backgroundPosition: `${ox}px ${oy}px`, opacity: 0.09, mixBlendMode: "overlay" }} />
    </>
  );
};

/* ---------------- Opening light leak ---------------- */
export const LightLeak: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const p = (frame - from) / (to - from);
  const o = Math.sin(p * Math.PI) * 0.5;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        opacity: o,
        background: `radial-gradient(circle at ${10 + p * 90}% ${20 + p * 15}%, rgba(255,150,60,0.55), rgba(255,90,140,0.25) 25%, rgba(139,92,246,0) 55%)`,
      }}
    />
  );
};

/* ---------------- Speedometer for the emergency brake ---------------- */
export const SpeedGauge: React.FC<{ from: number; to: number; keys: [number, number][] }> = ({ from, to, keys }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const enter = spring({ frame: f, fps, config: { damping: 14 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  const speed = interpolate(frame, keys.map((k) => k[0]), keys.map((k) => k[1]), { ...clamp, easing: Easing.out(Easing.quad) });
  const max = 130;
  const ang = -120 + (speed / max) * 240; // degrees
  const R = 74;
  const cx = 100;
  const cy = 100;
  const arc = (a0: number, a1: number, r: number) => {
    const p = (a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const danger = speed > 60;
  return (
    <div style={{ position: "absolute", left: 360 - 100, top: 1010, width: 200, height: 170, opacity: enter * out, transform: `scale(${0.7 + enter * 0.3})` }}>
      <svg width={200} height={170} viewBox="0 0 200 170">
        <circle cx={cx} cy={cy} r={92} fill="rgba(10,8,24,0.72)" />
        <path d={arc(-120, 120, R)} stroke="rgba(255,255,255,0.18)" strokeWidth={12} fill="none" strokeLinecap="round" />
        <path d={arc(-120, ang, R)} stroke={danger ? brand.alert : brand.gold} strokeWidth={12} fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${danger ? brand.alert : brand.gold})` }} />
        {new Array(14).fill(0).map((_, i) => {
          const a = -120 + i * (240 / 13);
          const r0 = 58;
          const r1 = i % 2 ? 52 : 48;
          const s0 = Math.sin((a * Math.PI) / 180);
          const c0 = Math.cos((a * Math.PI) / 180);
          return <line key={i} x1={cx + r0 * s0} y1={cy - r0 * c0} x2={cx + r1 * s0} y2={cy - r1 * c0} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />;
        })}
        <g transform={`rotate(${ang} ${cx} ${cy})`}>
          <path d={`M${cx - 4} ${cy} L${cx} ${cy - 66} L${cx + 4} ${cy} Z`} fill="#fff" />
        </g>
        <circle cx={cx} cy={cy} r={8} fill={brand.alert} stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy + 40} textAnchor="middle" fontFamily={display} fontSize={34} fill="#fff">
          {Math.round(speed)}
        </text>
        <text x={cx} y={cy + 56} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={10} letterSpacing={2} fill={brand.goldSoft}>
          KM/H
        </text>
      </svg>
    </div>
  );
};

/* ---------------- Wheel sparks under braking ---------------- */
export const Sparks: React.FC<{ from: number; to: number; points: { x: number; y: number }[] }> = ({ from, to, points }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const strength = interpolate(frame, [from, from + 4, to - 20, to], [0, 1, 0.8, 0], clamp);
  const sparks: React.ReactNode[] = [];
  points.forEach((p, pi) => {
    for (let i = 0; i < 14; i++) {
      const life = 10 + Math.floor(random(`sl${pi}${i}`) * 8);
      const birth = Math.floor(random(`sb${pi}${i}`) * life);
      const t = ((frame - from + birth) % life) / life;
      const vx = -(4 + random(`svx${pi}${i}`) * 9);
      const vy = -(2 + random(`svy${pi}${i}`) * 6);
      const x = p.x + vx * t * life;
      const y = p.y + vy * t * life + 0.35 * (t * life) ** 2;
      const len = 6 + random(`slen${pi}${i}`) * 10;
      const ang = (Math.atan2(vy + 0.7 * t * life, vx) * 180) / Math.PI;
      sparks.push(
        <div
          key={`${pi}-${i}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: len,
            height: 2,
            borderRadius: 2,
            background: "linear-gradient(90deg, rgba(255,250,210,1), rgba(255,150,40,0))",
            transform: `rotate(${ang}deg)`,
            transformOrigin: "0 50%",
            opacity: (1 - t) * strength,
            boxShadow: "0 0 6px rgba(255,170,60,0.9)",
          }}
        />
      );
    }
    sparks.push(
      <div
        key={`g${pi}`}
        style={{
          position: "absolute",
          left: p.x - 22,
          top: p.y - 12,
          width: 44,
          height: 24,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(255,210,120,0.9), rgba(255,140,40,0))",
          opacity: strength * (0.6 + 0.4 * random(`fl${pi}${frame}`)),
        }}
      />
    );
  });
  return <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>{sparks}</div>;
};

/* ---------------- Tap / press pulse on a button ---------------- */
export const TapPulse: React.FC<{ from: number; to: number; x: number; y: number; r: number; color: string; period?: number; label?: string; delay?: number }> = ({
  from,
  to,
  x,
  y,
  r,
  color,
  period = 24,
  label,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from + delay || frame >= to) return null;
  const f = frame - from - delay;
  const fade = interpolate(frame, [from + delay, from + delay + 6, to - 6, to], [0, 1, 1, 0], clamp);
  const pop = spring({ frame: f, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {[0, 1, 2].map((i) => {
        const t = ((f + (i * period) / 3) % period) / period;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r * (1 + t * 0.9),
              top: y - r * (1 + t * 0.9),
              width: r * 2 * (1 + t * 0.9),
              height: r * 2 * (1 + t * 0.9),
              borderRadius: "50%",
              border: `3px solid ${color}`,
              opacity: (1 - t) * 0.9,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        );
      })}
      {label && (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y + r + 16,
            transform: `translateX(-50%) scale(${pop})`,
            padding: "4px 10px",
            borderRadius: 8,
            background: color,
            color: brand.ink,
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 17,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            boxShadow: `0 0 14px ${color}`,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

/* ---------------- Pilot alertness meter ---------------- */
export const AlertMeter: React.FC<{ from: number; to: number; keys: [number, number][] }> = ({ from, to, keys }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const enter = spring({ frame: frame - from, fps, config: { damping: 15 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  const lvl = interpolate(frame, keys.map((k) => k[0]), keys.map((k) => k[1]), clamp);
  const col = lvl > 0.6 ? "#34D399" : lvl > 0.3 ? brand.gold : brand.alert;
  const blink = lvl < 0.3 ? 0.6 + 0.4 * Math.sin(frame / 2.5) : 1;
  const segs = 10;
  return (
    <div style={{ position: "absolute", left: 18, top: 520, width: 46, opacity: enter * out, transform: `translateX(${(1 - enter) * -60}px)` }}>
      <div style={{ padding: "8px 6px", borderRadius: 12, background: "rgba(10,8,24,0.7)", border: `1.5px solid ${col}`, boxShadow: `0 0 12px ${col}66` }}>
        <div style={{ display: "flex", flexDirection: "column-reverse", gap: 3 }}>
          {new Array(segs).fill(0).map((_, i) => (
            <div key={i} style={{ height: 14, borderRadius: 3, background: i / segs < lvl ? col : "rgba(255,255,255,0.12)", opacity: i / segs < lvl ? blink : 1, boxShadow: i / segs < lvl ? `0 0 6px ${col}` : "none" }} />
          ))}
        </div>
        <div style={{ marginTop: 6, textAlign: "center", fontFamily: display, fontSize: 17, color: col }}>{Math.round(lvl * 100)}%</div>
      </div>
      <div style={{ marginTop: 5, fontFamily: sans, fontWeight: 900, fontSize: 8.5, letterSpacing: 1.2, color: "#fff", textAlign: "center", textShadow: "0 1px 3px #000" }}>ALERT</div>
    </div>
  );
};

/* ---------------- Flashing warning badge ---------------- */
export const WarningBadge: React.FC<{ from: number; to: number; x: number; y: number }> = ({ from, to, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const pop = spring({ frame: f, fps, config: { damping: 8, stiffness: 200 } });
  const pulse = 0.5 + 0.5 * Math.cos((f / 15) * Math.PI * 2);
  const out = interpolate(frame, [to - 5, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, opacity: out, transform: `scale(${pop * (1 + pulse * 0.08)}) rotate(${Math.sin(f / 3) * 4}deg)` }}>
      <svg width={80} height={80} viewBox="0 0 80 80" style={{ filter: `drop-shadow(0 0 ${8 + pulse * 10}px rgba(255,59,78,0.9))` }}>
        <path d="M40 6 L76 70 L4 70 Z" fill={brand.alert} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
        <rect x="36" y="26" width="8" height="26" rx="4" fill="#fff" />
        <circle cx="40" cy="60" r="4.5" fill="#fff" />
      </svg>
    </div>
  );
};

/* ---------------- Bouncing comment bubble for the CTA ---------------- */
export const CommentBubble: React.FC<{ from: number; x: number; y: number }> = ({ from, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from) return null;
  const f = frame - from;
  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 180 } });
  const bounce = Math.abs(Math.sin(f / 7)) * -8;
  return (
    <div style={{ position: "absolute", left: x - 30, top: y - 30 + bounce, width: 60, height: 60, transform: `scale(${pop})` }}>
      <svg width={60} height={60} viewBox="0 0 60 60" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>
        <path d="M8 10 H52 a6 6 0 0 1 6 6 V38 a6 6 0 0 1 -6 6 H26 L14 54 V44 H8 a6 6 0 0 1 -6 -6 V16 a6 6 0 0 1 6 -6 Z" fill="#fff" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={18 + i * 12} cy={27 - Math.max(0, Math.sin(f / 4 - i * 0.9)) * 4} r={3.6} fill={brand.ink} />
        ))}
      </svg>
      {/* little hearts floating up */}
      {[0, 1, 2].map((i) => {
        const t = ((f + i * 14) % 42) / 42;
        return (
          <span key={i} style={{ position: "absolute", left: 40 + i * 6 + Math.sin(t * 6 + i) * 6, top: -t * 60, fontSize: 14, opacity: Math.sin(t * Math.PI), color: brand.alert }}>
            ❤
          </span>
        );
      })}
    </div>
  );
};
