import React from "react";
import { Composition } from "remotion";
import { FPS, WINDMILL_FRAMES, Windmill } from "./Windmill";

export const WindmillRoot: React.FC = () => (
  <Composition id="Windmill" component={Windmill} durationInFrames={WINDMILL_FRAMES} fps={FPS} width={1080} height={1920} />
);
