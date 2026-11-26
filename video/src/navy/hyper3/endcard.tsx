// v8 ending: Tejas pulls up past the camera on full afterburner, then a "FOLLOW · JUSTKNOW IT" motion graphic.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { GLView, GLState, Vec3 } from "./GLView";
import { Sprite, NightCtx } from "./Sprite";
import { MOON } from "./GLView";
import { SUN } from "./scenes_h3";
import { BrandMark, BrandWord, JK_RED } from "./brand";

const FPS = 30;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

/** red iris wipe into the Just KnowIt logo card (user's logo: brain + wordmark) */
const LOGO_START = 108;
const LogoReveal: React.FC<{ g: number }> = ({ g }) => {
  const iris = interpolate(g, [0, 12], [0, 1], { ...cl, easing: Easing.in(Easing.cubic) });
  const ring = interpolate(g, [0, 14], [1, 0], cl);
  const pop = interpolate(g, [8, 15, 21], [0.25, 1.12, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const popO = interpolate(g, [8, 12], [0, 1], cl);
  const wipe = interpolate(g, [15, 30], [0, 1], { ...cl, easing: ease });
  const sweep = interpolate(g, [40, 64], [-0.2, 1.2], cl);
  const sub = interpolate(g, [28, 38], [0, 1], cl);
  const breathe = 1 + 0.015 * Math.sin(g * 0.12);
  const R = iris * 120;
  const BW = 210, WW = 780, WH = WW * 97 / 783;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, #d8101f 0%, ${JK_RED} 55%, #8e0010 100%)`, clipPath: `circle(${R}% at 50% 46%)` }} />
      <div style={{ position: "absolute", left: 540, top: 883, width: 0, height: 0 }}>
        <div style={{ position: "absolute", left: -R * 22, top: -R * 22, width: R * 44, height: R * 44, borderRadius: "50%", border: `${6 * ring}px solid rgba(255,255,255,${0.9 * ring})` }} />
      </div>
      <AbsoluteFill style={{ transform: `scale(${breathe})` }}>
        <Img src={staticFile("navy/jk_brain.png")} style={{ position: "absolute", left: 540 - BW * 184 / 203 / 2, top: 560, height: BW, width: BW * 184 / 203, opacity: popO, transform: `scale(${pop})`, transformOrigin: "50% 60%" }} />
        <div style={{ position: "absolute", left: 540 - WW / 2, top: 830, width: WW, height: WH, clipPath: `inset(0 ${100 - wipe * 100}% 0 0)` }}>
          <Img src={staticFile("navy/jk_word.png")} style={{ width: WW, height: WH }} />
          <div style={{ position: "absolute", inset: 0, WebkitMaskImage: `url(${staticFile("navy/jk_word.png")})`, WebkitMaskSize: "100% 100%", maskImage: `url(${staticFile("navy/jk_word.png")})`, maskSize: "100% 100%",
            background: `linear-gradient(100deg, transparent ${sweep * 100 - 10}%, rgba(255,215,215,0.95) ${sweep * 100}%, transparent ${sweep * 100 + 10}%)` }} />
        </div>
        <div style={{ position: "absolute", left: 0, width: 1080, top: 990, textAlign: "center", opacity: sub, transform: `translateY(${(1 - sub) * 14}px)`, fontFamily: "Inter", fontWeight: 800, fontSize: 30, letterSpacing: 10, color: "#fff" }}>FOLLOW FOR MORE</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const JetEndCard: React.FC<{ t0: number; compact?: boolean; logoAt?: number }> = ({ t0, compact = false, logoAt }) => {
  const f = useCurrentFrame();
  const night = React.useContext(NightCtx);
  // flight path: low and fast from behind-left, then a climbing pull-up away from the camera
  const jetAt = (fr: number): Vec3 => {
    const u = fr / FPS;
    return [-26 + u * 22, 15 + Math.max(0, u - 1.0) * 14, -18 + u * 150];
  };
  const p = jetAt(f), q = jetAt(f + 1);
  const dir: Vec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  // camera: low fly-by first, then settles into a chase that keeps Tejas in frame (lower third) behind the FOLLOW graphic
  const camAt = (fr: number): { pos: Vec3; target: Vec3 } => {
    const pj = jetAt(fr);
    const k = ease(Math.min(1, Math.max(0, (fr - 22) / 30)));
    const flyPos: Vec3 = [-52 + fr * 0.75, 10 + fr * 0.05, -52 + fr * 3.4];
    const chasePos: Vec3 = [pj[0] - 10, pj[1] + 5, pj[2] - 62];
    const flyT: Vec3 = [pj[0], pj[1] + 2, pj[2]];
    const chaseT: Vec3 = [pj[0] - 1, pj[1] + 11, pj[2] + 40];
    const mix = (x: Vec3, y: Vec3): Vec3 => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k];
    return { pos: mix(flyPos, chasePos), target: mix(flyT, chaseT) };
  };
  const c0 = camAt(f), c1 = camAt(f + 1);
  const camPos = c0.pos;
  const cam: GLState["cam"] = { pos: camPos, target: c0.target, fov: 0.62, roll: Math.sin(f * 0.05) * 0.03 };
  const n = Math.hypot(...dir) || 1;
  const s: GLState = {
    t: t0 + f / FPS, cam, exposure: night ? 0.95 : 0.8, day: !night, hideObjects: true, moonDir: night ? MOON : SUN, mountains: night ? 0 : 1.3, mist: night ? 0 : 0.7, ice: night ? 0 : 1,
    vel: [(c1.pos[0] - c0.pos[0]) * FPS, (c1.pos[1] - c0.pos[1]) * FPS, (c1.pos[2] - c0.pos[2]) * FPS], shutter: 1 / 24,
    jet: { pos: p, dir: [dir[0] / n, dir[1] / n, dir[2] / n], scale: 1 },
  };
  // motion graphic
  const a = interpolate(f, compact ? [18, 32] : [44, 60], [0, 1], { ...cl, easing: ease });
  const b = interpolate(f, compact ? [26, 40] : [54, 72], [0, 1], { ...cl, easing: ease });
  const line = interpolate(f, compact ? [22, 42] : [50, 74], [0, 1], { ...cl, easing: ease });
  const sweep = interpolate(f, compact ? [34, 56] : [66, 96], [-0.3, 1.3], cl);
  const shadow = "0 3px 0 rgba(0,0,0,0.3), 0 4px 22px rgba(0,0,0,0.55)";
  return (
    <AbsoluteFill>
      <GLView s={s} scale={0.75} />
      <Sprite cam={cam} model="jet" center={p} dir={s.jet!.dir} length={13.2} />
      <GLView s={s} scale={0.75} layer="fx" />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(4,10,20,0) 25%, rgba(4,10,20,${0.3 * a}) 45%, rgba(4,10,20,${0.3 * a}) 65%, rgba(4,10,20,0) 85%)` }} />
      <div style={{ position: "absolute", left: 0, width: 1080, top: 700, textAlign: "center", fontFamily: "Inter", textShadow: shadow }}>
        <div style={{ display: "inline-block", fontWeight: 900, fontSize: 170, color: "#fff", letterSpacing: 4, transform: `scaleX(0.82) translateY(${(1 - a) * 40}px)`, opacity: a,
          clipPath: `inset(0 ${100 - a * 100}% 0 0)`, position: "relative" }}>
          FOLLOW
          <span style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${sweep * 100 - 12}%, rgba(255,255,255,0.75) ${sweep * 100}%, transparent ${sweep * 100 + 12}%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>FOLLOW</span>
        </div>
        <div style={{ margin: "14px auto 0", width: 700 * line, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #ff9933, #ffffff, #138808)" }} />
        <div style={{ marginTop: 26, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>
          <span style={{ display: "inline-flex", transform: `scale(${0.6 + 0.4 * b}) rotate(${(1 - b) * -90}deg)` }}><BrandMark size={104} /></span>
          <span style={{ textAlign: "left" }}><BrandWord size={70} sub="EXPLAINERS · FOLLOW FOR MORE" /></span>
        </div>
      </div>
      {f >= (logoAt ?? (compact ? 62 : LOGO_START)) && <LogoReveal g={f - (logoAt ?? (compact ? 62 : LOGO_START))} />}
    </AbsoluteFill>
  );
};
