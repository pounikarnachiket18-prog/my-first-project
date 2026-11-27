import React, { useMemo } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Deterministic 2D particle layers composited over the 3D renders.
 *  - streaks : debris / wind streaks flying EAST (screen right) at speed
 *  - rain    : slanted storm rain
 *  - dust    : big soft dust clouds sweeping right
 *  - motes   : floating dust / embers
 *  - snow    : frost crystals drifting in the dark
 */
type Kind = "streaks" | "rain" | "dust" | "motes" | "snow" | "embers";

export const Particles: React.FC<{
  kind: Kind; count?: number; seed?: string; speed?: number; opacity?: number; color?: string; dir?: number; size?: number; start?: number;
}> = ({ kind, count = 120, seed = kind, speed = 1, opacity = 1, color, dir = 0, size = 1, start = 0 }) => {
  const f = Math.max(0, useCurrentFrame() - start);
  const { width: W, height: H } = useVideoConfig();
  const ps = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        x: random(`${seed}x${i}`),
        y: random(`${seed}y${i}`),
        z: random(`${seed}z${i}`), // depth: 0 far .. 1 near
        r: random(`${seed}r${i}`),
      })),
    [count, seed],
  );
  const els: React.ReactNode[] = [];
  ps.forEach((p, i) => {
    const near = 0.25 + p.z * 0.75;
    if (kind === "streaks") {
      const v = (40 + 90 * near) * speed;
      const x = ((p.x * (W + 800) + f * v) % (W + 800)) - 400;
      const y = p.y * H + Math.sin(f * 0.1 + p.r * 9) * 6;
      const len = (60 + 260 * near) * speed;
      els.push(
        <line key={i} x1={x} y1={y} x2={x - len} y2={y + len * 0.04 * (p.r - 0.5)} stroke={color ?? (p.r > 0.7 ? "#3a2a1e" : "#cdbba5")}
          strokeWidth={(1 + 5 * near * near) * size} strokeLinecap="round" opacity={(0.25 + 0.6 * near) * opacity} />,
      );
    } else if (kind === "rain") {
      const v = (70 + 80 * near) * speed;
      const y = ((p.y * (H + 400) + f * v) % (H + 400)) - 200;
      const x = p.x * (W + 300) - 150 + (y * 0.35 + f * 8 * dir);
      const len = 40 + 110 * near;
      els.push(<line key={i} x1={x} y1={y} x2={x - len * 0.35} y2={y - len} stroke={color ?? "#c8d6e0"} strokeWidth={0.8 + 2.4 * near * size}
        opacity={(0.12 + 0.4 * near) * opacity} />);
    } else if (kind === "dust") {
      const v = (8 + 30 * near) * speed;
      const x = ((p.x * (W + 1400) + f * v) % (W + 1400)) - 700;
      const y = p.y * H * 1.1 - 50 + Math.sin(f * 0.02 + p.r * 6) * 30;
      const r = (180 + 420 * p.r) * size;
      els.push(<circle key={i} cx={x} cy={y} r={r} fill={color ?? "#b48a5e"} opacity={(0.05 + 0.12 * near) * opacity} filter="url(#pblur)" />);
    } else if (kind === "motes" || kind === "embers") {
      const x = (p.x * W + Math.sin(f * 0.03 + p.r * 10) * 40 + f * dir * (1 + near) * speed) % W;
      const y = ((p.y * H - f * (0.6 + near) * speed * (kind === "embers" ? 3 : 1)) % H + H) % H;
      const tw = 0.5 + 0.5 * Math.sin(f * 0.25 + p.r * 30);
      els.push(<circle key={i} cx={x} cy={y} r={(1 + 3.5 * near) * size} fill={color ?? (kind === "embers" ? "#ffb060" : "#fff3dc")}
        opacity={(0.2 + 0.6 * near) * tw * opacity} />);
    } else if (kind === "snow") {
      const x = ((p.x * W + f * (1.5 + 4 * near) * speed + Math.sin(f * 0.05 + p.r * 9) * 20) % W + W) % W;
      const y = ((p.y * H + f * (0.8 + 2.5 * near) * speed) % H + H) % H;
      els.push(<circle key={i} cx={x} cy={y} r={(0.8 + 3 * near * near) * size} fill={color ?? "#e6f2ff"} opacity={(0.25 + 0.6 * near) * opacity} />);
    }
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <filter id="pblur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
        {els}
      </svg>
    </AbsoluteFill>
  );
};
