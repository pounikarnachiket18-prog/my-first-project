import React from "react";
import { Composition } from "remotion";
import { IndiaReel, REEL_FRAMES } from "./IndiaReel";
import { CUT_FRAMES, OriginalCut } from "./OriginalCut";

export const IndiaRoot: React.FC = () => (
  <>
    <Composition
      id="OriginalIndianCut"
      component={OriginalCut}
      durationInFrames={CUT_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
    id="IndiaRoadReel"
    component={IndiaReel}
    durationInFrames={REEL_FRAMES}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ withAudio: true }}
  />
  </>
);
