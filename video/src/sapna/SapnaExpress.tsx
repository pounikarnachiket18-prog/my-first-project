import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SCENES, TOTAL_FRAMES, TRANSITION } from "./theme";
import { Chrome, NarratorBadge } from "./ui";
import { S01Hook } from "./scenes/S01Hook";
import { S02Coach } from "./scenes/S02Coach";
import { S03Phone } from "./scenes/S03Phone";
import { S04Gps } from "./scenes/S04Gps";
import { S05Towers } from "./scenes/S05Towers";
import { S06CrowdMap } from "./scenes/S06CrowdMap";
import { S07Timetable } from "./scenes/S07Timetable";
import { S08Catch } from "./scenes/S08Catch";
import { S09Payoff } from "./scenes/S09Payoff";
import { S10Cta } from "./scenes/S10Cta";

const T = () => linearTiming({ durationInFrames: TRANSITION });

/**
 * Sapna Express: a daytime explainer reel narrated by the train.
 * Voiceover: drop the recording in public/ and add an <Audio> here,
 * then re-time SCENES in theme.ts to match.
 */
export const SapnaExpress: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence name="1 Hook (drone)" durationInFrames={SCENES.hook}>
        <S01Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="2 Coach cutaway" durationInFrames={SCENES.coach}>
        <S02Coach />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="3 Phone" durationInFrames={SCENES.phone}>
        <S03Phone />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={T()} />
      <TransitionSeries.Sequence name="4 GPS myth" durationInFrames={SCENES.gps}>
        <S04Gps />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="5 Towers" durationInFrames={SCENES.towers}>
        <S05Towers />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="6 Crowd map" durationInFrames={SCENES.crowdMap}>
        <S06CrowdMap />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={T()} />
      <TransitionSeries.Sequence name="7 Timetable" durationInFrames={SCENES.timetable}>
        <S07Timetable />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={T()} />
      <TransitionSeries.Sequence name="8 Catch" durationInFrames={SCENES.catch}>
        <S08Catch />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="9 Payoff (station)" durationInFrames={SCENES.payoff}>
        <S09Payoff />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T()} />
      <TransitionSeries.Sequence name="10 CTA" durationInFrames={SCENES.cta}>
        <S10Cta />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Chrome total={TOTAL_FRAMES} />
    <NarratorBadge />
  </AbsoluteFill>
);
