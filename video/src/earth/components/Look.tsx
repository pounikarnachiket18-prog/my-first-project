import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";

/** Per-scene colour grade: lift/tint via blend layers, vignette, animated film grain. */
export const Grade: React.FC<{
  tint?: string; // soft-light colour wash
  tintOpacity?: number;
  shadows?: string; // multiply colour into the darks
  shadowOpacity?: number;
  vignette?: number;
  grain?: number;
  children?: React.ReactNode;
  filter?: string;
}> = ({ tint, tintOpacity = 0.25, shadows, shadowOpacity = 0.0, vignette = 0.55, grain = 0.06, children, filter }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ filter }}>
      {children}
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light", opacity: tintOpacity }} />}
      {shadows && <AbsoluteFill style={{ background: shadows, mixBlendMode: "multiply", opacity: shadowOpacity }} />}
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 75% 62% at 50% 46%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)` }}
      />
      {grain > 0 && (
        <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay" }}>
          <svg width="100%" height="100%">
            <filter id={`g${f % 7}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 97} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#g${f % 7})`} />
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Controlled handheld / impact shake. `amp` px, `rot` degrees, envelope by caller. */
export const Shake: React.FC<{ amp: number; rot?: number; speed?: number; seed?: string; children: React.ReactNode; zoom?: number }> = ({
  amp, rot = 0, speed = 0.35, seed = "s", children, zoom = 1,
}) => {
  const f = useCurrentFrame();
  const x = noise2D(seed + "x", f * speed, 0) * amp;
  const y = noise2D(seed + "y", 0, f * speed) * amp;
  const r = noise2D(seed + "r", f * speed, 3) * rot;
  const z = zoom + (amp > 0 ? (amp / 1080) * 1.6 : 0); // overscan so edges never show
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${z})` }}>{children}</AbsoluteFill>;
};

/** Envelope helper: quick attack, exponential decay after `at`. */
export const impulse = (f: number, at: number, decay = 10, attack = 1) =>
  f < at - attack ? 0 : f < at ? (f - (at - attack)) / attack : Math.exp(-(f - at) / decay);

export const Flash: React.FC<{ at: number; color?: string; peak?: number; decay?: number }> = ({ at, color = "#fff", peak = 1, decay = 6 }) => {
  const f = useCurrentFrame();
  const o = impulse(f, at, decay, 1.5) * peak;
  if (o < 0.002) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen" }} />;
};

export const Fade: React.FC<{ from: number; to: number; color?: string; out?: boolean }> = ({ from, to, color = "#000", out = true }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, to], out ? [0, 1] : [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o }} />;
};

/** Deterministic pseudo-random helper */
export const rnd = (seed: string | number) => random(seed);
