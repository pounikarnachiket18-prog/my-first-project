import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { brand, CUTS, fontCss, sampleTrack, SRC_W } from "./theme";
import { openTrack, frontTrack, decalATrack, decalBTrack } from "./tracks";
import { FrontLedBoard, SideLettering, TrainTitle } from "./Rajdhani";
import { LampGlow, LightBeam, finalLamps } from "./Headlight";
import {
  AlertEdge,
  AlertMeter,
  CommentBubble,
  CutFlash,
  Dust,
  Finish,
  LightLeak,
  NameTag,
  Sparks,
  Speedometer,
  SpeedLines,
  Stars,
  TapPulse,
  WarningBadge,
  Zzz,
} from "./Graphics";
import { Shout, Uncle } from "./Uncle";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const BRAKE = 881; // emergency brake shot
const BRAKE_END = 967;
const FINAL = 1121; // train approaching camera
const HORN_SCARE = 1182; // horn blows (audio at 39.3s)
const UNCLE_RUNS = 1200; // first (front) uncle bolts

type GangMember = { x: number; y: number; height: number; look: number; facing: "left" | "right" };
// opening "RAAT 03:00 AM" shot – far from the train, nobody suspects anything
// opening "RAAT 03:00 AM" shot – they hum, the horn blows at 0.8s, and they scatter before the first cut
const OPEN_HORN = 24;
const OPENING_GANG: (GangMember & { scareAt: number; runAt: number })[] = [
  { x: 62, y: 858, height: 102, look: 2, facing: "left", scareAt: 29, runAt: 36 },
  { x: 350, y: 818, height: 88, look: 1, facing: "left", scareAt: 27, runAt: 44 },
  { x: 240, y: 892, height: 118, look: 3, facing: "left", scareAt: 28, runAt: 48 },
  { x: 108, y: 995, height: 152, look: 0, facing: "left", scareAt: 26, runAt: 40 },
];
// finale – ordered far -> near so nearer uncles draw on top
const FINAL_GANG: (GangMember & { scareAt: number; runAt: number; lit: number })[] = [
  { x: 70, y: 872, height: 92, look: 2, facing: "left", scareAt: 1187, runAt: 1196, lit: 0.85 }, // dada is somehow the fastest
  { x: 610, y: 862, height: 92, look: 1, facing: "right", scareAt: 1184, runAt: 1203, lit: 0.7 },
  { x: 262, y: 912, height: 112, look: 3, facing: "left", scareAt: 1185, runAt: 1207, lit: 0.9 },
  { x: 135, y: 1030, height: 150, look: 0, facing: "left", scareAt: 1181, runAt: UNCLE_RUNS, lit: 0.95 },
];
const CTA = 1236; // "COMMENT KARO"

