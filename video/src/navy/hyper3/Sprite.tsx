import React from "react";
import { Img, staticFile } from "remotion";
import meta from "../../../public/navy/models/sprites.json";
import { GLState, Vec3, projectGL, pxPerMetre } from "./GLView";

export type ModelName = "missile" | "missile_cool" | "jet" | "ship";
type Meta = { frames: number; front: number; degPerFrame: number; w: number; h: number; axisX: number; axisY: number; sideLenPx: number; bottom: number[] };
const M = meta as unknown as Record<ModelName, Meta>;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** which turntable frame shows a model heading `dir` when seen from the camera, plus screen placement */
export const spriteXform = (cam: GLState["cam"], model: ModelName, center: Vec3, dir: Vec3, length: number) => {
  const m = M[model];
  const c = projectGL(cam, center);
  if (!c) return null;
  const hh = norm([dir[0], 0, dir[2]]);
  const toCam = norm([cam.pos[0] - center[0], 0, cam.pos[2] - center[2]]);
  // screen-left in world (horizontal) = toCam rotated so that heading-left gives +90
  const left: Vec3 = [-toCam[2], 0, toCam[0]];
  const leftScreen = projectGL(cam, add(center, left));
  const sgn = leftScreen && leftScreen[0] > c[0] ? -1 : 1; // make sure "left" really is screen-left
  const phi = Math.atan2(sgn * (hh[0] * left[0] + hh[2] * left[2]), hh[0] * toCam[0] + hh[2] * toCam[2]);
  let k = Math.round(m.front + (phi * 180) / Math.PI / m.degPerFrame) % m.frames;
  if (k < 0) k += m.frames;
  const scale = (pxPerMetre(cam, center) * length) / m.sideLenPx;
  // roll: difference between the projected true heading and its level version
  const half = length * 0.4;
  const pT = projectGL(cam, add(center, mul(norm(dir), half)));
  const pL = projectGL(cam, add(center, mul(hh, half)));
  let roll = 0;
  if (pT && pL) {
    const aT = Math.atan2(pT[1] - c[1], pT[0] - c[0]), aL = Math.atan2(pL[1] - c[1], pL[0] - c[0]);
    const lenL = Math.hypot(pL[0] - c[0], pL[1] - c[1]);
    if (lenL > 4) { roll = aT - aL; if (roll > Math.PI) roll -= 2 * Math.PI; if (roll < -Math.PI) roll += 2 * Math.PI; }
  }
  return { x: c[0], y: c[1], k, scale, roll, m };
};

/** a turntable sprite of one of the user's models, placed in the 3D scene */
export const Sprite: React.FC<{ cam: GLState["cam"]; model: ModelName; center: Vec3; dir: Vec3; length: number; glow?: string; opacity?: number; filter?: string; waterline?: boolean }> =
  ({ cam, model, center, dir, length, glow, opacity = 1, filter, waterline }) => {
    const t = spriteXform(cam, model, center, dir, length);
    if (!t || t.scale <= 0.002) return null;
    const { m } = t;
    const ay = waterline ? m.bottom[t.k] - 2 : m.axisY; // waterline: `center` is the point on the sea surface under the hull
    const f = [filter, glow ? `drop-shadow(0 0 ${Math.min(10, 4 + 4 * t.scale)}px ${glow}) drop-shadow(0 0 ${Math.min(22, 8 + 8 * t.scale)}px ${glow})` : ""].filter(Boolean).join(" ");
    return (
      <Img
        src={staticFile(`navy/models/${model}/${String(t.k).padStart(3, "0")}.webp`)}
        style={{
          position: "absolute", left: 0, top: 0, width: m.w, height: m.h, opacity,
          transformOrigin: `${m.axisX}px ${ay}px`,
          transform: `translate(${t.x - m.axisX}px, ${t.y - ay}px) rotate(${waterline ? 0 : t.roll}rad) scale(${t.scale})`,
          filter: f || undefined,
        }}
      />
    );
  };

export { sub };
