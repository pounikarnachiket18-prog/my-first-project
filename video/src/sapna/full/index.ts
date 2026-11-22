// Full reel (station opening + day reel) timed to the ElevenLabs voiceover, in 9:16 and 16:9.
// Render: npx remotion render src/sapna/full/index.ts Reel916 out/reel_916.mp4 --gl=swangle --muted
import React from "react";
import { Composition, registerRoot } from "remotion";
import { FULL_FRAMES, FullReel } from "./FullReel";

const Root: React.FC = () =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(Composition, { id: "Reel916", component: FullReel, durationInFrames: FULL_FRAMES, fps: 30, width: 1080, height: 1920, defaultProps: { landscape: false } }),
    React.createElement(Composition, { id: "Reel169", component: FullReel, durationInFrames: FULL_FRAMES, fps: 30, width: 1920, height: 1080, defaultProps: { landscape: true } }),
  );

registerRoot(Root);
