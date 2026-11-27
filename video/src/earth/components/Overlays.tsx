import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { FONT } from "../fonts";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const outline = (px: number) => ({ WebkitTextStroke: `${px}px #000`, paintOrder: "stroke fill" as const });

/** Big clean number counting up to 1,670 km/h (reference-style bold text, no gauges). */
export const SpeedCounter: React.FC<{ from: number; to: number; at: number; out: number }> = ({ from, to, at, out }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || f > out + 8) return null;
  const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 220 } });
  const t = interpolate(f, [from, to], [0, 1], { ...cl, easing: Easing.bezier(0.2, 0, 0.1, 1) });
  const v = Math.round(1670 * t);
  const o = interpolate(f, [out, out + 8], [1, 0], cl);
  return (
    <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})` }}>
      <div style={{ fontFamily: FONT.title, fontSize: 200, lineHeight: 1, color: "#ffd21f", ...outline(12), textShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
        {v.toLocaleString("en-IN")}
      </div>
      <div style={{ fontFamily: FONT.sub, fontWeight: 900, fontSize: 64, letterSpacing: 6, color: "#fff", ...outline(8), marginTop: 4 }}>KM/H</div>
    </div>
  );
};

/** Short bold headline (white, black outline), e.g. "1 DIN = 1 SAAL". */
export const Headline: React.FC<{ at: number; out: number; lines: { t: string; c?: string; size?: number }[]; y?: number }> = ({ at, out, lines, y = 0.12 }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  if (f < at || f > out + 8) return null;
  const o = interpolate(f, [out, out + 8], [1, 0], cl);
  return (
    <div style={{ position: "absolute", top: height * y, left: 30, right: 30, textAlign: "center", opacity: o }}>
      {lines.map((ln, i) => {
        const s = spring({ frame: f - at - i * 4, fps, config: { damping: 13, stiffness: 240 } });
        return (
          <div key={i} style={{ fontFamily: FONT.title, fontSize: ln.size ?? 130, lineHeight: 1.02, color: ln.c ?? "#fff", ...outline(11),
            textShadow: "0 10px 30px rgba(0,0,0,.45)", transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`, opacity: s }}>
            {ln.t}
          </div>
        );
      })}
    </div>
  );
};

/** "1 DIN = 24 GHANTE" with a red strike-through. */
export const StrikeLine: React.FC<{ at: number; strike: number; out: number }> = ({ at, strike, out }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || f > out + 4) return null;
  const s = spring({ frame: f - at, fps, config: { damping: 14 } });
  const st = interpolate(f, [strike, strike + 6], [0, 1], cl);
  const o = interpolate(f, [out - 4, out + 2], [1, 0], cl);
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", opacity: s * o }}>
      <span style={{ position: "relative", fontFamily: FONT.title, fontSize: 118, color: "#fff", ...outline(10) }}>
        1 DIN = 24 GHANTE
        <span style={{ position: "absolute", left: -12, right: -12, top: "50%", height: 16, background: "#ff3030", border: "4px solid #000",
          transform: `scaleX(${st}) rotate(-5deg)`, transformOrigin: "left" }} />
      </span>
    </div>
  );
};

type Track = { m: [number, number]; e: [number, number]; s: [number, number]; day: boolean; front: boolean }[];
let trackCache: Track | null = null;

/** Labels that follow the Sun and the India marker in the Blender orbit diagram (positions exported from Blender). */
export const OrbitLabels: React.FC<{ shotFrame: number }> = ({ shotFrame }) => {
  const { width: W, height: H } = useVideoConfig();
  const [track, setTrack] = React.useState<Track | null>(trackCache);
  const [handle] = React.useState(() => (trackCache ? null : delayRender("orbit track")));
  React.useEffect(() => {
    if (trackCache) return;
    fetch(staticFile("earth/renders/E2/track.json"))
      .then((r) => r.json())
      .then((j) => { trackCache = j; setTrack(j); })
      .finally(() => handle !== null && continueRender(handle));
  }, [handle]);
  if (!track) return null;
  const k = Math.max(0, Math.min(track.length - 1, shotFrame));
  const p = track[k];
  const o = interpolate(shotFrame, [6, 14], [0, 1], cl);
  const label = (x: number, y: number, text: string, color: string, dx = 0, dy = -70) => (
    <div style={{ position: "absolute", left: x * W + dx, top: y * H + dy, transform: "translateX(-50%)", whiteSpace: "nowrap", opacity: o,
      fontFamily: FONT.sub, fontWeight: 900, fontSize: 46, color, ...outline(7) }}>
      {text}
    </div>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {label(p.s[0], p.s[1], "☀ SURAJ", "#ffd21f", 0, 80)}
      {label(p.m[0], p.m[1], p.day ? "BHARAT · DIN" : "BHARAT · RAAT", p.day ? "#ffd21f" : "#8fd8ff", 0, -95)}
    </AbsoluteFill>
  );
};

/** Two labels for the half-lit planet. */
export const SideLabels: React.FC<{ dayAt: number; nightAt: number; out: number }> = ({ dayAt, nightAt, out }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const one = (at: number, text: string, color: string, style: React.CSSProperties) => {
    if (f < at || f > out + 6) return null;
    const s = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 240 } });
    return (
      <div style={{ position: "absolute", ...style, textAlign: "center", fontFamily: FONT.title, fontSize: 96, lineHeight: 1, color, ...outline(10),
        transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`, opacity: s * interpolate(f, [out, out + 6], [1, 0], cl) }}>
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {one(dayAt, "6 MAHINE\nDIN".split("\n").join(" "), "#ffd21f", { top: 250, right: 40, width: 480 })}
      {one(nightAt, "6 MAHINE RAAT", "#8fd8ff", { top: 1500, left: 40, width: 480 })}
    </AbsoluteFill>
  );
};
