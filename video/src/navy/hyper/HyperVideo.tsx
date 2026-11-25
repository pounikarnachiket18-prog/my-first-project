import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, continueRender, delayRender } from "remotion";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/unbounded/800.css";
import tl from "./timeline.json";
import { TimelineCtx, MotionCtx, TL } from "../v2/ctx";
import { ThemeCtx, DAY } from "../theme";
import { FastLabels } from "../world";
import { HUD2, Captions2 } from "../v2/ui2";
import { SCENES_H } from "./scenes_h";

export const HYPER_FRAMES = tl.frames;

const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("700 54px Inter"), document.fonts.load("600 27px Inter"),
      document.fonts.load("400 28px 'JetBrains Mono'"), document.fonts.load("600 36px 'JetBrains Mono'"),
      document.fonts.load("800 96px Unbounded"),
    ]).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

/** Reel 2: supersonic vs hypersonic (day look, fast motion graphics, Hinglish captions) */
export const HyperVideo: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  useFonts();
  const timeline = tl as unknown as TL;
  return (
    <ThemeCtx.Provider value={DAY}>
    <TimelineCtx.Provider value={timeline}>
    <MotionCtx.Provider value={{ fast: true }}>
    <FastLabels.Provider value={true}>
    <AbsoluteFill style={{ background: DAY.bgCss, overflow: "hidden" }}>
      {tl.scenes.map((s, i) => {
        const from = Math.round(s.start * tl.fps);
        const to = i === tl.scenes.length - 1 ? tl.frames : Math.round(s.end * tl.fps);
        const Comp = SCENES_H[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.id} layout="none">
            <Comp />
          </Sequence>
        );
      })}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="vigh" cx="50%" cy="46%" r="78%">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={DAY.vignette} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#vigh)" />
        <HUD2 />
      </svg>
      <Captions2 />
      {audio && <Audio src={staticFile("navy/mix_h1.wav")} />}
    </AbsoluteFill>
    </FastLabels.Provider>
    </MotionCtx.Provider>
    </TimelineCtx.Provider>
    </ThemeCtx.Provider>
  );
};
