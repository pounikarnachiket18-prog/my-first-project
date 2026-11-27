import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import captions from "../data/captions.json";
import { FONT } from "../fonts";

type Word = { text: string; start: number; end: number; emph: boolean; accent?: string };
type Line = { id: string; start: number; end: number; accent: string; words: Word[] };

/**
 * Reference-style captions: one spoken word at a time, centred in the lower third,
 * bold white with a heavy black outline. Key words (EARTH, 1,670, ruk, waves, saal, 6 mahine...)
 * turn yellow. The word pops in on its first frame.
 */
export const Captions: React.FC<{ y?: number }> = ({ y = 0.72 }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const words = (captions as { lines: Line[] }).lines.flatMap((l) => l.words);
  let w: Word | undefined;
  for (let i = 0; i < words.length; i++) {
    const nx = words[i + 1];
    const end = Math.min(words[i].end + 0.25, nx ? nx.start : 1e9);
    if (t >= words[i].start - 0.02 && t < end) {
      w = words[i];
      break;
    }
  }
  if (!w) return null;
  const s = spring({ frame: frame - Math.round((w.start - 0.02) * fps), fps, config: { damping: 14, stiffness: 420, mass: 0.45 } });
  const text = w.text.replace(/\.\.\.$/, "").replace(/[,.!?]$/, "");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: height * y, left: 40, right: 40, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: FONT.sub,
            fontWeight: 900,
            fontSize: w.emph ? 104 : 92,
            letterSpacing: 0.5,
            color: w.emph ? "#ffd21f" : "#ffffff",
            WebkitTextStroke: "10px #000",
            paintOrder: "stroke fill",
            textShadow: "0 8px 22px rgba(0,0,0,0.55)",
            transform: `scale(${interpolate(s, [0, 1], [0.78, 1])})`,
            opacity: interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
