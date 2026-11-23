import React from "react";
import { Composition } from "remotion";
import { Reel3D, REEL3D_FRAMES } from "./Reel3D";

export const Root3D: React.FC = () => (
  <Composition id="IndianRoads3D" component={Reel3D} durationInFrames={REEL3D_FRAMES} fps={30} width={1080} height={1920} />
);
