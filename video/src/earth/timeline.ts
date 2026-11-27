// Single source of truth for the edit (30 fps, 1500 frames = 50.0 s).
// Cut points are aligned to the narration word timings in data/captions.json.
export const FPS = 30;
export const TOTAL = 1500;

export const SHOTS = {
  A1: { from: 0, to: 150 }, // hook: dolly-in, Earth freezes on "band" (f80)
  B1: { from: 150, to: 270 }, // orbit + rotation trails ("invisible speed")
  B2: { from: 270, to: 360 }, // equator line + speedometer 1,670 km/h
  C1: { from: 360, to: 400 }, // city, normal traffic
  C2: { from: 400, to: 510 }, // the stop: slow-mo fling east
  C3: { from: 510, to: 600 }, // buildings shear, atmosphere keeps going
  D1: { from: 600, to: 668 }, // orbit view: atmosphere racing over the stopped surface
  D2: { from: 668, to: 724 }, // storm ocean
  D3: { from: 724, to: 768 }, // wave wall hits the coast
  D4: { from: 766, to: 840 }, // global wide: storms everywhere
  E1: { from: 840, to: 930 }, // calm, non-rotating Earth
  E2: { from: 930, to: 1110 }, // Sun-Earth orbit diagram: 1 day = 1 year
  F1: { from: 1110, to: 1215 }, // half day / half night
  F2: { from: 1215, to: 1275 }, // scorched day side
  F3: { from: 1275, to: 1323 }, // frozen night side
  G1: { from: 1323, to: 1500 }, // sunrise over the limb, pull back, black
} as const;

export type ShotId = keyof typeof SHOTS;
export const dur = (id: ShotId) => SHOTS[id].to - SHOTS[id].from;

// Key beats (global frames)
export const BEATS = {
  freeze: 80, // "band kar de"
  title: 108,
  equator: 270,
  speedCount: 300, // "1,670" @ 10.04 s
  groundStop: 400, // "ruk gayi" @ 13.30 s
  waveHit: 764, // "destruction" @ 25.45 s
  oneYear: 1005, // "ek saal" @ 33.5 s
  sixDay: 1138, // "6 mahine ... din" @ 37.94 s
  sixNight: 1184, // "6 mahine ... raat" @ 39.48 s
  black: 1484, // narration ends 49.47 s
  finalHit: 1486,
};
