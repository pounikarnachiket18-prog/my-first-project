import React from "react";
import { Html5Audio, Sequence, interpolate, staticFile } from "remotion";

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
const curve = (times: number[], vols: number[]) => (f: number) =>
  interpolate(f / FPS, times, vols, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** One clip: placed at `at` seconds, using `from`..`to` seconds of the source file */
const Clip: React.FC<{ src: string; at: number; from: number; to: number; vol: (f: number) => number }> = ({ src, at, from, to, vol }) => (
  <Sequence from={s(at)} durationInFrames={s(to - from)} layout="none">
    <Html5Audio src={staticFile(src)} trimBefore={s(from)} trimAfter={s(to)} volume={vol} />
  </Sequence>
);

const AMB = "sfx/express-ambience.mp3"; // continuous rumble + wheel rhythm
const HORN = "sfx/horn-passby.mp3"; // horn 0.4-2.2s, doppler horn 2-5s, pass-by rush 5.5-14s
const CLACK = "sfx/wheel-clacks.mp3"; // clickety-clack over rail joints 1-10s

const VO = "vo/voiceover-40s.mp3"; // ElevenLabs VO, pauses tightened + 1.37x (pitch kept), 38.5s

/*
 * Timeline (seconds), 40s total — scenes are cut to the VO lines:
 *  0.0  night hook       short horn, VO starts at 0.6
 *  5.6  day reveal       bed ducked (train standing)
 * 12.6  coupling breaks  wheel clacks, die out as the rear coaches stop (~19s)
 * 20.0  station master   pass-by rush as the train goes past
 * 24.6  night check      bed
 * 27.9  line clear/band  light clacks
 * 35.4  outro + end card everything fades out by 40s
 * Train SFX kept low (about -6 dB vs the earlier mix) so the voice leads.
 */
export const SoundDesign: React.FC = () => (
  <>
    <Clip src={VO} at={0.6} from={0} to={37.5} vol={curve([0, 36.7, 36.9], [1, 1, 0])} />
    <Clip
      src={AMB}
      at={0}
      from={5}
      to={45}
      vol={curve([0, 0.5, 5.0, 6.2, 12.3, 13.3, 20, 24.6, 27.9, 35.4, 38, 40], [0, 0.14, 0.11, 0.035, 0.035, 0.1, 0.08, 0.1, 0.065, 0.1, 0.075, 0])}
    />
    <Clip src={HORN} at={0} from={0.3} to={1.6} vol={curve([0, 0.05, 0.6, 1.1], [0, 0.4, 0.25, 0])} />
    <Clip src={CLACK} at={12.75} from={0.8} to={8} vol={curve([0, 0.3, 5.2, 6.5], [0, 0.16, 0.16, 0])} />
    <Clip src={HORN} at={21.3} from={4.8} to={10} vol={curve([0, 0.4, 3.2, 4.5], [0, 0.22, 0.22, 0])} />
    <Clip src={CLACK} at={28.0} from={1} to={5} vol={curve([0, 0.3, 3.4, 4], [0, 0.1, 0.1, 0])} />
    <Clip src={CLACK} at={32.0} from={1} to={4} vol={curve([0, 0.3, 2.5, 3], [0, 0.1, 0.1, 0])} />
  </>
);
