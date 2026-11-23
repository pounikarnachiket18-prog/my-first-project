/**
 * Motion-graphics building blocks layered over the original reel.
 * All coordinates are for a 1080x1920 frame; times are in frames
 * relative to the enclosing <Sequence>.
 */
import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../rail/theme";

export const K = {
  brand: "#A3192E", // maroon (matches the recoloured reel)
  yellow: "#FFD23F",
  red: "#FF3B4E",
  green: "#1DB954",
  ink: "#15171C",
  white: "#FFFFFF",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Pop-in / pop-out envelope (0..1) for an element living `dur` frames. */
const usePop = (dur: number, delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 190 } });
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return { p: inP * out, frame, raw: inP };
};

/* ------------------------------------------------------------------ */
/* Sticker: tilted, white-bordered card with emoji + bold text         */
/* ------------------------------------------------------------------ */
export const Sticker: React.FC<{
  text: string;
  emoji?: string;
  x: number;
  y: number;
  dur: number;
  tilt?: number;
  bg?: string;
  color?: string;
  size?: number;
  delay?: number;
}> = ({ text, emoji, x, y, dur, tilt = -6, bg = K.yellow, color = K.ink, size = 56, delay = 0 }) => {
  const { p, frame } = usePop(dur, delay);
  const wiggle = Math.sin((frame - delay) / 5) * 1.6;
  if (frame < delay) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${p}) rotate(${tilt + wiggle}deg)`,
        background: bg,
        color,
        border: "7px solid #FFFFFF",
        borderRadius: 30,
        padding: `${size * 0.22}px ${size * 0.5}px`,
        fontFamily: FONT.title,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        whiteSpace: "nowrap",
        boxShadow: "0 14px 0 rgba(0,0,0,0.18), 0 24px 50px rgba(20,30,60,0.35)",
        display: "flex",
        alignItems: "center",
        gap: size * 0.25,
      }}
    >
      {emoji && <span style={{ fontSize: size * 1.1 }}>{emoji}</span>}
      <span>{text}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Stamp: slams down from big, with a shake                            */
/* ------------------------------------------------------------------ */
export const Stamp: React.FC<{ text: string; x: number; y: number; dur: number; color?: string; tilt?: number; size?: number }> = ({
  text,
  x,
  y,
  dur,
  color = K.green,
  tilt = -12,
  size = 70,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, stiffness: 260 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  const shake = frame > 3 && frame < 12 ? Math.sin(frame * 3) * (12 - frame) * 0.8 : 0;
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x + shake,
        top: y,
        transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${scale})`,
        opacity: Math.min(1, slam * 1.4) * out,
        color,
        border: `9px solid ${color}`,
        borderRadius: 22,
        padding: "10px 34px",
        fontFamily: FONT.title,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 3,
        background: "rgba(255,255,255,0.88)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sparkles: twinkling 4-point stars around a point                    */
