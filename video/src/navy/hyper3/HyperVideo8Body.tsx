import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, OffthreadVideo, Img, staticFile, continueRender, delayRender, useCurrentFrame, interpolate } from "remotion";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/unbounded/800.css";
import tl from "../hyper8/timeline.json";
import { TimelineCtx, MotionCtx, SceneXCtx, TL } from "../v2/ctx";
import { ThemeCtx, DAY } from "../theme";
import { FastLabels } from "../world";
import { SCENES_H5 } from "./scenes_h5";
import { MarkingsCtx, RealismCtx } from "./Sprite";
import { JetEndCard } from "./endcard";
import { BrandMark, BrandWord } from "./brand";

const FPS = tl.fps;
const CREAM = "#f1ede3"; // background of the channel logo animation

// ---------- scene transitions (one per cut, picked for the story beat) ----------
type Kind = "flash" | "iris" | "whip" | "whipUp" | "crt" | "push" | "dip";
/** TRANS[i] = transition between scene i and i+1; h = half-length in frames (scenes overlap by 2h) */
const TRANS: { kind: Kind; h: number }[] = [
  { kind: "flash", h: 3 },  // cold -> pause: hard freeze-frame hit
  { kind: "iris", h: 8 },   // pause -> mach: open into the explanation
  { kind: "whip", h: 6 },   // mach -> supersonic: whip pan
  { kind: "whipUp", h: 6 }, // supersonic -> hypersonic: punch upward, faster
  { kind: "crt", h: 8 },    // hypersonic -> radar: switch to the ship's console
  { kind: "push", h: 7 },   // radar -> travel time: zoom through the screen
  { kind: "whip", h: 6 },   // travel time -> strike: back to the race
  { kind: "dip", h: 8 },    // strike -> outro: smoke dissolve
];

const SC = tl.scenes.map((s) => ({ id: s.id, a: Math.round(s.start * FPS), b: Math.round(s.end * FPS) }));

// logo end card starts as the "follow karo, Mindset Mode!" line begins
const LOGO_AT = Math.round(tl.lines[tl.lines.length - 1].t0 * FPS) - 3;
const LOGO_IN = 12; // iris-in frames
const LOGO_TRIM = 3; // skip the thumbnail frame at the head of the logo clip
const LOGO_VID = 124; // frames of the logo animation used (4.34 s source @30 fps, minus trim, safe margin)
export const HYPER8B_FRAMES = Math.max(tl.frames, LOGO_AT + LOGO_IN + LOGO_VID + 36);

const ease = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
const cl = (q: number) => Math.min(1, Math.max(0, q));

/** style for a scene on one side of a transition; q 0..1 across the overlap */
const side = (kind: Kind, role: "in" | "out", q: number): React.CSSProperties => {
  const e = ease(q);
  const mb = (k: number) => `blur(${(k * Math.sin(Math.PI * q)).toFixed(1)}px)`;
  switch (kind) {
    case "flash":
      return role === "out" ? { opacity: q < 0.5 ? 1 : 0 } : { opacity: q >= 0.5 ? 1 : 0, transform: `translate(${Math.sin(q * 40) * 14 * (1 - q)}px,0)` };
    case "iris":
      return role === "in"
        ? { clipPath: `circle(${(e * 76).toFixed(2)}% at 50% 46%)`, zIndex: 2 }
        : { transform: `scale(${1 + 0.14 * e})`, filter: `brightness(${1 - 0.5 * e})` };
    case "whip":
      return role === "out"
        ? { transform: `translateX(${-1080 * e}px)`, filter: mb(16) }
        : { transform: `translateX(${1080 * (1 - e)}px)`, filter: mb(16) };
    case "whipUp":
      return role === "out"
        ? { transform: `translateY(${-1920 * e}px)`, filter: mb(16) }
        : { transform: `translateY(${1920 * (1 - e)}px)`, filter: mb(16) };
    case "crt": {
      if (role === "out") {
        if (q >= 0.5) return { opacity: 0 };
        const k = ease(q / 0.5);
        return { transform: `scale(${1 + 0.08 * k},${Math.max(0.004, 1 - k)})`, filter: `brightness(${1 + 2.5 * k})` };
      }
      if (q < 0.5) return { opacity: 0 };
      const k = 1 - Math.pow(1 - (q - 0.5) / 0.5, 3);
      return { transform: `scale(${1.08 - 0.08 * k},${0.004 + 0.996 * k})`, filter: `brightness(${3.5 - 2.5 * k})` };
    }
    case "push":
      return role === "out"
        ? { transform: `scale(${1 + 1.6 * e})`, opacity: 1 - e, filter: `blur(${(8 * e).toFixed(1)}px)` }
        : { transform: `scale(${0.72 + 0.28 * e})`, opacity: e, zIndex: 2 };
    case "dip":
      return role === "out"
        ? { opacity: 1 - e, filter: `blur(${(12 * e).toFixed(1)}px)` }
        : { opacity: e, filter: `blur(${(12 * (1 - e)).toFixed(1)}px)`, zIndex: 2 };
  }
};

