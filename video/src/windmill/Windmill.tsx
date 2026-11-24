/**
 * 10-second sample: "Hawa se bijli kaise?" (how a wind turbine works).
 * Visuals: AI-generated 3D clip (MiniMax H3 via vidIQ) at
 * public/video/windmill-ai.mp4 (gitignored).
 * This file only adds the channel layer on top: spotlight title, step
 * labels, brand badge, follow CTA and original SFX.
 * Label times are in CUES; adjust them to the clip.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, FONT_CHECKS } from "../rail/theme";
import { Title, TitleStyle } from "../rail/parts";
import { BrandBadge } from "../remix/fx";

export const FPS = 30;
export const WINDMILL_FRAMES = 300;
const f = (s: number) => Math.round(s * FPS);

/** [start, end, text] for the step label (one at a time). */
export const CUES: [number, number, string][] = [
  [1.9, 3.0, "1 · Hawa blades ghumati hai 🌬️"],
  [3.0, 4.2, "2 · Gearbox speed badhata hai ⚙️"],
  [4.2, 5.6, "3 · Generator bijli banata hai ⚡"],
  [5.6, 8.5, "4 · Cable se bijli ghar tak 🏠"],
];
export const TITLE_OUT = 1.9;
export const FOLLOW_AT = 8.5;
const CLIP_END = 9.2; // AI clip is 9.4 s; hold its last frame to 10 s

const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(FONT_CHECKS.map((c) => document.fonts.load(c, "Aa"))).then(finish).catch(finish);
    const t = setTimeout(finish, 10000);
    return () => clearTimeout(t);
  }, [handle]);
};

const StepLabel: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 210 } });
  const out = interpolate(frame, [dur - 5, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          transform: `scale(${p}) translateY(${(1 - p) * 30}px)`,
          background: C.accent,
          color: "#FFFFFF",
          border: "5px solid #FFFFFF",
          borderRadius: 999,
          padding: "14px 36px",
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 50,
          whiteSpace: "nowrap",
          boxShadow: "0 14px 30px rgba(0,0,0,0.3)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Little step dots so viewers see progress 1 → 4. */
const Dots: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const active = CUES.findIndex(([a, b]) => t >= a && t < b);
  if (t < CUES[0][0] || t >= FOLLOW_AT) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1470, display: "flex", justifyContent: "center", gap: 18 }}>
      {CUES.map((_, i) => (
        <div
          key={i}
          style={{
            width: i === active ? 54 : 22,
            height: 22,
            borderRadius: 11,
            background: i <= active ? "#FFFFFF" : "rgba(255,255,255,0.45)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
          }}
        />
      ))}
    </div>
  );
};

const Follow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 10, stiffness: 190 } });
  const tap = 1 + Math.max(0, Math.sin((frame - 10) / 4)) * 0.05;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1000, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${p * tap})`,
          background: "#FFD23F",
          color: C.ink,
          border: "6px solid #FFFFFF",
          borderRadius: 999,
          padding: "14px 54px",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 58,
          boxShadow: "0 16px 34px rgba(0,0,0,0.3)",
        }}
      >
        Follow karo 🔔
      </div>
    </div>
  );
};

export const Windmill: React.FC = () => {
  useFonts();
  return (
    <TitleStyle.Provider value="spot">
      <AbsoluteFill style={{ background: "#000" }}>
        <Sequence durationInFrames={f(CLIP_END)}>
          <OffthreadVideo src={staticFile("video/windmill-ai.mp4")} volume={0.6} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </Sequence>
        <Sequence from={f(CLIP_END)}>
          {/* hold on the lit-house frame (exported from the clip at 9.2 s) */}
          <Img src={staticFile("video/windmill-end.png")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </Sequence>
        <Sequence durationInFrames={f(TITLE_OUT)}>
          <Title text={"Hawa se\nbijli kaise?"} inAt={3} outAt={f(TITLE_OUT)} y={230} />
        </Sequence>
        {CUES.map(([a, b, text]) => (
          <Sequence key={text} from={f(a)} durationInFrames={f(b) - f(a)} layout="none">
            <StepLabel text={text} dur={f(b) - f(a)} />
            <Audio src={staticFile("sfx/pop.wav")} volume={0.6} />
          </Sequence>
        ))}
        <Dots />
        <Sequence from={f(FOLLOW_AT)} layout="none">
          <Follow />
          <Audio src={staticFile("sfx/ding.wav")} volume={0.5} />
        </Sequence>
        <BrandBadge color={C.accent} />
        <Audio src={staticFile("sfx/wind.wav")} volume={0.25} />
      </AbsoluteFill>
    </TitleStyle.Provider>
  );
};
