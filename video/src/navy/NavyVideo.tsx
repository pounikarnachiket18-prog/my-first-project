import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, continueRender, delayRender, useCurrentFrame } from "remotion";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/unbounded/800.css";
import timeline from "./timeline.json";
import { HUD, Captions } from "./ui";
import { HookScene, ImagineScene, RunwayScene, SkiJumpScene, CompareScene, LandingScene, TwistScene, BackupScene } from "./scenes";

export const NAVY_FRAMES = timeline.frames;

const SCENES: Record<string, React.FC> = {
  hook: HookScene, imagine: ImagineScene, runway: RunwayScene, skijump: SkiJumpScene,
  compare: CompareScene, landing: LandingScene, twist: TwistScene, backup: BackupScene,
};

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

export const NavyVideo: React.FC<{ captions?: boolean }> = ({ captions = true }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 55% at 50% 46%, #172131 0%, #0d131d 55%, #070b12 100%)" }}>
      {timeline.scenes.map((s) => {
        const from = Math.round(s.start * timeline.fps);
        const to = Math.round(s.end * timeline.fps);
        const Comp = SCENES[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.id} layout="none">
            <Comp />
          </Sequence>
        );
      })}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="vig" cx="50%" cy="46%" r="75%">
            <stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#vig)" opacity={useCurrentFrame() < Math.round(timeline.scenes[0].end * timeline.fps) ? 0.4 : 1} />
        <HUD />
      </svg>
      {captions && <Captions />}
      <Audio src={staticFile("navy/mix.wav")} />
    </AbsoluteFill>
  );
};
