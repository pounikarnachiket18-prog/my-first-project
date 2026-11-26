import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SoundDesign } from "./SoundDesign";
import { LogoBug, ScaleCtx } from "./overlay";
import { DayReveal, NightHook, Outro, StationCheckDay, StationCheckNight, VerdictNo, VerdictOk, WhyLast } from "./scenes";

// New scene order: mystery (night lamp) -> reveal (X / LV) -> why last coach -> station master check
// -> verdict (line clear / blocked) -> outro + Just KnowIt end card.
// [scene, frames on screen, time scale]. Scenes are authored on a slower timeline; the scale plays them
// faster so each one fits its voiceover line (VO: pauses tightened, 1.37x, starts at 0.6s) -> 40s total.
export const SCENES: [React.FC, number, number][] = [
  [NightHook, 179, 1.318],
  [DayReveal, 224, 1.281],
  [WhyLast, 233, 1.245],
  [StationCheckDay, 149, 1.201],
  [StationCheckNight, 112, 1.232],
  [VerdictOk, 132, 1.295],
  [VerdictNo, 116, 1.224],
  [Outro, 139, 1.157],
];
export const XFADE = 12;
export const LV_TOTAL = SCENES.reduce((a, [, d]) => a + d, 0) - XFADE * (SCENES.length - 1);

export const DhonipurLV: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      {SCENES.flatMap(([C, d, k], i) => [
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}>
          <ScaleCtx.Provider value={k}>
            <C />
          </ScaleCtx.Provider>
        </TransitionSeries.Sequence>,
        ...(i < SCENES.length - 1
          ? [<TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: XFADE })} />]
          : []),
      ])}
    </TransitionSeries>
    <SoundDesign />
    <LogoBug />
  </AbsoluteFill>
);
