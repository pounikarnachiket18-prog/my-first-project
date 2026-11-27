import React from "react";
import { Composition, Still } from "remotion";
import { EarthStopped } from "./EarthStopped";
import { loadEarthFonts } from "./fonts";
import { FPS, TOTAL } from "./timeline";

loadEarthFonts();

export const EarthRoot: React.FC = () => (
  <>
    <Composition id="EarthStopped" component={EarthStopped} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ audio: true }} />
    <Composition id="EarthStoppedSilent" component={EarthStopped} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ audio: false }} />
  </>
);
