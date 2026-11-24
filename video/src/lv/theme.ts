import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadDeva } from "@remotion/google-fonts/NotoSansDevanagari";

const poppins = loadPoppins("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
const deva = loadDeva("normal", { weights: ["700", "800"], subsets: ["devanagari", "latin"] });

export const FONTS_READY = Promise.all([poppins.waitUntilDone(), deva.waitUntilDone()]);

export const F = {
  ui: `${poppins.fontFamily}, Inter, sans-serif`,
  deva: `${deva.fontFamily}, sans-serif`,
};

// Train livery: deep maroon body with cream stripe (replaces the old navy blue)
export const L = {
  maroon: "#7A1B2A",
  maroonDark: "#5A1220",
  cream: "#F3E4B9",
  roof: "#4A4A50",
  under: "#1E1F24",
  window: "#1B1F2A",
  xYellow: "#F5C518",
  lvRed: "#D7263D",
  loco: "#2E3340",
};

export const STATION = { hi: "धोनीपुर", en: "DHONIPUR" };
export const BRAND = "MINDSET MODE | EXPLAINERS";
export const BRAND_SHORT = { a: "Mindset Mode", b: "Explainers" };

export const UI = {
  ink: "#15161A",
  blue: "#2B3FD6",
  green: "#1E8A4C",
  red: "#C8283B",
  yellow: "#F5C518",
};
