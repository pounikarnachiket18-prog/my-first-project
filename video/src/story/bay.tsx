/**
 * Side-on view of a sleeper bay (a camera angle the reference never uses):
 * window, upper berth, lower berth with a passenger asleep under the blanket.
 * Used for the cold open (night), the solution (day, empty) and the ending.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BRAND, C, FONT } from "../rail/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// blanket outline over a body lying on its back, head on the left
const BODY = "M 300 1252 C 300 1190 322 1150 360 1146 C 420 1138 470 1118 540 1122 C 610 1126 640 1158 690 1156 C 750 1152 790 1104 860 1110 C 930 1116 980 1160 1000 1196 L 1012 1252 Z";

export const Bay: React.FC<{
  night?: boolean;
  person?: boolean;
  eyes?: number; // 0 closed → 1 wide open
  cover?: number; // 0 blanket → 1 white chadar cover over it
  zzz?: boolean;
  lamp?: number; // reading lamp glow 0..1
}> = ({ night = false, person = true, eyes = 0, cover = 0, zzz = false, lamp = 0 }) => {
  const frame = useCurrentFrame();
  const breathe = person ? 1 + Math.sin(frame / 13) * 0.018 : 1;
  const poles = Array.from({ length: 6 }).map((_, i) => ((i * 220 - frame * (night ? 9 : 14)) % 1320 + 1320) % 1320 - 120);
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="bWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.wall} />
          <stop offset="1" stopColor={C.wallShade} />
        </linearGradient>
        <linearGradient id="bSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#0B1634" : "#BFE1FF"} />
          <stop offset="1" stopColor={night ? "#28407A" : "#EEF7FF"} />
        </linearGradient>
        <linearGradient id="bCushion" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.berthEdge} />
          <stop offset="0.35" stopColor={C.berth} />
          <stop offset="1" stopColor={C.berthSide} />
        </linearGradient>
        <pattern id="bCheck" width="170" height="170" patternUnits="userSpaceOnUse">
          <rect width="170" height="170" fill={C.blanket} />
          <rect x="70" width="7" height="170" fill={C.blanketStripe} />
          <rect x="84" width="4" height="170" fill={C.blanketStripe2} />
          <rect y="70" width="170" height="7" fill={C.blanketStripe} />
          <rect y="84" width="170" height="4" fill={C.blanketStripe2} />
        </pattern>
        <radialGradient id="bShade" cx="40%" cy="20%" r="90%">
          <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        <radialGradient id="bLamp" cx="50%" cy="0%" r="100%">
          <stop offset="0" stopColor="rgba(255,226,160,0.55)" />
          <stop offset="1" stopColor="rgba(255,226,160,0)" />
        </radialGradient>
        <clipPath id="bWin">
          <rect x="150" y="330" width="780" height="420" rx="44" />
        </clipPath>
      </defs>

      {/* wall + window */}
      <rect width="1080" height="1920" fill="url(#bWall)" />
      <g clipPath="url(#bWin)">
        <rect x="150" y="330" width="780" height="420" fill="url(#bSky)" />
        {night ? (
          <>
            <circle cx="760" cy="430" r="46" fill="#F4F1DE" />
            <circle cx="782" cy="418" r="44" fill="#1A2A55" />
            {Array.from({ length: 14 }).map((_, i) => (
              <circle key={i} cx={(i * 137 + 180) % 760 + 160} cy={(i * 71) % 220 + 350} r={i % 3 ? 2.5 : 4} fill="#FFFFFF" opacity={0.5 + 0.5 * Math.abs(Math.sin((frame + i * 9) / 18))} />
            ))}
            <path d="M 150 700 Q 300 640 450 690 T 760 660 T 930 690 L 930 750 L 150 750 Z" fill="#101C3E" />
          </>
        ) : (
          <path d="M 150 690 Q 320 610 480 680 T 800 640 T 930 680 L 930 750 L 150 750 Z" fill="#9CCB8C" />
        )}
        {poles.map((x, i) => (
          <rect key={i} x={x} y="330" width="16" height="420" fill={night ? "rgba(5,10,30,0.8)" : "rgba(60,70,80,0.55)"} />
        ))}
      </g>
      <rect x="150" y="330" width="780" height="420" rx="44" fill="none" stroke="#FFFFFF" strokeWidth="20" />
      <rect x="140" y="534" width="800" height="12" fill="#FFFFFF" opacity="0.9" />
      {/* curtain */}
      <path d="M 900 300 q 70 160 10 470 l 160 0 l 0 -470 z" fill={C.curtain} />
      <path d="M 930 300 l 0 470" stroke="rgba(0,0,0,0.15)" strokeWidth="10" />
      {/* reading lamp */}
      <rect x="96" y="840" width="92" height="40" rx="10" fill="#3A3A40" />
      <rect x="0" y="840" width="1080" height="1100" fill="url(#bLamp)" opacity={lamp} />

      {/* upper berth edge */}
      <rect x="-20" y="900" width="1120" height="62" rx="18" fill="url(#bCushion)" />
      <rect x="-20" y="958" width="1120" height="26" fill={C.berthSide} />

      {/* lower berth */}
      <rect x="40" y="1236" width="1000" height="128" rx="34" fill="url(#bCushion)" />
      <rect x="70" y="1250" width="940" height="10" rx="5" fill="rgba(255,255,255,0.18)" />
      <rect x="40" y="1352" width="1000" height="170" rx="10" fill={C.berthSide} />
      <rect x="0" y="1520" width="1080" height="400" fill={C.wallDeep} />
      <rect x="0" y="1520" width="1080" height="16" fill="rgba(0,0,0,0.12)" />

      {/* pillow */}
      <rect x="64" y="1150" width="280" height="104" rx="52" fill="#FFFFFF" />
      <rect x="64" y="1150" width="280" height="104" rx="52" fill="url(#bShade)" opacity="0.35" />

      {person && (
        <>
          {/* head (lying on back, profile) */}
          <circle cx="250" cy="1150" r="76" fill={C.skin} />
          <path d="M 176 1170 C 168 1100 210 1068 262 1070 C 300 1072 318 1090 322 1104 C 290 1096 260 1102 238 1120 C 214 1140 200 1166 176 1170 Z" fill={C.hair} />
          <ellipse cx="226" cy="1160" rx="13" ry="18" fill={C.skinShade} />
          {/* nose + mouth */}
          <path d="M 318 1130 Q 342 1140 322 1156" stroke={C.skinShade} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 300 1188 Q 312 1194 322 1186" stroke="#6B2A20" strokeWidth="6" fill="none" strokeLinecap="round" />
          {/* eye: closed arc ↔ open */}
          {eyes < 0.3 ? (
            <path d="M 280 1122 Q 294 1132 306 1122" stroke="#2B1B14" strokeWidth="6" fill="none" strokeLinecap="round" />
          ) : (
            <g>
              <ellipse cx="294" cy="1122" rx={10 + 6 * eyes} ry={9 + 9 * eyes} fill="#FFFFFF" stroke="#2B1B14" strokeWidth="3" />
              <circle cx="298" cy="1124" r={5 + 2 * eyes} fill="#2B1B14" />
            </g>
          )}
          {eyes > 0.6 && <path d="M 276 1094 L 312 1100" stroke={C.hair} strokeWidth="7" strokeLinecap="round" />}
        </>
      )}

      {/* blanket over the body (or empty berth) */}
      {person && (
        <g transform={`translate(0 1252) scale(1 ${breathe}) translate(0 -1252)`}>
          <path d={BODY} fill="url(#bCheck)" />
          <path d={BODY} fill="url(#bShade)" />
          {cover > 0 && (
            <g opacity={cover}>
              <path d={BODY} fill="#FFFFFF" transform="translate(-8 -6)" />
              <path d={BODY} fill="none" stroke={C.brandPrint} strokeWidth="8" strokeDasharray="22 10" transform="translate(-8 -6)" />
              <text x="680" y="1218" textAnchor="middle" fontFamily={FONT.title} fontWeight={800} fontSize="44" fill={C.brandPrint}>
                {BRAND.hindi}
              </text>
              {/* blanket check peeking out at the feet */}
              <path d="M 990 1196 L 1012 1252 L 975 1252 Z" fill="url(#bCheck)" />
            </g>
          )}
          {/* fold at the chin */}
          <path d="M 330 1150 C 360 1140 400 1134 430 1136" stroke={cover > 0.5 ? "#E6DDD0" : C.blanketStripe2} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )}

      {/* Zzz */}
      {zzz &&
        [0, 1, 2].map((i) => {
          const t = ((frame + i * 18) % 54) / 54;
          return (
            <text
              key={i}
              x={340 + t * 120}
              y={1060 - t * 200}
              fontFamily={FONT.title}
              fontWeight={800}
              fontSize={52 + i * 14}
              fill={night ? "#E8EEFF" : C.ink}
              opacity={interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0], clamp)}
            >
              Z
            </text>
          );
        })}

      {/* night grade */}
      {night && (
        <>
          <rect width="1080" height="1920" fill="rgba(12,22,60,0.5)" />
          <polygon points="150,750 930,750 1040,1520 40,1520" fill="rgba(180,200,255,0.10)" />
          <rect x="0" y="840" width="1080" height="1100" fill="url(#bLamp)" opacity={lamp * 0.9} />
        </>
      )}
    </svg>
  );
};
