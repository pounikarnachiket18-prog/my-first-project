import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F, SAFFRON } from "./theme";

export const TopBar: React.FC<{ ep?: string }> = ({ ep = "EP 01" }) => (
  <div
    style={{
      position: "absolute",
      top: 54,
      left: 48,
      right: 48,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: F.ui,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: 3,
      color: "rgba(255,255,255,0.7)",
    }}
  >
    <span>INDIAN ROADS · {ep}</span>
    <span>NH 48</span>
  </div>
);

// Location / status chip (e.g. "● KHANDALA GHAT, MAHARASHTRA")
export const Chip: React.FC<{ text: string; from?: number; y?: number; dot?: string }> = ({
  text,
  from = 0,
  y = 130,
  dot = "#FF3B30",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 160 } });
  if (frame < from) return null;
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0.35;
  return (
    <div style={{ position: "absolute", top: y, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${s})`,
          background: "rgba(10,20,25,0.72)",
          border: "2px solid rgba(255,255,255,0.18)",
          borderRadius: 40,
          padding: "12px 26px",
          fontFamily: F.ui,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: 3,
          color: "#FFF",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 7, background: dot, opacity: blink }} />
        {text}
      </div>
    </div>
  );
};

// Word-by-word kinetic caption at the bottom (replaces the old voiceover captions).
export const Caption: React.FC<{ text: string; from: number; to: number; highlight?: string[]; y?: number }> = ({
  text,
  from,
  to,
  highlight = [],
  y = 1540,
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const words = text.split(" ");
  const out = interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 70,
        right: 70,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 14px",
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const appear = from + i * 3;
        const o = interpolate(frame, [appear, appear + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const ty = interpolate(frame, [appear, appear + 6], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const hl = highlight.includes(w.replace(/[^\p{L}\p{N}₹]/gu, ""));
        return (
          <span
            key={i}
            style={{
              opacity: o,
              transform: `translateY(${ty}px)`,
              fontFamily: F.fun,
              fontWeight: 800,
              fontSize: 60,
              lineHeight: 1.1,
              color: hl ? SAFFRON : "#FFF",
              textShadow: "0 4px 0 rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.5)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

// Warm film grade on top of everything (the "colour change").
export const Grade: React.FC<{ night?: boolean }> = ({ night }) => (
  <AbsoluteFill
    style={{
      background: night
        ? "linear-gradient(180deg, rgba(0,80,110,0.10), rgba(255,120,40,0.06))"
        : "linear-gradient(180deg, rgba(0,90,100,0.10), rgba(255,140,40,0.10))",
      mixBlendMode: "overlay",
    }}
  />
);

export const Flash: React.FC<{ at: number; dur?: number; color?: string }> = ({ at, dur = 8, color = "#FFF" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2, at + dur], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o }} />;
};
