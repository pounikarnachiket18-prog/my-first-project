// Entry point for the night reel with the Sapna Express character layer.
// Render: npx remotion render src/sapna/night/index.ts NightReel out/night.mp4 --muted
import React from "react";
import { Composition, registerRoot } from "remotion";
import { NIGHT_FPS, NIGHT_FRAMES, NightReel } from "./NightReel";

const Root: React.FC = () =>
  React.createElement(Composition, {
    id: "NightReel",
    component: NightReel,
    durationInFrames: NIGHT_FRAMES,
    fps: NIGHT_FPS,
    width: 1080,
    height: 1920,
  });

registerRoot(Root);
