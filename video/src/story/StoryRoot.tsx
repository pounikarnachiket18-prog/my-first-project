import React from "react";
import { Composition } from "remotion";
import { RECUT_FRAMES, Recut } from "./Recut";

export const StoryRoot: React.FC = () => (
  <Composition id="Story" component={Recut} durationInFrames={RECUT_FRAMES} fps={30} width={1080} height={1920} />
);
