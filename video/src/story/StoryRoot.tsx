import React from "react";
import { Composition } from "remotion";
import { STORY_FRAMES, Story } from "./Story";
import { FPS } from "./timeline";

export const StoryRoot: React.FC = () => (
  <Composition id="Story" component={Story} durationInFrames={STORY_FRAMES} fps={FPS} width={1080} height={1920} />
);
