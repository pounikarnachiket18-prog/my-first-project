// Single source of truth for the edit (30 fps, 1500 frames = 50.0 s).
// Every shot is a Blender (Cycles) render in public/earth/renders/<id>/NNNN.jpg.
// Cut points are aligned to the narration word timings in data/captions.json.
export const FPS = 30;
export const TOTAL = 1500;

export type Shot = { id: string; from: number; to: number; frames: number; offset?: number; filter?: string };

export const SHOTS: Shot[] = [
  { id: "A1", from: 0, to: 150, frames: 154 }, // Earth (India), spin freezes on "band" (f80)
  { id: "B1", from: 150, to: 255, frames: 109 }, // hero on a Mumbai zebra crossing, camera orbits
  { id: "B2", from: 255, to: 360, frames: 109, offset: 4 }, // equator lights up, 1,670 km/h
  { id: "C1", from: 360, to: 400, frames: 44 }, // ordinary morning traffic
  { id: "C2", from: 400, to: 510, frames: 114 }, // the stop: hero flung east (slow motion)
  { id: "C3", from: 510, to: 600, frames: 94 }, // everything streams east
  { id: "D1", from: 600, to: 668, frames: 72 }, // superfast winds
  { id: "D2", from: 668, to: 724, frames: 60 }, // Marine Drive: wall of water
  { id: "D3", from: 724, to: 768, frames: 48 }, // wave towers over the promenade
  { id: "D4", from: 768, to: 840, frames: 78 }, // wrecked street
  { id: "E1", from: 840, to: 930, frames: 94 }, // survivor sits up
  { id: "E2", from: 930, to: 1110, frames: 184 }, // orbit diagram: 1 din = 1 saal
  { id: "F1", from: 1110, to: 1215, frames: 109 }, // half day / half night
  { id: "F2", from: 1215, to: 1275, frames: 64, filter: "contrast(1.35) saturate(1.9) sepia(0.4) brightness(0.9) hue-rotate(-10deg)" }, // Thar: extreme heat
  { id: "F3", from: 1275, to: 1323, frames: 52, filter: "contrast(1.18) saturate(1.25) brightness(0.95)" }, // Ladakh: freezing darkness
  { id: "G1", from: 1323, to: 1400, frames: 81, filter: "contrast(1.12) saturate(1.35) sepia(0.18)" }, // sunrise on Marine Drive
  { id: "G2", from: 1400, to: 1500, frames: 104 }, // Earth spinning again, pull back
];

export const BEATS = {
  freeze: 80, // "band kar de"
  title: 108,
  speedCount: 300, // "1,670" @ 10.04 s
  groundStop: 400, // "ruk gayi" @ 13.30 s
  waveHit: 764, // "destruction" @ 25.45 s
  strike: 960, // "...ka nahi"
  oneYear: 1005, // "ek saal" @ 33.5 s
  sixDay: 1138, // "6 mahine ... din" @ 37.94 s
  sixNight: 1184, // "6 mahine ... raat" @ 39.48 s
  black: 1484, // narration ends 49.47 s
  finalHit: 1486,
};
