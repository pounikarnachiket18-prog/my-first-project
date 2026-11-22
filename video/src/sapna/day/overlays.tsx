import React from "react";
import { Easing, interpolate, random, spring } from "remotion";
import { C, FONT } from "../theme";
import { CheckIcon, ClockIcon, CrossIcon, LockIcon, PinIcon, TowerIcon, TrainGlyph } from "../ui";

export const FPS = 30;
export const YEL = "#FFC93C";
export const PNK = "#FF5C8A";
export const GLASS = "rgba(14,24,44,0.80)";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0..1 visibility for a [from, to] window (seconds) with short fades. */
export const vis = (t: number, from: number, to: number, fade = 0.25) =>
  interpolate(t, [from, from + fade, to - fade, to], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });

export const pop = (t: number, at: number, damping = 12) =>
  spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping, stiffness: 160 } });

export const popStyle = (s: number): React.CSSProperties => ({
  opacity: interpolate(s, [0, 0.25], [0, 1], clamp),
  scale: interpolate(s, [0, 1], [0.5, 1]),
});

export type W = string | { t: string; c: string };

/** Headline whose lines appear at their own times, words popping in one by one. */
export const TimedHeadline: React.FC<{ t: number; from: number; to: number; lines: { at: number; words: W[] }[]; size?: number; top?: number }> = ({
  t,
  from,
  to,
  lines,
  size = 86,
  top = 250,
}) => {
  const v = vis(t, from, to, 0.18);
  if (v <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: -1.5,
        opacity: v,
      }}
    >
      {lines.map((l, li) => (
        <div key={li}>
          {l.words.map((w, wi) => {
            const s = pop(t, l.at + wi * 0.12, 11);
            const text = typeof w === "string" ? w : w.t;
            const color = typeof w === "string" ? "#fff" : w.c;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  margin: "0 12px",
                  color,
                  textShadow: "0 4px 22px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5)",
                  opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
                  scale: interpolate(s, [0, 1], [0.4, 1]),
                  translate: `0px ${interpolate(s, [0, 1], [40, 0])}px`,
                }}
              >
                {text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const GChip: React.FC<{ children: React.ReactNode; color?: string; size?: number; icon?: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  color = YEL,
  size = 32,
  icon,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.4,
      padding: `${size * 0.32}px ${size * 0.65}px`,
      borderRadius: 999,
      background: GLASS,
      border: `2.5px solid ${color}`,
      color: "#fff",
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: 1,
      whiteSpace: "nowrap",
      boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
      ...style,
    }}
  >
    {icon ?? <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 99, background: color }} />}
    {children}
  </div>
);

/** Absolutely placed, centred element that pops at `at` and hides after `to`. */
export const Place: React.FC<{ t: number; at: number; to: number; x: number | string; y: number; children: React.ReactNode; anchor?: "center" | "left" }> = ({
  t,
  at,
  to,
  x,
  y,
  children,
  anchor = "center",
}) => {
  const v = vis(t, at, to, 0.2);
  if (v <= 0) return null;
  const s = pop(t, at);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: anchor === "center" ? "-50% -50%" : "0 -50%",
        opacity: v,
      }}
    >
      <div style={popStyle(s)}>{children}</div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; width?: number; style?: React.CSSProperties }> = ({ children, width = 820, style }) => (
  <div
    style={{
      width,
      padding: "30px 36px",
      borderRadius: 34,
      background: GLASS,
      border: "1.5px solid rgba(255,255,255,0.18)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
      fontFamily: FONT,
      color: "#fff",
      ...style,
    }}
  >
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "rgba(255,255,255,0.65)" }) => (
  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color }}>{children}</div>
);

/* ---------- specific cards ---------- */

