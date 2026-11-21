import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, C, FONT, FPS } from "./theme";

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

export type Cam = { rx: number; rz: number; s: number; x: number; y: number };
export type CamKey = Cam & { t: number }; // t in seconds (scene-local)

const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** Interpolates a camera between keyframes (scene-local seconds). */
export const useCam = (keys: CamKey[]): Cam => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ts = keys.map((k) => k.t);
  const pick = (p: keyof Cam) =>
    keys.length === 1
      ? keys[0][p]
      : interpolate(
          t,
          ts,
          keys.map((k) => k[p]),
          { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
  return { rx: pick("rx"), rz: pick("rz"), s: pick("s"), x: pick("x"), y: pick("y") };
};

/** A 3D plane (the berth top) viewed through a perspective camera. */
export const World: React.FC<{
  cam: Cam;
  w: number;
  h: number;
  children: React.ReactNode;
}> = ({ cam, w, h, children }) => (
  <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "50% 40%" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        transformStyle: "preserve-3d",
        transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s}) rotateX(${cam.rx}deg) rotateZ(${cam.rz}deg)`,
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/** A box with thickness: stacked layers give a convincing side face. */
export const Slab: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  thick: number;
  z?: number;
  side: string;
  radius?: number;
  rot?: number;
  opacity?: number;
  shadow?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, thick, z = 0, side, radius = 14, rot = 0, opacity = 1, shadow = true, children }) => {
  const n = Math.max(2, Math.round(thick / 3));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        transformStyle: "preserve-3d",
        transform: `translateZ(${z}px) rotateZ(${rot}deg)`,
      }}
    >
      {shadow && (
        <div
          style={{
            position: "absolute",
            inset: -10,
            borderRadius: radius + 10,
            background: "rgba(40,20,10,0.35)",
            filter: "blur(18px)",
            transform: "translate(14px, 18px)",
          }}
        />
      )}
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background: side,
            transform: `translateZ(${(i * thick) / n}px)`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          overflow: "hidden",
          transform: `translateZ(${thick}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

/** Green blanket with mustard + red double-stripe check. */
export const CheckPattern: React.FC<{ w: number; h: number; cells?: number }> = ({ w, h, cells = 2 }) => {
  const lines: React.ReactNode[] = [];
  const stepX = w / (cells + 1);
  const stepY = h / Math.max(1, Math.round((cells + 1) * (h / w)));
  for (let x = stepX; x < w - 1; x += stepX) {
    lines.push(<rect key={`v${x}`} x={x - 9} y={0} width={5} height={h} fill={C.blanketStripe} />);
    lines.push(<rect key={`v2${x}`} x={x + 4} y={0} width={3} height={h} fill={C.blanketStripe2} />);
  }
  for (let y = stepY; y < h - 1; y += stepY) {
    lines.push(<rect key={`h${y}`} x={0} y={y - 9} width={w} height={5} fill={C.blanketStripe} />);
    lines.push(<rect key={`h2${y}`} x={0} y={y + 4} width={w} height={3} fill={C.blanketStripe2} />);
  }
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={C.blanket} />
          <rect width="3" height="3" fill="rgba(255,255,255,0.04)" />
        </pattern>
        <radialGradient id="blShade" cx="35%" cy="30%" r="90%">
          <stop offset="0" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.25)" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="url(#weave)" />
      {lines}
      <rect width={w} height={h} fill="url(#blShade)" />
    </svg>
  );
};

/** Our own emblem: a rail wheel inside a ring (not an official logo). */
export const Emblem: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
    <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="5" />
    <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="5" />
    <circle cx="50" cy="50" r="7" fill={color} />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={50 + Math.cos(a) * 8}
          y1={50 + Math.sin(a) * 8}
          x2={50 + Math.cos(a) * 29}
          y2={50 + Math.sin(a) * 29}
          stroke={color}
          strokeWidth="4"
        />
      );
    })}
  </svg>
);

/** White chadar top with maroon "भारतीय रेल" border print. */
export const ChadarTop: React.FC<{ w: number; h: number; big?: boolean; label?: string }> = ({ w, h, big, label }) => {
  const fs = big ? Math.min(w, h) * 0.09 : Math.min(w, h) * 0.14;
  const repeat = Array.from({ length: 12 }).map(() => BRAND.hindi).join("  •  ");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(135deg, #FFFFFF 0%, #F7F2EA 100%)`,
      }}
    >
      {/* woven border */}
      <div
        style={{
          position: "absolute",
          inset: Math.min(w, h) * 0.05,
          border: `${Math.max(3, fs * 0.12)}px solid ${C.brandPrint}`,
          outline: `${Math.max(1, fs * 0.05)}px solid ${C.brandPrint}`,
          outlineOffset: -fs * 0.35,
          borderRadius: 6,
        }}
      />
      {big && (
        <>
          <div style={{ ...edgeText, top: Math.min(w, h) * 0.065, fontSize: fs * 0.45 }}>{repeat}</div>
          <div style={{ ...edgeText, bottom: Math.min(w, h) * 0.065, fontSize: fs * 0.45 }}>{repeat}</div>
        </>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: fs * 0.25,
          color: C.brandPrint,
        }}
      >
        <Emblem size={fs * 1.6} color={C.brandPrint} />
        <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: fs, lineHeight: 1 }}>{BRAND.hindi}</div>
        {label && (
          <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: fs * 0.42, letterSpacing: 2 }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

const edgeText: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textAlign: "center",
  fontFamily: FONT.title,
  fontWeight: 700,
  color: C.brandPrint,
  opacity: 0.85,
};

