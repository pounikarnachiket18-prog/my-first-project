import React from "react";
import { Composition } from "remotion";
import { MindsetVCD } from "./MindsetVCD";

// Separate entry point: uses only locally bundled fonts, so it renders offline.
export const MindsetRoot: React.FC = () => (
  <Composition id="MindsetVCD" component={MindsetVCD} durationInFrames={1320} fps={30} width={1080} height={1920} />
);