/* ------------------------------------------------------------------ */
export const Sparkles: React.FC<{ cx: number; cy: number; r: number; dur: number; n?: number; color?: string }> = ({
  cx,
  cy,
  r,
  dur,
  n = 9,
  color = K.yellow,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8, dur - 10, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = random(`a${i}`) * Math.PI * 2;
        const d = r * (0.6 + random(`d${i}`) * 0.5);
        const ph = random(`p${i}`) * 30;
        const tw = Math.max(0, Math.sin((frame + ph) / 6));
        const sz = 26 + random(`s${i}`) * 34;
        return (
          <svg
            key={i}
            width={sz}
            height={sz}
            viewBox="-10 -10 20 20"
            style={{
              position: "absolute",
              left: cx + Math.cos(a) * d - sz / 2,
              top: cy + Math.sin(a) * d - sz / 2,
              transform: `scale(${0.3 + tw}) rotate(${frame * 3 + i * 20}deg)`,
              filter: "drop-shadow(0 0 8px rgba(255,220,80,0.9))",
            }}
          >
            <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill={i % 3 === 0 ? "#FFFFFF" : color} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Bubbles: soap bubbles drifting up over the laundry                  */
/* ------------------------------------------------------------------ */
export const Bubbles: React.FC<{ dur: number; n?: number; top?: number; bottom?: number }> = ({ dur, n = 26, top = 500, bottom = 1500 }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 10, dur - 12, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 3 + random(`v${i}`) * 4;
        const span = bottom - top;
        const y = bottom - ((frame * speed + random(`y${i}`) * span) % span);
        const x = 60 + random(`x${i}`) * 960 + Math.sin((frame + i * 10) / 12) * 20;
        const sz = 30 + random(`r${i}`) * 70;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: sz,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.95)",
              background:
                "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.95) 0 12%, rgba(180,215,255,0.35) 13% 55%, rgba(120,170,255,0.15) 56%)",
              boxShadow: "0 0 18px rgba(140,190,255,0.6)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Question marks popping one after another                            */
/* ------------------------------------------------------------------ */
export const QuestionMarks: React.FC<{ dur: number; spots: [number, number, number][] }> = ({ dur, spots }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {spots.map(([x, y, rot], i) => {
        const p = spring({ frame: frame - i * 6, fps, config: { damping: 8, stiffness: 220 } });
        const bob = Math.sin((frame + i * 9) / 7) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + bob,
              transform: `translate(-50%,-50%) scale(${p}) rotate(${rot}deg)`,
              fontFamily: FONT.title,
              fontWeight: 800,
              fontSize: 150 - i * 20,
              color: i % 2 ? K.brand : K.red,
              WebkitTextStroke: "6px #FFFFFF",
              textShadow: "0 10px 24px rgba(0,0,0,0.3)",
            }}
          >
            ?
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Emoji that pops in and shakes                                       */
/* ------------------------------------------------------------------ */
export const EmojiPop: React.FC<{ emoji: string; x: number; y: number; dur: number; size?: number; delay?: number }> = ({
  emoji,
  x,
  y,
  dur,
  size = 150,
  delay = 0,
}) => {
  const { p, frame } = usePop(dur, delay);
  if (frame < delay) return null;
  const shake = Math.sin((frame - delay) * 1.4) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        transform: `translate(-50%,-50%) scale(${p}) rotate(${shake}deg)`,
        filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.3))",
      }}
    >
      {emoji}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Trip counter: "1 → 30 trips" then "= 1 dhulai"                      */
/* ------------------------------------------------------------------ */
export const TripCounter: React.FC<{ x: number; y: number; dur: number; countFrames: number }> = ({ x, y, dur, countFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { p } = usePop(dur);
  const n = Math.max(1, Math.round(interpolate(frame, [6, countFrames], [1, 30], clamp)));
  const reveal = spring({ frame: frame - countFrames - 4, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${p})`,
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: FONT.title,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          background: K.ink,
          color: "#FFFFFF",
          borderRadius: 26,
          padding: "12px 28px",
          fontSize: 58,
          border: "6px solid #FFFFFF",
          boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          minWidth: 330,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        🚆 {n} trips
      </div>
      <div
        style={{
          transform: `scale(${reveal}) rotate(${(1 - reveal) * -20}deg)`,
          background: K.red,
          color: "#FFFFFF",
          borderRadius: 26,
          padding: "12px 28px",
          fontSize: 58,
          border: "6px solid #FFFFFF",
          boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
        }}
      >
        = 1 dhulai 🧺
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Arrow that draws itself toward a target, with a label at its tail   */
/* ------------------------------------------------------------------ */
export const ArrowCallout: React.FC<{
  from: [number, number];
  to: [number, number];
  label: string;
  dur: number;
  color?: string;
}> = ({ from, to, label, dur, color = K.yellow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [4, 22], [0, 1], clamp);
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  const lp = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.25;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = (s: number) =>
    `M ${x2} ${y2} L ${x2 - Math.cos(ang - 0.5) * s} ${y2 - Math.sin(ang - 0.5) * s} M ${x2} ${y2} L ${x2 - Math.cos(ang + 0.5) * s} ${y2 - Math.sin(ang + 0.5) * s}`;
  const pulse = 1 + Math.sin(frame / 4) * 0.04;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}>
        <path
          d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={22}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
        <path
          d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
        {draw > 0.95 && (
          <>
            <path d={head(50)} stroke="#FFFFFF" strokeWidth={22} strokeLinecap="round" fill="none" />
            <path d={head(50)} stroke={color} strokeWidth={12} strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          transform: `translate(-50%, -120%) scale(${lp * pulse}) rotate(-4deg)`,
          background: color,
          color: K.ink,
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 54,
          padding: "10px 30px",
          borderRadius: 24,
          border: "6px solid #FFFFFF",
          whiteSpace: "nowrap",
          boxShadow: "0 14px 30px rgba(0,0,0,0.3)",
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Ribbon banner sliding in from the left                              */
/* ------------------------------------------------------------------ */
export const Banner: React.FC<{ tag: string; text: string; y: number; dur: number }> = ({ tag, text, y, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 15, stiffness: 140 } });
  const out = interpolate(frame, [dur - 10, dur], [0, -1200], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y,
        transform: `translateX(${(1 - p) * -1100 + out}px)`,
        display: "flex",
        alignItems: "stretch",
        fontFamily: FONT.title,
        fontWeight: 800,
        filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.3))",
      }}
    >
      <div style={{ background: K.yellow, color: K.ink, fontSize: 50, padding: "16px 28px 12px 50px" }}>{tag}</div>
      <div
        style={{
          background: K.brand,
          color: "#FFFFFF",
          fontSize: 50,
          padding: "16px 44px 12px 28px",
          clipPath: "polygon(0 0, 100% 0, 94% 100%, 0 100%)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Flash + light-streak transition                                     */
/* ------------------------------------------------------------------ */
export const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 2, 9], [0, 0.55, 0], clamp);
  const sx = interpolate(frame, [0, 10], [-700, 1500], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: o }} />
      <div
        style={{
          position: "absolute",
          top: -400,
          left: sx,
          width: 260,
          height: 2800,
          transform: "rotate(18deg)",
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))",
          opacity: interpolate(frame, [0, 3, 10], [0, 1, 0], clamp),
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Animated "Mindset Mode Explainers" badge with periodic shine        */
/* ------------------------------------------------------------------ */
export const BrandBadge: React.FC<{ big?: boolean; color?: string }> = ({ big, color = K.brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 150 } });
  const k = big ? 1.9 : 1;
  const shineX = ((frame % 150) / 150) * 900 - 200;
  return (
    <div
      style={{
        position: big ? "relative" : "absolute",
        top: big ? undefined : 52,
        left: big ? undefined : "50%",
        transform: big ? `scale(${drop})` : `translate(-50%, ${(1 - drop) * -160}px)`,
        display: "flex",
        alignItems: "center",
        gap: 14 * k,
        background: "rgba(255,255,255,0.96)",
        borderRadius: 999,
        padding: `${10 * k}px ${28 * k}px ${10 * k}px ${12 * k}px`,
        boxShadow: "0 10px 30px rgba(20,30,60,0.28)",
        overflow: "hidden",
        fontFamily: FONT.title,
        fontWeight: 800,
        fontSize: 37 * k,
        color: K.ink,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          width: 56 * k,
          height: 56 * k,
          borderRadius: "50%",
          background: color,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38 * k,
          position: "relative",
          transform: `rotate(${Math.sin(frame / 20) * 8}deg)`,
        }}
      >
        M
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: shineX,
          width: 70,
          transform: "skewX(-20deg)",
          background: `linear-gradient(90deg, transparent, ${color}24, transparent)`,
        }}
      />
      <span style={{ position: "relative" }}>
        Mindset <span style={{ color: color }}>Mode</span> Explainers
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Progress bar along the bottom edge                                  */
/* ------------------------------------------------------------------ */
export const ProgressBar: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [0, total], [0, 1080], clamp);
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, height: 12, background: "rgba(0,0,0,0.15)" }}>
      <div style={{ width: w, height: "100%", background: `linear-gradient(90deg, ${K.brand}, #F07C1E, ${K.yellow})` }} />
    </div>
  );
};
