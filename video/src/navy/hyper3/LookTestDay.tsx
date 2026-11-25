import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GLView, GLState, Vec3, MOON } from "./GLView";
import { Sprite } from "./Sprite";

const SUN: Vec3 = [0.45, 0.42, 1];

export const LookTestDay: React.FC = () => {
  const k = useCurrentFrame();
  const t = 3.2;
  const base = { t, day: true, hideObjects: true, exposure: 0.85, moonDir: SUN } as const;
  if (k === 0) {
    // jet with both missiles, chase from rear-left
    const jet: Vec3 = [0, 60, 0];
    const cam: GLState["cam"] = { pos: [-16, 63, -26], target: [0, 59.5, 4], fov: 0.7 };
    const s: GLState = { ...base, cam };
    return (
      <AbsoluteFill>
        <GLView s={s} scale={0.75} />
        <Sprite cam={cam} model="jet" center={jet} dir={[0, 0, 1]} length={13.2} />
        <Sprite cam={cam} model="missile_cool" center={[-3.0, 58.4, 1]} dir={[0, 0, 1]} length={5} />
        <Sprite cam={cam} model="missile" center={[3.0, 58.4, 1]} dir={[0, 0, 1]} length={4.6} />
      </AbsoluteFill>
    );
  }
  if (k === 1) {
    // hypersonic side close-up with plasma
    const c: Vec3 = [0, 9, 0];
    const cam: GLState["cam"] = { pos: [-1, 8, -20], target: [-1, 9, 0], fov: 0.6 };
    const s: GLState = { ...base, cam, m0: { on: true, nose: [3.5, 9, 0], dir: [1, 0, 0], len: 7, radius: 0.5, plasma: 0.9, glide: true, burn: 0, trail: { len: 200, width: 0.35, pink: true, opacity: 0.7 } } };
    return (
      <AbsoluteFill>
        <GLView s={s} scale={0.75} />
        <Sprite cam={cam} model="missile" center={c} dir={[1, 0, 0]} length={7} glow="#ff5fb0" />
        <GLView s={s} scale={0.75} layer="fx" />
      </AbsoluteFill>
    );
  }
  if (k === 2) {
    // supersonic three-quarter with contrail and shock rings
    const c: Vec3 = [0, 9, 0];
    const cam: GLState["cam"] = { pos: [-14, 11, -16], target: [-1, 9, 0], fov: 0.6 };
    const s: GLState = { ...base, cam, m0: { on: true, nose: [3.7, 9, 0], dir: [1, 0, 0], len: 7.5, radius: 0.36, plasma: 0, glide: false, burn: 1, trail: { len: 160, width: 0.5, pink: false, opacity: 0.8 } }, boom: { amt: 1, mach: 2.8, phase: 0.3 } };
    return (
      <AbsoluteFill>
        <GLView s={s} scale={0.75} />
        <Sprite cam={cam} model="missile_cool" center={c} dir={[1, 0, 0]} length={7.5} />
        <GLView s={s} scale={0.75} layer="fx" />
      </AbsoluteFill>
    );
  }
  // ship hit
  const cam: GLState["cam"] = { pos: [-230, 26, -200], target: [0, 10, 0], fov: 0.45 };
  const s: GLState = { ...base, cam, ship: { pos: [0, 0, 0], yaw: 0, damage: 0.5, fire: 1, sink: 0 }, ex0: { pos: [8, 14, 0], age: 0.5, size: 1.4 } };
  return (
    <AbsoluteFill>
      <GLView s={s} scale={0.75} />
      <Sprite cam={cam} model="ship" center={[0, 0, 0]} dir={[1, 0, 0.35]} length={150} waterline />
      <GLView s={s} scale={0.75} layer="fx" />
    </AbsoluteFill>
  );
};
void MOON;
