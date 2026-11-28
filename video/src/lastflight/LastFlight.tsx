import React from "react";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BEATS, FPS, GradeName, SHOTS, TOTAL } from "./timeline";
import { Plate } from "./components/Plate";
import { Subtitles, Super, SpeedReadout } from "./components/Text";
import { TitleCard } from "./components/Title";
import { Grade, Shake, Flash, impulse } from "../earth/components/Look";
import { Particles } from "../earth/components/Particles";
import { Cut, CutLayer, CutLight, overlap } from "./components/Cuts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const s = (sec: number) => Math.round(sec * FPS);

/** Per-scene colour grades for the DAYLIGHT version: clean, bright, gently warm; light vignette and grain. */
const GRADES: Record<GradeName, { filter: string; tint?: string; tintO?: number; shadows?: string; shadowO?: number; vignette: number; grain: number }> = {
  cockpit: { filter: "contrast(1.08) saturate(1.05) brightness(1.02)", tint: "#ff5a40", tintO: 0.08, vignette: 0.4, grain: 0.035 },
  space: { filter: "contrast(1.1) saturate(1.08)", tint: "#4a9cff", tintO: 0.1, vignette: 0.45, grain: 0.03 },
  dust: { filter: "contrast(1.1) saturate(1.12) brightness(1.02)", tint: "#ffd9a8", tintO: 0.12, vignette: 0.3, grain: 0.035 },
  street: { filter: "contrast(1.1) saturate(1.12) brightness(1.03)", tint: "#ffd2a0", tintO: 0.12, vignette: 0.32, grain: 0.04 },
  chase: { filter: "contrast(1.12) saturate(1.12)", tint: "#ffc890", tintO: 0.12, shadows: "#123a4a", shadowO: 0.14, vignette: 0.3, grain: 0.035 },
  roof: { filter: "contrast(1.08) saturate(1.1) brightness(1.03)", tint: "#ffd0a0", tintO: 0.12, vignette: 0.3, grain: 0.035 },
  glass: { filter: "contrast(1.15) saturate(1.05) brightness(1.1)", tint: "#ffd0a0", tintO: 0.1, vignette: 0.35, grain: 0.035 },
  slowmo: { filter: "contrast(1.12) saturate(0.9) brightness(1.06)", tint: "#fff0d8", tintO: 0.15, vignette: 0.5, grain: 0.03 },
  dusk: { filter: "contrast(1.08) saturate(1.15) brightness(1.02)", tint: "#ffb060", tintO: 0.2, vignette: 0.35, grain: 0.035 },
  earth: { filter: "contrast(1.1) saturate(1.08)", tint: "#3a7aff", tintO: 0.08, vignette: 0.45, grain: 0.03 },
};

/** One designed transition per cut (global frame, kind, half-width in frames). */
const CUTS: Cut[] = [
  { at: 96, kind: "zoom", h: 4 },        // visor -> failing instruments
  { at: 144, kind: "cut", h: 1 },        // power dies -> black -> space
  { at: 240, kind: "zoom", h: 6 },       // push through the planet into the city
  { at: 312, kind: "whipVD", h: 5 },     // aerial tilts down to the street
  { at: 384, kind: "whip", h: 4 },       // street -> low angle
  { at: 444, kind: "whipV", h: 5 },      // look up and out to the wide aerial
  { at: 528, kind: "whip", h: 6 },       // whip pan into the chase
  { at: 624, kind: "zoom", h: 5 },       // into the cockpit
  { at: 672, kind: "cut", h: 1 },        // hard cut to the hand (turbulence hit)
  { at: 708, kind: "whipL", h: 5 },      // out to the street below
  { at: 780, kind: "dissolve", h: 6 },   // the wide: a small helicopter in a big city
  { at: 840, kind: "whip", h: 5 },       // side profile
  { at: 888, kind: "leak", h: 8 },       // the rooftop
  { at: 960, kind: "whipV", h: 5 },      // tilt up into the downwash
  { at: 1008, kind: "zoom", h: 4 },      // into the cockpit glass
  { at: 1056, kind: "whipVD", h: 5 },    // down to the girl
  { at: 1104, kind: "zoom", h: 4 },      // push into the hand (slow motion)
  { at: 1128, kind: "cut", h: 1 },       // flash cut: lifted
  { at: 1176, kind: "leak", h: 10 },     // fly out
  { at: 1272, kind: "dissolve", h: 10 }, // the planet
];

/** Shake amplitude (px) per frame: turbulence, impacts, the gale, the fly-over, the title hits. */
const shakeAt = (f: number) => {
  let a = 0;
  if (f < s(6)) a += 2.5 + (f >= s(4) ? 5 : 0);
  a += impulse(f, BEATS.freeze, 10) * 46;
  if (f >= s(10) && f < s(13)) a += interpolate(f, [s(10), s(13)], [3, 9]);
  if (f >= s(13) && f < s(22)) a += 7;
  a += impulse(f, BEATS.pole, 8) * 24;
  a += impulse(f, BEATS.whip, 6) * 14;
  if (f >= s(22) && f < s(26)) a += 4;
  if (f >= s(26) && f < s(29.5)) a += 13 + 8 * Math.max(0, Math.sin(f * 0.9));
  a += impulse(f, BEATS.flyover, 10) * 30;
  if (f >= s(32.5) && f < s(37)) a += 3;
  if (f >= s(37) && f < s(46)) a += 4.5;
  a += impulse(f, BEATS.lift, 10) * 18;
  a += impulse(f, BEATS.title, 8) * 16 + impulse(f, BEATS.subtitle, 6) * 5 + impulse(f, BEATS.final, 6) * 28;
  return a;
};

