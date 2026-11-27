import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts are bundled locally (public/earth/fonts, from @fontsource) so rendering needs no network.
// @remotion/fonts handles delayRender/continueRender for every render tab.
const FACES: [string, string, string][] = [
  ["Anton", "anton-latin-400-normal.woff2", "400"],
  ["Montserrat", "montserrat-latin-600-normal.woff2", "600"],
  ["Montserrat", "montserrat-latin-800-normal.woff2", "800"],
  ["Montserrat", "montserrat-latin-900-normal.woff2", "900"],
  ["JetBrains Mono", "jetbrains-mono-latin-500-normal.woff2", "500"],
  ["JetBrains Mono", "jetbrains-mono-latin-700-normal.woff2", "700"],
];

let started = false;
export const loadEarthFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  for (const [family, file, weight] of FACES) {
    loadFont({ family, url: staticFile(`earth/fonts/${file}`), weight, format: "woff2" }).catch((e) => console.error(e));
  }
};

export const FONT = {
  title: "Anton, Impact, sans-serif",
  sub: "Montserrat, Arial, sans-serif",
  mono: "'JetBrains Mono', monospace",
};
