import { continueRender, delayRender, staticFile } from "remotion";

// Fonts are bundled locally (public/earth/fonts, from @fontsource) so rendering needs no network.
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
  const h = delayRender("earth fonts");
  Promise.all(
    FACES.map(([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(`earth/fonts/${file}`)}) format("woff2")`, { weight });
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .then(() => continueRender(h))
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
};

export const FONT = {
  title: "Anton, Impact, sans-serif",
  sub: "Montserrat, Arial, sans-serif",
  mono: "'JetBrains Mono', monospace",
};
