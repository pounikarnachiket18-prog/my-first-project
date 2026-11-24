/**
 * "5 cheezein, 1 raaz" explainer: no characters, all-new compositions,
 * in the channel look (maroon, spotlight titles, swoosh wipes, train line).
 */
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
import { TitleStyle } from "../rail/parts";
import { BrandBadge } from "../remix/fx";
import { Clip, FollowSlate, SW, Swoosh, TrainProgress } from "../story/Recut";
import { BonusScene, FreshLoopScene, HowToScene, LineupScene, RecapScene, SplitScene } from "./scenes";
import { FPS, LINES, SCENES, SFX, TOTAL } from "./script";

export const EXPLAINER_FRAMES = Math.round(TOTAL * FPS);
const f = (sec: number) => Math.round(sec * FPS);

/** Subtitles while there is no voiceover yet; set false once it is recorded, if you prefer. */
export const SHOW_SUBTITLES = true;
const VOICEOVER = "audio/explainer-voiceover.mp3";

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
    <div style={{ position: "absolute", left: 50, right: 50, bottom: 70, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * 16}px)`,
          background: "rgba(21,23,28,0.85)",
          color: "#FFFFFF",
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 40,
          lineHeight: 1.25,
          textAlign: "center",
          padding: "12px 24px",
          borderRadius: 20,
          maxWidth: 960,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SCENE_LIST: [readonly [number, number], React.ReactNode][] = [
  [SCENES.open, <Clip key="o" src="video/mme-branded-train.mp4" rate={0.6} freezeAfter={f(1.3)} />],
  [SCENES.lineup, <LineupScene key="l" />],
  [SCENES.fresh, <FreshLoopScene key="f" />],
  [SCENES.blanket, <SplitScene key="b" />],
  [SCENES.howto, <HowToScene key="h" />],
  [SCENES.bonus, <BonusScene key="x" />],
  [SCENES.recap, <RecapScene key="r" />],
  [
    SCENES.follow,
    <React.Fragment key="fo">
      <Clip src="video/mme-branded-train.mp4" rate={0.5} freezeAfter={f(1.4)} />
      <FollowSlate />
    </React.Fragment>,
  ],
];

export const Explainer: React.FC = () => {
  useFonts();
  return (
    <TitleStyle.Provider value="spot">
      <AbsoluteFill style={{ background: C.wall }}>
        {SCENE_LIST.map(([[a, b], el], i) => (
          <Sequence key={i} from={f(a)} durationInFrames={f(b) - f(a)}>
            {el}
          </Sequence>
        ))}
        {/* swoosh wipe at every scene change */}
        {SCENE_LIST.slice(1).map(([[a]], i) => (
          <Sequence key={`sw${i}`} from={f(a) - SW / 2} durationInFrames={SW} layout="none">
            <Swoosh />
          </Sequence>
        ))}
        <Sequence from={f(SCENES.lineup[0])} durationInFrames={f(SCENES.follow[0]) - f(SCENES.lineup[0])}>
          <BrandBadge color={C.accent} />
          <TrainProgress total={f(SCENES.follow[0]) - f(SCENES.lineup[0])} />
        </Sequence>
        {SHOW_SUBTITLES &&
          LINES.map(([a, b, text], i) => (
            <Sequence key={`t${i}`} from={f(a)} durationInFrames={f(b) - f(a)} layout="none">
              <Subtitle text={text} dur={f(b) - f(a)} />
            </Sequence>
          ))}

        {/* audio: voiceover (when recorded), train ambience, original SFX */}
        {has(VOICEOVER) && <Audio src={staticFile(VOICEOVER)} />}
        {has("audio/train-ambience.mp3") && (
          <Audio
            src={staticFile("audio/train-ambience.mp3")}
            volume={(fr) => 0.22 * interpolate(fr, [0, 10, EXPLAINER_FRAMES - 15, EXPLAINER_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />
        )}
        {SFX.map(([t, name, vol], i) => (
          <Sequence key={`fx${i}`} from={f(t)} layout="none">
            <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </TitleStyle.Provider>
  );
};
