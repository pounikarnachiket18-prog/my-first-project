import React from "react";
import { Composition, Still } from "remotion";
import { Main } from "./Main";
import { MainMobile } from "./MainMobile";
import { ThumbnailCard } from "./primitives";
import { TOTAL_FRAMES } from "./Video";

const THUMB_PROPS = { brandInitial: "h.", brandName: "HypoExplained", hook: "Paisa kahan gayab ho jata hai?", tagline: "COMPLEX TOPICS, SIMPLE WORDS" };

export const Root: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="MainMobile"
      component={MainMobile}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Still id="Thumb16x9" component={ThumbnailCard} defaultProps={THUMB_PROPS} width={1920} height={1080} />
    <Still id="Thumb9x16" component={ThumbnailCard} defaultProps={THUMB_PROPS} width={1080} height={1920} />
  </>
);
