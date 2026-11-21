import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT } from "./theme";

export type Word = string | { t: string; c: string };

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** Sticker-style kinetic headline: words pop in one by one. */
export const Headline: React.FC<{
  lines: Word[][];
  delay?: number;
  top?: number;
  size?: number;
  exitAt?: number;
  stagger?: number;
}> = ({ lines, delay = 0, top = 230, size = 92, exitAt, stagger = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = 0;
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + 10], [0, 1], {
          ...clamp,
          easing: Easing.in(Easing.cubic),
        });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: -1.5,
        opacity: 1 - exit,
        translate: `0px ${-40 * exit}px`,
      }}
    >
      {lines.map((line, li) => (
        <div key={li}>
          {line.map((w, wi) => {
            const i = idx++;
            const s = spring({
              frame: frame - delay - i * stagger,
              fps,
              config: { damping: 11, stiffness: 160 },
            });
            const text = typeof w === "string" ? w : w.t;
            const color = typeof w === "string" ? C.white : w.c;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  margin: "0 12px",
                  color,
                  WebkitTextStroke: `14px ${C.ink}`,
                  paintOrder: "stroke fill",
                  textShadow: "0 10px 0 rgba(19,35,58,0.35)",
                  opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
                  scale: interpolate(s, [0, 1], [0.4, 1]),
                  translate: `0px ${interpolate(s, [0, 1], [50, 0])}px`,
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

/** Small rounded label with a coloured dot or icon. */
export const Chip: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  fg?: string;
  size?: number;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  children,
  color = C.stripe,
  bg = "rgba(19,35,58,0.88)",
  fg = C.white,
  size = 36,
  icon,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.4,
      padding: `${size * 0.35}px ${size * 0.7}px`,
      borderRadius: 999,
      background: bg,
      color: fg,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 0.5,
      boxShadow: "0 12px 30px rgba(19,35,58,0.25)",
      border: `3px solid ${color}`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {icon ?? (
      <span
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderRadius: 99,
          background: color,
          display: "inline-block",
        }}
      />
    )}
    {children}
  </div>
);

/** Spring helper for pop-ins inside scenes. */
export const usePop = (at: number, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 150 } });
};

export const popStyle = (s: number): React.CSSProperties => ({
  opacity: interpolate(s, [0, 0.25], [0, 1], clamp),
  scale: interpolate(s, [0, 1], [0.5, 1]),
});

/* ---------------- Icons ---------------- */

export const TowerIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 60,
  color = C.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60">
    <path
      d="M30 14 L18 56 M30 14 L42 56 M22 40 L38 40 M25 28 L35 28 M20 48 L40 48"
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx={30} cy={12} r={5} fill={color} />
    <path
      d="M18 6 Q12 12 18 18 M42 6 Q48 12 42 18"
      stroke={color}
      strokeWidth={3.5}
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const ClockIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 60,
  color = C.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60">
    <circle cx={30} cy={30} r={23} stroke={color} strokeWidth={5} fill="none" />
    <path
      d="M30 16 L30 31 L40 37"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const PinIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 60,
  color = C.pink,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60">
    <path
      d="M30 56 C30 56 12 36 12 24 A18 18 0 0 1 48 24 C48 36 30 56 30 56 Z"
      fill={color}
    />
    <circle cx={30} cy={24} r={7} fill="#fff" />
  </svg>
);

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = C.green,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={19} fill={color} />
    <path
      d="M11 20 L17.5 26.5 L29 14"
      stroke="#fff"
      strokeWidth={4.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CrossIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = C.red,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={19} fill={color} />
    <path
      d="M13 13 L27 27 M27 13 L13 27"
      stroke="#fff"
      strokeWidth={4.5}
      strokeLinecap="round"
    />
  </svg>
);

