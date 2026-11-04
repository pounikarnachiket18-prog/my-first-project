import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Watermark, ThumbnailCard, MUSIC } from "./primitives";
import { HookScene } from "./scenes/HookScene";
import { StatementScene } from "./scenes/StatementScene";
import { OutroScene } from "./scenes/OutroScene";

// Compose your scenes here. Import from src/scenes/ — populate that folder
// by copying templates from ../scene-templates/ then customizing copy/timing.
//
// Example pattern (after copying HookScene.tsx into src/scenes/):
//
//   import { HookScene } from "./scenes/HookScene";
//   ...
//   <Sequence from={59} durationInFrames={130}>
//     <HookScene />
//   </Sequence>

const T = 59; // thumbnail intro duration

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* Thumbnail intro */}
    <Sequence from={0} durationInFrames={T}>
      <ThumbnailCard animated brandInitial="h." brandName="HypoExplained" hook="Paisa kahan gayab ho jata hai?" tagline="COMPLEX TOPICS, SIMPLE WORDS" />
    </Sequence>

    {/* ===== YOUR SCENES GO HERE ===== */}
    <Sequence from={T} durationInFrames={127}><HookScene /></Sequence>
    <Sequence from={T + 127} durationInFrames={75}><StatementScene /></Sequence>
    <Sequence from={T + 202} durationInFrames={90}><OutroScene /></Sequence>

    {/* Persistent watermark */}
    <Sequence from={T} durationInFrames={202}>
      <Watermark initial="h." />
    </Sequence>

    {/* Music — drop a track in public/ and update the path */}
    {/* <Audio src={staticFile("track.mp3")} volume={MUSIC.audioVolume} startFrom={MUSIC.audioStartFrom} /> */}
  </AbsoluteFill>
);
