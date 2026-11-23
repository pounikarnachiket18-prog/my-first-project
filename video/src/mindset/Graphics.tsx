import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { brand, display, sans } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------------- Brand logo mark ---------------- */
export const LogoMark: React.FC<{ size: number; spin?: number }> = ({ size, spin = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="mm-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={brand.violetHot} />
        <stop offset="100%" stopColor={brand.violet} />
      </linearGradient>
      <linearGradient id="mm-r" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={brand.gold} />
        <stop offset="100%" stopColor={brand.violetHot} />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill={brand.ink} />
    <circle
      cx="32"
      cy="32"
      r="28"
      fill="none"
      stroke="url(#mm-r)"
      strokeWidth="3"
      strokeDasharray="120 56"
      transform={`rotate(${spin} 32 32)`}
      strokeLinecap="round"
    />
    {/* stylised "M" built from two rising chevrons = mindset going up */}
    <path d="M16 44 L16 22 L32 36 L48 22 L48 44" fill="none" stroke="url(#mm-g)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="32" cy="18" r="4" fill={brand.gold} />
  </svg>
);

/* ---------------- Persistent bottom brand bar ---------------- */
export const BrandBar: React.FC<{ hideFrom: number }> = ({ hideFrom }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - 8, fps, config: { damping: 16, mass: 0.7 } });
  const exit = interpolate(frame, [hideFrom - 6, hideFrom + 4], [1, 0], clamp);
  const o = enter * exit;
  // shimmer sweep every 5s
  const cycle = (frame % 150) / 150;
  const sweep = interpolate(cycle, [0, 0.22], [-40, 140], clamp);
  const progress = frame / durationInFrames;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 34,
        display: "flex",
        justifyContent: "center",
        opacity: o,
        transform: `translateY(${(1 - enter) * 40}px)`,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 18px 8px 8px",
          borderRadius: 999,
          background: brand.inkSoft,
          border: `1.5px solid rgba(167,139,250,0.65)`,
          boxShadow: "0 6px 24px rgba(0,0,0,0.45), 0 0 18px rgba(139,92,246,0.35)",
          overflow: "hidden",
        }}
      >
        <LogoMark size={34} spin={frame * 2} />
        <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 17, letterSpacing: 2.2, color: brand.white }}>
          MINDSET MODE
        </span>
        <span style={{ width: 2, height: 20, background: brand.gold, borderRadius: 2 }} />
        <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, letterSpacing: 3, color: brand.gold }}>
          EXPLAINERS
        </span>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sweep}%`,
            width: "28%",
            background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
        {/* progress */}
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 2.5, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${brand.gold}, ${brand.violetHot})` }} />
      </div>
    </div>
  );
};

/* ---------------- End plate that replaces the old channel name ---------------- */
export const EndPlate: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const f = frame - start;
  const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
  const textIn = interpolate(f, [4, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const glow = 0.55 + 0.25 * Math.sin(f / 6);
  const orbit = (f * 4) % 360;
  return (
    <div
      style={{
        position: "absolute",
        left: 360 - 215,
        top: 196,
        width: 430,
        height: 88,
        transform: `scale(${0.85 + pop * 0.15})`,
        opacity: interpolate(f, [0, 3], [0, 1], clamp),
      }}
    >
      {/* rotating gradient border */}
      <div
        style={{
          position: "absolute",
          inset: -2.5,
          borderRadius: 20,
          background: `conic-gradient(from ${orbit}deg, ${brand.gold}, ${brand.violetHot}, ${brand.violet}, ${brand.gold})`,
          boxShadow: `0 0 ${26 * glow}px rgba(139,92,246,${glow}), 0 0 ${40 * glow}px rgba(255,201,64,${glow * 0.4})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background: `linear-gradient(160deg, #191338 0%, ${brand.ink} 70%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -90}deg)` }}>
          <LogoMark size={52} spin={f * 3} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, opacity: textIn, transform: `translateX(${(1 - textIn) * 18}px)` }}>
          <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 30, letterSpacing: 2.5, color: brand.white }}>MINDSET MODE</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ height: 2, width: 26, background: brand.gold }} />
            <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, letterSpacing: 6, color: brand.gold }}>EXPLAINERS</span>
            <span style={{ height: 2, width: 26, background: brand.gold }} />
          </div>
        </div>
      </div>
    </div>
  );
};

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

/* ---------------- Loco side decal (brand sticker over the old logo) ---------------- */
export const Decal: React.FC<{ x: number; y: number; skew: number; scale: number }> = ({ x, y, skew, scale }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) skewY(${skew}deg) scale(${scale})`,
      width: 70,
      height: 30,
      borderRadius: 5,
      background: `linear-gradient(135deg, #1a1236, ${brand.ink})`,
      border: `1.5px solid ${brand.gold}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      boxShadow: "0 0 6px rgba(0,0,0,0.5)",
    }}
  >
    <LogoMark size={18} />
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.95 }}>
      <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 8.5, color: brand.white, letterSpacing: 0.4 }}>MINDSET</span>
      <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 8.5, color: brand.gold, letterSpacing: 0.4 }}>MODE</span>
    </div>
  </div>
);

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
