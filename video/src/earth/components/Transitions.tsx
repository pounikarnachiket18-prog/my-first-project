import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

let uid = 0;

/** Directional motion blur (whip pan). amount in px, angle 0 = horizontal. */
export const WhipBlur: React.FC<{ amount: number; vertical?: boolean; children: React.ReactNode }> = ({ amount, vertical, children }) => {
  const id = React.useMemo(() => `whip${uid++}`, []);
  if (amount < 0.5) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={vertical ? `0 ${amount}` : `${amount} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Envelope for a whip centred on frame `at` (0 -> 1 -> 0). */
export const whipEnv = (f: number, at: number, half = 5) =>
  interpolate(f, [at - half, at, at + half], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Zoom-through: scale + radial brightening into a cut. */
export const ZoomPunch: React.FC<{ at: number; half?: number; children: React.ReactNode; maxScale?: number }> = ({ at, half = 6, children, maxScale = 1.35 }) => {
  const f = useCurrentFrame();
  const e = whipEnv(f, at, half);
  return <AbsoluteFill style={{ transform: `scale(${1 + (maxScale - 1) * e})`, filter: `brightness(${1 + e * 0.8}) blur(${e * 6}px)` }}>{children}</AbsoluteFill>;
};

/** Diagonal split: shows `a` on the upper-left side, `b` on the lower-right, with a glowing seam. */
export const DiagonalSplit: React.FC<{ progress: number; a: React.ReactNode; b: React.ReactNode; seam?: string }> = ({ progress, a, b, seam = "#ffffff" }) => {
  // progress 0 -> only a ; 1 -> only b
  const p = progress * 140 - 20; // seam position in %
  const clip = `polygon(${p + 20}% 0, 100% 0, 100% 100%, ${p - 20}% 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{a}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{b}</AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <line x1={p + 20} y1={0} x2={p - 20} y2={100} stroke={seam} strokeWidth={0.5} opacity={0.9} />
        <line x1={p + 20} y1={0} x2={p - 20} y2={100} stroke={seam} strokeWidth={2.5} opacity={0.25} />
      </svg>
    </AbsoluteFill>
  );
};