const SceneSlot: React.FC<{ i: number; from: number; children: React.ReactNode }> = ({ i, from, children }) => {
  const g = from + useCurrentFrame();
  const s = SC[i];
  let style: React.CSSProperties = {};
  const tin = i > 0 ? TRANS[i - 1] : null;
  const tout = i < SC.length - 1 ? TRANS[i] : null;
  if (tin && g < s.a + tin.h) style = side(tin.kind, "in", cl((g - (s.a - tin.h)) / (2 * tin.h)));
  else if (tout && g >= s.b - tout.h) style = side(tout.kind, "out", cl((g - (s.b - tout.h)) / (2 * tout.h)));
  return <AbsoluteFill style={{ overflow: "hidden", transformOrigin: "50% 46%", ...style }}>{children}</AbsoluteFill>;
};

/** light/streak accents drawn over the cut itself */
const TransFX: React.FC = () => {
  const g = useCurrentFrame();
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {TRANS.map((t, i) => {
        const b = SC[i].b;
        const q = (g - (b - t.h)) / (2 * t.h);
        if (q < -0.2 || q > 1.6) return null;
        const pk = Math.max(0, Math.sin(Math.PI * cl(q)));
        if (t.kind === "flash") {
          const fl = g < b ? cl(1 - (b - g) / 3) * 0.6 : Math.exp(-(g - b) / 3);
          return <g key={i}><rect width={1080} height={1920} fill="#ffffff" opacity={fl * 0.85} />
            {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={0} y={(k * 397 + g * 61) % 1920} width={1080} height={6 + k * 3} fill="#9fe2ff" opacity={fl * 0.5} />)}</g>;
        }
        if (t.kind === "iris") {
          const r = ease(cl(q)) * 0.76 * 1557;
          return <circle key={i} cx={540} cy={883} r={r} fill="none" stroke="#9fe2ff" strokeWidth={10 * (1 - cl(q)) + 2} opacity={pk} />;
        }
        if (t.kind === "whip" || t.kind === "whipUp") {
          const vert = t.kind === "whipUp";
          const col = i === 3 ? "#ff6fb0" : "#ffffff";
          return <g key={i} opacity={pk * 0.75} style={{ mixBlendMode: "screen" }}>
            {Array.from({ length: 14 }, (_, k) => {
              const o = ((k * 137.5) % 1) * 0 + ((k * 0.618) % 1);
              const len = 300 + 500 * ((k * 0.37) % 1);
              const off = (k * 223) % (vert ? 1080 : 1920);
              return vert
                ? <rect key={k} x={off} y={1920 - cl(q) * 2600 + o * 600} width={3 + (k % 3) * 2} height={len} fill={col} opacity={0.4 + 0.6 * o} />
                : <rect key={k} x={1080 - cl(q) * 1900 + o * 500} y={off} width={len} height={3 + (k % 3) * 2} fill={col} opacity={0.4 + 0.6 * o} />;
            })}
          </g>;
        }
        if (t.kind === "crt") {
          const w = Math.exp(-Math.pow((cl(q) - 0.5) / 0.12, 2));
          return <g key={i} opacity={w}><rect x={0} y={883 - 3} width={1080} height={6} fill="#ffffff" />
            <rect x={0} y={883 - 40} width={1080} height={80} fill="#7fffc4" opacity={0.25} filter="blur(8px)" /></g>;
        }
        if (t.kind === "push") return <rect key={i} width={1080} height={1920} fill="#7fdcff" opacity={pk * 0.18} />;
        if (t.kind === "dip") return <rect key={i} width={1080} height={1920} fill="#0b0f16" opacity={pk * 0.35} />;
        return null;
      })}
    </svg>
  );
};

