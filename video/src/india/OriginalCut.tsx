import React from "react";
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Highway } from "./Highway";
import { DhabaWrap, FightWrap, oncoming, TR_CAM, TR_HONKS, TR_SIDE, TR_VEH } from "./IndiaReel";
import { Caption, Chip, Grade, Vignette } from "./Overlay";
import { DUSK, F, SIGN_GREEN } from "./theme";
import tracking from "./tracking.json";

// Hybrid cut: the user's original reel (colour-graded, voice removed) with Indian
// overlays tracked onto it, plus animated Indian-road inserts cut in between.
// Source is 720x1280; we render at 1080x1920, so source px * 1.5.
const K = 1.5;

type Seg = { kind: "orig"; from: number; to: number } | { kind: "insert"; id: "dhaba" | "plates" | "fight"; dur: number };

const PLAN: Seg[] = [
  { kind: "orig", from: 0, to: 591 }, // …"pulled over for chai."
  { kind: "insert", id: "dhaba", dur: 150 },
  { kind: "orig", from: 591, to: 832 }, // hundreds of phones … "that's a jam."
  { kind: "insert", id: "plates", dur: 120 },
  { kind: "insert", id: "fight", dur: 270 },
  { kind: "orig", from: 832, to: 1549 }, // road turns red … end
];

export const CUT_FRAMES = PLAN.reduce((n, s) => n + (s.kind === "orig" ? s.to - s.from : s.dur), 0);

const SIGN = tracking.sign as unknown as Record<string, [number, number, number, number]>;
const CARD5 = tracking.card5 as unknown as Record<string, [number, number]>;

const nearest = <T,>(table: Record<string, T>, f: number, span = 3): T | null => {
  for (let d = 0; d <= span; d++) {
    if (table[f - d]) return table[f - d];
    if (table[f + d]) return table[f + d];
  }
  return null;
};

// --- replaces the US "EXIT 21 · Diner · Coffee" gantry sign
const NHSignPatch: React.FC<{ src: number }> = ({ src }) => {
  const b = nearest(SIGN, src);
  if (!b) return null;
  const pad = 2.5;
  const x = (b[0] - pad) * K;
  const y = (b[1] - pad) * K;
  const w = (b[2] + pad * 2) * K;
  const h = (b[3] + pad * 2) * K;
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={w} height={h}>
      <rect x={0} y={0} width={w} height={h} rx={h * 0.1} fill={SIGN_GREEN} stroke="#E9F2EC" strokeWidth={h * 0.05} />
      <text x={w * 0.06} y={h * 0.44} fontFamily={F.ui} fontWeight={800} fontSize={h * 0.3} fill="#FFF" textLength={w * 0.7} lengthAdjust="spacingAndGlyphs">
        NH 48 · Lonavala
      </text>
      <text x={w * 0.06} y={h * 0.8} fontFamily={F.ui} fontWeight={700} fontSize={h * 0.24} fill="#E6F0E8" textLength={w * 0.7} lengthAdjust="spacingAndGlyphs">
        Pune 64 km · Dhaba
      </text>
      <path
        d={`M ${w * 0.84} ${h * 0.74} L ${w * 0.93} ${h * 0.3} M ${w * 0.86} ${h * 0.32} L ${w * 0.93} ${h * 0.3} L ${w * 0.94} ${h * 0.46}`}
        stroke="#FFF"
        strokeWidth={h * 0.07}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

// --- replaces the "5 mph · ONE PHONE" callout on the yellow car
const PlateCardPatch: React.FC<{ src: number }> = ({ src }) => {
  const p = CARD5[src] ?? nearest(CARD5, src, 2);
  if (!p) return null;
  const o = interpolate(src, [461, 464, 574, 577], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: (p[0] + 1) * K,
        top: (p[1] + 1) * K,
        width: 215 * K,
        height: 82 * K,
        background: "#14161F",
        border: "2px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        opacity: o,
        padding: "10px 14px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 46, color: "#FFF", lineHeight: 1 }}>
        8 <span style={{ fontSize: 28 }}>km/h</span>
      </div>
      <div
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "#FFF",
          borderRadius: 4,
          padding: "2px 7px 2px 3px",
          fontFamily: F.ui,
          fontWeight: 900,
          fontSize: 19,
          color: "#111",
        }}
      >
        <span style={{ background: "#1A3E9A", color: "#FFF", fontSize: 10, padding: "2px 3px", borderRadius: 2 }}>IND</span>
        MH 12 KT 4581
      </div>
    </div>
  );
};

