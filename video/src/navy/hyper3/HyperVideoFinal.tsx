// FINAL reel (50 s, daytime, Just KnowIt): 2.7 s dogfight hook -> story on the user's ElevenLabs (Rudra) voice
// -> Tejas afterburner + FOLLOW -> red logo reveal. One soundtrack (voice + original action score + SFX): mix_final.wav
import React from "react";
import { AbsoluteFill, Sequence, Audio, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import { HyperVideo10Body, HYPER10B_FRAMES } from "./HyperVideo10Body";
import { HyperVideo11Body, HYPER11B_FRAMES } from "./HyperVideo11Body";
import { SCENES_H5 } from "./scenes_h5";
import { H6Strike, CLIP } from "./HyperVideo6";
import { H7Time } from "./scenes_h7";
import { Illus } from "./scenes_h3";
import { RealismCtx } from "./Sprite";
import { BrandBadge } from "./brand";

export const HOOK_F = 81;                 // last 2.7 s of the dogfight clip: dogfight -> HUD lock -> WEAPON AWAY
const CLIP_TRIM = 152 - HOOK_F;           // clip frames skipped (clip cut point at 5.07 s stays the end)
export const FINAL_FRAMES = HOOK_F + HYPER10B_FRAMES;
const SCENES_FINAL: Record<string, React.FC> = { ...SCENES_H5, strike: H6Strike, time: H7Time };

const HookFinal: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [HOOK_F - 4, HOOK_F], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(CLIP)} trimBefore={CLIP_TRIM} muted style={{ width: 1080, height: 1920, objectFit: "cover" }} />
      <div style={{ position: "absolute", right: 40, top: 150 }}><BrandBadge /></div>
      <Illus />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

export const HyperVideoFinal: React.FC = () => (
  <RealismCtx.Provider value={true}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={HOOK_F + 2} name="hook"><HookFinal /></Sequence>
      <Sequence from={HOOK_F} name="story"><HyperVideo10Body scenes={SCENES_FINAL} audio={false} /></Sequence>
      <Audio src={staticFile("navy/mix_final.wav")} />
    </AbsoluteFill>
  </RealismCtx.Provider>
);

/** FINAL 60 s: same reel, voice at ~1.1x (natural pace), full end card */
export const FINAL60_FRAMES = HOOK_F + HYPER11B_FRAMES;
export const HyperVideoFinal60: React.FC = () => (
  <RealismCtx.Provider value={true}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={HOOK_F + 2} name="hook"><HookFinal /></Sequence>
      <Sequence from={HOOK_F} name="story"><HyperVideo11Body scenes={SCENES_FINAL} audio={false} /></Sequence>
      <Audio src={staticFile("navy/mix_final60.wav")} />
    </AbsoluteFill>
  </RealismCtx.Provider>
);
