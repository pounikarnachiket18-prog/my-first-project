import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { FPS } from "../timeline";
import cues from "../data/dialogue.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Film-style dialogue subtitles. Radio (off-screen) lines are set in italics, as in theatrical subtitling. */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const c = (cues as { who: string; text: string; start: number; end: number }[]).find((q) => t >= q.start - 0.05 && t < q.end + 0.45);
  if (!c) return null;
  const a = interpolate(t, [c.start - 0.05, c.start + 0.08, c.end + 0.3, c.end + 0.45], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 470 }}>
      <div
        style={{
          fontFamily: FONT.sans, fontWeight: 600, fontStyle: c.who === "control" ? "italic" : "normal", fontSize: 50, lineHeight: 1.25,
          color: "#fff", textAlign: "center", maxWidth: 900, opacity: a, letterSpacing: "0.01em",
          textShadow: "0 0 3px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.85), 0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        {c.text}
      </div>
    </AbsoluteFill>
  );
};

/** Small HUD-style science super (top of frame). */
export const Super: React.FC<{ at: number; out: number; lines: { t: string; size?: number; color?: string }[]; y?: number }> = ({ at, out, lines, y = 150 }) => {
  const f = useCurrentFrame();
  if (f < at || f >= out) return null;
  const a = interpolate(f, [at, at + 6, out - 6, out], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: y, opacity: a }}>
      {lines.map((l, i) => {
        const shown = Math.floor(interpolate(f, [at + i * 4, at + i * 4 + 14], [0, l.t.length], clamp));
        return (
          <div key={i} style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: l.size ?? 30, color: l.color ?? "#f2e6d2", letterSpacing: "0.12em",
            textShadow: "0 0 8px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8)", marginTop: i ? 10 : 0, whiteSpace: "pre" }}>
            {l.t.slice(0, shown)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Rotation-speed readout that winds down to zero at the moment the planet stops. */
export const SpeedReadout: React.FC<{ at: number; stop: number; out: number }> = ({ at, stop, out }) => {
  const f = useCurrentFrame();
  if (f < at || f >= out) return null;
  // Earth's surface speed at Mumbai's latitude: 1,674 km/h x cos(19 deg) ~= 1,583 km/h
  const v = Math.round(interpolate(f, [at + 8, stop], [1583, 0], { ...clamp, easing: (x) => x * x * x }));
  const a = interpolate(f, [at, at + 5, out - 6, out], [0, 1, 1, 0], clamp);
  const red = f >= stop;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 150, opacity: a }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 26, color: "#d8cbb6", letterSpacing: "0.16em", textShadow: "0 0 8px #000" }}>EARTH'S ROTATION · MUMBAI 19°N</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 84, fontWeight: 500, color: red ? "#ff4a3a" : "#fff", letterSpacing: "0.04em", textShadow: "0 0 14px rgba(0,0,0,0.9)", marginTop: 6 }}>
        {v.toLocaleString("en-IN")} <span style={{ fontSize: 40 }}>KM/H</span>
      </div>
    </AbsoluteFill>
  );
};
