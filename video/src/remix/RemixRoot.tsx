import React from "react";
import { Composition } from "remotion";
import { FPS, REMIX_FRAMES, Remix } from "./Remix";

export const RemixRoot: React.FC = () => (
  <Composition id="Remix" component={Remix} durationInFrames={REMIX_FRAMES} fps={FPS} width={1080} height={1920} />
);
