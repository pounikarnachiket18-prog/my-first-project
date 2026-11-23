import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, display, sans } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Mindset Mode mark: rising-chevron "M" in a rotating neon ring. */
const Mark: React.FC<{ size: number; spin: number }> = ({ size, spin }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="fc-m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={brand.cyan} />
        <stop offset="100%" stopColor={brand.lime} />
      </linearGradient>
      <linearGradient id="fc-r" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={brand.magenta} />
        <stop offset="100%" stopColor={brand.cyan} />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill={brand.ink} />
    <circle cx="32" cy="32" r="28" fill="none" stroke="url(#fc-r)" strokeWidth="3" strokeDasharray="120 56" strokeLinecap="round" transform={`rotate(${spin} 32 32)`} />
    <path d="M16 44 L16 22 L32 36 L48 22 L48 44" fill="none" stroke="url(#fc-m)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="32" cy="18" r="4" fill={brand.magenta} />
  </svg>
);

/** End-card call to action: FOLLOW  Mindset Mode | Explainers. */
export const FollowCard: React.FC<{ from: number; tapAt: number; y: number }> = ({ from, tapAt, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from) return null;
  const f = frame - from;
  const enter = spring({ frame: f, fps, config: { damping: 13, stiffness: 150 } });
  const textIn = interpolate(f, [6, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // tap on the FOLLOW button when the voice says "follow karo"
  const tf = frame - tapAt;
  const tapped = tf >= 0;
  const press = tf >= 0 && tf < 6 ? interpolate(tf, [0, 2, 6], [1, 0.9, 1], clamp) : 1;
  const ripple = tf >= 0 && tf < 18 ? tf / 18 : -1;
  const handX = interpolate(tf, [-14, 0], [80, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const handO = interpolate(tf, [-14, -8, 14, 22], [0, 1, 1, 0], clamp);
  const glow = 0.6 + 0.4 * Math.sin(f / 5);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px 10px 10px",
          borderRadius: 999,
          background: "linear-gradient(160deg, rgba(36,20,80,0.95), rgba(7,5,12,0.95))",
          border: `2px solid ${brand.cyan}`,
          boxShadow: `0 0 ${18 * glow}px rgba(34,230,255,0.6), 0 0 ${30 * glow}px rgba(255,46,147,0.3)`,
          transform: `translateY(${(1 - enter) * 70}px) scale(${(0.85 + 0.15 * enter) * 1.22})`,
          opacity: Math.min(1, enter * 1.4),
        }}
      >
        <Mark size={52} spin={f * 3} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, opacity: textIn, transform: `translateX(${(1 - textIn) * 14}px)` }}>
          <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 21, letterSpacing: 2, color: brand.white }}>MINDSET MODE</span>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: brand.cyan, marginTop: 5 }}>| EXPLAINERS</span>
        </div>
        {/* FOLLOW button */}
        <div style={{ position: "relative", marginLeft: 6 }}>
          <div
            style={{
              padding: "10px 18px 8px",
              borderRadius: 999,
              background: tapped ? brand.lime : brand.magenta,
              color: tapped ? brand.ink : brand.white,
              fontFamily: display,
              fontSize: 26,
              letterSpacing: 2,
              transform: `scale(${press})`,
              boxShadow: `0 0 14px ${tapped ? brand.lime : brand.magenta}`,
              whiteSpace: "nowrap",
            }}
          >
            {tapped ? "FOLLOWING ✓" : "+ FOLLOW"}
          </div>
          {ripple >= 0 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 40 + ripple * 120,
                height: 40 + ripple * 120,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: `3px solid ${brand.lime}`,
                opacity: 1 - ripple,
              }}
            />
          )}
          {/* tapping finger */}
          <svg width={34} height={40} viewBox="0 0 34 40" style={{ position: "absolute", left: "55%", top: "60%", transform: `translate(${handX}px, ${handX * 0.4}px) scale(${press})`, opacity: handO }}>
            <path d="M12 4 a3.5 3.5 0 0 1 7 0 V18 l8 2 a4 4 0 0 1 3 4.5 L28 36 H12 L4 25 a3 3 0 0 1 4.5 -4 L12 24 Z" fill="#fff" stroke={brand.ink} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};
