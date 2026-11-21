import React from "react";
import { Composition } from "remotion";
import { RailKambal } from "./RailKambal";
import { DURATION, FPS } from "./theme";

export const RailRoot: React.FC = () => (
  <Composition id="RailKambal" component={RailKambal} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
);
