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

/** national markings painted onto the sprites (v7): IAF roundel + tricolour, projected in 3D */
export const MarkingsCtx = React.createContext(false);
export const SHIP_NAME = "BOKA-14";
/** v8 realism: daylight grade, soft edges, distance haze, surface reflection */
export const RealismCtx = React.createContext(false);
/** night version: moonlit open sea; sprites + footage graded day-for-night */
export const NightCtx = React.createContext(false);

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const RoundelArt: React.FC = () => (
  <svg viewBox="0 0 100 100" width={100} height={100} style={{ display: "block" }}>
    <circle cx={50} cy={50} r={49} fill="#ff9933" />
    <circle cx={50} cy={50} r={33} fill="#ffffff" />
    <circle cx={50} cy={50} r={17} fill="#138808" />
  </svg>
);
const FlagArt: React.FC = () => (
  <svg viewBox="0 0 150 100" width={100} height={100} preserveAspectRatio="none" style={{ display: "block" }}>
    <rect width={150} height={33.4} fill="#ff9933" /><rect y={33.3} width={150} height={33.4} fill="#ffffff" /><rect y={66.6} width={150} height={33.4} fill="#138808" />
    <circle cx={75} cy={50} r={13} fill="none" stroke="#000080" strokeWidth={2.5} />
    {Array.from({ length: 24 }, (_, i) => <line key={i} x1={75} y1={50} x2={75 + 13 * Math.cos((i * Math.PI) / 12)} y2={50 + 13 * Math.sin((i * Math.PI) / 12)} stroke="#000080" strokeWidth={0.9} />)}
  </svg>
);

const NameArt: React.FC = () => (
  <svg viewBox="0 0 600 100" width={100} height={100} preserveAspectRatio="none" style={{ display: "block" }}>
    <text x={300} y={82} textAnchor="middle" fill="#f4f6f8" fontFamily="Inter" fontWeight={900} fontSize={96} letterSpacing={6}>{SHIP_NAME}</text>
  </svg>
);

/** a flat decal on the camera-facing side of a body: u = metres along the axis from the centre, up/side = offsets */
export const Decal: React.FC<{ cam: GLState["cam"]; center: Vec3; dir: Vec3; u: number; up: number; side: number; w: number; h: number; kind: "roundel" | "flag" | "name" }> =
  ({ cam, center, dir, u, up, side, w, h, kind }) => {
    const a = norm(dir);
    let n = norm(cross(a, [0, 1, 0]));
    const toCam = norm(sub(cam.pos, center));
    if (dot(n, toCam) < 0) n = mul(n, -1);
    let upV = norm(cross(n, a));
    if (upV[1] < 0) upV = mul(upV, -1);
    const facing = dot(n, toCam);
    const op = Math.max(0, Math.min(1, (facing - 0.12) / 0.3));
    if (op <= 0) return null;
    const P0 = add(add(add(center, mul(a, u)), mul(upV, up)), mul(n, side));
    const S0 = projectGL(cam, P0), SX = projectGL(cam, add(P0, mul(a, w / 2))), SY = projectGL(cam, add(P0, mul(upV, -h / 2)));
    if (!S0 || !SX || !SY) return null;
    let ex = [SX[0] - S0[0], SX[1] - S0[1]];
    const ey = [SY[0] - S0[0], SY[1] - S0[1]];
    if (ex[0] < 0) ex = [-ex[0], -ex[1]]; // keep the art reading left-to-right
    if (Math.hypot(...ex) < 1.5 || Math.hypot(...ey) < 1.5) return null;
    const m = `matrix(${ex[0] / 50}, ${ex[1] / 50}, ${ey[0] / 50}, ${ey[1] / 50}, ${S0[0] - ex[0] - ey[0]}, ${S0[1] - ex[1] - ey[1]})`;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 100, height: 100, transformOrigin: "0 0", transform: m, opacity: op * 0.95, mixBlendMode: kind === "name" ? "normal" : "multiply", filter: kind === "name" ? "drop-shadow(0 0 1px rgba(0,0,0,0.6))" : "saturate(1.1)" }}>
        {kind === "roundel" ? <RoundelArt /> : kind === "flag" ? <FlagArt /> : <NameArt />}
      </div>
    );
  };

