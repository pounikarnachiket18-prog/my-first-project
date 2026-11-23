/**
 * "Kambal kab dhula?" — Bharatiya Rail edition.
 * All colours, fonts, branding text and beat timings live here.
 */
import { FONT_FILES } from "./fontFiles";

// Embedded fonts via CSS @font-face (data URLs — no network needed).
// <FontGate> in RailKambal.tsx holds the render until they're decoded.
if (typeof document !== "undefined" && !document.getElementById("rail-fonts")) {
  const style = document.createElement("style");
  style.id = "rail-fonts";
  style.textContent = FONT_FILES.map(
    (f) =>
      `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-display:block;` +
      `src:url(${f.url}) format("woff2");unicode-range:${f.range};}`,
  ).join("\n");
  document.head.appendChild(style);
}

export const FONT_CHECKS = ['800 40px "Baloo 2"', '500 40px "Mukta"', '700 40px "Mukta"', '800 40px "Mukta"'];

export const FONT = {
  title: `"Baloo 2", sans-serif`,
  body: `"Mukta", sans-serif`,
};

export const FPS = 30;
// Ends at 43.6s, just before the reference's channel-name end card.
export const DURATION_SEC = 43.6;
export const DURATION = Math.round(DURATION_SEC * FPS);
export const s = (sec: number) => Math.round(sec * FPS);

// Palette modelled on the reference reel: bright white/grey coach,
// charcoal blanket with peach stripes, kraft packet; maroon berths,
// pills and highlight words (the "red" version).
export const C = {
  wall: "#EEF1F5",
  wallShade: "#D9DFE7",
  wallDeep: "#BCC6D2",
  ink: "#15171C",
  inkSoft: "#5A6270",

  berth: "#A3192E", // maroon cushion
  berthSide: "#6E0F1F",
  berthEdge: "#C8364B",

  blanket: "#3A3F47", // charcoal
  blanketSide: "#24282E",
  blanketStripe: "#F0A982", // peach check
  blanketStripe2: "#F7DCCB",

  sheet: "#FFFFFF",
  sheetSide: "#DADFE6",
  brandPrint: "#8E1F2F", // maroon "भारतीय रेल" print on the chadar

  packet: "#D9A35E", // kraft bedroll packet
  packetSide: "#A9773A",
  packetPrint: "#5A3A16",

  accent: "#A3192E", // maroon highlight words
  pill: "#A3192E",
  curtain: "#2F5446",
  glass: "#5E7A8C",

  cover: "#7A1B2A", // printed cover base (maroon)
  coverPrint: "#F3F6FB",

  uniform: "#23272F", // attendant: dark vest
  uniformDark: "#121418",
  dupatta: "#A3192E",
  skin: "#B9784E",
  skinShade: "#9C5F3B",
  hair: "#1E1410",

  laundryWall: "#E9ECF0",
  machine: "#F7F8FA",
  machinePanel: "#A3192E",
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
  berthStory: [27.0, DURATION_SEC], // do chadar → cover → printed cover
} as const;
