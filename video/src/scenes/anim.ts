import { interpolate, spring } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Spring-in (0→1) starting at `start`, mapped to opacity + rise. */
export const enter = (frame: number, start: number, fps: number) => {
  const s = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 130 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [36, 0])}px)` };
};

/** Fade-out over the last `len` frames of a scene of `total` frames. */
export const exitFade = (frame: number, total: number, len = 10) =>
  interpolate(frame, [total - len, total], [1, 0], clamp);

export const ramp = (frame: number, from: number, to: number, a: number, b: number) =>
  interpolate(frame, [from, to], [a, b], clamp);