export const AppCard: React.FC<{ t: number }> = ({ t }) => {
  const km = Math.round(interpolate(t, [5.0, 6.1], [0, 12], clamp));
  const late = pop(t, 7.0);
  return (
    <Card width={640}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrainGlyph size={36} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>Where is my Train</div>
          <Label>LIVE STATUS</Label>
        </div>
        <GChip color={PNK} size={20}>
          OFFLINE
        </GChip>
      </div>
      <div style={{ marginTop: 26, marginLeft: 12, borderLeft: `5px solid ${C.green}`, paddingLeft: 30, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.75 }}>HOWRAH JN</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 84, fontWeight: 800, color: YEL, lineHeight: 1 }}>{km}</span>
          <span style={{ fontSize: 36, fontWeight: 800, color: YEL }}>km</span>
          <span style={{ fontSize: 30, fontWeight: 600 }}>pehle</span>
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>BARDHAMAN JN</div>
          <Label>NEXT STATION</Label>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, ...popStyle(late) }}>
        <GChip color={PNK} size={24} icon={<ClockIcon size={26} color={PNK} />}>
          1½ min late
        </GChip>
      </div>
    </Card>
  );
};

export const IdCounter: React.FC<{ t: number }> = ({ t }) => {
  const settle = 13.2;
  const final = "38822";
  const digits = final.split("").map((d, i) => (t > settle + i * 0.08 ? d : String(Math.floor(random(`d${i}${Math.floor(t * 20)}`) * 10))));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <Label color="#fff">TUMHARE PHONE MEIN</Label>
      <div style={{ display: "flex", gap: 12 }}>
        {digits.map((d, i) => (
          <div
            key={i}
            style={{
              width: 92,
              height: 118,
              borderRadius: 18,
              background: GLASS,
              border: "2px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 76,
              color: t > settle ? YEL : "#fff",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <LockIcon size={44} color={YEL} />
    </div>
  );
};

export const Battery: React.FC<{ t: number }> = ({ t }) => {
  const pct = Math.round(interpolate(t, [16.2, 17.6], [100, 23], clamp));
  const col = pct > 60 ? C.green : pct > 35 ? YEL : C.red;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 380, height: 170, borderRadius: 32, border: "10px solid #fff", padding: 12, boxSizing: "border-box", background: GLASS, position: "relative" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 16, background: col, boxShadow: `0 0 30px ${col}` }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 84, color: "#fff", textShadow: "0 3px 14px rgba(0,0,0,0.6)" }}>
            {pct}%
          </div>
        </div>
        <div style={{ width: 22, height: 70, borderRadius: "0 12px 12px 0", background: "#fff" }} />
      </div>
      <GChip color={C.red} size={28}>
        GPS ON = BATTERY DOWN
      </GChip>
    </div>
  );
};

export const MeterCard: React.FC<{ t: number }> = ({ t }) => {
  const r1 = pop(t, 23.0);
  const r2 = pop(t, 24.0);
  const row = (icon: React.ReactNode, a: string, b: React.ReactNode, s: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700, padding: "12px 0", ...popStyle(s) }}>
      {icon}
      <span style={{ flex: 1 }}>{a}</span>
      {b}
    </div>
  );
  return (
    <Card width={780}>
      {row(<PinIcon size={44} color={PNK} />, "Meter-level", <span style={{ display: "flex", alignItems: "center", gap: 10, color: PNK, fontSize: 28 }}><CrossIcon size={34} /> zaroorat nahi</span>, r1)}
      {row(<PinIcon size={44} color={C.green} />, "Kuch kilometre", <span style={{ display: "flex", alignItems: "center", gap: 10, color: C.green, fontSize: 28 }}><CheckIcon size={34} /> kaafi</span>, r2)}
    </Card>
  );
};

