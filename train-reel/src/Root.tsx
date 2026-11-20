import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import T from "./timeline.json";

export const Root: React.FC = () => (
  <Composition id="Reel" component={Reel} durationInFrames={T.total} fps={T.fps} width={1080} height={1920} defaultProps={{ theme: "classic" }} />
);