/** Saffron bedroll packet print. */
export const PacketTop: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const u = Math.min(w, h);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(ellipse at 30% 25%, #FFC46B, ${C.packet} 60%, #E08F2C)`,
        display: "flex",
        alignItems: "center",
        gap: u * 0.08,
        padding: u * 0.1,
        boxSizing: "border-box",
        color: C.brandPrint,
      }}
    >
      <Emblem size={u * 0.55} color={C.brandPrint} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: u * 0.24 }}>{BRAND.kitHindi}</div>
        <div style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: u * 0.15, letterSpacing: 2 }}>
          {BRAND.kitEnglish}
        </div>
        <div style={{ fontFamily: FONT.title, fontWeight: 700, fontSize: u * 0.13, marginTop: u * 0.04 }}>
          {BRAND.hindi}
        </div>
      </div>
    </div>
  );
};

export const PillowTop: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: "radial-gradient(ellipse at 45% 40%, #FFFFFF 0%, #F3EEE6 55%, #D9CFC1 100%)",
    }}
  />
);

export const BerthTop: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: `radial-gradient(ellipse at 40% 30%, ${C.berthEdge} 0%, ${C.berth} 55%, #741626 100%)`,
      boxShadow: `inset 0 0 0 10px rgba(255,255,255,0.06)`,
    }}
  />
);

/** Maroon printed cover with repeating "भारतीय रेल" + wheel motif. */
export const PrintedCover: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const rows = Math.ceil(h / 120) + 2;
  return (
    <div style={{ width: w, height: h, background: C.cover, position: "relative", overflow: "hidden" }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            position: "absolute",
            top: r * 120 - 40,
            left: r % 2 ? -80 : 0,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 34,
            color: C.coverPrint,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <React.Fragment key={i}>
              <Emblem size={46} color={C.accent} />
              <span style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 44 }}>{BRAND.hindi}</span>
            </React.Fragment>
          ))}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.12), rgba(0,0,0,0.25))",
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Backdrops                                                           */
/* ------------------------------------------------------------------ */

/** Coach interior behind the berth: ivory wall, window, curtain, lamp. */
export const CoachBackdrop: React.FC<{ lamp?: boolean }> = ({ lamp = true }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.wall} 0%, ${C.wallShade} 70%, ${C.wallDeep} 100%)` }}>
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#56707C" />
          <stop offset="1" stopColor={C.glass} />
        </linearGradient>
      </defs>
      <rect x="-40" y="120" width="1160" height="210" rx="28" fill="url(#glass)" opacity="0.9" />
      <rect x="-40" y="120" width="1160" height="210" rx="28" fill="none" stroke="#FFFFFF" strokeWidth="14" />
      <path d="M 840 100 q 60 140 0 300 l 120 0 l 0 -300 z" fill={C.curtain} />
      <path d="M 870 100 l 0 300" stroke="rgba(0,0,0,0.12)" strokeWidth="8" />
      {lamp && (
        <>
          <rect x="120" y="390" width="90" height="46" rx="10" fill="#3A2A22" />
          <ellipse cx="165" cy="470" rx="240" ry="160" fill="rgba(255,226,160,0.25)" />
        </>
      )}
      <rect x="0" y="1780" width="1080" height="140" fill="rgba(80,50,30,0.15)" />
    </svg>
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* Text overlays                                                       */
/* ------------------------------------------------------------------ */

/** Big two-line title. Wrap highlighted words in *asterisks*. */
export const Title: React.FC<{ text: string; inAt?: number; outAt?: number; y?: number }> = ({
  text,
  inAt = 0,
  outAt = 9999,
  y = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("\n");
  const out = interpolate(frame, [outAt - 8, outAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let wi = 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: y + 420,
          background: `linear-gradient(180deg, ${C.wall}F2 0%, ${C.wall}CC 55%, ${C.wall}00 100%)`,
          opacity: out * interpolate(frame, [inAt, inAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <div style={{ position: "absolute", top: y, left: 40, right: 40, textAlign: "center", opacity: out }}>
        {lines.map((line, li) => (
          <div key={li} style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 112, lineHeight: 1.02, color: C.ink }}>
            {line.split(" ").map((word, i) => {
              const hl = word.startsWith("*");
              const clean = word.replace(/\*/g, "");
              const p = spring({ frame: frame - inAt - wi++ * 3, fps, config: { damping: 14, stiffness: 160 } });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    marginRight: 26,
                    color: hl ? C.accent : C.ink,
                    transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + 0.2 * p})`,
                    opacity: p,
                    textShadow: "0 4px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  {clean}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Caption pill. variant "key" = maroon (main point); "label" = white tag. */
export const Pill: React.FC<{
  text: string;
  x: number;
  y: number;
  inAt?: number;
  outAt?: number;
  variant?: "key" | "label";
  size?: number;
}> = ({ text, x, y, inAt = 0, outAt = 99999, variant = "label", size = 44 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt || frame > outAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 12, stiffness: 200 } });
  const out = interpolate(frame, [outAt - 6, outAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const key = variant === "key";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${p})`,
        opacity: out,
        background: key ? C.pill : "#FFFFFF",
        color: key ? "#FFFFFF" : C.ink,
        border: key ? `4px solid ${C.accent}` : `3px solid ${C.wallShade}`,
        fontFamily: FONT.body,
        fontWeight: 800,
        fontSize: size,
        padding: `${size * 0.22}px ${size * 0.6}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 30px rgba(60,30,10,0.25)",
      }}
    >
      {text}
    </div>
  );
};

/** Fade a scene in over its first frames (scenes overlap slightly). */
export const FadeIn: React.FC<{ frames?: number; children: React.ReactNode }> = ({ frames = 10, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, frames], [0, 1], { extrapolateRight: "clamp" }) }}>
      {children}
    </AbsoluteFill>
  );
};
