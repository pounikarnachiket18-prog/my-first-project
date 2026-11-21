import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, staticFile } from "remotion";

// Fonts are bundled in public/fonts so the video renders offline (both are SIL OFL, from Google Fonts).
loadFont({ family: "VCD Fredoka", url: staticFile("fonts/Fredoka-Variable.woff2"), weight: "300 700" });
loadFont({ family: "VCD Barlow", url: staticFile("fonts/Barlow-Medium.woff2"), weight: "500" });
loadFont({ family: "VCD Barlow", url: staticFile("fonts/Barlow-SemiBold.woff2"), weight: "600" });

export const FONT = {
  label: `"VCD Fredoka", sans-serif`,
  clock: `"VCD Barlow", sans-serif`,
};

// Night-time navy + gold palette taken from the reference video.
export const COLOR = {
  sky: "#1d2745",
  ink: "#f4f1ea",
  gold: "#e9c46a",
  mint: "#a8e6cf",
  teal: "#8fd3d1",
  coral: "#f07167",
  pink: "#f4a3a8",
  chipBg: "rgba(34, 38, 46, 0.9)",
  chipBgLight: "rgba(52, 58, 52, 0.92)",

  // 3D materials
  grass: "#2b3624",
  ballast: "#5b5954",
  sleeper: "#8e8b84",
  rail: "#a9adb4",
  pole: "#8b9099",
  tree: "#26361f",
  trunk: "#3a2f25",
  locoBlue: "#2d4396",
  locoStripe: "#e7c45c",
  locoRoof: "#5c6068",
  wagon: "#8a2f2a",
  wall: "#e6e3dc",
  console: "#d8d5ce",
  dark: "#3d4046",
  seat: "#45484e",
  shirt: "#a8c5ea",
  shirtAlp: "#e9ebef",
  skin: "#e2b694",
  hair: "#4a3a2f",
  pants: "#3a3e46",
  windowNight: "#1f2b4d",
};

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const SMOOTH = Easing.bezier(0.65, 0, 0.35, 1);

/** Clamped interpolate between two frames. */
export const ramp = (
  frame: number,
  start: number,
  end: number,
  from = 0,
  to = 1,
  easing: (t: number) => number = SMOOTH,
) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export type V3 = [number, number, number];
export const mix = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
