import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../theme";
import { TrainGlyph } from "../ui";

/**
 * Night reel + Sapna Express character layer.
 * The base video (purple/lime, new voice, no watermark) lives in public/night/base.mp4.
 * Audio (voice + train sounds) is mixed separately with build-audio.sh and muxed after render.
 */

export const NIGHT_FPS = 30;
export const NIGHT_FRAMES = 3160; // 105.33 s

const LIME = "#B5F23D";
const GLASS = "rgba(28,10,48,0.78)";
const s = (sec: number) => Math.round(sec * NIGHT_FPS);

// Sapna's current "mode", following the story beats of the reel
const MODES: { from: number; label: string; color: string }[] = [
  { from: 0, label: "DATA OFF", color: "#FF6B6B" },
  { from: 13.5, label: "GPS SAVER", color: "#FFB547" },
  { from: 21.5, label: "TOWER MODE", color: LIME },
  { from: 36, label: "CROWD MAP", color: "#60A5FA" },
  { from: 55.5, label: "TRACK LOCK", color: LIME },
  { from: 69.5, label: "OFFLINE TIMETABLE", color: "#F472B6" },
  { from: 78, label: "USI TRAIN MEIN", color: LIME },
  { from: 81.5, label: "HISTORY MODE", color: "#C4B5FD" },
  { from: 91.5, label: "DATA OFF · LOCATION ON", color: LIME },
  { from: 97.5, label: "COMMENT MODE", color: "#FFB547" },
];

// Sapna's first-person explainer lines, timed to empty parts of the frame
const LINES: { from: number; to: number; text: React.ReactNode }[] = [
  { from: 5, to: 8.6, text: <>Data khatam? Tension nahi. <b style={{ color: LIME }}>Main phir bhi bataungi</b> main kahan hoon!</> },
  { from: 14.6, to: 19.6, text: <>GPS on = battery gayi. Mujhe meter nahi, <b style={{ color: LIME }}>kilometre wali location</b> kaafi hai.</> },
  { from: 33.2, to: 36.6, text: <>Har tower ki <b style={{ color: LIME }}>fixed ID</b> hai. Main jahan se guzarti hoon, phone woh ID padhta hai.</> },
  { from: 46, to: 49.6, text: <>Logon ke safar mein <b style={{ color: LIME }}>GPS + Tower ID</b> dono record hue...</> },
  { from: 50, to: 53.6, text: <>...aur ban gaya <b style={{ color: LIME }}>poore India ka tower map!</b></> },
  { from: 55.8, to: 59.4, text: <>Main sirf <b style={{ color: LIME }}>track pe</b> chalti hoon. Tower area + track = meri location!</> },
  { from: 71, to: 76.5, text: <>Mera <b style={{ color: LIME }}>timetable offline</b> saved hai. Late kitni, woh bhi pata!</> },
  { from: 92, to: 97, text: <>Network gaya? Koi baat nahi. <b style={{ color: LIME }}>Main phir bhi mil jaungi!</b></> },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const inOut = (frame: number, a: number, b: number, len = 9) =>
  interpolate(frame, [a, a + len, b - len, b], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });

/** Top-right: name plate + live mode. Sits where the old watermark was. */
const ModeHud: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / NIGHT_FPS;
  const idx = MODES.reduce((acc, m, i) => (t >= m.from ? i : acc), 0);
  const mode = MODES[idx];
  const flip = spring({ frame: frame - s(mode.from), fps, config: { damping: 13 } });
  const enter = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 92,
        right: 40,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px 10px 10px",
        borderRadius: 999,
        background: GLASS,
        border: "1.5px solid rgba(255,255,255,0.18)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        fontFamily: FONT,
        color: "#fff",
        opacity: enter,
        translate: `${(1 - enter) * 60}px 0px`,
      }}
    >
      <div style={{ width: 58, height: 58, borderRadius: 29, background: LIME, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TrainGlyph size={36} color="#1c0a30" />
      </div>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.5 }}>SAPNA EXPRESS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 700, letterSpacing: 1.2 }}>
          <span style={{ opacity: 0.7 }}>MODE</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: mode.color,
              rotate: `x ${interpolate(flip, [0, 1], [90, 0])}deg`,
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 5, background: mode.color, opacity: 0.6 + Math.sin(frame / 5) * 0.4 }} />
            {mode.label}
          </span>
        </div>
      </div>
    </div>
  );
};

/** Opening character card: name, mindset, mode, route. */
const CharacterCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vis = inOut(frame, s(0.3), s(4.4), 10);
  const row = (i: number) => spring({ frame: frame - s(0.5) - i * 5, fps, config: { damping: 15 } });
  const rows: [string, string][] = [
    ["MINDSET", "Network jaaye, main lost nahi hoti"],
    ["MODE", "Offline tracking"],
    ["ROUTE", "Howrah → Bardhaman"],
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1395,
        padding: "26px 32px",
        borderRadius: 34,
        background: GLASS,
        border: `2px solid ${LIME}`,
        boxShadow: `0 0 40px rgba(181,242,61,0.25), 0 20px 50px rgba(0,0,0,0.45)`,
        fontFamily: FONT,
        color: "#fff",
        opacity: vis,
        scale: interpolate(vis, [0, 1], [0.92, 1]),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, background: LIME, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrainGlyph size={40} color="#1c0a30" />
        </div>
        <div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>Sapna Express</div>
          <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.7, letterSpacing: 2, marginTop: 6 }}>TRAIN NO. 12345 · NARRATOR</div>
        </div>
      </div>
      {rows.map(([k, v], i) => (
        <div
          key={k}
          style={{
            display: "flex",
            gap: 16,
            alignItems: "baseline",
            fontSize: 28,
            marginTop: 8,
            opacity: row(i),
            translate: `${(1 - row(i)) * 30}px 0px`,
          }}
        >
          <span style={{ width: 130, fontSize: 20, fontWeight: 800, letterSpacing: 2, color: LIME }}>{k}</span>
          <span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
};

/** Sapna's speech bubble with a short explainer line. */
const Explainer: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  const v = inOut(frame, s(from), s(to), 8);
  if (v <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1430,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        opacity: v,
        translate: `0px ${(1 - v) * 30}px`,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 66,
          height: 66,
          borderRadius: 33,
          background: LIME,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 24px rgba(181,242,61,0.45)",
        }}
      >
        <TrainGlyph size={40} color="#1c0a30" />
      </div>
      <div
        style={{
          padding: "18px 26px",
          borderRadius: "8px 30px 30px 30px",
          background: GLASS,
          border: "1.5px solid rgba(255,255,255,0.18)",
          boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
          fontFamily: FONT,
          color: "#fff",
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: LIME, marginBottom: 4 }}>SAPNA EXPRESS</div>
        {children}
      </div>
    </div>
  );
};

export const NightReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo src={staticFile("night/base.mp4")} muted style={{ width: 1080, height: 1920 }} />
    <ModeHud />
    <CharacterCard />
    {LINES.map((l, i) => (
      <Explainer key={i} from={l.from} to={l.to}>
        {l.text}
      </Explainer>
    ))}
  </AbsoluteFill>
);
