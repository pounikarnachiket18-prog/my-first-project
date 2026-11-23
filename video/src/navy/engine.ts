// Minimal 2.5D projection engine: world in metres, x = starboard, y = forward (bow), z = up.
import { Easing } from "remotion";

export type V3 = [number, number, number];
export type Cam = {
  tx: number; ty: number; tz: number; // look-at target
  yaw: number; // degrees, negative = bow toward upper-right
  pitch: number; // degrees, 0 = straight down
  zoom: number; // px per metre at the target
  cx: number; cy: number; // screen position of the target
  F: number; // perspective distance (m)
  boost?: number; // global size multiplier on top of zoom
};

export const BASE_CAM: Cam = { tx: 0, ty: 130, tz: 0, yaw: -28, pitch: 38, zoom: 3, cx: 540, cy: 900, F: 1400, boost: 1.4 };

const D = Math.PI / 180;

export const project = (c: Cam, p: V3): [number, number] => {
  const x = p[0] - c.tx, y = p[1] - c.ty, z = p[2] - c.tz;
  const a = c.yaw * D, pt = c.pitch * D;
  const x1 = x * Math.cos(a) - y * Math.sin(a);
  const y1 = x * Math.sin(a) + y * Math.cos(a);
  const up = y1 * Math.cos(pt) + z * Math.sin(pt);
  const depth = y1 * Math.sin(pt) - z * Math.cos(pt);
  const s = c.F / Math.max(80, c.F + depth);
  const zm = c.zoom * (c.boost ?? 1);
  return [c.cx + zm * s * x1, c.cy - zm * s * up];
};

export const depthOf = (c: Cam, p: V3) => {
  const x = p[0] - c.tx, y = p[1] - c.ty, z = p[2] - c.tz;
  const a = c.yaw * D, pt = c.pitch * D;
  const y1 = x * Math.sin(a) + y * Math.cos(a);
  return y1 * Math.sin(pt) - z * Math.cos(pt);
};

export const poly = (c: Cam, arr: V3[]) =>
  arr.map((p) => project(c, p)).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export const path = (c: Cam, arr: V3[], close = false) =>
  arr.map((p, i) => { const [x, y] = project(c, p); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ") + (close ? " Z" : "");

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.1, 0.7, 0.2, 1);

/** progress 0..1 between frames a and b with easing */
export const prog = (f: number, a: number, b: number, e: (t: number) => number = ease) =>
  e(clamp01((f - a) / Math.max(1, b - a)));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Key = { f: number } & Partial<Cam>;
/** camera from keyframes (eased between consecutive keys) */
export const camAt = (f: number, base: Partial<Cam>, keys: Key[]): Cam => {
  const c: Cam = { ...BASE_CAM, ...base };
  if (!keys.length) return c;
  const fields: (keyof Cam)[] = ["tx", "ty", "tz", "yaw", "pitch", "zoom", "cx", "cy", "F"];
  // accumulate so each key inherits previous values
  const acc: Cam[] = [];
  keys.forEach((k, i) => acc.push({ ...(i ? acc[i - 1] : c), ...k } as Cam));
  if (f <= keys[0].f) return acc[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f <= keys[i + 1].f) {
      const t = ease(clamp01((f - keys[i].f) / Math.max(1, keys[i + 1].f - keys[i].f)));
      const out = { ...acc[i] };
      fields.forEach((k) => { (out[k] as number) = lerp(acc[i][k] as number, acc[i + 1][k] as number, t); });
      return out;
    }
  }
  return acc[acc.length - 1];
};

export const rotZ = (p: V3, deg: number): V3 => {
  const a = deg * D;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
};

export const mixColor = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], clamp01(t))).toString(16).padStart(2, "0")).join("");
};