export const LockIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 60,
  color = C.inkSoft,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60">
    <rect x={12} y={26} width={36} height={28} rx={6} fill={color} />
    <path
      d="M19 27 V19 A11 11 0 0 1 41 19 V27"
      stroke={color}
      strokeWidth={6}
      fill="none"
    />
    <circle cx={30} cy={40} r={4.5} fill="#fff" />
  </svg>
);

export const BulbIcon: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <circle cx={60} cy={50} r={34} fill={C.stripe} />
    <rect x={44} y={80} width={32} height={18} rx={4} fill={C.inkSoft} />
    <rect x={48} y={100} width={24} height={8} rx={4} fill={C.inkSoft} />
    <path
      d="M50 62 L56 46 L64 54 L70 40"
      stroke="#fff"
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (-160 + i * 35) * (Math.PI / 180);
      return (
        <line
          key={i}
          x1={60 + Math.cos(a) * 44}
          y1={50 + Math.sin(a) * 44}
          x2={60 + Math.cos(a) * 56}
          y2={50 + Math.sin(a) * 56}
          stroke={C.stripe}
          strokeWidth={6}
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

/** Train glyph used in the app UI. */
export const TrainGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "#fff",
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x={8} y={4} width={24} height={26} rx={7} fill={color} />
    <rect x={12} y={9} width={16} height={8} rx={2} fill="rgba(0,0,0,0.35)" />
    <circle cx={14} cy={23} r={2.5} fill="rgba(0,0,0,0.35)" />
    <circle cx={26} cy={23} r={2.5} fill="rgba(0,0,0,0.35)" />
    <path d="M12 31 L8 37 M28 31 L32 37" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

/* ---------------- Persistent overlays ---------------- */

/** Top progress bar + episode tag. Uses the global timeline frame. */
export const Chrome: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 10,
          width: `${(frame / total) * 100}%`,
          background: C.stripe,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(19,35,58,0.55)",
          color: C.white,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 3,
        }}
      >
        EP 01 · TECH
      </div>
    </AbsoluteFill>
  );
};

/** Sapna Express narrator badge: engine face with blinking headlight eyes. */
export const NarratorBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  // blink every ~3.2 s
  const t = frame % 96;
  const blink = t > 88 ? interpolate(t, [88, 92, 96], [1, 0.1, 1]) : 1;
  const bob = Math.sin(frame / 8) * 4;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        bottom: 120,
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: interpolate(enter, [0, 0.3], [0, 1], clamp),
        scale: interpolate(enter, [0, 1], [0.4, 1]),
        transformOrigin: "left center",
      }}
    >
      <svg width={150} height={150} viewBox="0 0 150 150" style={{ translate: `0px ${bob}px` }}>
        <circle cx={75} cy={75} r={72} fill={C.white} />
        <circle cx={75} cy={75} r={66} fill={C.skyLow} />
        {/* engine front */}
        <rect x={30} y={28} width={90} height={98} rx={26} fill={C.train} />
        <rect x={30} y={92} width={90} height={12} fill={C.stripe} />
        <rect x={42} y={38} width={66} height={30} rx={10} fill={C.ink} />
        <rect x={48} y={42} width={22} height={8} rx={4} fill="rgba(255,255,255,0.35)" />
        {/* headlight eyes */}
        {[54, 96].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={80} rx={11} ry={11 * blink} fill={C.white} />
            <ellipse cx={cx + 2} cy={81} rx={5} ry={5 * blink} fill={C.ink} />
          </g>
        ))}
        {/* smile */}
        <path d="M62 112 Q75 120 88 112" stroke={C.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
      </svg>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 22px",
          borderRadius: 999,
          background: "rgba(19,35,58,0.85)",
          color: C.white,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 30,
        }}
      >
        Sapna Express
        <div style={{ display: "flex", gap: 4, alignItems: "center", height: 30 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                borderRadius: 3,
                background: C.stripe,
                height: 10 + Math.abs(Math.sin(frame / 4 + i * 1.3)) * 18,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
