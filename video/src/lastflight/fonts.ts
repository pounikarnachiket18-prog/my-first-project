import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Local copies of OFL fonts from @fontsource (public/lastflight/fonts): rendering needs no network.
const FACES: [string, string, string, string][] = [
  ["Montserrat", "montserrat-latin-400-normal.woff2", "400", "normal"],
  ["Montserrat", "montserrat-latin-500-normal.woff2", "500", "normal"],
  ["Montserrat", "montserrat-latin-600-normal.woff2", "600", "normal"],
  ["Montserrat", "montserrat-latin-600-italic.woff2", "600", "italic"],
  ["Montserrat", "montserrat-latin-800-normal.woff2", "800", "normal"],
  ["JetBrains Mono", "jetbrains-mono-latin-500-normal.woff2", "500", "normal"],
];

let started = false;
export const loadLFFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  for (const [family, file, weight, style] of FACES) {
    loadFont({ family, url: staticFile(`lastflight/fonts/${file}`), weight, style, format: "woff2" }).catch((e) => console.error(e));
  }
};

export const FONT = { sans: "Montserrat, Arial, sans-serif", mono: "'JetBrains Mono', monospace" };
