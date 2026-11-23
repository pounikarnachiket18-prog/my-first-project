import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  getStaticFiles,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, FONT_CHECKS } from "../rail/theme";
import { FadeIn } from "../rail/parts";
import { BrandBadge, ProgressBar } from "../remix/fx";
import { BonusScene, EndingScene, HookScene, JourneyScene, PacketScene, RecapScene, SleepScene, SolutionScene, TwistScene } from "./scenes";
import { CAPTIONS, FPS, SCENES, TOTAL_SEC } from "./timeline";

export const STORY_FRAMES = Math.round(TOTAL_SEC * FPS);
const f = (sec: number) => Math.round(sec * FPS);
const X = 8; // cross-fade frames

// Drop your recording here (same name) and it is used automatically.
const VOICEOVER = "audio/story-voiceover.mp3";
const AMBIENCE = "audio/train-ambience.mp3";
/** Show subtitles (turn off if you add captions in your editing app). */
export const SHOW_SUBTITLES = true;

const has = (file: string) => {
  try {
    return getStaticFiles().some((x) => x.name === file);
  } catch {
    return false;
  }
};

const useFonts = () => {
  const [handle] = React.useState(() => delayRender("Loading embedded fonts"));
  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(FONT_CHECKS.map((c) => document.fonts.load(c, "Aa")))
      .then(finish)
      .catch(finish);
    const t = setTimeout(finish, 10000);
    return () => clearTimeout(t);
  }, [handle]);
};

const Subtitle: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  const out = interpolate(frame, [dur - 4, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 130, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 20}px)`,
          opacity: p,
          background: "rgba(21,23,28,0.82)",
          color: "#FFFFFF",
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 46,
          lineHeight: 1.25,
          textAlign: "center",
          padding: "14px 28px",
          borderRadius: 22,
          maxWidth: 940,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SCENE_LIST: [readonly [number, number], React.FC][] = [
  [SCENES.sleep, SleepScene],
  [SCENES.hook, HookScene],
  [SCENES.twist, TwistScene],
  [SCENES.packet, PacketScene],
  [SCENES.journey, JourneyScene],
  [SCENES.solution, SolutionScene],
  [SCENES.recap, RecapScene],
  [SCENES.bonus, BonusScene],
  [SCENES.ending, EndingScene],
];

export const Story: React.FC = () => {
  useFonts();
  const slateAt = SCENES.ending[0] + 3.0;
  return (
    <AbsoluteFill style={{ background: C.wall }}>
      {SCENE_LIST.map(([[a, b], Scene], i) => {
        const from = i === 0 ? 0 : f(a) - X;
        return (
          <Sequence key={i} from={from} durationInFrames={f(b) - from}>
            {i === 0 ? <Scene /> : <FadeIn frames={X}><Scene /></FadeIn>}
          </Sequence>
        );
      })}

      <Sequence durationInFrames={f(slateAt)}>
        <BrandBadge color={C.accent} />
        <ProgressBar total={f(slateAt)} />
      </Sequence>

      {SHOW_SUBTITLES &&
        CAPTIONS.map(([a, b, text], i) => (
          <Sequence key={i} from={f(a)} durationInFrames={f(b) - f(a)} layout="none">
            <Subtitle text={text} dur={f(b) - f(a)} />
          </Sequence>
        ))}

      {has(VOICEOVER) && <Audio src={staticFile(VOICEOVER)} />}
      {has(AMBIENCE) && (
        <Audio
          src={staticFile(AMBIENCE)}
          volume={(fr) => 0.3 * interpolate(fr, [0, 10, STORY_FRAMES - 15, STORY_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}
    </AbsoluteFill>
  );
};