/** Zoom-punch at every cut + camera shake during the emergency brake. */
const useCamera = (frame: number) => {
  const c = [...CUTS].reverse().find((k) => frame >= k);
  const sinceCut = c === undefined ? 999 : frame - c;
  const punch = interpolate(sinceCut, [0, 10], [1.055, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  let sx = 0;
  let sy = 0;
  if (frame >= BRAKE && frame < BRAKE + 40) {
    const amp = interpolate(frame, [BRAKE, BRAKE + 40], [9, 0], clamp);
    sx = noise2D("shx", frame * 0.6, 0) * amp;
    sy = noise2D("shy", 0, frame * 0.6) * amp;
  }
  // tiny jolt when the horn blows
  if (frame >= HORN_SCARE && frame < HORN_SCARE + 10) {
    const amp = interpolate(frame, [HORN_SCARE, HORN_SCARE + 10], [4, 0], clamp);
    sx += noise2D("hx", frame, 0) * amp;
    sy += noise2D("hy", 0, frame) * amp;
  }
  return { punch, sx, sy };
};

const Overlays: React.FC = () => {
  const frame = useCurrentFrame();

  // --- headlights -------------------------------------------------------
  const lamps: React.ReactNode[] = [];
  const o = sampleTrack(openTrack, frame);
  if (o && frame < 66) {
    const sz = interpolate(frame, [0, 65], [5, 8.5], clamp);
    lamps.push(<LightBeam key="ob" x={o.x} y={o.y + 4} topW={10} bottomW={520} opacity={0.22} />);
    lamps.push(<LampGlow key="o" x={o.x} y={o.y - 6} size={sz} seed="open" />);
  }
  const fr = sampleTrack(frontTrack, frame);
  if (fr && frame >= 184 && frame < 256) {
    const sz = interpolate(frame, [184, 255], [9, 12], clamp);
    lamps.push(<LightBeam key="fb" x={fr.x} y={fr.y + 30} topW={30} bottomW={760} opacity={0.28} />);
    lamps.push(<LampGlow key="f" x={fr.x} y={fr.y} size={sz} seed="front" />);
  }
  let L: ReturnType<typeof finalLamps> | null = null;
  if (frame >= FINAL) {
    L = finalLamps(frame);
    const sz = L.spacing / 7.5;
    const on = interpolate(frame, [FINAL, FINAL + 5], [0.4, 1], clamp);
    // headlight flashes brighter with the horn
    const hornBoost = interpolate(frame, [HORN_SCARE, HORN_SCARE + 3, HORN_SCARE + 24], [1, 1.5, 1], clamp);
    lamps.push(<FrontLedBoard key="led" x={L.roof.x} y={L.roof.y + L.spacing * 0.1} w={L.spacing * 0.92} on={on} />);
    lamps.push(<LightBeam key="lb" x={L.roof.x} y={L.lowerL.y} topW={L.spacing * 1.2} bottomW={900} opacity={0.3 * on * hornBoost} />);
    lamps.push(<LampGlow key="r" x={L.roof.x} y={L.roof.y} size={sz} seed="roof" intensity={on * hornBoost} />);
    lamps.push(<LampGlow key="l1" x={L.lowerL.x} y={L.lowerL.y} size={sz * 0.6} seed="l1" rays={false} intensity={0.8 * on} />);
    lamps.push(<LampGlow key="l2" x={L.lowerR.x} y={L.lowerR.y} size={sz * 0.6} seed="l2" rays={false} intensity={0.8 * on} />);
  }

  // painted "RAJDHANI EXPRESS" on the loco side (where the old logo was painted out)
  let lettering: React.ReactNode = null;
  if (frame >= 66 && frame < 127) {
    const d = sampleTrack(decalATrack, Math.max(frame, 67));
    if (d) lettering = <SideLettering x={d.x} y={d.y} skew={-11} scale={0.95} />;
  }
  if (frame >= BRAKE && frame < BRAKE_END) {
    const d = sampleTrack(decalBTrack, Math.max(frame, 882));
    if (d) lettering = <SideLettering x={d.x} y={d.y} skew={-28} scale={0.85} />;
  }

  // speed curve that matches the on-screen numbers (110 -> 95 -> 35)
  const speedKeys: [number, number][] = [
    [BRAKE, 110],
    [908, 110],
    [915, 95],
    [925, 73],
    [935, 58],
    [950, 28],
    [965, 0],
  ];

  return (
    <>
      <Stars ranges={[[0, 66], [184, 256], [FINAL, 1320]]} />

      {/* the four uncles by the tracks: opening (unaware) ... */}
      {OPENING_GANG.map((u, i) => (
        <Uncle
          key={`o${i}`}
          x={u.x}
          y={u.y}
          height={u.height}
          look={u.look}
          facing={u.facing}
          from={0}
          to={66}
          seed={10 + i}
          lit={(f) => interpolate(f, [0, 65], [0.2, 0.32], clamp)}
          scareAt={u.scareAt}
          runAt={u.runAt}
        />
      ))}
      <Shout text="BHAAGO!!" x={300} y={1080} from={OPEN_HORN + 5} to={44} rot={-8} size={38} />
      {/* ... and the finale: the horn blows, chain-reaction panic, everybody bolts (lotas left behind) */}
      {FINAL_GANG.map((u, i) => (
        <Uncle
          key={`f${i}`}
          x={u.x}
          y={u.y}
          height={u.height}
          look={u.look}
          facing={u.facing}
          from={FINAL}
          to={u.runAt + 20}
          seed={20 + i}
          lit={(f) => interpolate(f, [FINAL, HORN_SCARE, HORN_SCARE + 4], [u.lit * 0.3, u.lit * 0.65, u.lit], clamp)}
          scareAt={u.scareAt}
          runAt={u.runAt}
        />
      ))}
      <Shout text="BHAAGO!!" x={300} y={1065} from={HORN_SCARE + 3} to={UNCLE_RUNS + 6} rot={-10} size={40} />
      <Shout text="TRAIN AAYI!" x={555} y={735} from={HORN_SCARE + 7} to={1203} rot={8} size={26} />
      {frame >= HORN_SCARE && frame < HORN_SCARE + 20 && L && (
        // horn shock-wave rings from the loco
        <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
          {[0, 1].map((i) => {
            const t = interpolate(frame - HORN_SCARE - i * 5, [0, 15], [0, 1], clamp);
            const r = 40 + t * 380;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: L!.roof.x - r,
                  top: L!.roof.y - r * 0.6,
                  width: r * 2,
                  height: r * 1.2,
                  borderRadius: "50%",
                  border: "3px solid rgba(34,230,255,0.85)",
                  opacity: (1 - t) * (t > 0 ? 1 : 0),
                }}
              />
            );
          })}
        </div>
      )}

      {lamps}
      {lettering}
      <TrainTitle from={72} to={127} y={1030} />
      {/* speedometer over the source's "110 KM/H" box in the opening side shot: needle sweeps up to 110 */}
      <Speedometer
        from={66}
        to={127}
        x0={184}
        y0={169}
        w={352}
        h={298}
        keys={[
          [66, 0],
          [84, 118],
          [92, 108],
          [98, 110],
        ]}
      />
      <NameTag name="RAJDHANI" role="EXPRESS" color={brand.cyan} anchor={{ x: 350, y: 628 }} tag={{ x: 545, y: 520 }} from={6} to={62} />

      {/* speed lines on running shots */}
      <SpeedLines from={66} to={127} dir={-1} intensity={0.8} />
      <SpeedLines from={BRAKE} to={BRAKE_END} dir={-1} intensity={interpolate(frame, [BRAKE, BRAKE_END], [1, 0.25], clamp)} />

      {/* cab ambience */}
      <Dust from={127} to={184} />
      <Dust from={256} to={881} count={22} />
      <Dust from={967} to={FINAL} count={22} />

      {/* VCD close-up: show which button the pilot must press */}
      <TapPulse from={340} to={411} x={213} y={733} r={58} color={brand.cyan} label="ACK = PRESS" delay={10} />
      <TapPulse from={355} to={411} x={520} y={653} r={50} color={brand.lime} period={30} />

      {/* alertness drains as ABHI dozes off */}
      <AlertMeter
        from={487}
        to={881}
        keys={[
          [487, 1],
          [660, 0.9],
          [700, 0.55],
          [729, 0.42],
          [805, 0.3],
          [870, 0.05],
        ]}
      />

      {/* sleepy pilot */}
      <Zzz from={680} to={729} x={440} y={470} />
      <Zzz from={810} to={881} x={440} y={420} />

      {/* buzzer + emergency alerts */}
      <AlertEdge from={774} to={881} period={15} strength={0.9} />
      <WarningBadge from={790} to={881} x={640} y={330} />
      <AlertEdge from={BRAKE} to={BRAKE_END} period={10} strength={1.1} />
      {frame >= BRAKE && frame < BRAKE + 8 && (
        <div style={{ position: "absolute", inset: 0, background: brand.alert, mixBlendMode: "screen", opacity: interpolate(frame, [BRAKE, BRAKE + 8], [0.45, 0], clamp) }} />
      )}
      <Sparks
        from={BRAKE}
        to={BRAKE_END}
        points={[
          { x: 190, y: 668 },
          { x: 373, y: 706 },
          { x: 560, y: 700 },
        ]}
      />
      {/* replaces the source's numeric speed readout in the brake shot */}
      <Speedometer from={BRAKE} to={BRAKE_END} x0={226} y0={292} w={268} h={196} keys={speedKeys} alarm />

      {/* ---- names: ABHI (loco pilot) & NACHI (assistant loco pilot) ---- */}
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 300, y: 760 }} tag={{ x: 150, y: 1010 }} from={132} to={184} />
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 150, y: 590 }} tag={{ x: 250, y: 470 }} from={416} to={487} />
      {/* these two sit exactly over the old "LP" / "ALP" labels in the two-pilot shot */}
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 186, y: 588 }} tag={{ x: 184, y: 486 }} from={972} to={1044} minW={150} minH={76} hardOut />
      <NameTag name="NACHI" role="ASST. LOCO PILOT" color={brand.nachi} anchor={{ x: 574, y: 588 }} tag={{ x: 532, y: 486 }} from={978} to={1044} minW={150} minH={76} hardOut />
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 172, y: 640 }} tag={{ x: 420, y: 780 }} from={1050} to={FINAL} />

      <CommentBubble from={CTA + 4} x={360} y={250} />

      <LightLeak from={0} to={40} />
      <CutFlash cuts={CUTS} />
    </>
  );
};

export const VCDExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { punch, sx, sy } = useCamera(frame);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <style>{fontCss}</style>
      {/* work in source pixel space (720x1280) and scale to output */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 720, height: 1280, transformOrigin: "0 0", transform: `scale(${1080 / SRC_W})`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${sx}px, ${sy}px) scale(${punch})`, transformOrigin: "50% 50%" }}>
          <OffthreadVideo src={staticFile("vcd/graded.mp4")} muted style={{ width: 720, height: 1280 }} />
          <Overlays />
        </div>
        <Finish />
      </div>
    </AbsoluteFill>
  );
};
