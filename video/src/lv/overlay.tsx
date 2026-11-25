import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { F, L, LOGO, UI } from "./theme";

/** Per-scene time scale: scenes were authored on a longer timeline and are played faster to fit the VO */
export const ScaleCtx = createContext(1);
export const useF = () => useCurrentFrame() * useContext(ScaleCtx);

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

export const Title: React.FC<{ text: string; from?: number; to?: number; dark?: boolean; hi?: string; top?: number; plate?: boolean }> = ({
  text,
  from = 0,
  to = 99999,
  dark,
  hi = L.maroon,
  top = 220,
  plate,
}) => {
  const f = useF();
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
          textShadow: plate ? "none" : dark ? "0 4px 24px rgba(0,0,0,0.6)" : "0 2px 18px rgba(255,255,255,0.8)",
          ...(plate
            ? { width: "max-content", maxWidth: 940, left: "50%", translate: "-50% 0", background: "rgba(255,255,255,0.94)", padding: "18px 40px", borderRadius: 28, boxShadow: "0 12px 34px rgba(0,0,0,0.2)" }
            : {}),
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
  const f = useF();
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
  const f = useF();
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

/** End card: the Just KnowIt logo on its own red, brain pops in, wordmark slides up */
export const EndCard: React.FC<{ from: number }> = ({ from }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  if (f < from) return null;
  const bg = ip(f, [from, from + 10], [0, 1]);
  const s1 = spring({ frame: f - from - 4, fps, config: { damping: 11, stiffness: 160 } });
  const s2 = spring({ frame: f - from - 12, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ background: LOGO.red, opacity: bg, alignItems: "center", justifyContent: "center" }}>
      <Img src={staticFile(LOGO.brain)} style={{ height: 300, transform: `scale(${s1})`, marginBottom: 70 }} />
      <Img
        src={staticFile(LOGO.text)}
        style={{ width: 900, opacity: Math.min(1, s2), transform: `translateY(${(1 - s2) * 60}px)` }}
      />
    </AbsoluteFill>
  );
};

/* ---------------- motion-graphic callouts ---------------- */

type P3 = [number, number, number];
export type Cam = { pos: P3; look: P3; fov?: number; zoom?: number };

/** Project a world point to screen pixels for a camera set up like <CameraRig/> */
export const project = (p: P3, cam: Cam, W = 1080, H = 1920) => {
  const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a: P3): P3 => {
    const l = Math.hypot(...a);
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const f = norm(sub(cam.look, cam.pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const v = sub(p, cam.pos);
  const xc = dot(v, r);
  const yc = dot(v, u);
  const zc = dot(v, f);
  if (cam.zoom !== undefined) return { x: W / 2 + xc * cam.zoom, y: H / 2 - yc * cam.zoom };
  const t = Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  return { x: ((xc / (zc * t * (W / H)) + 1) / 2) * W, y: ((1 - yc / (zc * t)) / 2) * H };
};

/**
 * Callout: pulsing dot on the object, a leader line that draws itself,
 * then a label card that wipes in. `side` = which way the card extends from (lx, ly).
 */
export const Callout: React.FC<{
  a: { x: number; y: number };
  lx: number;
  ly: number;
  text: string;
  sub?: string;
  from: number;
  to?: number;
  side?: "left" | "right";
  color?: string;
  dark?: boolean;
}> = ({ a, lx, ly, text, sub, from, to = 99999, side = "right", color = UI.blue, dark }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const t = f - from;
  const out = ip(f, [to - 8, to], [1, 0]);
  const dotS = spring({ frame: t, fps, config: { damping: 11, stiffness: 220 } });
  const ex = lx + (side === "right" ? -46 : 46);
  const seg1 = Math.hypot(ex - a.x, ly - a.y);
  const seg2 = 46;
  const len = seg1 + seg2;
  const draw = ip(t, [4, 18], [0, 1], Easing.out(Easing.cubic));
  const card = spring({ frame: t - 14, fps, config: { damping: 16, stiffness: 160 } });
  const pulse = (t % 40) / 40;
  const fg = dark ? "#fff" : UI.ink;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: out }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={a.x} cy={a.y} r={14 + pulse * 30} fill="none" stroke={color} strokeWidth={4} opacity={(1 - pulse) * 0.7 * dotS} />
        <polyline
          points={`${a.x},${a.y} ${ex},${ly} ${lx},${ly}`}
          fill="none"
          stroke={dark ? "#fff" : color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - draw)}
        />
        <circle cx={a.x} cy={a.y} r={12 * dotS} fill="#fff" stroke={color} strokeWidth={6} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: lx,
          top: ly,
          transform: `translate(${side === "right" ? 0 : -100}%, -50%)`,
          clipPath: side === "right" ? `inset(0 ${(1 - Math.min(1, card)) * 100}% 0 0)` : `inset(0 0 0 ${(1 - Math.min(1, card)) * 100}%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            background: dark ? "rgba(20,21,26,0.88)" : "#fff",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 12px 34px rgba(0,0,0,0.25)",
            fontFamily: F.ui,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ width: 12, background: color }} />
          <div style={{ padding: "14px 26px 14px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 42, color: fg, lineHeight: 1.1 }}>{text}</div>
            {sub && <div style={{ fontWeight: 600, fontSize: 30, color, marginTop: 4, filter: dark ? "brightness(1.6)" : undefined }}>{sub}</div>}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