const Shots: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <Shake amp={shakeAt(f)} rot={shakeAt(f) * 0.035} speed={0.55} seed="lf" zoom={1.03}>
      {SHOTS.map((sh, i) => {
        const g = GRADES[sh.grade];
        const cin = CUTS.find((c) => c.at === sh.from);
        const cout = CUTS.find((c) => c.at === sh.to);
        const pre = overlap(cin), post = overlap(cout);
        return (
          <Sequence key={sh.id} from={sh.from - pre} durationInFrames={sh.to - sh.from + pre + post} name={sh.id}>
            <CutLayer f={f} cin={cin} cout={cout} width={width} height={height}>
              <Grade tint={g.tint} tintOpacity={g.tintO} shadows={g.shadows} shadowOpacity={g.shadowO} vignette={g.vignette} grain={g.grain}>
                <Plate shot={sh.id} frames={sh.frames} offset={(sh.offset ?? 0) - pre} filter={g.filter}
                  bloom={sh.grade === "dusk" || sh.grade === "earth" ? 0.3 : 0.16} scale={sh.zoom ?? 1} origin={sh.origin} />
              </Grade>
            </CutLayer>
          </Sequence>
        );
      })}
    </Shake>
  );
};

/** Cockpit warning light: pulses red with the master-warning alarm; the instruments flicker, then the power dies. */
const CockpitLights: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= s(6)) return null;
  const t = f / FPS;
  const warble = t >= 3.55 ? 0.5 + 0.5 * Math.sign(Math.sin(t * 2 * Math.PI * 2)) : 0.3 + 0.3 * Math.sin(t * 2 * Math.PI * 0.8);
  const red = warble * (t < 5.55 ? 0.22 : 0);
  const flick = t >= 4 && t < 5.55 ? (random(`fl${f}`) < 0.3 ? 0.55 : 0) : 0;
  const dead = interpolate(f, [BEATS.powerdown, BEATS.powerdown + 3], [0, 1], clamp);
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,40,20,0.9), rgba(120,0,0,0) 75%)", opacity: red, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(flick, dead) }} />
    </>
  );
};

/** THE LAST FLIGHT: 60 s vertical disaster short. Every plate is a Blender Cycles render; this is the edit. */
export const LastFlight: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={0} durationInFrames={BEATS.title} name="Shots">
        <Shots />
      </Sequence>
      <CockpitLights />
      {/* S2A fades up out of the blackout */}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(f, [s(6), s(6) + 8], [1, 0], clamp) * (f >= s(6) ? 1 : 0) }} />
      {/* 2D atmosphere over the 3D plates: the dust sea, wind-blown debris, motes in the low sun */}
      <Sequence from={s(10)} durationInFrames={s(46) - s(10)}><Particles kind="dust" count={10} seed="lfdust" speed={1.6} opacity={0.4} color="#d8b890" /></Sequence>
      <Sequence from={s(13)} durationInFrames={s(18.5) - s(13)}><Particles kind="streaks" count={55} seed="lfwind" speed={1.4} opacity={0.6} /></Sequence>
      <Sequence from={s(37)} durationInFrames={s(42) - s(37)}><Particles kind="streaks" count={28} seed="lfroof" speed={1.1} opacity={0.4} /></Sequence>
      <Sequence from={s(44)} durationInFrames={s(46) - s(44)}><Particles kind="streaks" count={28} seed="lfroof2" speed={1.1} opacity={0.4} /></Sequence>
      <Sequence from={s(46)} durationInFrames={s(47) - s(46)}><Particles kind="motes" count={70} seed="lfslow" speed={0.15} opacity={0.8} /></Sequence>
      <Sequence from={s(49)} durationInFrames={s(53) - s(49)}><Particles kind="motes" count={60} seed="lfdusk" speed={0.4} dir={0.4} opacity={0.6} /></Sequence>
      {/* cuts */}
      <Flash at={BEATS.freeze} color="#e8f2ff" peak={0.9} decay={7} />
      <Flash at={BEATS.dustCut} color="#fff0dc" peak={0.6} decay={5} />
      <Flash at={BEATS.pole} color="#ffffff" peak={0.35} decay={4} />
      <Flash at={BEATS.lift} color="#fff2d8" peak={0.4} decay={6} />
      <CutLight cuts={CUTS} />
      {/* science supers (minimal) */}
      <SpeedReadout at={s(6.4)} stop={BEATS.freeze} out={s(9.8)} />
      <Super at={s(10.25)} out={s(12.9)} lines={[{ t: "THE GROUND STOPPED." }, { t: "THE AIR DIDN'T." }, { t: "WIND ≈ 1,580 KM/H →", color: "#ffb36a", size: 34 }]} />
      <Subtitles />
      <Sequence from={BEATS.title} durationInFrames={TOTAL - BEATS.title} name="Title">
        <TitleCard sub={BEATS.subtitle - BEATS.title} final={BEATS.final - BEATS.title} black={BEATS.black - BEATS.title} />
      </Sequence>
      {/* first frames fade up from black */}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(f, [0, 8], [1, 0], clamp) }} />
      {audio && <Audio src={staticFile("lastflight/audio/final_mix.wav")} />}
    </AbsoluteFill>
  );
};