/** per-model decal layout (metres; model lengths as used in the scenes) */
const MARKS: Partial<Record<ModelName, (L: number) => { u: number; up: number; side: number; w: number; h: number; kind: "roundel" | "flag" | "name" }[]>> = {
  // hull name near the bow, above the waterline (`center` is the sea point under the ship)
  ship: (L) => [{ u: 0.08 * L, up: 0.04 * L, side: 0.065 * L, w: 0.16 * L, h: 0.028 * L, kind: "name" }],
  jet: (L) => [
    { u: -0.10 * L, up: 0.05 * L, side: 0.055 * L, w: 0.075 * L, h: 0.075 * L, kind: "roundel" },
  ],
  missile: (L) => [
    { u: 0.02 * L, up: 0.0, side: 0.055 * L, w: 0.085 * L, h: 0.085 * L, kind: "roundel" },
    { u: -0.24 * L, up: 0.0, side: 0.055 * L, w: 0.1 * L, h: 0.066 * L, kind: "flag" },
  ],
};
MARKS.missile_cool = MARKS.missile;

/** a turntable sprite of one of the user's models, placed in the 3D scene */
export const Sprite: React.FC<{ cam: GLState["cam"]; model: ModelName; center: Vec3; dir: Vec3; length: number; glow?: string; opacity?: number; filter?: string; waterline?: boolean }> =
  ({ cam, model, center, dir, length, glow, opacity = 1, filter, waterline }) => {
    const marked = React.useContext(MarkingsCtx);
    const real = React.useContext(RealismCtx);
    const night = React.useContext(NightCtx);
    const t = spriteXform(cam, model, center, dir, length);
    if (!t || t.scale <= 0.002) return null;
    const { m } = t;
    const ay = waterline ? m.bottom[t.k] - 2 : m.axisY; // waterline: `center` is the point on the sea surface under the hull
    const f = [filter, glow ? `drop-shadow(0 0 ${Math.min(10, 4 + 4 * t.scale)}px ${glow}) drop-shadow(0 0 ${Math.min(22, 8 + 8 * t.scale)}px ${glow})` : ""].filter(Boolean).join(" ");
    const decals = marked ? (MARKS[model]?.(length) ?? []) : [];
    const src = staticFile(`navy/models/${model}/${String(t.k).padStart(3, "0")}.webp`);
    // realism grade: studio-lit sprites -> daylight (cool sky fill), softened cut edges, aerial perspective with distance
    const dist = Math.hypot(cam.pos[0] - center[0], cam.pos[1] - center[1], cam.pos[2] - center[2]);
    const haze = Math.max(0, Math.min(1, (dist - 120) / 1600));
    const grade = !real ? "" : night
      ? `brightness(${0.46 - 0.12 * haze}) contrast(${1.18 - 0.3 * haze}) saturate(${0.55 - 0.25 * haze}) blur(${0.45 + 0.6 * haze}px)`
      : `brightness(${1.1 + 0.22 * haze}) contrast(${1.08 - 0.4 * haze}) saturate(${0.95 - 0.35 * haze}) blur(${0.45 + 0.6 * haze}px)`;
    const height = waterline ? 0 : center[1];
    const reflOp = real ? 0.38 * Math.exp(-height / 35) : 0;
    let refl: React.ReactNode = null;
    if (reflOp > 0.02) {
      const mirror: Vec3 = [center[0], -center[1], center[2]];
      const tr = spriteXform(cam, model, mirror, [dir[0], -dir[1], dir[2]], length);
      if (tr) {
        const ry = waterline ? m.bottom[t.k] - 2 : m.axisY;
        const yy = waterline ? t.y : tr.y;
        refl = (
          <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: m.w, height: m.h, opacity: reflOp,
            transformOrigin: `${m.axisX}px ${ry}px`,
            transform: `translate(${tr.x - m.axisX}px, ${yy - ry}px) rotate(${waterline ? 0 : -t.roll}rad) scale(${tr.scale}, ${-tr.scale})`,
            filter: `blur(${2.5 + 4 * Math.min(1, height / 40)}px) brightness(0.75) saturate(0.8)`,
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0) 85%)", maskImage: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0) 85%)" }} />
        );
      }
    }
    return (
      <>
      {refl}
      <Img
        src={src}
        style={{
          position: "absolute", left: 0, top: 0, width: m.w, height: m.h,
          transformOrigin: `${m.axisX}px ${ay}px`,
          transform: `translate(${t.x - m.axisX}px, ${t.y - ay}px) rotate(${waterline ? 0 : t.roll}rad) scale(${t.scale})`,
          filter: [f, grade].filter(Boolean).join(" ") || undefined,
          opacity: opacity * (1 - 0.15 * haze),
        }}
      />
      {decals.map((d, i) => <Decal key={i} cam={cam} center={center} dir={dir} {...d} />)}
      </>
    );
  };

export { sub };
