// THE LAST FLIGHT: edit timeline (24 fps, 60 s = 1440 frames). Seconds here match lastflight/tools/build_audio.py.
export const FPS = 24;
export const TOTAL = 1440;
const s = (sec: number) => Math.round(sec * FPS);

export type Shot = { id: string; from: number; to: number; frames: number; offset?: number; grade: GradeName; zoom?: number; origin?: string };
export type GradeName = "cockpit" | "space" | "dust" | "street" | "chase" | "roof" | "slowmo" | "dusk" | "earth";

// `frames` = rendered frames in public/lastflight/renders/<id>/ ; the edit takes [offset, offset + (to - from)).
export const SHOTS: Shot[] = [
  { id: "S1A", from: s(0), to: s(4), frames: 98, grade: "cockpit" },
  { id: "S1B", from: s(4), to: s(6), frames: 50, grade: "cockpit" },
  { id: "S2A", from: s(6), to: s(10), frames: 98, grade: "space" },
  { id: "S2B", from: s(10), to: s(13), frames: 74, grade: "dust" },
  { id: "S3A", from: s(13), to: s(16), frames: 74, grade: "street" },
  { id: "S3B", from: s(16), to: s(18.5), frames: 62, grade: "street" },
  { id: "S3C", from: s(18.5), to: s(22), frames: 86, grade: "dust" },
  { id: "S4A", from: s(22), to: s(26), frames: 98, grade: "chase" },
  { id: "S4B", from: s(26), to: s(28), frames: 50, grade: "cockpit" },
  { id: "S4C", from: s(28), to: s(29.5), frames: 38, grade: "cockpit" },
  { id: "S4D", from: s(29.5), to: s(32.5), frames: 74, grade: "chase" },
  { id: "S4E", from: s(32.5), to: s(35), frames: 62, grade: "dust" },
  { id: "S4F", from: s(35), to: s(37), frames: 50, grade: "chase" },
  { id: "S5A", from: s(37), to: s(40), frames: 74, grade: "roof" },
  { id: "S5B", from: s(40), to: s(42), frames: 50, grade: "roof" },
  { id: "S5C", from: s(42), to: s(44), frames: 50, grade: "cockpit", zoom: 1.45, origin: "40% 42%" },
  { id: "S5D", from: s(44), to: s(46), frames: 50, grade: "roof" },
  { id: "S5E", from: s(46), to: s(47), frames: 26, grade: "slowmo" },
  { id: "S5F", from: s(47), to: s(49), frames: 50, grade: "roof" },
  { id: "S6A", from: s(49), to: s(53), frames: 98, grade: "dusk" },
  { id: "S6B", from: s(53), to: s(56), frames: 74, grade: "earth" },
];

export const BEATS = {
  powerdown: s(5.55),
  freeze: s(6) + 44,
  dustCut: s(10),
  pole: s(17.4),
  whip: s(22),
  cockpit2: s(26),
  flyover: s(30.9),
  lift: s(47),
  earth: s(53),
  title: s(56),
  subtitle: s(57.4),
  final: s(59),
  black: s(59.5),
};
