import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { FONT } from "../fonts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Instrument-style speedometer that counts up to `value` km/h, tilted into the 3D scene. */
export const Speedometer: React.FC<{ at: number; countFrom: number; countTo: number; value?: number; max?: number; x?: number; y?: number; out?: number }> = ({
  at, countFrom, countTo, value = 1670, max = 2000, x = 0.5, y = 0.12, out = 1e9,
}) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (f < at - 1 || f > out + 12) return null;
  const s = spring({ frame: f - at, fps, config: { damping: 15, stiffness: 140 } });
  const t = interpolate(f, [countFrom, countTo], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.0, 0.1, 1) });
  const v = Math.round(value * t);
  const o = interpolate(f, [out, out + 10], [1, 0], clamp);
  const R = 230;
  const a0 = -225, a1 = 45; // degrees, sweep 270
  const ang = (k: number) => ((a0 + (a1 - a0) * k) * Math.PI) / 180;
  const needle = ang(Math.min(1, (value * t) / max));
  const ticks = [];
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const big = i % 5 === 0;
    const a = ang(k);
    const r1 = R - (big ? 34 : 18);
    const lit = k <= (value * t) / max;
    ticks.push(
      <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * R} y2={Math.sin(a) * R}
        stroke={lit ? (k > 0.78 ? "#ff5a3a" : "#ffc24a") : "rgba(255,255,255,0.35)"} strokeWidth={big ? 6 : 3} strokeLinecap="round" />,
    );
    if (big) {
      const lr = R - 66;
      ticks.push(
        <text key={`t${i}`} x={Math.cos(a) * lr} y={Math.sin(a) * lr + 9} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontFamily={FONT.mono} fontSize={24} fontWeight={700}>
          {Math.round(k * max / 100) * 100 / 1000 >= 1 ? `${(k * max / 1000).toFixed(1)}k` : Math.round(k * max)}
        </text>,
      );
    }
  }
  const arcPath = (k: number) => {
    const aa = ang(0), bb = ang(k);
    const large = (a1 - a0) * k > 180 ? 1 : 0;
    return `M ${Math.cos(aa) * (R + 16)} ${Math.sin(aa) * (R + 16)} A ${R + 16} ${R + 16} 0 ${large} 1 ${Math.cos(bb) * (R + 16)} ${Math.sin(bb) * (R + 16)}`;
  };
  return (
    <div
      style={{
        position: "absolute", left: width * x - 300, top: height * y, width: 600, height: 600, opacity: o * s,
        transform: `perspective(1400px) rotateX(${interpolate(s, [0, 1], [60, 14])}deg) rotateY(-10deg) scale(${interpolate(s, [0, 1], [0.6, 1])})`,
        transformOrigin: "50% 60%",
      }}
    >
      <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: "radial-gradient(circle at 50% 40%, rgba(30,40,60,0.55), rgba(5,8,14,0.75))", backdropFilter: "blur(6px)", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 30px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(255,194,74,0.12)" }} />
      <svg width={600} height={600} viewBox="-300 -300 600 600" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="spglow"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <path d={arcPath(1)} stroke="rgba(255,255,255,0.12)" strokeWidth={10} fill="none" />
        <path d={arcPath(Math.max(0.001, (value * t) / max))} stroke="#ffb02e" strokeWidth={10} fill="none" filter="url(#spglow)" />
        <path d={arcPath(Math.max(0.001, (value * t) / max))} stroke="#ffd27a" strokeWidth={6} fill="none" />
        {ticks}
        <g transform={`rotate(${(needle * 180) / Math.PI})`}>
          <polygon points={`-10,0 ${R - 40},-3 ${R - 40},3 -10,0`} fill="#ff5a3a" filter="url(#spglow)" />
          <polygon points={`-18,-6 ${R - 36},-2 ${R - 36},2 -18,6`} fill="#ff6a4a" />
        </g>
        <circle r={22} fill="#0b0f16" stroke="#ff6a4a" strokeWidth={4} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.title, fontSize: 118, color: "#fff", lineHeight: 1, textShadow: "0 0 30px rgba(255,190,80,0.7)" }}>
          {v.toLocaleString("en-IN")}
        </div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 32, letterSpacing: 10, color: "#ffc24a" }}>KM/H</div>
      </div>
    </div>
  );
};
