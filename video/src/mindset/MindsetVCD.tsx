import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { brand, CUTS, fontCss, sampleTrack, SRC_W } from "./theme";
import { openTrack, frontTrack, decalATrack, decalBTrack } from "./tracks";
import { LampGlow, LightBeam, finalLamps } from "./Headlight";
import {
  AlertEdge,
  BrandBar,
  CutFlash,
  Decal,
  Dust,
  EndPlate,
  Finish,
  LightLeak,
  NameTag,
  SpeedLines,
  Stars,
  Zzz,
} from "./Graphics";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Frame where the old channel name appears on the end card; our plate lands just before it.
const END_PLATE_START = 1229;
const BRAKE = 881; // emergency brake shot
const BRAKE_END = 967;

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
  if (frame >= 1121) {
    const L = finalLamps(frame);
    const sz = L.spacing / 7.5;
    const on = interpolate(frame, [1121, 1126], [0.4, 1], clamp);
    lamps.push(<LightBeam key="lb" x={L.roof.x} y={L.lowerL.y} topW={L.spacing * 1.2} bottomW={900} opacity={0.3 * on} />);
    lamps.push(<LampGlow key="r" x={L.roof.x} y={L.roof.y} size={sz} seed="roof" intensity={on} />);
    lamps.push(<LampGlow key="l1" x={L.lowerL.x} y={L.lowerL.y} size={sz * 0.6} seed="l1" rays={false} intensity={0.8 * on} />);
    lamps.push(<LampGlow key="l2" x={L.lowerR.x} y={L.lowerR.y} size={sz * 0.6} seed="l2" rays={false} intensity={0.8 * on} />);
  }

  // --- loco side decal (old logo replaced) -----------------------------
  let decal: React.ReactNode = null;
  if (frame >= 66 && frame < 127) {
    const d = sampleTrack(decalATrack, Math.max(frame, 67));
    if (d) decal = <Decal x={d.x} y={d.y} skew={-11} scale={0.95} />;
  }
  if (frame >= BRAKE && frame < BRAKE_END) {
    const d = sampleTrack(decalBTrack, Math.max(frame, 882));
    if (d) decal = <Decal x={d.x} y={d.y} skew={-28} scale={0.85} />;
  }

  return (
    <>
      <Stars ranges={[[0, 66], [184, 256], [1121, 1320]]} />
      {lamps}
      {decal}

      {/* speed lines on running shots */}
      <SpeedLines from={66} to={127} dir={-1} intensity={0.8} />
      <SpeedLines from={BRAKE} to={BRAKE_END} dir={-1} intensity={interpolate(frame, [BRAKE, BRAKE_END], [1, 0.25], clamp)} />

      {/* cab ambience */}
      <Dust from={127} to={184} />
      <Dust from={256} to={881} count={22} />
      <Dust from={967} to={1121} count={22} />

      {/* sleepy pilot */}
      <Zzz from={680} to={729} x={440} y={470} />
      <Zzz from={810} to={881} x={440} y={420} />

      {/* buzzer + emergency alerts */}
      <AlertEdge from={774} to={881} period={15} strength={0.9} />
      <AlertEdge from={BRAKE} to={BRAKE_END} period={10} strength={1.1} />
      {frame >= BRAKE && frame < BRAKE + 8 && (
        <div style={{ position: "absolute", inset: 0, background: brand.alert, mixBlendMode: "screen", opacity: interpolate(frame, [BRAKE, BRAKE + 8], [0.45, 0], clamp) }} />
      )}

      {/* ---- names: ABHI (loco pilot) & NACHI (assistant loco pilot) ---- */}
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 300, y: 760 }} tag={{ x: 150, y: 1010 }} from={132} to={184} />
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 150, y: 590 }} tag={{ x: 250, y: 470 }} from={416} to={487} />
      {/* these two sit exactly over the old "LP" / "ALP" labels in the two-pilot shot */}
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 186, y: 588 }} tag={{ x: 184, y: 486 }} from={972} to={1044} minW={150} minH={76} hardOut />
      <NameTag name="NACHI" role="ASST. LOCO PILOT" color={brand.nachi} anchor={{ x: 574, y: 588 }} tag={{ x: 532, y: 486 }} from={978} to={1044} minW={150} minH={76} hardOut />
      <NameTag name="ABHI" role="LOCO PILOT" color={brand.abhi} anchor={{ x: 172, y: 640 }} tag={{ x: 420, y: 780 }} from={1050} to={1121} />

      <LightLeak from={0} to={40} />
      <CutFlash cuts={CUTS} />

      <EndPlate start={END_PLATE_START} />
    </>
  );
};

export const MindsetVCD: React.FC = () => {
  const frame = useCurrentFrame();
  const { punch, sx, sy } = useCamera(frame);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <style>{fontCss}</style>
      {/* work in source pixel space (720x1280) and scale to output */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 720, height: 1280, transformOrigin: "0 0", transform: `scale(${1080 / SRC_W})`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${sx}px, ${sy}px) scale(${punch})`, transformOrigin: "50% 50%" }}>
          <OffthreadVideo src={staticFile("mindset/graded.mp4")} muted style={{ width: 720, height: 1280 }} />
          <Overlays />
        </div>
        <Finish />
        <BrandBar hideFrom={END_PLATE_START} />
      </div>
    </AbsoluteFill>
  );
};
