import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, display, sans } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const TRAIN_NAME = "RAJDHANI EXPRESS";

/** Dot-matrix LED text (amber dots, like an Indian Railways destination board). */
const LedText: React.FC<{ text: string; size: number; color?: string; dot?: number; offsetX?: number }> = ({ text, size, color = brand.led, dot, offsetX = 0 }) => {
  const d = dot ?? Math.max(1.6, size / 9);
  const mask = `radial-gradient(circle, #000 52%, transparent 58%)`;
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: display,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: size * 0.08,
        color,
        whiteSpace: "nowrap",
        transform: `translateX(${offsetX}px)`,
        textShadow: `0 0 ${size * 0.25}px ${color}`,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: `${d}px ${d}px`,
        maskSize: `${d}px ${d}px`,
      }}
    >
      {text}
    </span>
  );
};

/** LED destination board fixed to the loco's front (scrolls the train name). */
export const FrontLedBoard: React.FC<{ x: number; y: number; w: number; on?: number }> = ({ x, y, w, on = 1 }) => {
  const frame = useCurrentFrame();
  const h = w * 0.2;
  const size = h * 0.78;
  const textW = size * 0.5 * TRAIN_NAME.length; // approx Bebas advance
  const scroll = w - ((frame * size * 0.09) % (textW + w));
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y,
        width: w,
        height: h,
        background: "#07050c",
        border: `${Math.max(1, w / 90)}px solid #2a2a33`,
        borderRadius: h * 0.12,
        overflow: "hidden",
        opacity: on,
        boxShadow: `0 0 ${h * 0.6}px rgba(255,154,31,0.35)`,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: (h - size) / 2 - 1 }}>
        <LedText text={TRAIN_NAME} size={size} offsetX={scroll} dot={Math.max(1.2, size / 7)} />
      </div>
    </div>
  );
};

/** Painted name on the loco side, tracked to the body (skewed with the perspective). */
export const SideLettering: React.FC<{ x: number; y: number; skew: number; scale: number }> = ({ x, y, skew, scale }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) skewY(${skew}deg) scale(${scale})`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      lineHeight: 0.92,
      filter: "blur(0.25px)",
      opacity: 0.94,
    }}
  >
    <span style={{ fontFamily: sans, fontWeight: 900, fontSize: 12, letterSpacing: 0.6, color: "#FFF3D6", textShadow: "0 0 2px rgba(0,0,0,0.35)" }}>RAJDHANI</span>
    <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 8.6, letterSpacing: 1.6, color: "#FFD36B" }}>EXPRESS</span>
  </div>
);

/** Title card: animated LED board + neon frame. */
export const TrainTitle: React.FC<{ from: number; to: number; y: number }> = ({ from, to, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const enter = spring({ frame: f, fps, config: { damping: 14, stiffness: 140 } });
  const out = interpolate(frame, [to - 7, to], [1, 0], clamp);
  // letters flicker on one by one like an LED board booting up
  const shown = Math.floor(interpolate(f, [4, 20], [0, TRAIN_NAME.length], { ...clamp, easing: Easing.out(Easing.quad) }));
  const text = TRAIN_NAME.split("").map((c, i) => (i < shown ? c : " ")).join("");
  const sweep = interpolate(f, [16, 34], [-30, 130], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          position: "relative",
          padding: "10px 20px 8px",
          borderRadius: 14,
          background: "linear-gradient(160deg, #1b0f3d, #07050c 70%)",
          border: `2px solid ${brand.cyan}`,
          boxShadow: `0 0 18px rgba(34,230,255,0.55), 0 0 36px rgba(255,46,147,0.3)`,
          transform: `scaleX(${enter}) translateY(${(1 - enter) * 20}px)`,
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 10, letterSpacing: 4, color: brand.magenta, marginBottom: 4 }}>NOW RUNNING</div>
        <LedText text={text} size={42} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sweep}%`, width: "22%", background: "linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))" }} />
      </div>
    </div>
  );
};
