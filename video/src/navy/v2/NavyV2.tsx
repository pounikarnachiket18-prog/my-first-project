import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, continueRender, delayRender } from "remotion";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/unbounded/800.css";
import timeline from "./timeline.json";
import { HUD2, Captions2 } from "./ui2";
import { SCENES_V2 } from "./scenes2";

export const NAVY_V2_FRAMES = timeline.frames;

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

export const NavyV2: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 60% at 50% 45%, #14202f 0%, #0b121c 55%, #05080d 100%)", overflow: "hidden" }}>
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
            <stop offset="1" stopColor="#000" stopOpacity={0.6} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#vig2)" />
        <HUD2 />
      </svg>
      <Captions2 />
      {audio && <Audio src={staticFile("navy/mix_v2.wav")} />}
    </AbsoluteFill>
  );
};
