/**
 * Editorial science-documentary typography. Minimal, bold, readable on a
 * phone. Everything stays inside Reels/Shorts safe margins:
 *   x ∈ [72, 960], y ∈ [200, 1480] (bottom UI + right action rail avoided).
 */
import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, smoothstep, easeOut, FPS } from "../core/anim";
import { projectPoint, Shot, V3 } from "../core/Stage";

export const FONT = {
  sans: "'JKI Sans', 'Inter Tight', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JKI Mono', 'JetBrains Mono', ui-monospace, monospace",
  deva: "'JKI Deva', 'Noto Sans Devanagari', sans-serif",
};

export const SAFE = { left: 72, right: 960, top: 200, bottom: 1480 };

const FACES: [string, string][] = [
  ["JKI Sans", "InterTight.woff2"],
  ["JKI Mono", "JetBrainsMono.woff2"],
  ["JKI Deva", "NotoSansDevanagari.woff2"],
];
let fontsReady = false;

/** Load the bundled fonts (no network) before the first frame is captured. */
export function useBrandFonts() {
  const [handle] = useState(() => (fontsReady ? null : delayRender("Loading JKI fonts")));
  useEffect(() => {
    if (handle === null) return;
    Promise.all(
      FACES.map(([family, file]) => {
        const f = new FontFace(family, `url(${staticFile(`jki/fonts/${file}`)}) format('woff2')`, { weight: "100 900" });
        document.fonts.add(f);
        return f.load();
      }),
    )
      .then(() => {
        fontsReady = true;
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
}

const useT = () => {
  const frame = useCurrentFrame();
  return frame / FPS;
};

/** Big kinetic headline: words resolve from blur, then exit upward. */
export const Headline: React.FC<{
  /** absolute reel seconds */
  at: number;
  until: number;
  /** words; prefix a word with * to accent it */
  lines: string[];
  y?: number;
  size?: number;
  accent?: string;
  align?: "center" | "left";
  /** local sequence start (seconds) so useCurrentFrame maps to reel time */
  seqStart?: number;
  tracking?: number;
}> = ({ at, until, lines, y = 560, size = 118, accent = "#7ff3ff", align = "center", seqStart = 0, tracking = -3 }) => {
  const t = useT() + seqStart;
  if (t < at - 0.05 || t > until + 0.6) return null;
  let wi = 0;
  const exit = smoothstep(until, until + 0.45, t);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 1080 - SAFE.right,
        top: y,
        textAlign: align,
        fontFamily: FONT.sans,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.98,
        letterSpacing: tracking,
        color: "#ffffff",
        textTransform: "uppercase",
        transform: `translateY(${-exit * 40}px)`,
        opacity: 1 - exit,
        filter: `blur(${exit * 14}px)`,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((w, i) => {
            const k = wi++;
            const st = at + k * 0.09;
            const e = easeOut(clamp((t - st) / 0.42));
            const isAcc = w.startsWith("*");
            const word = isAcc ? w.slice(1) : w;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: size * 0.24,
                  opacity: e,
                  transform: `translateY(${(1 - e) * 34}px) scale(${1.06 - e * 0.06})`,
                  filter: `blur(${(1 - e) * 16}px)`,
                  color: isAcc ? accent : "#ffffff",
                  textShadow: isAcc ? `0 0 38px ${accent}88, 0 4px 30px rgba(0,0,0,0.55)` : "0 4px 30px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * Scientific callout anchored to a 3D point: ring marker + leader line +
 * mono label. The anchor is projected with the same camera function the
 * renderer uses, so it tracks the object exactly.
 */
export const SciLabel: React.FC<{
  at: number;
  until: number;
  shot: (t: number) => Shot;
  anchor: (t: number) => V3;
  text: React.ReactNode;
  sub?: string;
  dx?: number;
  dy?: number;
  color?: string;
  size?: number;
  seqStart?: number;
}> = ({ at, until, shot, anchor, text, sub, dx = 140, dy = -120, color = "#7ff3ff", size = 44, seqStart = 0 }) => {
  const t = useT() + seqStart;
  const { width, height } = useVideoConfig();
  if (t < at - 0.05 || t > until + 0.5) return null;
  const p = projectPoint(shot(t), anchor(t), width, height);
  const inn = easeOut(clamp((t - at) / 0.5));
  const out = 1 - smoothstep(until, until + 0.4, t);
  const a = inn * out;
  // keep label inside safe area (flip side if the text would leave it)
  const estW = typeof text === "string" ? text.length * size * 0.64 : 320;
  let lx = p.x + dx;
  let ly = p.y + dy;
  if (dx < 0 && lx - estW < SAFE.left) lx = p.x + Math.abs(dx);
  if (dx >= 0 && lx + estW > SAFE.right) lx = p.x - Math.abs(dx);
  lx = Math.min(Math.max(lx, SAFE.left), SAFE.right);
  ly = Math.min(Math.max(ly, SAFE.top + 40), SAFE.bottom - 80);
  const len = Math.hypot(lx - p.x, ly - p.y);
  const ang = Math.atan2(ly - p.y, lx - p.x);
  const ring = 18 + (1 - inn) * 30;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: p.x - ring,
          top: p.y - ring,
          width: ring * 2,
          height: ring * 2,
          borderRadius: "50%",
          border: `2.5px solid ${color}`,
          boxShadow: `0 0 18px ${color}aa`,
        }}
      />
      <div style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: "50%", background: color }} />
      <div
        style={{
          position: "absolute",
          left: p.x,
          top: p.y,
          width: len * smoothstep(at + 0.05, at + 0.4, t),
          height: 2.5,
          background: `linear-gradient(90deg, ${color}00, ${color})`,
          transformOrigin: "0 50%",
          transform: `rotate(${ang}rad)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lx + (Math.cos(ang) < 0 ? -12 : 12),
          top: ly - size * 0.62,
          transform: Math.cos(ang) < 0 ? "translateX(-100%)" : undefined,
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: 2,
          color: "#ffffff",
          textShadow: `0 0 24px ${color}99, 0 2px 14px rgba(0,0,0,0.7)`,
          whiteSpace: "nowrap",
          clipPath: `inset(0 ${(1 - smoothstep(at + 0.2, at + 0.65, t)) * 100}% 0 0)`,
        }}
      >
        {text}
        {sub ? (
          <div style={{ fontSize: size * 0.48, fontWeight: 500, letterSpacing: 3, color: `${color}`, marginTop: 6, textTransform: "uppercase" }}>{sub}</div>
        ) : null}
      </div>
    </div>
  );
};

/** Subscript helper for chemical formulas (CO₂ rendered with a true subscript). */
export const CO2Text: React.FC = () => (
  <span>
    CO<span style={{ fontSize: "0.62em", verticalAlign: "-0.28em" }}>2</span>
  </span>
);

/** Citation chip for the study reference. */
export const StudyChip: React.FC<{ at: number; until: number; seqStart?: number; y?: number }> = ({ at, until, seqStart = 0, y = 1290 }) => {
  const t = useT() + seqStart;
  if (t < at - 0.05 || t > until + 0.5) return null;
  const a = easeOut(clamp((t - at) / 0.45)) * (1 - smoothstep(until, until + 0.4, t));
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: y,
        opacity: a,
        transform: `translateY(${(1 - a) * 20}px)`,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 26px",
        borderRadius: 16,
        background: "rgba(6,14,20,0.62)",
        border: "1.5px solid rgba(127,243,255,0.45)",
        backdropFilter: "blur(10px)",
        fontFamily: FONT.mono,
        color: "#dff9ff",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, color: "#7ff3ff" }}>2022 STUDY</div>
      <div style={{ width: 2, height: 38, background: "rgba(127,243,255,0.45)" }} />
      <div style={{ fontSize: 27, fontWeight: 500, letterSpacing: 1 }}>
        <span style={{ fontWeight: 700 }}>Cell</span> · De Obaldia et al.
      </div>
    </div>
  );
};

/** Persistent tiny brand bug (top-left). */
export const BrandBug: React.FC<{ opacity?: number }> = ({ opacity = 0.75 }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: 120,
      fontFamily: FONT.sans,
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: 6,
      color: "#ffffff",
      opacity,
      textShadow: "0 2px 12px rgba(0,0,0,0.6)",
    }}
  >
    JUST KNOW IT<span style={{ color: "#7ff3ff" }}>.</span>
  </div>
);

/** Optional Hindi captions of the narration (off by default; see README). */
export const Caption: React.FC<{ text: string; at: number; until: number; seqStart?: number }> = ({ text, at, until, seqStart = 0 }) => {
  const t = useT() + seqStart;
  if (t < at || t > until) return null;
  const a = smoothstep(at, at + 0.15, t) * (1 - smoothstep(until - 0.15, until, t));
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 1080 - SAFE.right,
        top: 1390,
        textAlign: "center",
        fontFamily: FONT.deva,
        fontWeight: 700,
        fontSize: 44,
        lineHeight: 1.3,
        color: "#fff",
        opacity: a,
        textShadow: "0 2px 14px rgba(0,0,0,0.9)",
      }}
    >
      {text}
    </div>
  );
};

export const reelSeconds = (frame: number) => frame / FPS;
