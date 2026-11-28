import { staticFile } from "remotion";

// Local copies of OFL fonts from @fontsource (public/lastflight/fonts): rendering needs no network.
// Declared with plain CSS @font-face (no delayRender): in this CPU-only container, a delayRender per font
// per render tab could time out under load and kill the whole render.
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
  const css = FACES.map(([family, file, weight, style]) =>
    `@font-face{font-family:'${family}';src:url('${staticFile(`lastflight/fonts/${file}`)}') format('woff2');font-weight:${weight};font-style:${style};font-display:block;}`,
  ).join("\n");
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
  for (const [family, , weight, style] of FACES) {
    document.fonts.load(`${style} ${weight} 20px '${family}'`).catch(() => undefined);
  }
};

export const FONT = { sans: "Montserrat, Arial, sans-serif", mono: "'JetBrains Mono', monospace" };
