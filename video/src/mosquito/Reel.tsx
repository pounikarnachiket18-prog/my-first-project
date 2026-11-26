/**
 * JUST KNOW IT — "Why do mosquitoes bite some people more?"
 * 35 s · 1080×1920 · 30 fps. Timing lives in config/timeline.json
 * (shared with scripts/generate_audio.py).
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SC, TL, CUE, FPS, smoothstep, clamp } from "./core/anim";
import { useBrandFonts, Headline, SciLabel, StudyChip, BrandBug, Caption, CO2Text, FONT, SAFE } from "./ui/Typography";
import { OpeningScene, openingShot, palpAnchor, antennaAnchor } from "./scenes/S2Detection";
import { SignalsScene, signalsShot, co2Pos, odourPos } from "./scenes/S3Signals";
import { MoleculeScene, moleculeShot, coohA, CompareScene, compareShot, anchorA, anchorB, T_A1, T_B0 } from "./scenes/S4Reveal";
import { PayoffScene } from "./scenes/S5Payoff";
import { BrandScene } from "./scenes/S6Brand";
import { PEOPLE } from "./scenes/cast";

export type ReelProps = { captions?: boolean; audio?: boolean };

const f = (s: number) => Math.round(s * FPS);

/** Sequence that fades its content in over `fadeIn` frames (for overlapping match-dissolves). */
const Seq: React.FC<{ from: number; to: number; fadeIn?: number; children: React.ReactNode }> = ({ from, to, fadeIn = 0, children }) => (
  <Sequence from={from} durationInFrames={to - from} layout="none">
    <Fade fadeIn={fadeIn}>{children}</Fade>
  </Sequence>
);
const Fade: React.FC<{ fadeIn: number; children: React.ReactNode }> = ({ fadeIn, children }) => {
  const frame = useCurrentFrame();
  const o = fadeIn > 0 ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** "SWEET BLOOD?" with an animated strike-through — the myth being corrected. */
const Myth: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < CUE.sweetBlood - 0.1 || t > 30.6) return null;
  const a = smoothstep(CUE.sweetBlood, CUE.sweetBlood + 0.35, t) * (1 - smoothstep(30.1, 30.5, t));
  const strike = smoothstep(29.35, 29.75, t);
  return (
    <div style={{ position: "absolute", left: SAFE.left, right: 1080 - SAFE.right, top: 330, textAlign: "center", opacity: a }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 30, letterSpacing: 6, color: "#ffb0b0", marginBottom: 10 }}>MYTH</div>
      <div style={{ position: "relative", display: "inline-block", fontFamily: FONT.sans, fontWeight: 900, fontSize: 124, letterSpacing: -4, color: "#fff", lineHeight: 1, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        SWEET BLOOD?
        <div style={{ position: "absolute", left: -12, top: "50%", height: 12, width: `${strike * 104}%`, background: "#ff5a5a", borderRadius: 6, boxShadow: "0 0 24px #ff5a5a" }} />
      </div>
    </div>
  );
};

const Caveat: React.FC<{ at: number; until: number; text: string; y?: number }> = ({ at, until, text, y = 1395 }) => {
  const t = useCurrentFrame() / FPS;
  if (t < at || t > until + 0.4) return null;
  const a = smoothstep(at, at + 0.4, t) * (1 - smoothstep(until, until + 0.35, t));
  return (
    <div style={{ position: "absolute", left: SAFE.left, right: 1080 - SAFE.right, top: y, textAlign: "center", fontFamily: FONT.mono, fontSize: 27, fontWeight: 500, letterSpacing: 1.5, color: "rgba(230,250,255,0.9)", opacity: a, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
      {text}
    </div>
  );
};

const SplitTags: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const a = smoothstep(28.4, 28.9, t) * (1 - smoothstep(32.7, 33.0, t));
  const tag = (txt: string, sub: string, color: string, x: number) => (
    <div style={{ position: "absolute", left: x, width: 470, top: 1300, textAlign: "center", fontFamily: FONT.mono, opacity: a }}>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, color }}>{txt}</div>
      <div style={{ fontSize: 22, letterSpacing: 2, color: "rgba(255,255,255,0.75)", marginTop: 6 }}>{sub}</div>
    </div>
  );
  return (
    <>
      {tag("STRONG SIGNATURE", "more mosquito visits", "#ffc04d", 35)}
      {tag("WEAK SIGNATURE", "fewer visits", "#9fdcff", 575)}
    </>
  );
};

/** Warm light-flash that bridges the breath chase into the macro skin world. */
const Flash: React.FC<{ at: number; color?: string }> = ({ at, color = "#fff1e0" }) => {
  const t = useCurrentFrame() / FPS;
  const a = smoothstep(at - 0.22, at, t) * (1 - smoothstep(at, at + 0.38, t));
  if (a <= 0.001) return null;
  return <AbsoluteFill style={{ background: color, opacity: a, mixBlendMode: "screen" }} />;
};

