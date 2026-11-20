import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, EASE_OUT, F } from "./tokens";

/** Springy 0→1 starting at `start`. */
export const usePop = (start: number, damping = 13, stiffness = 190) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping, stiffness, mass: 0.7 } });
};

/** Eased 0→1 between start and start+dur. */
export const useT = (start: number, dur: number, ease = EASE_OUT) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

/** Fades a whole scene in and out so scenes cross smoothly. */
export const SceneWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 9], [0, 1], { extrapolateRight: "clamp", easing: EASE_OUT });
  const outT = interpolate(frame, [dur - 7, dur], [1, 0], { extrapolateLeft: "clamp" });
  const scale = interpolate(inT, [0, 1], [1.04, 1]) * interpolate(outT, [0, 1], [0.97, 1]);
  return (
    <AbsoluteFill style={{ opacity: Math.min(inT, outT), transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Night-sky background with drifting stars and a vignette. */
export const NightBg: React.FC<{ glow?: string }> = ({ glow = C.navy2 }) => {
  const frame = useCurrentFrame();
  const stars = new Array(70).fill(0).map((_, i) => ({
    x: random(`sx${i}`) * 1080,
    y: random(`sy${i}`) * 1920,
    r: 1 + random(`sr${i}`) * 2.2,
    tw: random(`st${i}`) * Math.PI * 2,
  }));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 90% 60% at 50% 38%, ${glow} 0%, ${C.navy} 45%, ${C.night} 100%)`,
      }}
    >
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={(s.x - frame * 0.25 * s.r + 1080) % 1080}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={0.15 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 14 + s.tw))}
          />
        ))}
      </svg>
      {/* subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
          backgroundPosition: `${-frame * 0.6}px 0px`,
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 45%, black 0%, transparent 100%)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, #00000099 100%)" }} />
    </AbsoluteFill>
  );
};

/** Small pill label at the top of each scene. */
export const Tag: React.FC<{ text: string; start?: number; color?: string }> = ({ text, start = 4, color = C.yellow }) => {
  const p = usePop(start);
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * -30}px)`,
      }}
    >
      <div
        style={{
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 6,
          color: C.night,
          background: color,
          padding: "12px 28px",
          borderRadius: 999,
          boxShadow: `0 0 40px ${color}66`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** A line of text that pops up. */
export const PopLine: React.FC<{
  start: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  style?: React.CSSProperties;
  from?: "up" | "scale";
}> = ({ start, children, size = 86, color = C.cream, font = F.display, weight = 400, style, from = "up" }) => {
  const p = usePop(start);
  const transform =
    from === "scale" ? `scale(${interpolate(p, [0, 1], [0.4, 1])})` : `translateY(${(1 - p) * 60}px)`;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.08,
        color,
        textAlign: "center",
        opacity: Math.min(1, p * 1.4),
        transform,
        textTransform: font === F.display ? "uppercase" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Hi: React.FC<{ c?: string; children: React.ReactNode }> = ({ c = C.yellow, children }) => (
  <span style={{ color: c, textShadow: `0 0 30px ${c}66` }}>{children}</span>
);

/** Amber dot-matrix style passenger information board. */
export const LedBoard: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ children, width = 900, height = 150, style }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        background: "#0A0A0C",
        border: "6px solid #2B2F3A",
        boxShadow: "0 20px 60px #0009, inset 0 0 30px #000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ color: C.amber, textShadow: `0 0 18px ${C.amber}, 0 0 4px ${C.amber}`, whiteSpace: "nowrap" }}>
        {children}
      </div>
      {/* dot-matrix mesh */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(transparent 45%, #0A0A0C 70%)",
          backgroundSize: "6px 6px",
          opacity: 0.75,
        }}
      />
      {/* scanline shimmer */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 120,
          left: ((frame * 9) % (width + 400)) - 200,
          background: "linear-gradient(90deg, transparent, #ffffff10, transparent)",
        }}
      />
    </div>
  );
};

