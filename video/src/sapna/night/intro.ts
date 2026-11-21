// Entry point for the new station cold open.
// Render: npx remotion render src/sapna/night/intro.ts StationIntro out/intro.mp4 --gl=swangle --muted
import React from "react";
import { Composition, registerRoot } from "remotion";
import { INTRO_FRAMES, StationIntro } from "./StationIntro";

const Root: React.FC = () =>
  React.createElement(Composition, {
    id: "StationIntro",
    component: StationIntro,
    durationInFrames: INTRO_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  });

registerRoot(Root);
