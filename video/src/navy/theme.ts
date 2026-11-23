// Colour themes. NIGHT reproduces the original v1/v2 colours exactly; DAY is the daylight look (v3).
import React, { useContext } from "react";

export type Theme = {
  day: boolean;
  deck: string; deckHi: string; deckGrad: [string, string, string];
  hullA: string; hullB: string; boxTop: string; islandTop: [string, string];
  line: string; lineDim: string;
  seaShadow: string; foam: string; wakeCore: string; wakeLine: string;
  migBody: string; migFin: string; cutHole: string; engine: string;
  oceanStroke: string; oceanGain: number;
  sky: [string, string, string]; skyWarm: string; seaGrad: [string, string, string]; haze: string; hazeOpacity: number;
  sun: string; ray: string; rayGain: number;
  land: string; asphalt: string; genDeck: string; genSides: [string, string];
  bgCss: string; vignette: number;
};

export const NIGHT: Theme = {
  day: false,
  deck: "#4d5869", deckHi: "#5a6678", deckGrad: ["#3f4a5a", "#4f5b6c", "#5d6a7d"],
  hullA: "#1b232f", hullB: "#3a4657", boxTop: "#5f6c7f", islandTop: ["#6a778b", "#72809a"],
  line: "rgba(235,242,250,0.78)", lineDim: "rgba(235,242,250,0.32)",
  seaShadow: "rgba(0,0,0,0.45)", foam: "rgba(200,225,245,0.28)", wakeCore: "rgba(190,215,235,0.16)", wakeLine: "rgba(190,215,235,0.22)",
  migBody: "#8a96a6", migFin: "#9fabbb", cutHole: "#0b111a", engine: "#56637a",
  oceanStroke: "#9cc3e3", oceanGain: 1,
  sky: ["#05080e", "#111c2c", "#22344c"], skyWarm: "#3a3a48", seaGrad: ["#1d2c42", "#0f1826", "#070b12"], haze: "#5d7593", hazeOpacity: 0.35,
  sun: "#ffcf96", ray: "#bfd9ff", rayGain: 1,
  land: "#0e161f", asphalt: "#232c38", genDeck: "#4a5566", genSides: ["#2b3543", "#323d4c"],
  bgCss: "radial-gradient(ellipse 85% 60% at 50% 45%, #14202f 0%, #0b121c 55%, #05080d 100%)", vignette: 0.6,
};

export const DAY: Theme = {
  day: true,
  deck: "#59626e", deckHi: "#6a7480", deckGrad: ["#4c5561", "#5a636f", "#69737f"],
  hullA: "#55606d", hullB: "#aab4bf", boxTop: "#c3cbd4", islandTop: ["#cdd4dc", "#d6dce3"],
  line: "rgba(255,255,255,0.88)", lineDim: "rgba(255,255,255,0.45)",
  seaShadow: "rgba(4,30,55,0.5)", foam: "rgba(255,255,255,0.75)", wakeCore: "rgba(235,248,255,0.35)", wakeLine: "rgba(255,255,255,0.6)",
  migBody: "#9ba6b3", migFin: "#b4bec9", cutHole: "#1a2330", engine: "#7d8a9c",
  oceanStroke: "#e9f6ff", oceanGain: 1.35,
  sky: ["#2f6db3", "#6aa4da", "#d9ecf8"], skyWarm: "#f3e7cf", seaGrad: ["#5f93bd", "#245f8f", "#123f66"], haze: "#ffffff", hazeOpacity: 0.55,
  sun: "#fff4d6", ray: "#fffbea", rayGain: 0.7,
  land: "#4b6b3f", asphalt: "#3a3f47", genDeck: "#59626e", genSides: ["#6f7a87", "#8a95a2"],
  bgCss: "radial-gradient(ellipse 90% 65% at 50% 42%, #2a76aa 0%, #1c5b8c 55%, #123f66 100%)", vignette: 0.28,
};

export const ThemeCtx = React.createContext<Theme>(NIGHT);
export const useTheme = () => useContext(ThemeCtx);