/** Railway loudspeaker horn with sound rings. */
export const Speaker: React.FC<{ x: number; y: number; scale?: number; ringsFrom?: number; ringsUntil?: number; flip?: boolean }> = ({
  x,
  y,
  scale = 1,
  ringsFrom = 0,
  ringsUntil = 9999,
  flip = false,
}) => {
  const frame = useCurrentFrame();
  const active = frame >= ringsFrom && frame <= ringsUntil;
  return (
    <svg
      width={420 * scale}
      height={300 * scale}
      viewBox="0 0 420 300"
      style={{ position: "absolute", left: x, top: y, overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}
    >
      <rect x={30} y={110} width={14} height={190} fill="#56607F" />
      <rect x={30} y={130} width={60} height={10} fill="#56607F" />
      <path d="M70 100 L150 70 L150 190 L70 160 Z" fill="#C9D2EA" />
      <path d="M150 70 L200 30 L200 230 L150 190 Z" fill="#E9EEFA" />
      <ellipse cx={200} cy={130} rx={16} ry={100} fill="#9AA6C8" />
      <rect x={58} y={104} width={22} height={52} rx={6} fill="#7D88AA" />
      {active &&
        [0, 1, 2].map((i) => {
          const t = ((frame - ringsFrom) / 22 + i / 3) % 1;
          return (
            <path
              key={i}
              d={`M ${230 + t * 140} ${130 - 60 - t * 90} Q ${270 + t * 190} 130 ${230 + t * 140} ${130 + 60 + t * 90}`}
              fill="none"
              stroke={C.yellow}
              strokeWidth={10 - t * 6}
              strokeLinecap="round"
              opacity={1 - t}
            />
          );
        })}
    </svg>
  );
};

/** Deterministic waveform; `segments` are [startFrac, endFrac] spans with sound. */
export const Waveform: React.FC<{
  width: number;
  height: number;
  segments: { a: number; b: number; color?: string }[];
  reveal: number; // 0..1 how much is drawn
  bars?: number;
  seed?: string;
  gapColor?: string;
}> = ({ width, height, segments, reveal, bars = 90, seed = "w", gapColor = "#ffffff30" }) => {
  const frame = useCurrentFrame();
  const bw = width / bars;
  return (
    <svg width={width} height={height}>
      {new Array(bars).fill(0).map((_, i) => {
        const f = (i + 0.5) / bars;
        if (f > reveal) return null;
        const seg = segments.find((s) => f >= s.a && f <= s.b);
        const local = seg ? (f - seg.a) / (seg.b - seg.a) : 0;
        const env = seg ? Math.sin(Math.PI * local) ** 0.6 : 0;
        const jitter = 0.35 + 0.65 * random(`${seed}${i}`);
        const wobble = 0.85 + 0.15 * Math.sin(frame / 3 + i);
        const h = seg ? Math.max(8, env * jitter * wobble * height * 0.95) : 4;
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.18}
            y={(height - h) / 2}
            width={bw * 0.64}
            height={h}
            rx={bw * 0.3}
            fill={seg ? seg.color ?? C.teal : gapColor}
          />
        );
      })}
    </svg>
  );
};

/** Tiny train that runs along the top as a progress bar. */
export const ProgressTrain: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const p = frame / total;
  const w = 880;
  const x = 100 + p * w;
  return (
    <svg width={1080} height={80} style={{ position: "absolute", top: 150, left: 0 }}>
      <line x1={100} y1={52} x2={100 + w} y2={52} stroke="#ffffff22" strokeWidth={4} strokeLinecap="round" />
      <line x1={100} y1={52} x2={x} y2={52} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" />
      {new Array(23).fill(0).map((_, i) => (
        <rect key={i} x={100 + i * 40} y={56} width={14} height={4} fill="#ffffff22" />
      ))}
      <g transform={`translate(${x - 70}, 22)`}>
        <rect x={0} y={6} width={30} height={20} rx={4} fill="#3D63C9" />
        <rect x={34} y={6} width={36} height={20} rx={5} fill={C.cream} />
        <path d="M60 6 L70 14 L70 26 L60 26 Z" fill={C.red} />
        <circle cx={70} cy={16} r={3} fill={C.yellow} />
        {[8, 22, 42, 58].map((cx) => (
          <circle key={cx} cx={cx} cy={28} r={3.5} fill="#ddd" />
        ))}
      </g>
    </svg>
  );
};
