import React from "react";
import { Composition } from "remotion";
import { NavyVideo, NAVY_FRAMES } from "./NavyVideo";

export const NavyRoot: React.FC = () => (
  <Composition id="IndianNavy" component={NavyVideo} durationInFrames={NAVY_FRAMES} fps={30} width={1080} height={1920} />
);
