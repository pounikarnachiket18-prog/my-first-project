import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F, L, UI } from "./theme";

export const ip = (f: number, i: [number, number], o: [number, number], ease = Easing.inOut(Easing.cubic)) =>
  interpolate(f, i, o, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Tail-lamp blink: ~1.25 flashes per second */
export const blink = (frame: number) => {
  const ph = frame % 24;
  if (ph < 3) return ph / 3;
  if (ph < 10) return 1;
  if (ph < 13) return 1 - (ph - 10) / 3;
  return 0;
};

/** Render "plain **highlight** plain" with highlighted runs */
const Rich: React.FC<{ text: string; hi: string }> = ({ text, hi }) => (
  <>
    {text.split("**").map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} style={{ color: hi }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

export const Title: React.FC<{ text: string; from?: number; to?: number; dark?: boolean; hi?: string; top?: number }> = ({
  text,
  from = 0,
  to = 99999,
  dark,
  hi = L.maroon,
  top = 220,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sIn = spring({ frame: f - from, fps, config: { damping: 16, stiffness: 140 } });
  const out = ip(f, [to - 10, to], [1, 0]);
  if (f < from || f > to) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          width: 940,
          textAlign: "center",
          fontFamily: F.ui,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          whiteSpace: "pre-line",
          color: dark ? "#fff" : UI.ink,
          opacity: sIn * out,
          transform: `translateY(${(1 - sIn) * 40}px) scale(${0.94 + sIn * 0.06})`,
          textShadow: dark ? "0 4px 24px rgba(0,0,0,0.6)" : "0 2px 18px rgba(255,255,255,0.8)",
        }}
      >
        <Rich text={text} hi={hi} />
      </div>
    </AbsoluteFill>
  );
};

type ChipKind = "blue" | "green" | "red" | "white";
const CHIP: Record<ChipKind, { bg: string; fg: string }> = {
  blue: { bg: UI.blue, fg: "#fff" },
  green: { bg: "#E6F4EC", fg: UI.green },
  red: { bg: "#FBE7EA", fg: UI.red },
  white: { bg: "#fff", fg: UI.ink },
};

export const Chip: React.FC<{ text: string; x: number; y: number; from: number; to: number; kind?: ChipKind }> = ({
  text,
  x,
  y,
  from,
  to,
  kind = "blue",
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps, config: { damping: 12, stiffness: 180 } });
  const out = ip(f, [to - 8, to], [1, 0]);
  const c = CHIP[kind];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: out,
        background: c.bg,
        color: c.fg,
        fontFamily: F.ui,
        fontWeight: 700,
        fontSize: 44,
        padding: "14px 34px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
      }}
    >
      {text}
    </div>
  );
};

/** Hinglish caption strip (the narration, since the video has no voiceover) */
export const Captions: React.FC<{ lines: { from: number; to: number; text: string }[]; y?: number }> = ({ lines, y = 1440 }) => {
  const f = useCurrentFrame();
  const line = lines.find((l) => f >= l.from && f < l.to);
  if (!line) return null;
  const a = ip(f, [line.from, line.from + 8], [0, 1]) * ip(f, [line.to - 6, line.to], [1, 0]);
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          maxWidth: 940,
          padding: "22px 36px",
          borderRadius: 28,
          background: "rgba(14,15,20,0.78)",
          color: "#fff",
          fontFamily: F.ui,
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.28,
          textAlign: "center",
          opacity: a,
          transform: `translateY(${(1 - a) * 18}px)`,
        }}
      >
        <Rich text={line.text} hi={UI.yellow} />
      </div>
    </AbsoluteFill>
  );
};

export const EndCard: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from) return null;
  const bg = ip(f, [from, from + 14], [0, 1]);
  const s1 = spring({ frame: f - from - 6, fps, config: { damping: 14, stiffness: 140 } });
  const s2 = spring({ frame: f - from - 14, fps, config: { damping: 14, stiffness: 140 } });
  const bar = ip(f, [from + 10, from + 30], [0, 1]);
  return (
    <AbsoluteFill style={{ background: `rgba(122,27,42,${0.94 * bg})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 150, height: 150, marginBottom: 50, transform: `scale(${s1})` }}>
        {[45, -45].map((r) => (
          <div
            key={r}
            style={{
              position: "absolute",
              left: 55,
              top: -10,
              width: 40,
              height: 170,
              background: UI.yellow,
              transform: `rotate(${r}deg)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: F.ui,
          fontWeight: 800,
          fontSize: 104,
          color: "#fff",
          letterSpacing: -2,
          opacity: s1,
          transform: `translateY(${(1 - s1) * 30}px)`,
        }}
      >
        Mindset Mode
      </div>
      <div style={{ width: 520 * bar, height: 8, background: UI.yellow, borderRadius: 4, margin: "18px 0 26px" }} />
      <div
        style={{
          fontFamily: F.ui,
          fontWeight: 600,
          fontSize: 58,
          letterSpacing: 14,
          color: L.cream,
          opacity: s2,
          transform: `translateY(${(1 - s2) * 30}px)`,
        }}
      >
        EXPLAINERS
      </div>
    </AbsoluteFill>
  );
};
