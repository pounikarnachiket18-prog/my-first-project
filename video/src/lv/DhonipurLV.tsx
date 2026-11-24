import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SoundDesign } from "./SoundDesign";
import { DayReveal, NightHook, Outro, StationCheckDay, StationCheckNight, VerdictNo, VerdictOk, WhyLast } from "./scenes";

// New scene order: mystery (night lamp) -> reveal (X / LV) -> why last coach -> station master check
// -> verdict (line clear / blocked) -> outro + Mindset Mode end card.
export const SCENES: [React.FC, number][] = [
  // durations fitted to the voiceover lines (VO sped up 1.22x, starts at 1.0s) -> 50s total
  [NightHook, 236],
  [DayReveal, 287],
  [WhyLast, 290],
  [StationCheckDay, 179],
  [StationCheckNight, 138],
  [VerdictOk, 171],
  [VerdictNo, 142],
  [Outro, 162],
];
export const XFADE = 15;
export const LV_TOTAL = SCENES.reduce((a, [, d]) => a + d, 0) - XFADE * (SCENES.length - 1);

export const DhonipurLV: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      {SCENES.flatMap(([C, d], i) => [
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}>
          <C />
        </TransitionSeries.Sequence>,
        ...(i < SCENES.length - 1
          ? [<TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: XFADE })} />]
          : []),
      ])}
    </TransitionSeries>
    <SoundDesign />
  </AbsoluteFill>
);
