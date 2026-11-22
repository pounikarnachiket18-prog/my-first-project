// Maps voiceover time (s) to the reel's design time (s): intro 0-5 s, then DayMain at design time - 5.
// Each pair is [when the line starts in the ElevenLabs voiceover, when its on-screen text is designed to appear].
export const VO_SECONDS = 123.82;
export const DESIGN_SECONDS = 110.33;

export const ANCHORS: [number, number][] = [
  [0, 0],
  [8.24, 6.0],
  [10.57, 8.0],
  [15.5, 13.7],
  [18.35, 16.0],
  [21.07, 19.0],
  [27.45, 23.7],
  [31.45, 26.0],
  [36.13, 31.0],
  [38.5, 33.0],
  [43.29, 38.0],
  [46.16, 40.3],
  [49.76, 43.8],
  [52.36, 47.8],
  [57.48, 51.0],
  [61.35, 55.0],
  [64.87, 58.0],
  [69.29, 61.0],
  [72.43, 65.0],
  [77.55, 68.0],
  [80.03, 70.0],
  [84.64, 75.0],
  [86.4, 77.0],
  [89.33, 79.0],
  [92.58, 81.0],
  [94.71, 83.0],
  [98.01, 86.8],
  [98.91, 88.0],
  [103.28, 90.0],
  [106.44, 93.0],
  [110.27, 97.0],
  [113.74, 101.0],
  [117.38, 103.0],
  [120.02, 107.0],
  [VO_SECONDS, DESIGN_SECONDS],
];

/** Voice time -> design time. Text leads the voice by LEAD seconds so it lands as the word is spoken. */
const LEAD = 0.12;
export const warp = (a: number) => {
  const x = a + LEAD;
  if (x <= 0) return 0;
  for (let i = 1; i < ANCHORS.length; i++) {
    const [a0, d0] = ANCHORS[i - 1];
    const [a1, d1] = ANCHORS[i];
    if (x <= a1) return d0 + ((x - a0) / (a1 - a0)) * (d1 - d0);
  }
  return DESIGN_SECONDS;
};
