/**
 * Sleeping passenger on the berth, built with the same 3D berth pieces as
 * the rebuilt reel (World / Slab / CheckPattern), plus the follow slate.
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, s } from "../rail/theme";
import { BerthTop, ChadarTop, CheckPattern, CoachBackdrop, PillowTop, Slab, World, useCam } from "../rail/parts";
import { BrandBadge } from "../remix/fx";

const BW = 640;
const BH = 1700;
const BZ = 70;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Face: React.FC<{ eyes: number }> = ({ eyes }) => (
  <svg width="100%" height="100%" viewBox="0 0 180 200" preserveAspectRatio="none" style={{ display: "block" }}>
    <defs>
      <radialGradient id="slFace" cx="45%" cy="55%" r="65%">
        <stop offset="0" stopColor="#C88A60" />
        <stop offset="1" stopColor={C.skinShade} />
      </radialGradient>
    </defs>
    <rect width="180" height="200" fill="url(#slFace)" />
    {/* hair toward the pillow end */}
    <path d="M 0 0 L 180 0 L 180 70 Q 150 52 90 56 Q 30 52 0 70 Z" fill={C.hair} />
    {eyes < 0.3 ? (
      <>
        <path d="M 46 104 Q 60 114 74 104" stroke="#2B1B14" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 106 104 Q 120 114 134 104" stroke="#2B1B14" strokeWidth="6" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        {[60, 120].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="104" rx={10 + 6 * eyes} ry={8 + 9 * eyes} fill="#FFFFFF" stroke="#2B1B14" strokeWidth="3" />
            <circle cx={x} cy="106" r={5 + 2 * eyes} fill="#2B1B14" />
          </g>
        ))}
      </>
    )}
    <path d="M 90 118 Q 98 136 88 140" stroke="#8A5232" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d={eyes > 0.5 ? "M 74 162 Q 90 152 106 162" : "M 74 158 Q 90 168 106 158"} stroke="#6B2A20" strokeWidth="6" fill="none" strokeLinecap="round" />
  </svg>
);

/** Passenger asleep (or waking up / covered) on the 3D berth at night. */
export const Sleeper: React.FC<{ wake?: boolean; cover?: boolean; slate?: boolean }> = ({ wake = false, cover = false, slate = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCam(
    wake
      ? [
          { t: 0, rx: 50, rz: -24, s: 1.3, x: 20, y: 520 },
          { t: 0.5, rx: 40, rz: -16, s: 2.3, x: 60, y: 1080 },
          { t: 2.0, rx: 38, rz: -14, s: 2.4, x: 60, y: 1100 },
        ]
      : [
          { t: 0, rx: 52, rz: -26, s: 1.15, x: 20, y: 380 },
          { t: 4, rx: 50, rz: -24, s: 1.3, x: 20, y: 520 },
          { t: 6, rx: 50, rz: -24, s: 1.3, x: 20, y: 520 },
        ],
  );
  const eyes = wake ? spring({ frame: frame - 10, fps, config: { damping: 9, stiffness: 260 } }) : 0;
  const bang = wake ? spring({ frame: frame - 14, fps, config: { damping: 8, stiffness: 260 } }) : 0;
  const breathe = Math.sin(frame / 13) * 3;
  const lamp = wake ? interpolate(frame, [10, 18], [0, 1], clamp) : 0;
  const thumb = cover ? spring({ frame: frame - s(0.8), fps, config: { damping: 9, stiffness: 200 } }) * interpolate(frame, [s(2.4), s(2.8)], [1, 0], clamp) : 0;
  const slateIn = slate ? interpolate(frame, [s(3.0), s(3.5)], [0, 1], clamp) : 0;
  const btn = slate ? spring({ frame: frame - s(3.5), fps, config: { damping: 10, stiffness: 180 } }) : 0;
  const tap = 1 + Math.max(0, Math.sin((frame - s(4)) / 4)) * 0.05;
  return (
    <AbsoluteFill>
      <CoachBackdrop lamp={false} />
      <World cam={cam} w={BW} h={BH}>
        <Slab x={0} y={0} w={BW} h={BH} thick={BZ} side={C.berthSide} radius={44}>
          <BerthTop />
        </Slab>
        <Slab x={110} y={60} w={420} h={210} thick={46} z={BZ} side={C.sheetSide} radius={80}>
          <PillowTop />
        </Slab>
        {/* head on the pillow */}
        <Slab x={230} y={110} w={180} h={200} thick={64} z={BZ + 30} side={C.skinShade} radius={90} shadow={false}>
          <Face eyes={eyes} />
        </Slab>
        {/* body under the blanket */}
        <Slab x={70} y={300} w={500} h={1300} thick={64 + breathe} z={BZ} side={C.blanketSide} radius={70}>
          <CheckPattern w={500} h={1300} />
        </Slab>
        {cover && (
          <Slab x={60} y={292} w={520} h={1316} thick={6} z={BZ + 66 + breathe} side={C.sheetSide} radius={70} shadow={false}>
            <ChadarTop w={520} h={1316} big />
          </Slab>
        )}
      </World>

      {/* night grade + reading lamp */}
      <AbsoluteFill style={{ background: "rgba(12,22,60,0.48)", opacity: 1 - lamp * 0.6 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 35%, rgba(255,226,160,0.45), rgba(255,226,160,0) 60%)", opacity: lamp }} />

      {/* Zzz */}
      {!wake &&
        [0, 1, 2].map((i) => {
          const t = ((frame + i * 18) % 54) / 54;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 560 + t * 160,
                top: 640 - t * 260,
                fontFamily: FONT.title,
                fontWeight: 800,
                fontSize: 70 + i * 18,
                color: "#E8EEFF",
                opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0], clamp),
                textShadow: "0 4px 14px rgba(0,0,0,0.4)",
              }}
            >
              Z
            </div>
          );
        })}
      {wake && (
        <div
          style={{
            position: "absolute",
            left: 760,
            top: 420,
            transform: `scale(${bang}) rotate(12deg)`,
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 280,
            color: C.accent,
            WebkitTextStroke: "10px #FFFFFF",
          }}
        >
          !
        </div>
      )}
      {cover && (
        <div style={{ position: "absolute", left: 700, top: 900, fontSize: 170, transform: `translate(-50%,-50%) scale(${thumb}) rotate(-10deg)`, filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.35))" }}>
          👍
        </div>
      )}

      {slate && (
        <AbsoluteFill
          style={{
            opacity: slateIn,
            background: "linear-gradient(180deg, rgba(163,25,46,0.88), rgba(21,23,28,0.92))",
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
          }}
        >
          <BrandBadge big color={C.accent} />
          <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 64, color: "#FFFFFF", textAlign: "center", lineHeight: 1.15 }}>
            Aise hi 1-minute
            <br />
            explainers ke liye 👇
          </div>
          <div
            style={{
              transform: `scale(${btn * tap})`,
              background: "#FFD23F",
              color: C.ink,
              fontFamily: FONT.title,
              fontWeight: 800,
              fontSize: 72,
              padding: "18px 80px",
              borderRadius: 999,
              border: "8px solid #FFFFFF",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            }}
          >
            Follow karo 🔔
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Short "⏪ Flashback" rewind overlay. */
export const Flashback: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 4, 16, 22], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 4px, rgba(0,0,0,0.22) 4px 10px)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 90, color: "#FFFFFF", background: C.ink, padding: "14px 40px", borderRadius: 30 }}>⏪ Flashback</div>
    </AbsoluteFill>
  );
};
