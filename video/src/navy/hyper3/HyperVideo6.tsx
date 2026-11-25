// Reel 2 v6: v5 "best-of" + the user's Blender dogfight clip
//  - opening hook: dogfight -> cockpit HUD lock -> "WEAPON AWAY" (clip 0-5.07 s), flash-cut into the story
//  - strike: the clip's double impact replaces the wide hit shot, slowed so both blasts land on the voice beats
import React from "react";
import { AbsoluteFill, Sequence, OffthreadVideo, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { HyperVideo5, HYPER5_FRAMES } from "./HyperVideo5";
import { SCENES_H5, H5Strike } from "./scenes_h5";
import { useS, Big, Illus } from "./scenes_h3";

const FPS = 30;
const CLIP = "navy/dogfight.mp4";
const HOOK = 152;            // clip 0 -> 5.07 s (cut just before its missile-flight shot)
const HIT1 = 7.17, HIT2 = 7.87; // flash times of the two impacts in the clip
export const HYPER6_FRAMES = HOOK + HYPER5_FRAMES;

/** strike: our race shots, then the user's impact footage time-mapped onto hyperHit / superHit */
const H6Strike: React.FC = () => {
  const { f, Le, W, dur } = useS("strike");
  const cf = useCurrentFrame();
  const hyperHit = Le(10) - 10, superHit = W(11, 1);
  const rate = (HIT2 - HIT1) / ((superHit - hyperHit) / FPS);
  const start = hyperHit - Math.round(((HIT1 - 6.68) / rate) * FPS); // first frame of the clip's ship shot
  if (f < start) return <H5Strike />;
  const clipStart = HIT1 - ((hyperHit - start) / FPS) * rate;
  const tag = (x: number, y: number, text: string, col: string, p: number, left = false) => p > 0 && (
    <div style={{ position: "absolute", left: left ? undefined : x + 40, right: left ? 1080 - x + 40 : undefined, top: y - 120, opacity: Math.min(1, p * 2), fontFamily: "Inter" }}>
      <div style={{ padding: "8px 14px", background: "rgba(4,10,18,0.74)", borderLeft: `4px solid ${col}`, color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: 2.5 }}>{text}</div>
    </div>
  );
  const p1 = interpolate(f, [hyperHit + 3, hyperHit + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p2 = interpolate(f, [superHit + 4, superHit + 13], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Sequence from={start - f + cf} layout="none">
        <OffthreadVideo src={staticFile(CLIP)} trimBefore={Math.round(clipStart * FPS)} playbackRate={rate} muted style={{ position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover" }} />
      </Sequence>
      {tag(560, 900, "HYPERSONIC · 1st", "#ff3d9a", p1)}
      {tag(230, 780, "SUPERSONIC · 2nd", "#ffb703", p2)}
      <Big text="HIT!" f={f} at={superHit} until={dur + 20} y={600} size={200} color="#ffc233" />
      <Illus />
    </AbsoluteFill>
  );
};

const SCENES_H6: Record<string, React.FC> = { ...SCENES_H5, strike: H6Strike };

/** hook: the user's dogfight, cockpit lock and weapon release, with the series title */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [HOOK - 4, HOOK], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const title = interpolate(f, [6, 16, HOOK - 10, HOOK - 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(CLIP)} muted style={{ width: 1080, height: 1920, objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 0, width: 1080, top: 150, textAlign: "center", opacity: title, fontFamily: "Inter", whiteSpace: "nowrap",
        textShadow: "0 3px 0 rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.6), 0 4px 22px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "inline-block", transform: "scaleX(0.8)", fontWeight: 900, fontSize: 60, color: "#fff" }}>
          SUPERSONIC <span style={{ fontSize: 40, color: "#ffc233" }}>vs</span> HYPERSONIC
        </div>
        <div style={{ marginTop: 2, fontWeight: 800, fontSize: 19, letterSpacing: 3, color: "#f2f5f9" }}>MINDSET MODE <span style={{ color: "rgba(255,255,255,0.45)" }}>|</span> <span style={{ color: "#9fe2ff" }}>EXPLAINERS</span></div>
      </div>
      <Illus />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

export const HyperVideo6: React.FC = () => {
  const vol = (fr: number) => interpolate(fr, [0, 4, HOOK - 8, HOOK + 4], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={HOOK + 2} name="hook">
        <Hook />
      </Sequence>
      <Sequence from={HOOK} name="story">
        <HyperVideo5 scenes={SCENES_H6} />
      </Sequence>
      <Sequence durationInFrames={HOOK + 6} name="hook-audio" layout="none">
        <Audio src={staticFile(CLIP)} volume={vol} />
      </Sequence>
    </AbsoluteFill>
  );
};
