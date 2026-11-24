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

const VO = "vo/voiceover-1.22x.mp3"; // ElevenLabs VO, sped up 1.22x (pitch kept), 48.3s

/*
 * Timeline (seconds), 50s total — scenes are cut to the VO lines:
 *  0.0  night hook       horn, VO starts at 1.0
 *  7.4  day reveal       bed ducked (train standing)
 * 16.4  coupling breaks  wheel clacks, die out as the rear coaches stop (~24.6s)
 * 25.6  station master   pass-by rush as the train goes past
 * 31.1  night check      bed
 * 35.2  line clear/band  light clacks
 * 44.6  outro + end card everything fades out by 50s
 */
export const SoundDesign: React.FC = () => (
  <>
    <Clip src={VO} at={1.0} from={0} to={48.3} vol={() => 1} />
    <Clip
      src={AMB}
      at={0}
      from={5}
      to={55}
      vol={curve([0, 0.6, 6.8, 8.2, 15.8, 17.2, 25.6, 31, 35.2, 44.6, 47.5, 50], [0, 0.28, 0.22, 0.07, 0.07, 0.2, 0.16, 0.2, 0.13, 0.2, 0.15, 0])}
    />
    <Clip src={HORN} at={0} from={0.3} to={2.0} vol={curve([0, 0.06, 1.0, 1.6], [0, 0.7, 0.45, 0])} />
    <Clip src={CLACK} at={16.6} from={0.8} to={9} vol={curve([0, 0.4, 6.6, 8.0], [0, 0.32, 0.32, 0])} />
    <Clip src={HORN} at={27.2} from={4.8} to={11} vol={curve([0, 0.4, 4.0, 5.6], [0, 0.42, 0.42, 0])} />
    <Clip src={CLACK} at={35.3} from={1} to={6} vol={curve([0, 0.4, 4.4, 5], [0, 0.2, 0.2, 0])} />
    <Clip src={CLACK} at={40.5} from={1} to={5} vol={curve([0, 0.4, 3.4, 4], [0, 0.2, 0.2, 0])} />
  </>
);
