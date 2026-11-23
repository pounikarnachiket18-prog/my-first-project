import React from "react";
import { Composition } from "remotion";
import { NavyVideo, NAVY_FRAMES } from "./NavyVideo";
import { NavyV2, NAVY_V2_FRAMES } from "./v2/NavyV2";

export const NavyRoot: React.FC = () => (
  <>
    <Composition id="IndianNavy" component={NavyVideo} durationInFrames={NAVY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IndianNavyV2" component={NavyV2} durationInFrames={NAVY_V2_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
