import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Watermark, ThumbnailCard } from "./primitives";
import { HookScene } from "./scenes/HookScene";
import { SamosaScene, SAMOSA_FRAMES } from "./scenes/SamosaScene";
import { StatementScene } from "./scenes/StatementScene";
import { WhyScene, WHY_FRAMES } from "./scenes/WhyScene";
import { TakeawayScene, TAKEAWAY_FRAMES } from "./scenes/TakeawayScene";
import { OutroScene } from "./scenes/OutroScene";

// Scene order + lengths (frames @ 30fps). Total must equal TOTAL_FRAMES.
const SCENES: { id: string; frames: number; el: React.ReactNode }[] = [
  { id: "thumb", frames: 59, el: <ThumbnailCard animated brandInitial="h." brandName="HypoExplained" hook="Paisa kahan gayab ho jata hai?" tagline="COMPLEX TOPICS, SIMPLE WORDS" /> },
  { id: "hook", frames: 127, el: <HookScene /> },
  { id: "samosa", frames: SAMOSA_FRAMES, el: <SamosaScene /> },
  { id: "statement", frames: 75, el: <StatementScene /> },
  { id: "why", frames: WHY_FRAMES, el: <WhyScene /> },
  { id: "takeaway", frames: TAKEAWAY_FRAMES, el: <TakeawayScene /> },
  { id: "outro", frames: 90, el: <OutroScene /> },
];

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0); // 900 = 30s

const starts = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, s) => n + s.frames, 0));
const OUTRO_START = starts[SCENES.length - 1];
const THUMB = SCENES[0].frames;

/** Shared timeline for both 16:9 and 9:16 — scenes adapt via useVideoConfig(). */
export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map((s, i) => (
      <Sequence key={s.id} from={starts[i]} durationInFrames={s.frames}>{s.el}</Sequence>
    ))}
    <Sequence from={THUMB} durationInFrames={OUTRO_START - THUMB}>
      <Watermark initial="h." />
    </Sequence>
    {/* Music: drop a track in public/ and add
        <Audio src={staticFile("track.mp3")} volume={MUSIC.audioVolume} /> */}
  </AbsoluteFill>
);
