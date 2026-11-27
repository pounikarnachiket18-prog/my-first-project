import React from "react";
import { Composition } from "remotion";
import { LastFlight } from "./LastFlight";
import { loadLFFonts } from "./fonts";
import { FPS, TOTAL } from "./timeline";

loadLFFonts();

export const LFRoot: React.FC = () => (
  <>
    <Composition id="LastFlight" component={LastFlight} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ audio: true }} />
    <Composition id="LastFlightSilent" component={LastFlight} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ audio: false }} />
  </>
);
