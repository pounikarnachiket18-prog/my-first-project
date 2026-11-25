// Reel 2 v7: v6 (dogfight hook + impact footage, best-of references) with Mumbai -> Karachi travel time,
// IAF roundel + tricolour markings on the Tejas and both missiles, radio-blackout callout. Target ship stays unmarked.
import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, interpolate } from "remotion";
import { HyperVideo7Body, HYPER7B_FRAMES } from "./HyperVideo7Body";
import { SCENES_H5 } from "./scenes_h5";
import { H6Strike, Hook, HOOK, CLIP } from "./HyperVideo6";
import { H7Time } from "./scenes_h7";

export const HYPER7_FRAMES = HOOK + HYPER7B_FRAMES;
const SCENES_H7: Record<string, React.FC> = { ...SCENES_H5, strike: H6Strike, time: H7Time };

export const HyperVideo7: React.FC = () => {
  const vol = (fr: number) => interpolate(fr, [0, 4, HOOK - 8, HOOK + 4], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={HOOK + 2} name="hook"><Hook /></Sequence>
      <Sequence from={HOOK} name="story"><HyperVideo7Body scenes={SCENES_H7} /></Sequence>
      <Sequence durationInFrames={HOOK + 6} name="hook-audio" layout="none"><Audio src={staticFile(CLIP)} volume={vol} /></Sequence>
    </AbsoluteFill>
  );
};
