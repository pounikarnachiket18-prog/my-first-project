import React from "react";
import { Composition } from "remotion";
import { Reel3D, REEL3D_FRAMES } from "./Reel3D";
import { VOReel, VO_REEL_FRAMES } from "./VOReel";

export const Root3D: React.FC = () => (
  <>
    <Composition id="IndianRoadsVO" component={VOReel} durationInFrames={VO_REEL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IndianRoads3D" component={Reel3D} durationInFrames={REEL3D_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
