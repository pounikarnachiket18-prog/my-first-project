import { continueRender, delayRender, staticFile } from "remotion";
import faces from "./fontFaces.json";

// Fonts are self-hosted in public/fonts (Montserrat, Baloo 2, Noto Sans Devanagari)
// so rendering works offline and behind proxies.
if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("Loading India reel fonts", { timeoutInMilliseconds: 120000 });
  Promise.all(
    faces.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)}) format("woff2")`, {
        weight: f.weight,
        unicodeRange: f.unicodeRange,
        display: "block",
      });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .catch((e) => console.error("Font load failed", e))
    .finally(() => continueRender(handle));
}

const montserrat = "Montserrat";
const baloo = "'Baloo 2'";
const deva = "'Noto Sans Devanagari'";

export const F = {
  ui: `${montserrat}, sans-serif`,
  fun: `${baloo}, ${montserrat}, sans-serif`,
  deva: `${deva}, ${baloo}, sans-serif`,
};

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// New colour grade: warm saffron dusk + teal, replacing the original purple/pink.
export type Palette = {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  sun: string;
  hillFar: string;
  hillNear: string;
  ground: string;
  asphalt: string;
  asphaltFar: string;
  lane: string;
  edgeYellow: string;
  median: string;
  shrub: string;
  night: boolean;
};

export const DUSK: Palette = {
  skyTop: "#0F4C5C",
  skyMid: "#E36414",
  skyLow: "#FFC971",
  sun: "#FFE8A3",
  hillFar: "#6B5B73",
  hillNear: "#3E4F45",
  ground: "#5B6B3A",
  asphalt: "#2E2C36",
  asphaltFar: "#7A6A6A",
  lane: "#F4E9D8",
  edgeYellow: "#F7C548",
  median: "#4F7942",
  shrub: "#E05297",
  night: false,
};

export const NIGHT: Palette = {
  skyTop: "#04121C",
  skyMid: "#0C2E3F",
  skyLow: "#B5543A",
  sun: "#FFD9A0",
  hillFar: "#1B2A36",
  hillNear: "#0F1A20",
  ground: "#18231A",
  asphalt: "#15141B",
  asphaltFar: "#3A2E33",
  lane: "#D9CFC0",
  edgeYellow: "#E0B23C",
  median: "#1F3420",
  shrub: "#8E2F5C",
  night: true,
};

export const SAFFRON = "#FF9933";
export const INDIA_GREEN = "#138808";
export const SIGN_GREEN = "#0A6B3A";
export const CREAM = "#FFF4E0";
