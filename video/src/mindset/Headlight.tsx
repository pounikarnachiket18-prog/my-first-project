import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";

type GlowProps = {
  x: number;
  y: number;
  size: number; // core radius in px (720-space)
  intensity?: number;
  seed?: string;
  streak?: boolean;
  rays?: boolean;
  tint?: string;
};

/** A layered, screen-blended headlamp: hot core, bloom, anamorphic streak, star rays. */
export const LampGlow: React.FC<GlowProps> = ({
  x,
  y,
  size,
  intensity = 1,
  seed = "lamp",
  streak = true,
  rays = true,
  tint = "255, 236, 190",
}) => {
  const frame = useCurrentFrame();
  const flicker = 1 + noise2D(seed, frame * 0.15, 0) * 0.07;
  const k = intensity * flicker;
  const layer = (w: number, h: number, bg: string, opacity: number, extra?: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        background: bg,
        opacity: Math.min(1, opacity),
        mixBlendMode: "screen",
        pointerEvents: "none",
        ...extra,
      }}
    />
  );
  return (
    <>
      {/* wide atmospheric bloom */}
      {layer(size * 14, size * 14, `radial-gradient(circle, rgba(${tint},0.55) 0%, rgba(${tint},0.18) 28%, rgba(${tint},0) 62%)`, 0.75 * k, { borderRadius: "50%" })}
      {/* mid bloom */}
      {layer(size * 5, size * 5, `radial-gradient(circle, rgba(255,250,235,0.95) 0%, rgba(${tint},0.6) 30%, rgba(${tint},0) 70%)`, 0.9 * k, { borderRadius: "50%" })}
      {/* anamorphic streak */}
      {streak &&
        layer(size * 26, size * 0.9, `radial-gradient(ellipse at center, rgba(235,240,255,0.95) 0%, rgba(170,190,255,0.45) 30%, rgba(140,160,255,0) 70%)`, 0.7 * k, { borderRadius: "50%" })}
      {/* star rays */}
      {rays &&
        layer(size * 9, size * 9, `repeating-conic-gradient(from ${frame * 0.6}deg, rgba(255,255,255,0.55) 0deg 2deg, rgba(255,255,255,0) 2deg 45deg)`, 0.35 * k, {
          borderRadius: "50%",
          WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 65%)",
          maskImage: "radial-gradient(circle, #000 0%, transparent 65%)",
        })}
      {/* hot core */}
      {layer(size * 1.6, size * 1.6, `radial-gradient(circle, #ffffff 0%, #fffaf0 40%, rgba(255,245,220,0) 75%)`, 1 * k, { borderRadius: "50%" })}
    </>
  );
};

/** A soft cone of light from the lamp toward the viewer / down onto the track. */
export const LightBeam: React.FC<{ x: number; y: number; topW: number; bottomW: number; opacity: number }> = ({
  x,
  y,
  topW,
  bottomW,
  opacity,
}) => {
  const h = 1280 - y;
  return (
    <div
      style={{
        position: "absolute",
        left: x - bottomW / 2,
        top: y,
        width: bottomW,
        height: h,
        background: "linear-gradient(180deg, rgba(255,240,200,0.55) 0%, rgba(255,230,180,0.18) 45%, rgba(255,230,180,0) 100%)",
        clipPath: `polygon(${50 - (topW / bottomW) * 50}% 0%, ${50 + (topW / bottomW) * 50}% 0%, 100% 100%, 0% 100%)`,
        mixBlendMode: "screen",
        filter: "blur(6px)",
        opacity,
      }}
    />
  );
};

// Final approach shot keyframes: [frame, roofX, roofY, redLx, redLy, redRx, redRy]
const FINAL_KF: number[][] = [
  [1121, 360, 605, 323, 690, 424, 690],
  [1155, 360, 605, 322, 692, 426, 692],
  [1185, 360, 600, 320, 695, 430, 695],
  [1215, 360, 592, 315, 698, 435, 698],
  [1245, 360, 590, 312, 702, 443, 706],
  [1275, 360, 592, 310, 708, 450, 708],
  [1305, 360, 598, 305, 710, 455, 712],
  [1320, 362, 598, 305, 710, 455, 712],
];

export const finalLamps = (frame: number) => {
  const col = (c: number) =>
    interpolate(
      frame,
      FINAL_KF.map((k) => k[0]),
      FINAL_KF.map((k) => k[c]),
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  const roof = { x: col(1), y: col(2) };
  const L = { x: col(3), y: col(4) };
  const R = { x: col(5), y: col(6) };
  const s = R.x - L.x;
  return {
    roof,
    lowerL: { x: L.x + 7, y: L.y + 0.54 * s },
    lowerR: { x: R.x + 7, y: R.y + 0.54 * s },
    spacing: s,
  };
};
