import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import "../india/theme"; // registers the self-hosted @font-face rules

const UI = "Montserrat, sans-serif";
const MONO = "ui-monospace, 'DejaVu Sans Mono', monospace";

// Renders children only once fonts are loaded (canvas textures need them).
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("3D reel fonts", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
      continueRender(handle);
    };
    Promise.all([
      document.fonts.load("900 40px Montserrat"),
      document.fonts.load("800 40px Montserrat"),
      document.fonts.load("700 40px Montserrat"),
      document.fonts.load("800 40px 'Baloo 2'", "Ab"),
      document.fonts.load("800 40px 'Noto Sans Devanagari'", "ढाबा"),
    ])
      .catch(() => undefined)
      .finally(finish);
    const t = setTimeout(finish, 15000);
    return () => clearTimeout(t);
  }, [handle]);
  return ready ? <>{children}</> : null;
};

export const Header: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 30,
      left: 34,
      right: 34,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: MONO,
      fontSize: 17,
      letterSpacing: 3,
      color: "rgba(255,255,255,0.5)",
    }}
  >
    <span>HOW IT SECRETLY WORKS · #18</span>
    <span>ILLUSTRATIVE</span>
  </div>
);

export const Chip: React.FC<{ text: string; from?: number; to?: number; dot?: string }> = ({ text, from = 0, to = 99999, dot = "#FF3B30" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 16, stiffness: 170 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 82, width: "100%", display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          transform: `scale(${0.85 + 0.15 * s})`,
          opacity: s,
          background: "rgba(16,18,26,0.86)",
          borderRadius: 30,
          padding: "11px 24px",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 23,
          letterSpacing: 3,
          color: "#FFF",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ width: 13, height: 13, borderRadius: 7, background: dot }} />
        {text}
      </div>
    </div>
  );
};

export const Title: React.FC<{ from?: number; to: number }> = ({ from = 0, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const o = interpolate(frame, [from, from + 8, to - 10, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", opacity: o }}>
      <div style={{ fontFamily: UI, fontWeight: 900, fontSize: 80, lineHeight: 1.02, color: "#FFF", letterSpacing: -2, textShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
        HOW DOES MAPS KNOW
      </div>
      <div style={{ fontFamily: UI, fontWeight: 900, fontSize: 80, lineHeight: 1.02, color: "#FF4A3D", letterSpacing: -2, textShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
        THERE&apos;S TRAFFIC?
      </div>
      <div style={{ marginTop: 18, fontFamily: UI, fontWeight: 800, fontSize: 28, letterSpacing: 6, color: "#FFE3A8", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
        NH 48 · MUMBAI → PUNE
      </div>
    </div>
  );
};

// Captions: each phrase spans [from,to]; words light up one by one like the original.
export type Phrase = { from: number; to: number; text: string; hl?: string[] };

export const Captions: React.FC<{ phrases: Phrase[] }> = ({ phrases }) => {
  const frame = useCurrentFrame();
  const p = phrases.find((x) => frame >= x.from && frame < x.to);
  if (!p) return null;
  const words = p.text.split(" ");
  const span = Math.max(1, (p.to - p.from) * 0.75);
  return (
    <div style={{ position: "absolute", top: 1438, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: "rgba(16,18,28,0.82)",
          borderRadius: 10,
          padding: "14px 26px 16px",
          display: "flex",
          gap: 14,
          fontFamily: UI,
          fontWeight: 800,
          fontSize: 50,
          maxWidth: 940,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {words.map((w, i) => {
          const at = p.from + (span * i) / words.length;
          const lit = frame >= at;
          const cur = lit && frame < p.from + (span * (i + 1)) / words.length + 4;
          const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
          const hl = p.hl?.includes(clean);
          return (
            <span
              key={i}
              style={{
                color: lit ? (hl ? "#FFB347" : "#FFFFFF") : "rgba(255,255,255,0.38)",
                borderBottom: cur ? "4px solid #FFFFFF" : "4px solid transparent",
                lineHeight: 1.15,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const DataCard: React.FC<{
  x: number;
  y: number;
  big: string;
  unit?: string;
  sub?: string;
  plate?: string;
  bar?: string;
  from: number;
  to: number;
  scale?: number;
}> = ({ x, y, big, unit, sub, plate, bar, from, to, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 15, stiffness: 180 } });
  const out = interpolate(frame, [to - 5, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${(0.8 + 0.2 * s) * scale})`,
        transformOrigin: "left top",
        opacity: s * out,
        background: "rgba(16,18,28,0.88)",
        borderLeft: bar ? `7px solid ${bar}` : undefined,
        borderRadius: 8,
        padding: "14px 22px 16px",
      }}
    >
      <div style={{ fontFamily: UI, fontWeight: 900, fontSize: 74, color: "#FFF", lineHeight: 1 }}>
        {big}
        {unit && <span style={{ fontSize: 30, fontWeight: 800, marginLeft: 8 }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{sub}</div>}
      {plate && (
        <div
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#FFF",
            border: "3px solid #111",
            borderRadius: 5,
            padding: "3px 12px 3px 4px",
            fontFamily: UI,
            fontWeight: 900,
            fontSize: 28,
            color: "#111",
          }}
        >
          <span style={{ background: "#1A3E9A", color: "#FFF", fontSize: 13, padding: "4px 4px", borderRadius: 3 }}>IND</span>
          {plate}
        </div>
      )}
    </div>
  );
};

export const SpeechBubble: React.FC<{ x: number; y: number; text: string; from: number; to: number; color?: string; tail?: "left" | "right" }> = ({
  x,
  y,
  text,
  from,
  to,
  color = "#FFFFFF",
  tail = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 11, stiffness: 220 } });
  const out = interpolate(frame, [to - 4, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = Math.sin(frame * 2.1) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${s}) rotate(${shake * 0.4}deg)`,
        transformOrigin: tail === "left" ? "20% 100%" : "80% 100%",
        opacity: out,
      }}
    >
      <div
        style={{
          background: color,
          border: "5px solid #111",
          borderRadius: 26,
          padding: "14px 24px",
          fontFamily: "'Baloo 2', Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 44,
          lineHeight: 1.1,
          color: "#111",
          maxWidth: 520,
          textAlign: "center",
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -26,
          [tail === "left" ? "left" : "right"]: 60,
          width: 0,
          height: 0,
          borderLeft: "18px solid transparent",
          borderRight: "18px solid transparent",
          borderTop: "30px solid #111",
        }}
      />
    </div>
  );
};

export const Honk: React.FC<{ x: number; y: number; text: string; from: number; dur?: number; color?: string }> = ({ x, y, text, from, dur = 22, color = "#FFD400" }) => {
  const frame = useCurrentFrame();
  const l = frame - from;
  if (l < 0 || l > dur) return null;
  const p = Math.min(1, l / 4) * Math.min(1, (dur - l) / 4);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * p}) rotate(${-8 + Math.sin(l * 2.4) * 4}deg)`,
        opacity: p,
        background: color,
        border: "5px solid #111",
        borderRadius: 14,
        padding: "8px 20px",
        fontFamily: "'Baloo 2', Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 46,
        color: "#111",
        clipPath: "polygon(0% 15%, 8% 0%, 20% 12%, 35% 0%, 50% 12%, 65% 0%, 80% 12%, 92% 0%, 100% 15%, 94% 50%, 100% 85%, 92% 100%, 80% 88%, 65% 100%, 50% 88%, 35% 100%, 20% 88%, 8% 100%, 0% 85%, 6% 50%)",
      }}
    >
      {text}
    </div>
  );
};

export const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6, dur - 4, dur], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
