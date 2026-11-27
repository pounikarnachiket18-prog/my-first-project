import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BEATS, SHOTS, TOTAL } from "./timeline";
import { FrameSequence } from "./components/FrameSequence";
import { Captions } from "./components/Captions";
import { Fade, Flash, Shake, impulse } from "./components/Look";
import { Particles } from "./components/Particles";
import { Headline, OrbitLabels, SideLabels, SpeedCounter, StrikeLine } from "./components/Overlays";

/** Camera-shake amplitude (px) per global frame: impacts + sustained rumble during destruction. */
const shakeAt = (f: number) =>
  impulse(f, BEATS.freeze, 8) * 24 +
  impulse(f, BEATS.groundStop, 8) * 40 + (f >= 400 && f < 600 ? 3 : 0) +
  (f >= 600 && f < 768 ? 5 + (f >= 724 ? (f - 724) * 0.5 : 0) : 0) +
  impulse(f, BEATS.waveHit, 10) * 36 +
  impulse(f, BEATS.finalHit, 6) * 10;

const Shots: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shake amp={shakeAt(f)} rot={shakeAt(f) * 0.04} speed={0.5} seed="cam" zoom={1.02}>
      {SHOTS.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.to - s.from} name={s.id}>
          <FrameSequence shot={s.id} frames={s.frames} offset={s.offset ?? 0} bloom={0.18} filter="contrast(1.06) saturate(1.08)" />
        </Sequence>
      ))}
    </Shake>
  );
};

/** "What If Earth Suddenly Stopped Rotating?" — 50 s vertical science reel (Hinglish), all shots rendered in Blender. */
export const EarthStopped: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Shots />
    {/* light compositing only where the reference also has it: wind debris, spray, heat shimmer, snow */}
    <Sequence from={400} durationInFrames={268}><Particles kind="streaks" count={40} seed="wind" speed={1.2} opacity={0.45} /></Sequence>
    <Sequence from={668} durationInFrames={100}><Particles kind="rain" count={120} seed="spray" speed={1.3} dir={1} opacity={0.55} /></Sequence>
    <Sequence from={1275} durationInFrames={48}><Particles kind="snow" count={110} seed="snow" speed={1} opacity={0.8} /></Sequence>
    <Flash at={BEATS.freeze} color="#dff0ff" peak={0.5} decay={5} />
    <Flash at={BEATS.groundStop} color="#ffffff" peak={0.6} decay={5} />
    <Flash at={BEATS.waveHit} color="#e8f4f6" peak={1} decay={8} />
    {/* science text (minimal) */}
    <Headline at={BEATS.title} out={146} y={0.1} lines={[{ t: "AGAR EARTH", size: 120 }, { t: "RUK JAAYE?", size: 140, c: "#ffd21f" }]} />
    <SpeedCounter at={290} from={300} to={328} out={356} />
    <Sequence from={930} durationInFrames={180}><OrbitLabelsSeq /></Sequence>
    <StrikeLine at={940} strike={BEATS.strike} out={1002} />
    <Headline at={BEATS.oneYear} out={1104} y={0.8} lines={[{ t: "1 DIN = 1 SAAL", size: 120, c: "#ffd21f" }]} />
    <SideLabels dayAt={BEATS.sixDay} nightAt={BEATS.sixNight} out={1212} />
    <Fade from={BEATS.black - 12} to={BEATS.black} />
    <Sequence from={0} durationInFrames={TOTAL - 14} name="Captions"><Captions /></Sequence>
    {audio && <Audio src={staticFile("earth/audio/final_mix.wav")} />}
  </AbsoluteFill>
);

const OrbitLabelsSeq: React.FC = () => {
  const f = useCurrentFrame();
  return <OrbitLabels shotFrame={f} />;
};
