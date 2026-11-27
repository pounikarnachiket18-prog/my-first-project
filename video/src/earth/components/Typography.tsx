import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { FONT } from "../fonts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Big cinematic title: letters slam in with tracking compression and a light sweep. */
export const TitleCard: React.FC<{
  lines: { text: string; color?: string; size?: number }[];
  at: number;
  out?: number;
  y?: number;
  glow?: string;
}> = ({ lines, at, out = 1e9, y = 0.3, glow = "#7fd4ff" }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  if (f < at - 1 || f > out + 12) return null;
  const outT = interpolate(f, [out, out + 10], [1, 0], clamp);
  const back = 0 * outT;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ opacity: back, background: `linear-gradient(180deg, rgba(0,0,0,0.0) ${y * 100 - 12}%, rgba(0,0,0,0.55) ${y * 100 + 6}%, rgba(0,0,0,0.55) ${y * 100 + 16}%, rgba(0,0,0,0) ${y * 100 + 30}%)` }} />
      <div style={{ position: "absolute", top: height * y, left: 40, right: 40, textAlign: "center", opacity: outT }}>
        {lines.map((ln, i) => {
          const s = spring({ frame: f - at - i * 5, fps, config: { damping: 14, stiffness: 180, mass: 0.8 } });
          const track = interpolate(s, [0, 1], [40, 2]);
          const blur = interpolate(s, [0, 1], [14, 0]);
          const sweep = interpolate(f - at - i * 5, [6, 30], [-30, 130], clamp);
          return (
            <div
              key={i}
              style={{
                fontFamily: FONT.title,
                fontSize: ln.size ?? 132,
                lineHeight: 0.98,
                letterSpacing: track,
                color: ln.color ?? "#fff",
                textTransform: "uppercase",
                transform: `scale(${interpolate(s, [0, 1], [1.35, 1])})`,
                opacity: s,
                filter: `blur(${blur}px)`,
                textShadow: `0 0 40px ${glow}66, 0 10px 30px rgba(0,0,0,0.7)`,
                backgroundImage: `linear-gradient(100deg, transparent ${sweep - 18}%, rgba(255,255,255,0.95) ${sweep}%, transparent ${sweep + 18}%), linear-gradient(${ln.color ?? "#fff"}, ${ln.color ?? "#fff"})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {ln.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Scientific label: kicker + headline + optional sub-line, with an animated rule. */
export const Callout: React.FC<{
  at: number; out?: number; kicker?: string; title: string; sub?: string; accent?: string; x?: number; y?: number; align?: "left" | "center" | "right";
  size?: number;
}> = ({ at, out = 1e9, kicker, title, sub, accent = "#ffc24a", x = 0.5, y = 0.18, align = "center", size = 96 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (f < at - 1 || f > out + 12) return null;
  const s = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 200 } });
  const o = interpolate(f, [out, out + 10], [1, 0], clamp);
  const rule = interpolate(f - at, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0%";
  return (
    <div style={{ position: "absolute", left: width * x, top: height * y, transform: `translateX(${tx})`, textAlign: align, opacity: o, pointerEvents: "none", width: width - 120 }}>
      {kicker && (
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: 8, color: accent, opacity: s, textShadow: "0 2px 10px #000" }}>
          {kicker}
        </div>
      )}
      <div
        style={{
          height: 4, background: accent, width: `${rule * 100}%`, margin: align === "center" ? "10px auto" : "10px 0",
          boxShadow: `0 0 18px ${accent}`, maxWidth: 520, marginLeft: align === "right" ? "auto" : undefined,
        }}
      />
      <div
        style={{
          fontFamily: FONT.title, fontSize: size, color: "#fff", lineHeight: 1, letterSpacing: interpolate(s, [0, 1], [18, 1]),
          transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`, opacity: s, textShadow: `0 0 34px ${accent}88, 0 8px 24px rgba(0,0,0,0.8)`,
        }}
      >
        {title}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT.sub, fontWeight: 600, fontSize: 34, color: "#e9eef5", marginTop: 12, opacity: interpolate(f - at, [8, 20], [0, 0.92], clamp), textShadow: "0 2px 12px #000" }}>
          {sub}
        </div>
      )}
    </div>
  );
};

/** Small corner tag, documentary style (e.g. "ILLUSTRATIVE · NOT TO SCALE"). */
export const Tag: React.FC<{ text: string; at?: number; out?: number; y?: number }> = ({ text, at = 0, out = 1e9, y = 0.085 }) => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const o = interpolate(f, [at, at + 10, out, out + 10], [0, 0.85, 0.85, 0], clamp);
  return (
    <div style={{ position: "absolute", top: height * y, left: 0, right: 0, textAlign: "center", opacity: o, fontFamily: FONT.mono, fontSize: 24, letterSpacing: 5, color: "#dfe7ef", textShadow: "0 2px 8px #000" }}>
      {text}
    </div>
  );
};
