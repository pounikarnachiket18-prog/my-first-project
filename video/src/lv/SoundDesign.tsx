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

/*
 * Timeline (seconds) — matches DhonipurLV scene order:
 *  0.0  night hook (train pulls away)     -> horn + bed
 *  5.8  day reveal (train standing)       -> bed ducked low
 * 15.7  coupling breaks                    -> wheel clacks, stop when rear coaches stop (~22s)
 * 27.5  station master, train passes       -> pass-by rush
 * 33.3  night check                        -> bed
 * 37.5  line clear / line blocked          -> light clacks as train passes
 * 49.2  outro (train departs) + end card   -> horn, everything fades out
 */
export const SoundDesign: React.FC = () => (
  <>
    <Clip
      src={AMB}
      at={0}
      from={5}
      to={61.2}
      vol={curve([0, 0.6, 5.5, 7, 15.5, 17, 27.5, 33.5, 37.5, 49.5, 52.5, 56], [0, 0.35, 0.35, 0.1, 0.1, 0.3, 0.25, 0.3, 0.2, 0.32, 0.22, 0])}
    />
    <Clip src={HORN} at={0.1} from={0.3} to={2.4} vol={curve([0, 0.08, 1.7, 2.1], [0, 0.75, 0.75, 0])} />
    <Clip src={CLACK} at={16.0} from={0.8} to={9} vol={curve([0, 0.4, 5.5, 7.0], [0, 0.55, 0.55, 0])} />
    <Clip src={HORN} at={28.0} from={4.8} to={16} vol={curve([0, 0.5, 6.0, 8.5], [0, 0.75, 0.75, 0])} />
    <Clip src={CLACK} at={37.8} from={1} to={7} vol={curve([0, 0.4, 5.4, 6], [0, 0.35, 0.35, 0])} />
    <Clip src={CLACK} at={43.6} from={1} to={7} vol={curve([0, 0.4, 5.4, 6], [0, 0.35, 0.35, 0])} />
    <Clip src={HORN} at={49.6} from={0.3} to={5} vol={curve([0, 0.08, 3.5, 4.7], [0, 0.6, 0.6, 0])} />
  </>
);
