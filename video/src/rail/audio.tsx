import React from "react";
import { Audio, Loop, Sequence, getStaticFiles, staticFile } from "remotion";
import { DURATION, s } from "./theme";

/**
 * AUDIO SLOTS
 * Drop files into video/public/audio/ with these exact names — any file
 * that exists is mixed in automatically; missing ones are skipped.
 * Change `at` (seconds) / `volume` to taste.
 */
export const VOICEOVER = { file: "audio/voiceover.mp3", volume: 1 };

export const AMBIENCE = [
  // continuous train running sound under the whole video
  { file: "audio/train-ambience.mp3", volume: 0.22 },
];

export const SFX: { file: string; at: number; volume?: number }[] = [
  { file: "audio/train-horn.mp3", at: 0.0, volume: 0.5 }, // opening
  { file: "audio/packet-open.mp3", at: 5.3 }, // bedroll lid slides off
  { file: "audio/cloth-whoosh.mp3", at: 5.6 }, // chadar slides out
  { file: "audio/washing-machine.mp3", at: 11.2, volume: 0.6 }, // Dhulai
  { file: "audio/press-steam.mp3", at: 13.4, volume: 0.6 }, // Press
  { file: "audio/pop.mp3", at: 14.6, volume: 0.5 }, // packets stack
  { file: "audio/calendar-ticks.mp3", at: 20.3, volume: 0.5 }, // trips fill in
  { file: "audio/ding.mp3", at: 22.4, volume: 0.6 }, // kambal dhulai ring
  { file: "audio/cloth-whoosh.mp3", at: 30.3 }, // sheet 1 spreads
  { file: "audio/cloth-whoosh.mp3", at: 32.6 }, // blanket into cover
  { file: "audio/whoosh.mp3", at: 39.6 }, // printed cover wipes in
  { file: "audio/train-horn.mp3", at: 44.0, volume: 0.35 }, // end card
];

const has = (() => {
  let names: Set<string> | null = null;
  return (file: string) => {
    if (!names) {
      try {
        names = new Set(getStaticFiles().map((f) => f.name));
      } catch {
        names = new Set();
      }
    }
    return names.has(file);
  };
})();

export const Soundtrack: React.FC = () => (
  <>
    {has(VOICEOVER.file) && <Audio src={staticFile(VOICEOVER.file)} volume={VOICEOVER.volume} />}
    {AMBIENCE.filter((a) => has(a.file)).map((a) => (
      <Loop key={a.file} durationInFrames={DURATION}>
        <Audio src={staticFile(a.file)} volume={a.volume} />
      </Loop>
    ))}
    {SFX.filter((x) => has(x.file)).map((x, i) => (
      <Sequence key={i} from={s(x.at)}>
        <Audio src={staticFile(x.file)} volume={x.volume ?? 0.7} />
      </Sequence>
    ))}
  </>
);
