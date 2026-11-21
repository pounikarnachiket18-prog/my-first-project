/**
 * "Kambal kab dhula?" — Bharatiya Rail edition.
 * All colours, fonts, branding text and beat timings live here.
 */
import { continueRender, delayRender } from "remotion";
import { FONT_FILES } from "./fontFiles";

// Embedded fonts via CSS @font-face. We wait for document.fonts.ready
// (with a safety timeout) so text never renders in a fallback font.
if (typeof document !== "undefined" && !document.getElementById("rail-fonts")) {
  const style = document.createElement("style");
  style.id = "rail-fonts";
  style.textContent = FONT_FILES.map(
    (f) =>
      `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-display:block;` +
      `src:url(${f.url}) format("woff2");unicode-range:${f.range};}`,
  ).join("\n");
  document.head.appendChild(style);

  // Probe element forces every face to be used (and therefore loaded).
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:-9999px;top:0;opacity:0";
  probe.innerHTML = ["Baloo 2|800", "Mukta|500", "Mukta|700", "Mukta|800"]
    .map((x) => {
      const [fam, w] = x.split("|");
      return `<span style='font-family:"${fam}";font-weight:${w}'>Aa भारतीय रेल</span>`;
    })
    .join("");
  document.body.appendChild(probe);

  const handle = delayRender("Loading embedded fonts");
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      continueRender(handle);
    }
  };
  document.fonts.ready.then(() => requestAnimationFrame(finish));
  setTimeout(finish, 8000);
}

export const FONT = {
  title: `"Baloo 2", sans-serif`,
  body: `"Mukta", sans-serif`,
};

export const FPS = 30;
export const DURATION_SEC = 49.4;
export const DURATION = Math.round(DURATION_SEC * FPS);
export const s = (sec: number) => Math.round(sec * FPS);

// New palette (original was blue berth / charcoal blanket / grey coach).
export const C = {
  wall: "#F4EBDC",
  wallShade: "#E3D3BA",
  wallDeep: "#CDB898",
  ink: "#2B1B14",
  inkSoft: "#6E5545",

  berth: "#8E1F2F", // maroon cushion
  berthSide: "#5F1220",
  berthEdge: "#B23A48",

  blanket: "#2E4C3B", // forest green
  blanketSide: "#1E3328",
  blanketStripe: "#E7AE3E", // mustard check
  blanketStripe2: "#C9483A",

  sheet: "#FFFFFF",
  sheetSide: "#E6DDD0",
  brandPrint: "#8E1F2F", // maroon print on the chadar

  packet: "#F2A541", // saffron bedroll packet
  packetSide: "#C77E22",

  accent: "#F07C1E", // saffron highlight words
  pill: "#8E1F2F",
  curtain: "#D9A23A",
  glass: "#3B4A52",

  cover: "#7A1B2A", // printed cover base
  coverPrint: "#F6E6C8",

  uniform: "#16675F", // attendant uniform (teal)
  uniformDark: "#0F4A44",
  dupatta: "#F07C1E",
  skin: "#B9784E",
  skinShade: "#9C5F3B",
  hair: "#1E1410",

  laundryWall: "#E7EEEA",
  machine: "#F5F1E8",
  machinePanel: "#8E1F2F",
};

// Branding printed on the textiles.
export const BRAND = {
  hindi: "भारतीय रेल",
  kitHindi: "बेडरोल किट",
  kitEnglish: "BEDROLL KIT",
  handle: "@hypoexplained",
  nextVideoTitle: "Wapsi ka raasta chhota kyun?",
};

// Story beats, in seconds — matched to the original voiceover.
export const BEAT = {
  hook: [0, 4.5],
  packet: [4.5, 8.7],
  attendant: [8.7, 11.2],
  laundry: [11.2, 16.0],
  kambalBhi: [16.0, 20.0],
  calendar: [20.0, 27.0],
  berthStory: [27.0, DURATION_SEC], // do chadar → cover → printed cover → end card
} as const;
