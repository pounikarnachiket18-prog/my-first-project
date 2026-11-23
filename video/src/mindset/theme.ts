import { staticFile } from "remotion";

// Mindset Mode | Explainers brand tokens
export const brand = {
  ink: "#0D0A1E",
  inkSoft: "rgba(13, 10, 30, 0.78)",
  violet: "#8B5CF6",
  violetHot: "#A78BFA",
  gold: "#FFC940",
  goldSoft: "#FFE08A",
  white: "#FFFFFF",
  abhi: "#FF8A1F", // saffron, matches ABHI's recoloured shirt
  nachi: "#22D3EE", // cyan for NACHI
  alert: "#FF3B4E",
};

export const FPS = 30;
export const SRC_W = 720;
export const SRC_H = 1280;

// Hard scene cuts in the source video (frame numbers @30fps)
export const CUTS = [66, 127, 184, 256, 324, 411, 487, 671, 729, 805, 881, 967, 1044, 1121];

export const fontCss = `
@font-face { font-family: 'Montserrat'; font-weight: 600; src: url('${staticFile("fonts/montserrat-latin-600-normal.woff2")}') format('woff2'); }
@font-face { font-family: 'Montserrat'; font-weight: 700; src: url('${staticFile("fonts/montserrat-latin-700-normal.woff2")}') format('woff2'); }
@font-face { font-family: 'Montserrat'; font-weight: 800; src: url('${staticFile("fonts/montserrat-latin-800-normal.woff2")}') format('woff2'); }
@font-face { font-family: 'Montserrat'; font-weight: 900; src: url('${staticFile("fonts/montserrat-latin-900-normal.woff2")}') format('woff2'); }
@font-face { font-family: 'Bebas Neue'; font-weight: 400; src: url('${staticFile("fonts/bebas-neue-latin-400-normal.woff2")}') format('woff2'); }
`;

export const display = "'Bebas Neue', 'Montserrat', sans-serif";
export const sans = "'Montserrat', sans-serif";

/** Linear interpolation over a [frame, x, y] track. */
export const sampleTrack = (
  track: [number, number, number][],
  frame: number
): { x: number; y: number } | null => {
  if (track.length === 0) return null;
  if (frame < track[0][0] - 1 || frame > track[track.length - 1][0] + 1) return null;
  if (frame <= track[0][0]) return { x: track[0][1], y: track[0][2] };
  for (let i = 1; i < track.length; i++) {
    const [f1, x1, y1] = track[i];
    if (frame <= f1) {
      const [f0, x0, y0] = track[i - 1];
      const t = (frame - f0) / Math.max(1, f1 - f0);
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
    }
  }
  const last = track[track.length - 1];
  return { x: last[1], y: last[2] };
};
