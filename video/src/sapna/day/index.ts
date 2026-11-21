// Entry point for the daytime 3D rebuild of the reel (everything after the station cold open).
// Render: npx remotion render src/sapna/day/index.ts DayMain out/day.mp4 --gl=swangle --muted
import React from "react";
import { Composition, registerRoot } from "remotion";
import { DAY_FRAMES, DayMain } from "./DayMain";

const Root: React.FC = () =>
  React.createElement(Composition, { id: "DayMain", component: DayMain, durationInFrames: DAY_FRAMES, fps: 30, width: 1080, height: 1920 });

registerRoot(Root);
