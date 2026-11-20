import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { Main } from "./Main";
import T from "./timeline.json";

// Hold rendering until all web fonts (incl. Indic scripts) are ready.
const fontHandle = delayRender("Loading fonts");
Promise.all(
  [
    "400 40px Anton",
    "700 40px Inter",
    "900 40px Inter",
    "400 40px VT323",
    "700 40px 'Noto Sans Devanagari'",
    "700 40px 'Noto Sans Tamil'",
    "700 40px 'Noto Sans Bengali'",
    "700 40px 'Noto Sans Telugu'",
  ].map((f) => document.fonts.load(f, f.includes("Devanagari") ? "यात्री" : f.includes("Tamil") ? "தமிழ்" : f.includes("Bengali") ? "বাংলা" : f.includes("Telugu") ? "తెలుగు" : "Aa1"))
)
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Main} durationInFrames={T.total} fps={T.fps} width={1080} height={1920} defaultProps={{ withAudio: true }} />
  </>
);
