// v8 ending: Tejas pulls up past the camera on full afterburner, then a "FOLLOW · MINDSET MODE | EXPLAINERS" motion graphic.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { GLView, GLState, Vec3 } from "./GLView";
import { Sprite } from "./Sprite";
import { SUN } from "./scenes_h3";

const FPS = 30;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

export const JetEndCard: React.FC<{ t0: number }> = ({ t0 }) => {
  const f = useCurrentFrame();
  // flight path: low and fast from behind-left, then a climbing pull-up away from the camera
  const jetAt = (fr: number): Vec3 => {
    const u = fr / FPS;
    return [-26 + u * 22, 15 + Math.max(0, u - 1.0) ** 2 * 24, -18 + u * 150];
  };
  const p = jetAt(f), q = jetAt(f + 1);
  const dir: Vec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const camPos: Vec3 = [-52 + f * 0.75, 10 + f * 0.05, -52 + f * 3.4];
  const cam: GLState["cam"] = { pos: camPos, target: [p[0], p[1] + 2, p[2]], fov: 0.62, roll: Math.sin(f * 0.05) * 0.03 };
  const n = Math.hypot(...dir) || 1;
  const s: GLState = {
    t: t0 + f / FPS, cam, exposure: 0.8, day: true, hideObjects: true, moonDir: SUN, mountains: 1.3, mist: 0.7, ice: 1,
    vel: [0.6 * FPS, 0.05 * FPS, 3.2 * FPS], shutter: 1 / 24,
    jet: { pos: p, dir: [dir[0] / n, dir[1] / n, dir[2] / n], scale: 1 },
  };
  // motion graphic
  const a = interpolate(f, [44, 60], [0, 1], { ...cl, easing: ease });
  const b = interpolate(f, [54, 72], [0, 1], { ...cl, easing: ease });
  const line = interpolate(f, [50, 74], [0, 1], { ...cl, easing: ease });
  const sweep = interpolate(f, [66, 96], [-0.3, 1.3], cl);
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
          <span style={{ width: 92, height: 92, borderRadius: "50%", background: "#f1ede3", overflow: "hidden", display: "inline-flex", boxShadow: "0 4px 20px rgba(0,0,0,0.45)", transform: `scale(${0.6 + 0.4 * b}) rotate(${(1 - b) * -90}deg)` }}>
            <Img src={staticFile("navy/logo_mm_icon.png")} style={{ width: 92, height: 92 }} />
          </span>
          <span style={{ fontWeight: 900, fontSize: 58, color: "#fff", letterSpacing: 2, transform: "scaleX(0.86)" }}>MINDSET MODE</span>
          <span style={{ fontWeight: 600, fontSize: 56, color: "rgba(255,255,255,0.55)" }}>|</span>
          <span style={{ fontWeight: 800, fontSize: 50, color: "#9fe2ff", letterSpacing: 3, transform: "scaleX(0.9)" }}>EXPLAINERS</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
