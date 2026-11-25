// Reel 2 v8 ("reference copy", channel JustKnow It): dogfight hook + reference look + realistic models,
// clean callouts, Tejas afterburner end card with FOLLOW · JUSTKNOW IT. Narration ends "...follow karo, JustKnow It!".
import React from "react";
import { AbsoluteFill, Sequence, Audio, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import { HyperVideo8Body, HYPER8B_FRAMES } from "./HyperVideo8Body";
import { SCENES_H5 } from "./scenes_h5";
import { H6Strike, HOOK, CLIP } from "./HyperVideo6";
import { H7Time } from "./scenes_h7";
import { Illus } from "./scenes_h3";
import { RealismCtx } from "./Sprite";
import { BrandMark, BrandWord } from "./brand";

export const HYPER8_FRAMES = HOOK + HYPER8B_FRAMES;
const SCENES_H8: Record<string, React.FC> = { ...SCENES_H5, strike: H6Strike, time: H7Time };

const Hook8: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [HOOK - 4, HOOK], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wm = interpolate(f, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(CLIP)} muted style={{ width: 1080, height: 1920, objectFit: "cover" }} />
      <div style={{ position: "absolute", right: 40, top: 150, opacity: wm, display: "flex", alignItems: "center", gap: 10, padding: "5px 16px 5px 5px", borderRadius: 28, background: "rgba(6,12,20,0.35)", whiteSpace: "nowrap" }}>
        <BrandMark size={44} /><BrandWord size={24} />
      </div>
      <Illus />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

export const HyperVideo8: React.FC = () => {
  const vol = (fr: number) => interpolate(fr, [0, 4, HOOK - 8, HOOK + 4], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <RealismCtx.Provider value={true}>
      <AbsoluteFill style={{ background: "#000" }}>
        <Sequence durationInFrames={HOOK + 2} name="hook"><Hook8 /></Sequence>
        <Sequence from={HOOK} name="story"><HyperVideo8Body scenes={SCENES_H8} /></Sequence>
        <Sequence durationInFrames={HOOK + 6} name="hook-audio" layout="none"><Audio src={staticFile(CLIP)} volume={vol} /></Sequence>
      </AbsoluteFill>
    </RealismCtx.Provider>
  );
};
