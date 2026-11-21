import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT } from "./theme";

const usePop = (from: number, to?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 170 } });
  const exit = to === undefined ? 1 : interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { enter, exit, visible: frame >= from && (to === undefined || frame < to) };
};

/** Dark rounded label chip — the signature text treatment of the style. */
export const Chip: React.FC<{
  children: React.ReactNode;
  from: number;
  to?: number;
  top: number;
  left?: number; // centre x in px; default = centred
  color?: string;
  size?: number;
  bg?: string;
  accent?: string; // optional left accent bar
  align?: "center" | "left";
}> = ({ children, from, to, top, left, color = COLOR.ink, size = 52, bg = COLOR.chipBg, accent, align = "center" }) => {
  const { width } = useVideoConfig();
  const { enter, exit, visible } = usePop(from, to);
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: left ?? width / 2,
        translate: "-50% 0",
        scale: interpolate(enter, [0, 1], [0.7, 1]) * interpolate(exit, [0, 1], [0.9, 1]),
        opacity: Math.min(enter, exit),
        background: bg,
        borderRadius: 14,
        padding: `${size * 0.22}px ${size * 0.5}px`,
        borderLeft: accent ? `${size * 0.1}px solid ${accent}` : undefined,
        fontFamily: FONT.label,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: size * 0.02,
        color,
        textTransform: "uppercase",
        textAlign: align,
        whiteSpace: "nowrap",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </div>
  );
};

/** Big free-floating headline (no box), with a soft shadow for legibility over 3D. */
export const Hero: React.FC<{
  children: React.ReactNode;
  from: number;
  to?: number;
  top: number;
  size?: number;
  color?: string;
  weight?: number;
}> = ({ children, from, to, top, size = 96, color = COLOR.ink, weight = 700 }) => {
  const { enter, exit, visible } = usePop(from, to);
  if (!visible) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT.label,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.05,
          color,
          textTransform: "uppercase",
          letterSpacing: size * 0.01,
          opacity: Math.min(enter, exit),
          translate: `0 ${interpolate(enter, [0, 1], [30, 0])}px`,
          scale: interpolate(enter, [0, 1], [0.85, 1]),
          textShadow: "0 6px 24px rgba(0,0,0,0.45)",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Countdown ring ("~60s"). progress 1 = full. */
export const TimerRing: React.FC<{ progress: number; x: number; y: number; size?: number; from?: number; label?: string; warn?: boolean }> = ({
  progress,
  x,
  y,
  size = 220,
  from = 0,
  label = "~60s",
  warn = false,
}) => {
  const { enter } = usePop(from);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const ring = warn && progress < 0.3 ? COLOR.coral : COLOR.mint;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: enter, scale: interpolate(enter, [0, 1], [0.6, 1]) }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(20,24,32,0.35)" stroke="rgba(255,255,255,0.18)" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.clock,
          fontWeight: 600,
          fontSize: size * 0.2,
          color: "#ffffff",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** Big speed number with KM/H. */
export const Speed: React.FC<{ value: number; top: number; from: number; boxed?: boolean }> = ({ value, top, from, boxed }) => {
  const { enter, visible } = usePop(from);
  const { width } = useVideoConfig();
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: width / 2,
        translate: "-50% 0",
        opacity: enter,
        scale: interpolate(enter, [0, 1], [0.7, 1]),
        textAlign: "center",
        color: "#fff",
        fontFamily: FONT.clock,
        background: boxed ? "rgba(24,28,36,0.88)" : undefined,
        borderRadius: 18,
        padding: boxed ? "18px 44px 22px" : 0,
        textShadow: boxed ? undefined : "0 6px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 150, fontWeight: 600, lineHeight: 1 }}>{Math.round(value)}</div>
      <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: 4, marginTop: 4 }}>KM/H</div>
    </div>
  );
};

/** Draining progress bar with a caption, e.g. "KUCH SECOND...". */
export const DrainBar: React.FC<{ progress: number; top: number; label: string; from: number }> = ({ progress, top, label, from }) => {
  const { enter, visible } = usePop(from);
  const { width } = useVideoConfig();
  if (!visible) return null;
  const w = width * 0.62;
  return (
    <div style={{ position: "absolute", top, left: (width - w) / 2, width: w, opacity: enter }}>
      <div style={{ fontFamily: FONT.label, fontWeight: 600, fontSize: 46, color: COLOR.ink, textAlign: "center", marginBottom: 18, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
        {label}
      </div>
      <div style={{ height: 18, borderRadius: 9, background: "rgba(20,20,24,0.55)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, progress) * 100}%`, background: COLOR.coral, borderRadius: 9 }} />
      </div>
    </div>
  );
};

/** Floating sleepy "Z". */
export const Zzz: React.FC<{ from: number; x: number; y: number; size?: number }> = ({ from, x, y, size = 90 }) => {
  const frame = useCurrentFrame();
  const { enter, visible } = usePop(from);
  if (!visible) return null;
  const t = frame - from;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - t * 0.6,
        translate: "-50% -50%",
        opacity: enter,
        rotate: `${Math.sin(t / 10) * 8}deg`,
        scale: interpolate(enter, [0, 1], [0.3, 1]),
        fontFamily: FONT.label,
        fontWeight: 700,
        fontSize: size,
        color: "#ffffff",
        textShadow: "0 4px 18px rgba(0,0,0,0.5)",
      }}
    >
      Z
    </div>
  );
};

/** Expanding alarm rings centred on a screen point (buzzer). */
export const AlarmRings: React.FC<{ x: number; y: number; from: number; color?: string }> = ({ x, y, from, color = COLOR.coral }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const t = frame - from;
  return (
    <>
      {[0, 10, 20].map((d) => {
        const p = ((t + d) % 30) / 30;
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 520,
              height: 520,
              translate: "-50% -50%",
              borderRadius: "50%",
              border: `${interpolate(p, [0, 1], [14, 2])}px solid ${color}`,
              scale: interpolate(p, [0, 1], [0.25, 1.1], { easing: Easing.out(Easing.cubic) }),
              opacity: interpolate(p, [0, 0.2, 1], [0, 0.9, 0]),
            }}
          />
        );
      })}
    </>
  );
};

/** Gentle top/bottom darkening so text stays readable — mimics a camera vignette. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.35 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse 120% 80% at 50% 50%, transparent 55%, rgba(5,8,18,${strength}) 100%)`,
    }}
  />
);
