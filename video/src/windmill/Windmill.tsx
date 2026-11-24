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
  getStaticFiles,
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
const f = (s: number) => Math.round(s * FPS);

// Meme ending (user's sounds in public/audio, gitignored):
// 10 s → meme-1 plays + caption pops in; when it ends → meme-2 with a punch zoom.
const MAIN_END = 10;
const MEME1_LEN = 7.95;
const MEME2_AT = MAIN_END + MEME1_LEN;
const MEME2_LEN = 4.82;
/** Meme ending off: the user adds their own meme after the 10 s reel. */
const MEME_ENDING = false;
export const END_AT = MEME_ENDING ? MEME2_AT + MEME2_LEN : MAIN_END;
export const WINDMILL_FRAMES = f(END_AT);
/** Drop the recorded funny voiceover here; it is used automatically. */
const VOICEOVER = "audio/windmill-voiceover.mp3";
const MEME_TEXT = "Zyada backchodi karne ki humein aadat nahi hai 😎";

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

/** Slow push-in during meme 1, punch + shake when meme 2 hits. */
const OutroCamera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let z = 1;
  let sx = 0;
  let sy = 0;
  if (t >= MAIN_END) z = interpolate(t, [MAIN_END, MEME2_AT], [1, 1.12], { extrapolateRight: "clamp" });
  if (t >= MEME2_AT) {
    const d = frame - f(MEME2_AT);
    z = 1.12 + 0.18 * Math.exp(-d / 6) + 0.03;
    const amp = 14 * Math.exp(-d / 8);
    sx = Math.sin(d * 2.1) * amp;
    sy = Math.cos(d * 2.7) * amp;
  }
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${z})`, transformOrigin: "50% 60%" }}>{children}</AbsoluteFill>
  );
};

/** Meme caption over the held frame; bounces when the second sound hits. */
const MemeOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dim = interpolate(frame, [0, 8], [0, 0.45], { extrapolateRight: "clamp" });
  const p = spring({ frame: frame - 9, fps, config: { damping: 9, stiffness: 220 } });
  const hit = frame - f(MEME1_LEN);
  const bounce = hit >= 0 ? 1 + 0.22 * Math.exp(-hit / 5) * Math.abs(Math.cos(hit / 2)) : 1;
  const emoji = hit >= 0 ? spring({ frame: hit, fps, config: { damping: 8, stiffness: 240 } }) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${dim})` }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 760, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${p * bounce}) rotate(${(1 - p) * -8}deg)`,
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.12,
            textAlign: "center",
            color: "#FFFFFF",
            WebkitTextStroke: "12px #000000",
            paintOrder: "stroke fill",
            textShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          {MEME_TEXT}
        </div>
      </div>
      <div style={{ position: "absolute", left: 540, top: 1260, fontSize: 200, transform: `translate(-50%,-50%) scale(${emoji}) rotate(${Math.sin(hit / 3) * 10}deg)` }}>
        😂
      </div>
    </AbsoluteFill>
  );
};

export const Windmill: React.FC = () => {
  useFonts();
  return (
    <TitleStyle.Provider value="spot">
      <AbsoluteFill style={{ background: "#000" }}>
        <OutroCamera>
        <Sequence durationInFrames={f(CLIP_END)}>
          <OffthreadVideo src={staticFile("video/windmill-ai.mp4")} volume={0.6} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </Sequence>
        <Sequence from={f(CLIP_END)}>
          {/* hold on the lit-house frame (exported from the clip at 9.2 s) */}
          <Img src={staticFile("video/windmill-end.png")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </Sequence>
        </OutroCamera>
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
        <Sequence from={f(FOLLOW_AT)} durationInFrames={f(MAIN_END - FOLLOW_AT)} layout="none">
          <Follow />
          <Audio src={staticFile("sfx/ding.wav")} volume={0.5} />
        </Sequence>
        {MEME_ENDING && (
        <>
        <Sequence from={f(MAIN_END)} layout="none">
          <MemeOutro />
          <Audio src={staticFile("audio/meme-1.mp3")} volume={1} />
        </Sequence>
        <Sequence from={f(MEME2_AT)} layout="none">
          <Audio src={staticFile("audio/meme-2.mp3")} volume={1} />
        </Sequence>
        </>
        )}
        {getStaticFiles().some((x) => x.name === VOICEOVER) && <Audio src={staticFile(VOICEOVER)} volume={1} />}
        <BrandBadge color={C.accent} />
        <Audio src={staticFile("sfx/wind.wav")} volume={0.25} />
      </AbsoluteFill>
    </TitleStyle.Provider>
  );
};