export const ServingCard: React.FC<{ t: number }> = ({ t }) => {
  const tiles = pop(t, 37.0);
  const tile = (label: string, ok: boolean) => (
    <div style={{ flex: 1, padding: "16px 10px", borderRadius: 18, background: ok ? "rgba(46,204,113,0.18)" : "rgba(255,77,77,0.15)", border: `2px solid ${ok ? C.green : C.red}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {ok ? <CheckIcon size={36} /> : <CrossIcon size={36} />}
      <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>{label}</span>
    </div>
  );
  return (
    <Card width={640}>
      <Label>PHONE · SERVING TOWER</Label>
      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
        <GChip color={PNK} size={40} icon={<TowerIcon size={44} color={PNK} />}>
          ID 21425
        </GChip>
      </div>
      <div style={{ display: "flex", gap: 14, ...popStyle(tiles) }}>
        {tile("INTERNET", false)}
        {tile("GPS", false)}
        {tile("TOWER ID", true)}
      </div>
    </Card>
  );
};

const LOG_ROWS = [
  ["23.198°N, 88.035°E", "21385"],
  ["23.206°N, 88.012°E", "21385"],
  ["23.215°N, 87.990°E", "21401"],
  ["23.223°N, 87.968°E", "21401"],
  ["23.231°N, 87.945°E", "21417"],
  ["23.238°N, 87.921°E", "21417"],
];

export const LoggerCard: React.FC<{ t: number }> = ({ t }) => (
  <Card width={860}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
      <Label color={YEL}>LOGGER APP · DOSTON KE PHONES</Label>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
      <Label>GPS LOCATION</Label>
      <Label>TOWER ID</Label>
    </div>
    {LOG_ROWS.map(([g, id], i) => {
      const s = pop(t, 42.2 + i * 0.35);
      return (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            marginTop: 8,
            borderRadius: 14,
            background: "rgba(255,255,255,0.07)",
            fontSize: 30,
            fontWeight: 700,
            opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
            translate: `${(1 - s) * 40}px 0px`,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PinIcon size={30} color="#60A5FA" />
            {g}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: i < 2 ? "#60A5FA" : i < 4 ? YEL : PNK }}>
            <TowerIcon size={30} color={i < 2 ? "#60A5FA" : i < 4 ? YEL : PNK} />
            {id}
          </span>
        </div>
      );
    })}
  </Card>
);

export const SizeCard: React.FC<{ t: number }> = ({ t }) => {
  const p = interpolate(t, [53.8, 55.2], [0, 100], clamp);
  return (
    <Card width={720}>
      <Label color={YEL}>INDIA RAIL ROUTES · TOWER MAP</Label>
      <div style={{ fontSize: 150, fontWeight: 800, color: YEL, lineHeight: 1.1, margin: "14px 0" }}>7–8 MB</div>
      <div style={{ height: 16, borderRadius: 8, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: "#2DD4BF" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <Label>PHONE MEIN OFFLINE</Label>
        <Label color={p >= 100 ? C.green : "rgba(255,255,255,0.65)"}>{p >= 100 ? "SAVED ✓" : `${Math.round(p)}%`}</Label>
      </div>
    </Card>
  );
};

const TT = [
  ["HOWRAH JN", "20:00"],
  ["BANDEL JN", "20:42"],
  ["MEMARI", "21:18"],
  ["BARDHAMAN JN", "21:40"],
];

export const TimetableCard: React.FC<{ t: number }> = ({ t }) => (
  <Card width={720}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Label color={YEL}>TIMETABLE</Label>
      <GChip color={C.green} size={20}>
        OFFLINE SAVED
      </GChip>
    </div>
    {TT.map(([n, time], i) => {
      const s = pop(t, 71.6 + i * 0.3);
      const last = i === TT.length - 1;
      return (
        <div
          key={n}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 18px",
            marginTop: 6,
            borderRadius: 14,
            fontSize: 34,
            fontWeight: 700,
            background: last ? "rgba(255,201,60,0.22)" : "transparent",
            border: last ? `2px solid ${YEL}` : "2px solid transparent",
            opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
          }}
        >
          <span>{n}</span>
          <span style={{ color: last ? YEL : "rgba(255,255,255,0.75)" }}>{time}</span>
        </div>
      );
    })}
  </Card>
);

export const Avatars: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
    <div style={{ display: "flex", gap: 18 }}>
      {[YEL, PNK, "#60A5FA", C.green, "#C084FC"].map((c, i) => {
        const s = pop(t, 83.6 + i * 0.12);
        return (
          <div key={i} style={{ width: 110, height: 110, borderRadius: 55, background: GLASS, border: `5px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", ...popStyle(s) }}>
            <svg width={60} height={60} viewBox="0 0 60 60">
              <circle cx={30} cy={22} r={12} fill="#fff" />
              <path d="M8 56 C 10 38, 50 38, 52 56 Z" fill="#fff" />
            </svg>
          </div>
        );
      })}
    </div>
    <GChip color={YEL} size={30} icon={<TrainGlyph size={30} color={YEL} />}>
      Where is my Train
    </GChip>
  </div>
);

