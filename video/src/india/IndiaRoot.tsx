import React from "react";
import { Composition } from "remotion";
import { IndiaReel, REEL_FRAMES } from "./IndiaReel";

export const IndiaRoot: React.FC = () => (
  <Composition
    id="IndiaRoadReel"
    component={IndiaReel}
    durationInFrames={REEL_FRAMES}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ withAudio: true }}
  />
);
