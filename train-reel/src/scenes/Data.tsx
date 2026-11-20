import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop } from "../ui";

const S = T.data;

const ROWS = [
  { label: "TRAIN NO.", value: "12951", fixed: "Gaadi sankhya" },
  { label: "PLATFORM", value: "3", fixed: "platform sankhya" },
  { label: "STATUS", value: "ARRIVING", fixed: "par…", clip: "aa rahi hai" },
];
const DATA_Y = 520;
const TPL_Y = 1010;
const ROW_H = 100;
const TPL_H = 120;
const VAL_X = 560;

export const Data: React.FC = () => {
  const frame = useCurrentFrame();
  const card = usePop(S.feed);
  const tpl = usePop(S.feed + 20);

  return (
    <AbsoluteFill>
      <NightBg glow="#173A57" />
      <Tag text="HOW DOES IT KNOW?" color={C.teal} />
      <div style={{ position: "absolute", top: 340, left: 60, right: 60 }}>
        <PopLine start={4} size={60} font={F.sans} weight={900}>
          Live train data <Hi c={C.teal}>fills in the blanks</Hi>
        </PopLine>
      </div>

      {/* live data card */}
      <div
        style={{
          position: "absolute",
          top: DATA_Y - 30,
          left: 60,
          width: 960,
          height: ROWS.length * ROW_H + 60,
          borderRadius: 26,
          background: "#0A1430",
          border: "3px solid #2A4F78",
          opacity: card,
          transform: `translateY(${(1 - card) * -40}px)`,
        }}
      >
        <div style={{ position: "absolute", top: -22, left: 30, background: C.teal, color: C.night, fontFamily: F.sans, fontWeight: 900, fontSize: 24, padding: "6px 16px", borderRadius: 8 }}>
          ● LIVE FEED
        </div>
        {ROWS.map((r, i) => (
          <div key={i} style={{ position: "absolute", top: 30 + i * ROW_H, left: 40, fontFamily: F.led, fontSize: 64, color: C.muted }}>
            {r.label}
          </div>
        ))}
      </div>

      {/* template sentence */}
      <div style={{ position: "absolute", top: TPL_Y - 70, left: 60, fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.muted, opacity: tpl }}>
        ANNOUNCEMENT TEMPLATE
      </div>
      {ROWS.map((r, i) => (
        <div key={i} style={{ position: "absolute", top: TPL_Y + i * TPL_H, left: 60, opacity: tpl, transform: `translateX(${(1 - tpl) * -100}px)` }}>
          <div style={{ padding: "18px 26px", borderRadius: 16, border: `3px solid ${C.teal}`, background: `${C.teal}22`, fontFamily: F.sans, fontWeight: 900, fontSize: 40, color: C.cream }}>
            {r.fixed}
          </div>
        </div>
      ))}
      {ROWS.map((_, i) => (
        <div key={i} style={{ position: "absolute", top: TPL_Y + i * TPL_H, left: VAL_X, width: 460, height: 82, borderRadius: 16, border: `3px dashed ${C.yellow}88`, opacity: tpl }} />
      ))}

      {/* values flying from data card into template */}
      {ROWS.map((r, i) => {
        const start = S.slots[i];
        const t = interpolate(frame, [start, start + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const e = 1 - Math.pow(1 - t, 3);
        const y0 = DATA_Y + i * ROW_H - 10;
        const y1 = TPL_Y + i * TPL_H;
        const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * 60;
        const glow = frame >= start - 8 && frame < start + 24;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y,
              left: VAL_X,
              height: 82,
              padding: "0 26px",
              display: "flex",
              alignItems: "center",
              borderRadius: 16,
              background: t >= 1 ? C.yellow : "#0A0A0C",
              border: `3px solid ${C.yellow}`,
              fontFamily: t >= 1 ? F.sans : F.led,
              fontWeight: 900,
              fontSize: t >= 1 ? 40 : 64,
              color: t >= 1 ? C.night : C.amber,
              boxShadow: glow ? `0 0 40px ${C.yellow}` : "none",
              opacity: card,
              whiteSpace: "nowrap",
            }}
          >
            {t >= 1 ? (r.clip ?? r.value.split("").join(" · ")) : r.value}
          </div>
        );
      })}

      <div style={{ position: "absolute", top: 1420, left: 60, right: 60 }}>
        <PopLine start={S.cap} size={64} font={F.sans} weight={900}>
          Each value is swapped for <Hi>its own audio clip</Hi>
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
