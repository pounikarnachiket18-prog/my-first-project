/**
 * Deterministic animation helpers. Every animated value in the reel is a
 * pure function of time (seconds), so frames render identically on every
 * machine and sub-frame motion-blur samples are exact.
 */
import TIMELINE from "../config/timeline.json";

export const TL = TIMELINE;
export const FPS = TIMELINE.fps;
export const CUE = TIMELINE.cues;
export const SC = TIMELINE.scenes;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
/** Cinematic S-curve (bezier 0.65,0,0.35,1 approximation). */
export const cine = (t: number) => {
  const x = clamp(t);
  return x * x * x * (x * (6 * x - 15) + 10);
};

export type Ease = (t: number) => number;
export type Key<T> = [number, T, Ease?];

const mixAny = (a: any, b: any, t: number): any => {
  if (typeof a === "number") return lerp(a, b, t);
  return (a as number[]).map((v, i) => lerp(v, (b as number[])[i], t));
};

/** Keyframe track. Each key: [time, value, easeIntoThisKey?]. */
export function track<T extends number | number[]>(t: number, keys: Key<T>[], fallbackEase: Ease = cine): T {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1, e] = keys[i];
      const u = (t - t0) / (t1 - t0);
      return mixAny(v0, v1, (e ?? fallbackEase)(u));
    }
  }
  return keys[keys.length - 1][1];
}

/** Log-space interpolation: for camera distances spanning metres → millimetres. */
export const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

/** Seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise, deterministic. */
export function noise1(x: number, seed = 0) {
  const h = (n: number) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

/** Fractal 1D noise (organic hovering motion). */
export const fbm1 = (x: number, seed = 0) =>
  noise1(x, seed) * 0.6 + noise1(x * 2.13, seed + 7) * 0.28 + noise1(x * 4.7, seed + 13) * 0.12;
