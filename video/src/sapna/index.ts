// Standalone entry point for the Sapna Express reel.
// Render with: npx remotion render src/sapna/index.ts SapnaExpress out/sapna-express.mp4
import React from "react";
import { Composition, registerRoot } from "remotion";
import { SapnaExpress } from "./SapnaExpress";
import { TOTAL_FRAMES } from "./theme";

const SapnaRoot: React.FC = () =>
  React.createElement(Composition, {
    id: "SapnaExpress",
    component: SapnaExpress,
    durationInFrames: TOTAL_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  });

registerRoot(SapnaRoot);
