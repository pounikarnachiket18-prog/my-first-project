import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { Ingredient } from "./Ingredients";
import { JammerReel } from "./jammer/JammerReel";
import JT from "./jammer/timeline.json";
import T from "./timeline.json";

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={T.total} fps={T.fps} width={1080} height={1920} defaultProps={{ theme: "classic" }} />
    <Composition id="Jammer" component={JammerReel} durationInFrames={JT.total} fps={JT.fps} width={1080} height={1920} defaultProps={{ theme: "classic", audio: true }} />
    <Composition id="Ingredient" component={Ingredient} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ view: "train-nose", theme: "classic" }} />
  </>
);
