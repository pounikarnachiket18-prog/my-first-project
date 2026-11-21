import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { Chip, ClockIcon, Headline, PinIcon, TowerIcon, popStyle, usePop } from "../ui";

const ROWS = [
  { n: "HOWRAH JN", t: "08:05" },
  { n: "BANDEL JN", t: "08:47" },
  { n: "MEMARI", t: "09:38" },
  { n: "BARDHAMAN JN", t: "10:05" },
];

const Tile: React.FC<{ s: number; label: string; children: React.ReactNode; accent: string }> = ({ s, label, children, accent }) => (
  <div
    style={{
      width: 230,
      height: 230,
      borderRadius: 40,
      background: C.white,
      border: `6px solid ${accent}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      boxShadow: "0 16px 40px rgba(19,35,58,0.18)",
      ...popStyle(s),
    }}
  >
    {children}
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink }}>{label}</div>
  </div>
);

const Op: React.FC<{ s: number; t: string }> = ({ s, t }) => (
  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 90, color: C.ink, ...popStyle(s) }}>{t}</div>
);

/** Scene 7: timetable saved offline + tower ID = location within a few km. */
export const S07Timetable: React.FC = () => {
  const frame = useCurrentFrame();
  const card = usePop(10);
  const glow = interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s1 = usePop(115);
  const s2 = usePop(128);
  const s3 = usePop(141);
  const s4 = usePop(154);
  const s5 = usePop(167);
  const acc = usePop(195);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.skyLow}, ${C.cream})`, overflow: "hidden" }}>
      <Headline lines={[["Timetable:"], [{ t: "offline!", c: C.stripe }]]} delay={4} top={180} size={104} />
      {/* timetable card */}
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          top: 470,
          borderRadius: 40,
          background: C.white,
          padding: "34px 40px",
          boxShadow: "0 24px 60px rgba(19,35,58,0.18)",
          fontFamily: FONT,
          ...popStyle(card),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800, letterSpacing: 3, color: C.inkSoft }}>
            <ClockIcon size={44} color={C.inkSoft} /> TIMETABLE
          </div>
          <Chip color={C.green} size={26} bg="#E8F9EF" fg="#15803D">
            OFFLINE SAVED
          </Chip>
        </div>
        {ROWS.map((r, i) => {
          const rs = interpolate(frame, [20 + i * 10, 34 + i * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const current = i === ROWS.length - 1;
          return (
            <div
              key={r.n}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                marginTop: 8,
                borderRadius: 20,
                fontSize: 40,
                fontWeight: 700,
                color: C.ink,
                background: current ? `rgba(255,201,60,${0.45 * glow})` : "transparent",
                border: current ? `4px solid rgba(255,201,60,${glow})` : "4px solid transparent",
                opacity: rs,
                translate: `${(1 - rs) * 60}px 0px`,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ width: 18, height: 18, borderRadius: 9, background: current ? C.stripe : C.train }} />
                {r.n}
              </span>
              <span style={{ color: C.inkSoft }}>{r.t}</span>
            </div>
          );
        })}
      </div>
      {/* equation */}
      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <Tile s={s1} label="Tower ID" accent={C.pink}>
          <TowerIcon size={100} />
        </Tile>
        <Op s={s2} t="+" />
        <Tile s={s3} label="Timetable" accent={C.train}>
          <ClockIcon size={100} />
        </Tile>
        <Op s={s4} t="=" />
        <Tile s={s5} label="Location" accent={C.stripe}>
          <PinIcon size={100} />
        </Tile>
      </div>
      <div style={{ position: "absolute", top: 1440, width: "100%", display: "flex", justifyContent: "center", ...popStyle(acc) }}>
        <Chip color={C.stripe} size={38}>
          kuch km ke andar accurate
        </Chip>
      </div>
    </AbsoluteFill>
  );
};
