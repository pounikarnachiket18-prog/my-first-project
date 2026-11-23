import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type UncleLook = {
  vest: [string, string]; // light, shade
  lungi: [string, string, string]; // base, stripe 1, stripe 2
  lungiEdge: string;
  skin: [string, string, string]; // light, dark, hands
  hair: string;
  hairStyle: "balding" | "full" | "bald" | "cap";
  lota: "brass" | "steel";
};

export const LOOKS: UncleLook[] = [
  // 0: classic – white banian, blue check lungi, balding
  { vest: ["#fbf8f1", "#d6d0c2"], lungi: ["#2f5d9e", "#86b6ea", "#3fae7a"], lungiEdge: "#1d3f70", skin: ["#f0c09b", "#c98f68", "#d9a07a"], hair: "#2b211c", hairStyle: "balding", lota: "brass" },
  // 1: yellow vest, red check lungi, full black hair
  { vest: ["#f7e7a1", "#d8c477"], lungi: ["#a3242f", "#f2a3a3", "#f4d35e"], lungiEdge: "#6b1219", skin: ["#d9a57f", "#a97452", "#c38a64"], hair: "#151110", hairStyle: "full", lota: "steel" },
  // 2: old dada – grey vest, purple check, white hair, bald top
  { vest: ["#e6e8ec", "#b9bdc6"], lungi: ["#5b3c8f", "#c6a8f0", "#e6e1f5"], lungiEdge: "#35205c", skin: ["#c88f68", "#94603f", "#b07a55"], hair: "#e9e6df", hairStyle: "bald", lota: "brass" },
  // 3: sky-blue vest, brown check lungi, white Gandhi topi
  { vest: ["#bfe3f5", "#8fbcd6"], lungi: ["#7a4b26", "#e0b07a", "#3c8c5a"], lungiEdge: "#4a2b12", skin: ["#eab894", "#b98361", "#cf9a76"], hair: "#2b211c", hairStyle: "cap", lota: "steel" },
];

type Props = {
  /** where his feet touch the ground (720x1280 space) */
  x: number;
  y: number;
  /** rendered height in px */
  height: number;
  from: number;
  to: number;
  look?: number;
  /** which way he faces (and runs). Drawn facing left. */
  facing?: "left" | "right";
  /** 0..1 how strongly the train's headlight lights him */
  lit?: (frame: number) => number;
  /** frame the horn scares him (eyes pop, "!!"); undefined = never */
  scareAt?: number;
  /** frame he bolts off screen */
  runAt?: number;
  seed?: number;
};

