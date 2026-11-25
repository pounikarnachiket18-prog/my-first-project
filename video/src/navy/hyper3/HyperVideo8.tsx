// Reel 2 v8 ("reference copy"): v7 content in the "10 fastest missiles" look -
// frozen sea with streaking snow + strong motion blur, mountains, realistic model grading/reflections,
// only the reference's own graphics (title, rank cards, finale card, plasma callouts) + captions.
import React from "react";
import { HyperVideo7, HYPER7_FRAMES } from "./HyperVideo7";
import { RealismCtx } from "./Sprite";

export const HYPER8_FRAMES = HYPER7_FRAMES;
export const HyperVideo8: React.FC = () => (
  <RealismCtx.Provider value={true}>
    <HyperVideo7 />
  </RealismCtx.Provider>
);
