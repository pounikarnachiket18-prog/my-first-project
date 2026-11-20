import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop } from "../ui";

const S = T.pros;

const ITEMS: { icon: string; t: string; s: string; col: string }[] = [
  { icon: "24×7", t: "Never gets tired", s: "announces round the clock", col: C.teal },
  { icon: "≡", t: "Same clear voice", s: "every single time", col: C.yellow },
  { icon: "+", t: "New train?", s: "just record one new name clip", col: C.coral },
  { icon: "₹", t: "Cheap & reliable", s: "no live announcer needed", col: C.violet },
];

const Item: React.FC<{ i: number }> = ({ i }) => {
  const p = usePop(S.items[i]);
  const frame = useCurrentFrame();
  const it = ITEMS[i];
  const check = usePop(S.items[i] + 8, 9, 240);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "24px 30px",
        borderRadius: 24,
        background: "#0A1430",
        border: `3px solid ${it.col}66`,
        opacity: p,
        transform: `translateX(${(1 - p) * (i % 2 ? 300 : -300)}px)`,
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 24,
          background: `${it.col}26`,
          border: `3px solid ${it.col}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: it.icon.length > 2 ? 36 : 60,
          color: it.col,
          flexShrink: 0,
          transform: `rotate(${Math.sin((frame + i * 10) / 12) * 4}deg)`,
        }}
      >
        {it.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 48, color: C.cream }}>{it.t}</div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.muted }}>{it.s}</div>
      </div>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: C.teal, color: C.night, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 40, fontFamily: F.sans, transform: `scale(${check})` }}>
        ✓
      </div>
    </div>
  );
};

export const Pros: React.FC = () => (
  <AbsoluteFill>
    <NightBg glow="#173A4A" />
    <Tag text="AND HONESTLY? IT WORKS" color={C.teal} />
    <div style={{ position: "absolute", top: 380, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 26 }}>
      {ITEMS.map((_, i) => (
        <Item key={i} i={i} />
      ))}
    </div>
    <div style={{ position: "absolute", top: 1330, left: 60, right: 60 }}>
      <PopLine start={S.cap} size={74}>
        A few pauses are a <Hi c={C.teal}>small price</Hi> for that
      </PopLine>
    </div>
  </AbsoluteFill>
);