export const Uncle: React.FC<Props> = ({ x, y, height, from, to, look = 0, facing = "left", lit, scareAt, runAt, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const L = LOOKS[look % LOOKS.length];
  const id = `u${seed}`;
  const f = frame - from;
  const s = height / 150;
  const flip = facing === "right" ? -1 : 1; // inner mirror
  const dir = facing === "right" ? 1 : -1; // screen-space run direction
  const light = lit ? lit(frame) : 0;

  const scared = scareAt !== undefined && frame >= scareAt;
  const sf = scareAt !== undefined ? frame - scareAt : -1;
  const running = runAt !== undefined && frame >= runAt;
  const rf = runAt !== undefined ? frame - runAt : -1;

  const bob = scared ? 0 : Math.sin((f + seed * 7) / 9) * 1.2;
  const jolt = scared && !running ? spring({ frame: sf, fps, config: { damping: 6, stiffness: 260 } }) : 0;
  const shakeX = scared && !running ? Math.sin(sf * 2.6 + seed) * 1.6 * Math.max(0, 1 - sf / 30) : 0;
  const hop = running ? interpolate(rf, [0, 4, 8], [0, -26 * s, -10 * s], clamp) : 0;
  const dashLen = 560;
  const dash = running ? dir * interpolate(rf, [2, 14], [0, dashLen], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  const tilt = running ? interpolate(rf, [0, 6], [0, -14], clamp) : 0;
  const legCycle = running ? Math.sin(rf * 1.9) : 0;

  const headTurn = scared ? 1 : 0;
  const eyeR = scared ? 5.2 : 3.4;
  const pupilR = scared ? 1.5 : 1.9;

  // night tint (cool, dim) -> headlight (warm, bright)
  const k = light;
  const rM = (0.5 + k * 0.62).toFixed(3);
  const gM = (0.55 + k * 0.5).toFixed(3);
  const bM = (0.78 + k * 0.22).toFixed(3);
  const lift = (0.02 * k).toFixed(3);

  // inner (mirrored) offset that keeps things left behind on the ground in screen space
  const stay = (-dash * flip) / s; // in svg units
  const stayPx = -dash * flip; // in inner px

  const notes = !scared
    ? [0, 1].map((i) => {
        const life = 40;
        const t = ((f + i * 20 + seed * 11) % life) / life;
        return (
          <text key={i} x={30 - t * 22 + i * 6} y={22 - t * 26} fontSize={11 + i * 2} fill="#ffe7a8" opacity={Math.sin(t * Math.PI) * 0.9} fontFamily="Montserrat, sans-serif" fontWeight={800}>
            {i ? "♫" : "♪"}
          </text>
        );
      })
    : null;

  const hairPath = (() => {
    if (L.hairStyle === "full")
      return headTurn ? "M45 30 C44 14 58 10 70 14 C76 17 79 22 79 28 C72 20 60 18 50 26 Z" : "M79 30 C80 14 66 10 54 14 C48 17 45 22 45 28 C52 20 64 18 74 26 Z";
    if (L.hairStyle === "bald") return headTurn ? "M46 36 C45 30 46 26 48 23" : "M78 36 C79 30 78 26 76 23";
    return headTurn ? "M48 26 C50 14 60 12 66 14 C60 16 54 20 52 30 Z" : "M64 18 C76 16 82 26 79 36 C77 30 72 24 64 22 Z";
  })();

  return (
    <div
      style={{
        position: "absolute",
        left: x - 70 * s,
        top: y - 146 * s,
        width: 140 * s,
        height: 150 * s,
        transform: `translate(${dash + shakeX}px, ${bob + hop - jolt * 6 * s}px)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, transform: `scaleX(${flip})` }}>
        {/* cast shadow */}
        <div
          style={{
            position: "absolute",
            left: 10 * s + (running ? stayPx : 0),
            top: 136 * s,
            width: 110 * s,
            height: 12 * s,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
            transform: `skewX(${35 * light * flip}deg)`,
            opacity: running ? Math.max(0, 1 - rf / 6) : 1,
          }}
        />
        <svg width={140 * s} height={150 * s} viewBox="0 0 140 150" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <filter id={`night${id}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={`${rM} 0 0 0 ${lift}  0 ${gM} 0 0 ${lift}  0 0 ${bM} 0 0  0 0 0 1 0`} />
            </filter>
            <pattern id={`check${id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
              <rect width="8" height="8" fill={L.lungi[0]} />
              <rect width="8" height="2.2" fill={L.lungi[1]} opacity="0.8" />
              <rect width="2.2" height="8" fill={L.lungi[2]} opacity="0.75" />
            </pattern>
            <linearGradient id={`skin${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={L.skin[0]} />
              <stop offset="100%" stopColor={L.skin[1]} />
            </linearGradient>
            <linearGradient id={`vest${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={L.vest[0]} />
              <stop offset="100%" stopColor={L.vest[1]} />
            </linearGradient>
            <radialGradient id={`lota${id}`} cx="0.35" cy="0.35" r="0.8">
              {L.lota === "brass" ? (
                <>
                  <stop offset="0%" stopColor="#ffe29a" />
                  <stop offset="55%" stopColor="#d79d3c" />
                  <stop offset="100%" stopColor="#8a5a1e" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#b9c2cc" />
                  <stop offset="100%" stopColor="#5d6670" />
                </>
              )}
            </radialGradient>
          </defs>

          <g filter={`url(#night${id})`}>
            {/* lota – stays behind (and wobbles) when he runs */}
            <g transform={running ? `translate(${stay}, ${-hop / s}) rotate(${Math.sin(rf * 0.9 + seed) * 18 * Math.max(0, 1 - rf / 40)} 22 128)` : undefined}>
              <ellipse cx="22" cy="127" rx="10" ry="9.5" fill={`url(#lota${id})`} />
              <rect x="17" y="113" width="10" height="7" rx="2" fill={L.lota === "brass" ? "#c48a34" : "#8e98a3"} />
              <ellipse cx="22" cy="113" rx="7.5" ry="2.6" fill={L.lota === "brass" ? "#ffd77a" : "#e8edf2"} />
              <path d="M12 121 q-7 -2 -8 -7" stroke={L.lota === "brass" ? "#c48a34" : "#8e98a3"} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>

            <g transform={`rotate(${tilt} 70 120)`}>
              {/* feet / chappals */}
              <rect x={92 + legCycle * 6} y="131" width="24" height="7" rx="3" fill="#4a3426" />
              <rect x={44 - legCycle * 6} y="133" width="28" height="7" rx="3" fill="#3a281d" />
              {/* shins */}
              <path d={`M${52 - legCycle * 4} 132 L${50 - legCycle * 2} 96`} stroke={`url(#skin${id})`} strokeWidth="12" strokeLinecap="round" />
              {/* lungi (tucked up) */}
              <path d="M100 92 C110 106 108 126 90 130 L50 120 C40 112 38 98 44 86 L84 82 Z" fill={`url(#check${id})`} />
              <path d="M100 92 C110 106 108 126 90 130" stroke={L.lungiEdge} strokeWidth="2" fill="none" />
              <path d="M60 86 C62 100 70 112 86 118" stroke={L.lungiEdge} strokeWidth="1.5" fill="none" opacity="0.7" />
              {/* torso: banian, leaning forward */}
              <path d="M98 94 C104 72 92 54 74 52 C62 52 54 62 55 74 C56 88 68 98 82 100 Z" fill={`url(#vest${id})`} />
              <path d="M66 56 C64 62 64 68 68 72" stroke={L.vest[1]} strokeWidth="2" fill="none" />
              {/* far arm resting on knee */}
              <path d="M66 62 L48 82 L38 96" stroke={`url(#skin${id})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="37" cy="98" r="5.5" fill={L.skin[2]} />
              {/* neck */}
              <rect x="62" y="40" width="12" height="16" rx="5" fill={L.skin[2]} />
              {/* head */}
              <g transform={`translate(${headTurn * 4}, ${-jolt * 3})`}>
                <circle cx="62" cy="32" r="17" fill={`url(#skin${id})`} />
                {L.hairStyle === "bald" ? (
                  <path d={hairPath} stroke={L.hair} strokeWidth="6" strokeLinecap="round" fill="none" />
                ) : (
                  <>
                    <path d={hairPath} fill={L.hair} />
                    {L.hairStyle !== "full" && (
                      <path d={headTurn ? "M47 34 C46 28 47 24 49 22" : "M77 40 C80 34 80 28 78 24"} stroke={L.hair} strokeWidth="5" strokeLinecap="round" fill="none" />
                    )}
                  </>
                )}
                {L.hairStyle === "cap" && (
                  // white Gandhi topi
                  <path d="M45 22 L79 20 L76 9 C66 4 54 5 47 12 Z" fill="#f6f4ee" stroke="#cfcabd" strokeWidth="1.5" />
                )}
                <ellipse cx={headTurn ? 56 : 70} cy="34" rx="3.2" ry="4.5" fill={L.skin[1]} />
                <ellipse cx={headTurn ? 70 : 52} cy="30" rx={eyeR} ry={eyeR * 1.1} fill="#fff" />
                <circle cx={(headTurn ? 70 : 52) + (headTurn ? 1.2 : -1.2)} cy="30.5" r={pupilR} fill="#1b1410" />
                <path d={headTurn ? `M65 ${23 - jolt * 4} L76 ${22 - jolt * 5}` : "M46 24 L57 23"} stroke={L.hairStyle === "bald" ? "#cfcac0" : L.hair} strokeWidth="2.4" strokeLinecap="round" />
                <path d={headTurn ? "M78 33 q4 2 0 5" : "M46 33 q-4 2 0 5"} stroke={L.skin[1]} strokeWidth="2" fill="none" />
                <path d={headTurn ? "M70 41 C74 38 80 39 82 43 C78 42 74 43 70 41 Z" : "M54 41 C50 38 44 39 42 43 C46 42 50 43 54 41 Z"} fill={L.hairStyle === "bald" ? "#e9e6df" : "#2b211c"} />
                {scared && <ellipse cx={headTurn ? 75 : 49} cy="46" rx="2.6" ry={2 + jolt * 1.6} fill="#5a2a22" />}
              </g>
              {/* near arm: hugging knee */}
              <path d="M80 60 L92 80 L82 92" stroke={`url(#skin${id})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="81" cy="93" r="6" fill={L.skin[2]} />
            </g>
          </g>
          {notes}
        </svg>

        {/* sweat drops */}
        {scared &&
          !running &&
          [0, 1].map((i) => {
            const t = ((sf + i * 7) % 16) / 16;
            return (
              <div key={i} style={{ position: "absolute", left: (92 + i * 10) * s, top: (10 + t * 24) * s, width: 6 * s, height: 9 * s, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "#9fdcff", opacity: 1 - t }} />
            );
          })}

        {/* dust puff + speed lines when he bolts (left behind on the ground) */}
        {running && rf < 22 && (
          <>
            {[0, 1, 2, 3, 4].map((i) => {
              const t = rf / 22;
              const r = (14 + i * 6) * s * (0.6 + t);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: (70 + i * 14) * s + stayPx * 0.85 - r / 2,
                    top: (120 - (i % 2) * 10) * s - r / 2,
                    width: r,
                    height: r,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(210,200,180,0.85), rgba(210,200,180,0))",
                    opacity: (1 - t) * 0.9,
                  }}
                />
              );
            })}
            {[0, 1, 2].map((i) => (
              <div
                key={`l${i}`}
                style={{
                  position: "absolute",
                  left: 110 * s,
                  top: (60 + i * 22) * s,
                  width: 90 * s,
                  height: 3 * s,
                  borderRadius: 3,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0))",
                  opacity: Math.max(0, 1 - rf / 12),
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* "!!" (not mirrored) */}
      {scared && !running && (
        <div
          style={{
            position: "absolute",
            left: (flip > 0 ? 66 : 50) * s,
            top: -34 * s,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 46 * s,
            color: "#FF3B4E",
            textShadow: "0 0 10px rgba(255,59,78,0.8), 0 2px 0 #fff",
            transform: `scale(${spring({ frame: sf, fps, config: { damping: 8, stiffness: 220 } })}) rotate(${Math.sin(sf / 2 + seed) * 8}deg)`,
          }}
        >
          !!
        </div>
      )}
    </div>
  );
};

/** Comic shout burst, e.g. "BHAAGO!!" */
export const Shout: React.FC<{ text: string; x: number; y: number; from: number; to: number; rot?: number; size?: number }> = ({ text, x, y, from, to, rot = -8, size = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const pop = spring({ frame: f, fps, config: { damping: 7, stiffness: 240 } });
  const out = interpolate(frame, [to - 5, to], [1, 0], clamp);
  const wob = Math.sin(f / 1.6) * 2.5;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop}) rotate(${rot + wob}deg)`, opacity: out }}>
      <svg width={size * 5.4} height={size * 2.4} viewBox="0 0 216 96" style={{ position: "absolute", left: -size * 0.6, top: -size * 0.55 }}>
        <path
          d="M8 48 L28 30 L20 8 L50 22 L72 4 L86 24 L114 6 L124 28 L158 10 L160 34 L200 22 L186 48 L210 66 L176 70 L184 92 L150 78 L128 94 L112 74 L80 92 L74 70 L38 86 L44 64 L6 66 Z"
          fill="#FFD23F"
          stroke="#1b1410"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ position: "relative", fontFamily: "'Bebas Neue', sans-serif", fontSize: size, color: "#E0262F", letterSpacing: 2, WebkitTextStroke: "1.5px #1b1410", whiteSpace: "nowrap", paddingLeft: size * 0.55, paddingTop: size * 0.12 }}>
        {text}
      </div>
    </div>
  );
};
