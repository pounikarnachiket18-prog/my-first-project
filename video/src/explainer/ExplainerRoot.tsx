import React from "react";
import { Composition } from "remotion";
import { EXPLAINER_FRAMES, Explainer } from "./Explainer";
import { FPS } from "./script";

export const ExplainerRoot: React.FC = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={EXPLAINER_FRAMES} fps={FPS} width={1080} height={1920} />
);