// --- replaces the "65 → 15 mph · AVG SPEED" card
const SpeedCardPatch: React.FC<{ src: number }> = ({ src }) => {
  if (src < 686 || src > 821) return null;
  const v = Math.round(interpolate(src, [717, 742], [105, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bar = v > 60 ? "#3DDC97" : v > 35 ? "#FF9933" : "#FF3B30";
  const o = interpolate(src, [686, 689, 818, 821], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 36 * K,
        top: 766 * K,
        width: 294 * K,
        height: 114 * K,
        background: "#14161F",
        borderLeft: `8px solid ${bar}`,
        opacity: o,
        padding: "14px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 88, color: "#FFF", lineHeight: 1 }}>
        {v} <span style={{ fontSize: 34 }}>km/h</span>
      </div>
      <div style={{ marginTop: 10, fontFamily: F.ui, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: "rgba(255,255,255,0.65)" }}>
        AVG SPEED · NH 48, PUNE
      </div>
    </div>
  );
};

// --- caption swaps: coffee → chai, mph numbers → km/h numbers
const CAPTION_SWAPS: { from: number; to: number; text: React.ReactNode }[] = [
  { from: 557, to: 590, text: <>over for&nbsp;<span style={{ color: "#FF9933" }}>chai.</span></> },
  { from: 693, to: 738, text: <>drop from&nbsp;<span style={{ color: "#3DDC97" }}>105</span>&nbsp;to</> },
  { from: 739, to: 774, text: <><span style={{ color: "#FF3B30" }}>24</span>&nbsp;at the same</> },
];

const CaptionPatch: React.FC<{ src: number }> = ({ src }) => {
  const c = CAPTION_SWAPS.find((x) => src >= x.from && src <= x.to);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", top: 958 * K, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          minWidth: 310 * K,
          height: 68 * K,
          padding: "0 24px",
          background: "#141826",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.ui,
          fontWeight: 800,
          fontSize: 50,
          color: "#FFF",
        }}
      >
        {c.text}
      </div>
    </div>
  );
};

const OrigSegment: React.FC<{ from: number }> = ({ from }) => {
  const local = useCurrentFrame();
  const src = local + from;
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("original-graded.mp4")} trimBefore={from} muted style={{ width: "100%", height: "100%" }} />
      <NHSignPatch src={src} />
      <PlateCardPatch src={src} />
      <SpeedCardPatch src={src} />
      <CaptionPatch src={src} />
      {src < 110 && (
        <div
          style={{
            position: "absolute",
            top: 440,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(src, [0, 6, 98, 110], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            fontFamily: F.ui,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: 5,
            color: "#FFE08A",
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          MUMBAI–PUNE EXPRESSWAY · NH 48
        </div>
      )}
    </AbsoluteFill>
  );
};

const Header: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 24,
      left: 24,
      right: 24,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "ui-monospace, monospace",
      fontSize: 15,
      letterSpacing: 3,
      color: "rgba(255,255,255,0.45)",
    }}
  >
    <span>HOW IT SECRETLY WORKS · #18</span>
    <span>ILLUSTRATIVE</span>
  </div>
);

const PlatesInsert: React.FC = () => (
  <AbsoluteFill>
    <Highway palette={DUSK} cam={TR_CAM} vehicles={TR_VEH} oncoming={oncoming("tro", 12, 140)} roadside={TR_SIDE} honks={TR_HONKS} frameOffset={10} />
    <Chip text="BUMPER TO BUMPER · NH 48" from={2} />
    <Caption text="MH, GJ, KA… sab ek hi jam mein." from={6} to={118} highlight={["jam"]} />
  </AbsoluteFill>
);

const Insert: React.FC<{ id: "dhaba" | "plates" | "fight"; dur: number }> = ({ id, dur }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 5, dur - 4, dur], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: o, background: "#000" }}>
      {id === "dhaba" && <DhabaWrap />}
      {id === "plates" && <PlatesInsert />}
      {id === "fight" && <FightWrap />}
      <Grade />
      <Vignette strength={0.45} />
      <Header />
    </AbsoluteFill>
  );
};

export const OriginalCut: React.FC = () => {
  let t = 0;
  const seqs = PLAN.map((s, i) => {
    const dur = s.kind === "orig" ? s.to - s.from : s.dur;
    const start = t;
    t += dur;
    return (
      <Sequence key={i} from={start} durationInFrames={dur}>
        {s.kind === "orig" ? <OrigSegment from={s.from} /> : <Insert id={s.id} dur={s.dur} />}
      </Sequence>
    );
  });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {seqs}
      <Audio
        src={staticFile("indian-traffic.mp3")}
        volume={(f) => interpolate(f, [0, 10, CUT_FRAMES - 45, CUT_FRAMES], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