export const MapsCard: React.FC<{ t: number }> = ({ t }) => {
  const p = interpolate(t, [88.2, 89.6], [0, 1], clamp);
  return (
    <Card width={720}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>Maps</div>
          <Label>LIVE TRAIN STATUS</Label>
        </div>
        <Label color={YEL}>BARDHAMAN</Label>
      </div>
      <svg width={648} height={330} viewBox="0 0 648 330" style={{ marginTop: 12, borderRadius: 20, background: "#1d3557" }}>
        <path d="M0 210 C 150 140, 260 260, 420 170 S 600 120, 648 90" stroke="#3b6ea5" strokeWidth={34} fill="none" opacity={0.6} />
        <rect x={80} y={40} width={120} height={70} rx={10} fill="#2a9d8f" opacity={0.35} />
        <rect x={420} y={230} width={150} height={70} rx={10} fill="#2a9d8f" opacity={0.35} />
        <path d="M40 290 C 180 260, 300 200, 420 150 S 560 70, 600 50" stroke="#60A5FA" strokeWidth={10} fill="none" strokeDasharray="900" strokeDashoffset={900 * (1 - p)} strokeLinecap="round" />
        <circle cx={40} cy={290} r={14} fill="#fff" />
        <circle cx={600} cy={50} r={22} fill={YEL} stroke={C.ink} strokeWidth={5} />
        <text x={60} y={320} fontFamily={FONT} fontWeight={800} fontSize={22} fill="#fff">HOWRAH</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16, ...popStyle(pop(t, 89.0)) }}>
        <GChip color={C.green} size={24}>
          ISI APP KE SAATH BANA · 2019
        </GChip>
      </div>
    </Card>
  );
};

export const CommentCard: React.FC<{ t: number }> = ({ t }) => {
  const full = "Meri sabse lambi journey: ";
  const typed = full.slice(0, Math.max(0, Math.floor((t - 99.2) * 18)));
  const ans = t > 100.8 ? "__ ghante!" : "";
  return (
    <Card width={840}>
      <Label color={YEL}>COMMENT</Label>
      <div style={{ fontSize: 44, fontWeight: 700, marginTop: 14, minHeight: 120, lineHeight: 1.35 }}>
        {typed}
        <span style={{ color: YEL }}>{ans}</span>
        <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: "#60A5FA" }}>|</span>
      </div>
    </Card>
  );
};

export const FollowCard: React.FC<{ t: number }> = ({ t }) => {
  const pressed = t > 103.6;
  return (
    <Card width={960} style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <div style={{ flexShrink: 0, width: 96, height: 96, borderRadius: 48, background: "#1F6FB8", border: `4px solid ${YEL}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TrainGlyph size={56} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 36, fontWeight: 800, whiteSpace: "nowrap" }}>
          Mindset_Mode <span style={{ color: YEL }}>| Explainers</span>
        </div>
        <Label>DAILY TECH · HINGLISH MEIN</Label>
      </div>
      <div
        style={{
          padding: "16px 34px",
          borderRadius: 999,
          background: pressed ? "transparent" : YEL,
          border: `3px solid ${YEL}`,
          color: pressed ? YEL : C.ink,
          fontSize: 32,
          fontWeight: 800,
          whiteSpace: "nowrap",
          scale: pressed ? 1 : 1 + Math.max(0, Math.sin(t * 8)) * 0.05,
        }}
      >
        {pressed ? "Following ✓" : "Follow"}
      </div>
    </Card>
  );
};
