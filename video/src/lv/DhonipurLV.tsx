import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { DayReveal, NightHook, Outro, StationCheckDay, StationCheckNight, VerdictNo, VerdictOk, WhyLast } from "./scenes";

// New scene order: mystery (night lamp) -> reveal (X / LV) -> why last coach -> station master check
// -> verdict (line clear / blocked) -> outro + Mindset Mode end card.
export const SCENES: [React.FC, number][] = [
  [NightHook, 190],
  [DayReveal, 310],
  [WhyLast, 370],
  [StationCheckDay, 190],
  [StationCheckNight, 140],
  [VerdictOk, 190],
  [VerdictNo, 190],
  [Outro, 210],
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
  </AbsoluteFill>
);
