import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, LedBoard, NightBg, PopLine, Tag, usePop } from "../ui";

const S = T.lang;

const LANGS: { native: string; en: string; sample: string }[] = [
  { native: "हिंदी", en: "Hindi", sample: "गाड़ी संख्या…" },
  { native: "English", en: "English", sample: "Train number…" },
  { native: "मराठी", en: "Marathi", sample: "गाडी क्रमांक…" },
  { native: "தமிழ்", en: "Tamil", sample: "ரயில் எண்…" },
  { native: "বাংলা", en: "Bengali", sample: "ট্রেন নম্বর…" },
  { native: "తెలుగు", en: "Telugu", sample: "రైలు నంబర్…" },
];
const COLORS = [C.yellow, C.teal, C.coral, C.violet, "#6FD3FF", "#FF7BC1"];

const Card: React.FC<{ i: number }> = ({ i }) => {
  const p = usePop(S.cards[i], 11, 190);
  const l = LANGS[i];
  const col = COLORS[i];
  const row = Math.floor(i / 2);
  const colIdx = i % 2;
  return (
    <div
      style={{
        position: "absolute",
        left: 70 + colIdx * 480,
        top: 640 + row * 210,
        width: 460,
        height: 180,
        borderRadius: 24,
        background: `${col}18`,
        border: `4px solid ${col}`,
        padding: "18px 26px",
        boxSizing: "border-box",
        opacity: p,
        transform: `perspective(800px) rotateX(${(1 - p) * 90}deg)`,
        transformOrigin: "top center",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: F.indic, fontWeight: 700, fontSize: 56, color: C.cream }}>{l.native}</span>
        <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 24, color: col }}>{l.en.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
        <span style={{ fontFamily: F.indic, fontWeight: 700, fontSize: 30, color: C.muted }}>{l.sample}</span>
        {/* mini clip blocks with gaps */}
        {[46, 18, 18, 18].map((w, k) => (
          <div key={k} style={{ width: w, height: 22, borderRadius: 6, background: col, marginLeft: k ? 6 : 10 }} />
        ))}
      </div>
    </div>
  );
};

export const Lang: React.FC = () => {
  const frame = useCurrentFrame();
  // flipping board cycles languages
  const idx = Math.min(LANGS.length - 1, Math.max(0, S.cards.filter((c) => frame >= c).length - 1));
  const flip = interpolate(frame - (S.cards[idx] ?? 0), [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <NightBg glow="#2A2456" />
      <Tag text="AND THEN… AGAIN" color={C.violet} />
      <div style={{ position: "absolute", top: 360, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <LedBoard width={720} height={150}>
          <span style={{ display: "inline-block", fontFamily: F.indic, fontSize: 84, fontWeight: 700, transform: `scaleY(${flip})` }}>
            {LANGS[idx].native}
          </span>
        </LedBoard>
      </div>
      {LANGS.map((_, i) => (
        <Card key={i} i={i} />
      ))}
      <div style={{ position: "absolute", top: 1300, left: 50, right: 50 }}>
        <PopLine start={S.cap} size={74}>
          Every language = <Hi c={C.violet}>its own clip library</Hi>
        </PopLine>
        <PopLine start={S.cap + 16} size={48} font={F.sans} weight={700} color={C.muted} style={{ marginTop: 18 }}>
          Same stitching. Same pauses.
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
