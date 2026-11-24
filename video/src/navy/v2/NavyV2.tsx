import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, continueRender, delayRender } from "remotion";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/unbounded/800.css";
import tlNight from "./timeline.json";
import tlDay from "../v3/timeline.json";
import tl60 from "../v4/timeline.json";
import { TimelineCtx, MotionCtx, TL } from "./ctx";
import { ThemeCtx, NIGHT, DAY } from "../theme";
import { FastLabels, BrandCtx } from "../world";
import { HUD2, Captions2 } from "./ui2";
import { SCENES_V2 } from "./scenes2";

export const NAVY_V2_FRAMES = tlNight.frames;
export const NAVY_V3_FRAMES = tlDay.frames;
export const NAVY_V4_FRAMES = tl60.frames;

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

type Props = { audio?: boolean; variant?: "v2-night" | "v3-day" | "v4-day60" };
export const NavyV2: React.FC<Props> = ({ audio = true, variant = "v2-night" }) => {
  useFonts();
  const v4 = variant === "v4-day60";
  const v3 = variant === "v3-day" || v4; // v4 = v3 look + 60 s cut
  const timeline: TL = (v4 ? tl60 : v3 ? tlDay : tlNight) as TL;
  const theme = v3 ? DAY : NIGHT;
  return (
    <ThemeCtx.Provider value={theme}>
    <TimelineCtx.Provider value={timeline}>
    <MotionCtx.Provider value={{ fast: v3 }}>
    <FastLabels.Provider value={v3}>
    <BrandCtx.Provider value={v3 ? { deck: ["MINDSET MODE", "EXPLAINERS"], hull: "MINDSET MODE | EXPLAINERS" } : null}>
    <AbsoluteFill style={{ background: theme.bgCss, overflow: "hidden" }}>
      {timeline.scenes.map((s) => {
        const from = Math.round(s.start * timeline.fps);
        const to = Math.round(s.end * timeline.fps);
        const Comp = SCENES_V2[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.id} layout="none">
            <Comp />
          </Sequence>
        );
      })}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="vig2" cx="50%" cy="46%" r="78%">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={theme.vignette} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#vig2)" />
        <HUD2 />
      </svg>
      <Captions2 />
      {audio && <Audio src={staticFile(v4 ? "navy/mix_v4.wav" : v3 ? "navy/mix_v3.wav" : "navy/mix_v2.wav")} />}
    </AbsoluteFill>
    </BrandCtx.Provider>
    </FastLabels.Provider>
    </MotionCtx.Provider>
    </TimelineCtx.Provider>
    </ThemeCtx.Provider>
  );
};
