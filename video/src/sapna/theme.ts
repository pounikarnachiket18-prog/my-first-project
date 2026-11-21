import { continueRender, delayRender, staticFile } from "remotion";

// Poppins is self-hosted in public/fonts so rendering needs no network.
export const FONT = "SapnaPoppins";

if (typeof document !== "undefined") {
  const handle = delayRender("Loading Poppins");
  Promise.all(
    ["500", "600", "700", "800"].map((w) => {
      const face = new FontFace(FONT, `url(${staticFile(`fonts/Poppins-${w}.woff2`)}) format("woff2")`, { weight: w });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}

// Daytime palette for "Sapna Express"
export const C = {
  skyTop: "#4FB3F6",
  sky: "#8FD3FF",
  skyLow: "#D8F1FF",
  field: "#7BC86C",
  fieldLight: "#9BD77F",
  fieldDark: "#5DAE57",
  mustard: "#E8D35A",
  soil: "#D9C39A",
  ballast: "#CDBB9A",
  river: "#5BC0EB",
  riverEdge: "#A7E0F5",
  tree: "#3E8E41",
  treeDark: "#2F6F33",
  roof: "#E07A4F",
  train: "#3FA9F5",
  trainDark: "#1F7BC4",
  stripe: "#FFC93C",
  pink: "#FF5C8A",
  green: "#2ECC71",
  red: "#FF4D4D",
  ink: "#13233A",
  inkSoft: "#4A5B73",
  cream: "#FFF8EC",
  map: "#F4EEDF",
  white: "#FFFFFF",
};

export const FPS = 30;

// Scene lengths in frames. Re-time these to match the recorded voice.
export const SCENES = {
  hook: 150,
  coach: 210,
  phone: 180,
  gps: 240,
  towers: 300,
  crowdMap: 300,
  timetable: 240,
  catch: 240,
  payoff: 240,
  cta: 150,
};

export const TRANSITION = 12;

export const TOTAL_FRAMES =
  Object.values(SCENES).reduce((a, b) => a + b, 0) -
  (Object.values(SCENES).length - 1) * TRANSITION;
