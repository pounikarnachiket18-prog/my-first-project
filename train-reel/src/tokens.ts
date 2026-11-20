import { Easing } from "remotion";

export const C = {
  night: "#060B1C",
  navy: "#0D1A3A",
  navy2: "#162B5C",
  line: "#2A3F78",
  yellow: "#FFC83D",
  amber: "#FFB000",
  red: "#FF4D5E",
  cream: "#FFF4DC",
  teal: "#2EE6C5",
  coral: "#FF8A5B",
  violet: "#A98BFF",
  muted: "#8FA0CC",
  white: "#FFFFFF",
};

export const KIND_COLOR: Record<string, string> = {
  phrase: C.teal,
  num: C.yellow,
  name: C.coral,
};

export const F = {
  display: "'Anton', 'Inter', sans-serif",
  sans: "'Inter', 'Noto Sans Devanagari', sans-serif",
  led: "'VT323', monospace",
  deva: "'Noto Sans Devanagari', 'Inter', sans-serif",
  indic:
    "'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', 'Noto Sans Telugu', 'Inter', sans-serif",
};

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
