import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Props = {
  /** where his feet touch the ground (720x1280 space) */
  x: number;
  y: number;
  /** rendered height in px */
  height: number;
  from: number;
  to: number;
  /** 0..1 how strongly the train's headlight lights him */
  lit?: (frame: number) => number;
  /** frame the horn scares him (eyes pop, "!"); undefined = never */
  scareAt?: number;
  /** frame he bolts off screen */
  runAt?: number;
  seed?: number;
};

/**
 * Low-poly-style cartoon uncle squatting beside the track with his lota,
 * facing away from the line (classic Indian-railway gag, kept clean).
 * Drawn facing LEFT. viewBox 140 x 150.
 */
export const Uncle: React.FC<Props> = ({ x, y, height, from, to, lit, scareAt, runAt, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const f = frame - from;
  const s = height / 150;
  const light = lit ? lit(frame) : 0;

  const scared = scareAt !== undefined && frame >= scareAt;
  const sf = scareAt !== undefined ? frame - scareAt : -1;
  const running = runAt !== undefined && frame >= runAt;
  const rf = runAt !== undefined ? frame - runAt : -1;

  // idle breathing / bobbing
  const bob = scared ? 0 : Math.sin((f + seed * 7) / 9) * 1.2;
  // jolt when scared
  const jolt = scared && !running ? spring({ frame: sf, fps, config: { damping: 6, stiffness: 260 } }) : 0;
  const shakeX = scared && !running ? Math.sin(sf * 2.6) * 1.6 * Math.max(0, 1 - sf / 30) : 0;
  // run: hop up then dash left
  const hop = running ? interpolate(rf, [0, 4, 8], [0, -26, -10], clamp) : 0;
  const dash = running ? interpolate(rf, [2, 14], [0, -520], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  const tilt = running ? interpolate(rf, [0, 6], [0, -14], clamp) : 0;
  const legCycle = running ? Math.sin(rf * 1.9) : 0;

  const headTurn = scared ? 1 : 0; // looks back over shoulder toward the train
  const eyeR = scared ? 5.2 : 3.4;
  const pupilR = scared ? 1.5 : 1.9;

  // night tint (cool, dim) -> headlight (warm, bright)
  const k = light;
  const rM = (0.5 + k * 0.62).toFixed(3);
  const gM = (0.55 + k * 0.5).toFixed(3);
  const bM = (0.78 + k * 0.22).toFixed(3);
  const lift = (0.02 * k).toFixed(3);

  // humming notes while idle
  const notes = !scared
    ? [0, 1].map((i) => {
        const life = 40;
        const t = ((f + i * 20 + seed * 11) % life) / life;
        return (
          <text
            key={i}
            x={30 - t * 22 + i * 6}
            y={22 - t * 26}
            fontSize={11 + i * 2}
            fill="#ffe7a8"
            opacity={Math.sin(t * Math.PI) * 0.9}
            fontFamily="Montserrat, sans-serif"
            fontWeight={800}
          >
            {i ? "♫" : "♪"}
          </text>
        );
      })
    : null;

  return (
    <div
      style={{
        position: "absolute",
        left: x - 70 * s,
        top: y - 146 * s,
        width: 140 * s,
        height: 150 * s,
        transform: `translate(${dash + shakeX}px, ${bob + hop - jolt * 6}px)`,
      }}
    >
      {/* cast shadow (light comes from the train, up-right) */}
      <div
        style={{
          position: "absolute",
          left: running ? 30 * s - dash * 0.0 : 10 * s,
          top: 136 * s,
          width: 110 * s,
          height: 12 * s,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          transform: `skewX(${35 * light}deg) translateX(${-20 * light * s}px)`,
          opacity: running ? Math.max(0, 1 - rf / 6) : 1,
        }}
      />
      <svg
        width={140 * s}
        height={150 * s}
        viewBox="0 0 140 150"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <filter id={`night${seed}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`${rM} 0 0 0 ${lift}  0 ${gM} 0 0 ${lift}  0 0 ${bM} 0 0  0 0 0 1 0`} />
          </filter>
          <pattern id={`check${seed}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <rect width="8" height="8" fill="#2f5d9e" />
            <rect width="8" height="2.2" fill="#86b6ea" opacity="0.8" />
            <rect width="2.2" height="8" fill="#3fae7a" opacity="0.75" />
          </pattern>
          <linearGradient id={`skin${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0c09b" />
            <stop offset="100%" stopColor="#c98f68" />
          </linearGradient>
          <linearGradient id={`vest${seed}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fbf8f1" />
            <stop offset="100%" stopColor="#d6d0c2" />
          </linearGradient>
          <radialGradient id={`brass${seed}`} cx="0.35" cy="0.35" r="0.8">
            <stop offset="0%" stopColor="#ffe29a" />
            <stop offset="55%" stopColor="#d79d3c" />
            <stop offset="100%" stopColor="#8a5a1e" />
          </radialGradient>
        </defs>

        <g filter={`url(#night${seed})`}>
        {/* lota – stays behind when he runs */}
        <g transform={running ? `translate(${-dash}, ${-hop}) rotate(${Math.sin(rf * 0.9) * 18 * Math.max(0, 1 - rf / 40)} 22 128)` : undefined}>
          <ellipse cx="22" cy="127" rx="10" ry="9.5" fill={`url(#brass${seed})`} />
          <rect x="17" y="113" width="10" height="7" rx="2" fill="#c48a34" />
          <ellipse cx="22" cy="113" rx="7.5" ry="2.6" fill="#ffd77a" />
          <path d="M12 121 q-7 -2 -8 -7" stroke="#c48a34" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>

        <g transform={`rotate(${tilt} 70 120)`}>
          {/* feet / chappals */}
          <rect x={92 + legCycle * 6} y="131" width="24" height="7" rx="3" fill="#4a3426" />
          <rect x={44 - legCycle * 6} y="133" width="28" height="7" rx="3" fill="#3a281d" />
          {/* shins */}
          <path d={`M${52 - legCycle * 4} 132 L${50 - legCycle * 2} 96`} stroke={`url(#skin${seed})`} strokeWidth="12" strokeLinecap="round" />
          {/* lungi (tucked up) */}
          <path d="M100 92 C110 106 108 126 90 130 L50 120 C40 112 38 98 44 86 L84 82 Z" fill={`url(#check${seed})`} />
          <path d="M100 92 C110 106 108 126 90 130" stroke="#1d3f70" strokeWidth="2" fill="none" />
          <path d="M60 86 C62 100 70 112 86 118" stroke="#1d3f70" strokeWidth="1.5" fill="none" opacity="0.7" />
          {/* torso: white banian, leaning forward */}
          <path d="M98 94 C104 72 92 54 74 52 C62 52 54 62 55 74 C56 88 68 98 82 100 Z" fill={`url(#vest${seed})`} />
          <path d="M66 56 C64 62 64 68 68 72" stroke="#c9c1b0" strokeWidth="2" fill="none" />
          {/* far arm resting on knee, hand dangling */}
          <path d="M66 62 L48 82 L38 96" stroke={`url(#skin${seed})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="37" cy="98" r="5.5" fill="#d9a07a" />
          {/* neck */}
          <rect x="62" y="40" width="12" height="16" rx="5" fill="#d9a07a" />
          {/* head */}
          <g transform={`translate(${headTurn * 4}, ${-jolt * 3})`}>
            <circle cx="62" cy="32" r="17" fill={`url(#skin${seed})`} />
            {/* hair (balding on top – uncle style) */}
            <path d={headTurn ? "M48 26 C50 14 60 12 66 14 C60 16 54 20 52 30 Z" : "M64 18 C76 16 82 26 79 36 C77 30 72 24 64 22 Z"} fill="#2b211c" />
            <path d={headTurn ? "M47 34 C46 28 47 24 49 22" : "M77 40 C80 34 80 28 78 24"} stroke="#2b211c" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* ear */}
            <ellipse cx={headTurn ? 56 : 70} cy="34" rx="3.2" ry="4.5" fill="#c98f68" />
            {/* eye – looks forward (left) idle, back toward train (right) when scared */}
            <ellipse cx={headTurn ? 70 : 52} cy="30" rx={eyeR} ry={eyeR * 1.1} fill="#fff" />
            <circle cx={(headTurn ? 70 : 52) + (headTurn ? 1.2 : -1.2)} cy="30.5" r={pupilR} fill="#1b1410" />
            {/* eyebrow */}
            <path d={headTurn ? `M65 ${23 - jolt * 4} L76 ${22 - jolt * 5}` : "M46 24 L57 23"} stroke="#2b211c" strokeWidth="2.4" strokeLinecap="round" />
            {/* nose + moustache */}
            <path d={headTurn ? "M78 33 q4 2 0 5" : "M46 33 q-4 2 0 5"} stroke="#b97f5a" strokeWidth="2" fill="none" />
            <path d={headTurn ? "M70 41 C74 38 80 39 82 43 C78 42 74 43 70 41 Z" : "M54 41 C50 38 44 39 42 43 C46 42 50 43 54 41 Z"} fill="#2b211c" />
            {/* mouth – "O" when scared */}
            {scared && <ellipse cx={headTurn ? 75 : 49} cy="46" rx="2.6" ry={2 + jolt * 1.6} fill="#5a2a22" />}
          </g>
          {/* near arm: hugging knee */}
          <path d="M80 60 L92 80 L82 92" stroke={`url(#skin${seed})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="81" cy="93" r="6" fill="#e0a984" />
        </g>
        </g>
        {notes}
      </svg>

      {/* "!" + sweat when the horn blows */}
      {scared && !running && (
        <>
          <div
            style={{
              position: "absolute",
              left: 66 * s,
              top: -34 * s,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 46 * s,
              color: "#FF3B4E",
              textShadow: "0 0 10px rgba(255,59,78,0.8), 0 2px 0 #fff",
              transform: `scale(${spring({ frame: sf, fps, config: { damping: 8, stiffness: 220 } })}) rotate(${Math.sin(sf / 2) * 8}deg)`,
            }}
          >
            !!
          </div>
          {[0, 1].map((i) => {
            const t = ((sf + i * 7) % 16) / 16;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: (92 + i * 10) * s,
                  top: (10 + t * 24) * s,
                  width: 6 * s,
                  height: 9 * s,
                  borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                  background: "#9fdcff",
                  opacity: 1 - t,
                }}
              />
            );
          })}
        </>
      )}

      {/* dust puff + speed lines when he bolts */}
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
                  left: (70 + i * 14) * s - dash - r / 2,
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
  );
};