const Tagline: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < 33.6) return null;
  const a = smoothstep(33.75, 34.25, t);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1090, textAlign: "center", fontFamily: FONT.sans, fontWeight: 500, fontSize: 46, letterSpacing: 1, color: "rgba(255,255,255,0.92)", opacity: a, transform: `translateY(${(1 - a) * 16}px)` }}>
      Curiosity starts here.
    </div>
  );
};

export const Reel: React.FC<ReelProps> = ({ captions = false, audio = true }) => {
  useBrandFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const bugOpacity = 0.75 * (1 - smoothstep(32.6, 33.0, t));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Scenes 1+2: one continuous world & camera (0–11 s) */}
      <Seq from={0} to={SC.signals.from}>
        <OpeningScene />
      </Seq>
      {/* Scene 3 (flash match from the breath chase) */}
      <Seq from={SC.signals.from} to={SC.reveal.from}>
        <SignalsScene />
      </Seq>
      {/* Scene 4a — molecular reveal (match-cut from Scene 3's dive) */}
      <Seq from={SC.reveal.from} to={f(T_A1)}>
        <MoleculeScene />
      </Seq>
      {/* Scene 4b — side-by-side skin samples (dissolve through the molecule field) */}
      <Seq from={f(T_B0)} to={SC.payoff.from} fadeIn={f(T_A1) - f(T_B0)}>
        <CompareScene />
      </Seq>
      {/* Scene 5 — split screen */}
      <Seq from={SC.payoff.from} to={SC.brand.from} fadeIn={6}>
        <PayoffScene leftLook={PEOPLE[3].look} rightLook={PEOPLE[1].look} />
      </Seq>
      {/* Scene 6 — brand */}
      <Seq from={SC.brand.from} to={TL.durationInFrames} fadeIn={5}>
        <BrandScene />
      </Seq>

      <Flash at={SC.signals.from / FPS} />

      {/* ---------------- Typography (reel time) ---------------- */}
      <Headline at={CUE.whyYou} until={4.35} lines={["WHY", "*YOU?"]} y={430} size={190} accent="#ffcf7a" tracking={-6} />

      <SciLabel at={7.3} until={8.35} shot={openingShot} anchor={palpAnchor} text="MAXILLARY PALPS" sub="CO₂ sensors" dx={150} dy={210} color="#7ff3ff" size={38} />
      <SciLabel at={7.8} until={8.35} shot={openingShot} anchor={antennaAnchor} text="ANTENNAE" sub="odour · heat" dx={120} dy={-200} color="#ffc46b" size={38} />
      <Headline at={CUE.senseBreath} until={10.3} lines={["IT CAN", "*SENSE YOUR", "*BREATH"]} y={300} size={112} accent="#7ff3ff" />

      <SciLabel at={CUE.co2Label} until={13.25} shot={signalsShot} anchor={(tt) => co2Pos(4, tt)} text={<CO2Text />} sub="from your breath" dx={110} dy={-190} color="#7ff3ff" size={64} />
      <SciLabel at={CUE.heatLabel} until={14.8} shot={signalsShot} anchor={() => [5.3, 0.9, 5.2]} text="BODY HEAT" sub="rising off your skin" dx={-120} dy={-260} color="#ff9a4a" size={60} />
      <SciLabel at={CUE.odourLabel} until={16.75} shot={signalsShot} anchor={(tt) => odourPos(0, tt)} text="SKIN ODOUR" sub="sweat + skin chemicals" dx={120} dy={-230} color="#d8ff7a" size={60} />

      <StudyChip at={CUE.studyChip} until={27.7} y={1300} />
      <SciLabel at={20.3} until={22.2} shot={moleculeShot} anchor={coohA} text="–COOH" sub="carboxyl group" dx={130} dy={-220} color="#ffc04d" size={58} />
      <Headline at={CUE.carboxylic} until={24.45} lines={["*CARBOXYLIC", "*ACIDS"]} y={300} size={128} accent="#ffc04d" />
      <SciLabel at={CUE.comparison + 0.5} until={27.75} shot={compareShot} anchor={() => anchorA} text="SKIN A" sub="more carboxylic acids" dx={-60} dy={-170} color="#ffc04d" size={44} />
      <SciLabel at={CUE.comparison + 0.8} until={27.75} shot={compareShot} anchor={() => anchorB} text="SKIN B" sub="fewer carboxylic acids" dx={-60} dy={-110} color="#9fdcff" size={44} />
      <Caveat at={26.0} until={27.75} text="Linked to higher attraction — one factor among several" />

      <Myth />
      <Headline at={CUE.signature} until={32.75} lines={["YOUR SKIN HAS A", "*CHEMICAL", "*SIGNATURE"]} y={270} size={98} accent="#ffc04d" />
      <SplitTags />
      <Caveat at={31.4} until={32.75} text="CO₂ + body heat + skin odour, together" y={1430} />

      <Tagline />
      <BrandBug opacity={bugOpacity} />
      {captions && TL.vo.map((v) => <Caption key={v.id} text={v.display} at={v.start} until={v.start + v.slot} />)}
      {audio ? (
        <>
          <Audio src={staticFile("jki/audio/sfx.wav")} />
          <Audio src={staticFile("jki/audio/vo.wav")} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export const _unused = clamp;