/** reference-style series title with the channel brand (top of frame, whole reel until the logo card) */
const SeriesTitle: React.FC = () => {
  const f = useCurrentFrame();
  const op = interpolate(f, [2, 12, LOGO_AT - 8, LOGO_AT + 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (op <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 40, top: 150, whiteSpace: "nowrap", opacity: op, fontFamily: "Inter", textShadow: "0 3px 0 rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.6), 0 4px 22px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, padding: "5px 16px 5px 5px", borderRadius: 28, background: "rgba(6,12,20,0.35)" }}>
        <BrandMark size={44} />
        <BrandWord size={24} />
      </div>
    </div>
  );
};

/** reference-style captions: one short phrase, spoken words solid, active word boxed with corner dots */
const Captions3: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const chunk = (tl as unknown as TL).captions.find((c) => t >= c.t0 - 0.05 && t < c.t1);
  if (!chunk) return null;
  const k = Math.min(1, (t - chunk.t0 + 0.05) / 0.1);
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: 1300, display: "flex", justifyContent: "center", opacity: k }}>
    <div style={{ maxWidth: 1000, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 16px", padding: "10px 18px", borderRadius: 16, background: "rgba(6,12,20,0.55)",
      transform: `translateY(${(1 - k) * 10}px)`, fontFamily: "Inter", fontWeight: 700, fontSize: 52, lineHeight: 1.25, textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)" }}>
      {chunk.words.map((w, i) => {
        const active = t >= w.t0 && t < w.t1, done = t >= w.t1;
        return (
          <span key={i} style={{ position: "relative", padding: "0 8px", color: active || done ? "#ffffff" : "rgba(255,255,255,0.5)" }}>
            {w.text}
            {active && (
              <>
                <span style={{ position: "absolute", inset: "-2px 0", border: "2px solid rgba(140,200,255,0.85)", borderRadius: 3 }} />
                {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], j) => (
                  <span key={j} style={{ position: "absolute", left: x ? "calc(100% - 4px)" : -4, top: y ? "calc(100% - 3px)" : -6, width: 8, height: 8, borderRadius: "50%", background: "#9fd0ff" }} />
                ))}
              </>
            )}
          </span>
        );
      })}
    </div>
    </div>
  );
};

/** channel logo end card: cream iris opens over the outro, then the logo animation plays and holds */
const LogoCard: React.FC = () => {
  const f = useCurrentFrame();
  const q = ease(cl(f / LOGO_IN));
  const handle = interpolate(f, [LOGO_IN + 70, LOGO_IN + 86], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const S = 920, top = 300;
  return (
    <AbsoluteFill style={{ clipPath: `circle(${(q * 76).toFixed(2)}% at 50% 46%)`, background: CREAM }}>
      <Sequence from={LOGO_IN - 2} durationInFrames={LOGO_VID} layout="none">
        <div style={{ position: "absolute", left: (1080 - S) / 2, top, width: S, height: S }}>
          <OffthreadVideo src={staticFile("navy/logo_mm.mp4")} trimBefore={LOGO_TRIM} muted style={{ width: S, height: S }} />
        </div>
      </Sequence>
      {f >= LOGO_IN - 2 + LOGO_VID && <Img src={staticFile("navy/logo_mm_final.png")} style={{ position: "absolute", left: (1080 - S) / 2, top, width: S, height: S }} />}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1470, textAlign: "center", opacity: handle, transform: `translateY(${(1 - handle) * 16}px)`, fontFamily: "Inter", fontWeight: 700, fontSize: 40, letterSpacing: 2, color: "#4b5b33" }}>
        FOLLOW <span style={{ color: "#5a3f57" }}>@mindset_mode_co</span>
      </div>
    </AbsoluteFill>
  );
};

const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("700 54px Inter"), document.fonts.load("900 54px Inter"), document.fonts.load("600 27px Inter"),
      document.fonts.load("400 28px 'JetBrains Mono'"), document.fonts.load("600 36px 'JetBrains Mono'"),
      document.fonts.load("800 96px Unbounded"),
    ]).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

/** Reel 2 v5 (best-of): merges both references with the user's models; day, mist, motion blur, rank cards, console, finale card, branding, logo */
export const HyperVideo8Body: React.FC<{ audio?: boolean; scenes?: Record<string, React.FC> }> = ({ audio = true, scenes = SCENES_H5 }) => {
  useFonts();
  const timeline = tl as unknown as TL;
  const real = React.useContext(RealismCtx);
  return (
    <MarkingsCtx.Provider value={true}>
    <ThemeCtx.Provider value={DAY}>
    <TimelineCtx.Provider value={timeline}>
    <MotionCtx.Provider value={{ fast: true }}>
    <FastLabels.Provider value={true}>
    <AbsoluteFill style={{ background: "#03060b", overflow: "hidden" }}>
      {SC.map((s, i) => {
        const pre = i > 0 ? TRANS[i - 1].h : 0;
        const post = i < SC.length - 1 ? TRANS[i].h : 0;
        const from = s.a - pre;
        const to = i === SC.length - 1 ? LOGO_AT + LOGO_IN + 2 : s.b + post;
        const Comp = scenes[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.id} layout="none">
            <SceneXCtx.Provider value={{ managed: true, shift: pre }}>
              <SceneSlot i={i} from={from}><Comp /></SceneSlot>
            </SceneXCtx.Provider>
          </Sequence>
        );
      })}
      <TransFX />
      <SeriesTitle />
      <Sequence from={LOGO_AT} name="logo" layout="none">
        {real ? <JetEndCard t0={LOGO_AT / FPS} /> : <LogoCard />}
      </Sequence>
      <Captions3 />
      {audio && <Audio src={staticFile("navy/mix_h8.wav")} />}
    </AbsoluteFill>
    </FastLabels.Provider>
    </MotionCtx.Provider>
    </TimelineCtx.Provider>
    </ThemeCtx.Provider>
    </MarkingsCtx.Provider>
  );
};
