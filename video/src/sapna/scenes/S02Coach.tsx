import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";
import { Chip, Headline, popStyle, usePop } from "../ui";

// Coach geometry (screen space before camera transform)
const X0 = 280;
const X1 = 800;
const Y0 = 250;
const Y1 = 1750;
const AISLE_X = 640;
const BAY_H = (Y1 - Y0) / 6;

const SHIRTS = ["#F59E0B", "#10B981", "#6366F1", "#EF4444", "#14B8A6", "#8B5CF6", "#F97316", "#0EA5E9"];
const HAIR = ["#2B1B12", "#3B2A20", "#1A1A1A", "#5B3A29", "#9CA3AF"];

const Person: React.FC<{ x: number; y: number; facing: 1 | -1; seed: string; shirt?: string; hair?: string }> = ({
  x,
  y,
  facing,
  seed,
  shirt,
  hair,
}) => {
  const sh = shirt ?? SHIRTS[Math.floor(random(seed + "s") * SHIRTS.length)];
  const hr = hair ?? HAIR[Math.floor(random(seed + "h") * HAIR.length)];
  return (
    <g>
      {/* legs toward the facing direction */}
      <rect x={x - 22} y={facing === 1 ? y + 4 : y - 56} width={18} height={52} rx={9} fill="#334155" />
      <rect x={x + 4} y={facing === 1 ? y + 4 : y - 56} width={18} height={52} rx={9} fill="#334155" />
      <ellipse cx={x + 4} cy={y + 6} rx={38} ry={22} fill="rgba(0,0,0,0.15)" />
      <ellipse cx={x} cy={y} rx={38} ry={22} fill={sh} />
      <circle cx={x} cy={y - facing * 4} r={19} fill={hr} />
    </g>
  );
};

/** Scene 2: drone rises over the coach, the roof turns to glass, push in on Riya. */
export const S02Coach: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const roof = interpolate(frame, [25, 70], [1, 0.07], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const sweep = interpolate(frame, [25, 75], [-600, 1600], clamp);
  const push = spring({ frame: frame - 85, fps, config: { damping: 22, stiffness: 60 } });
  const scale = interpolate(push, [0, 1], [0.78, 1.75]);

  // Riya: bay 3, window seat on bench A (faces down)
  const riya = { x: 340, y: Y0 + BAY_H * 3 + 58 };
  const tx = interpolate(push, [0, 1], [0, 540 - riya.x]);
  const ty = interpolate(push, [0, 1], [0, 1120 - riya.y]);

  const groundShift = (frame * 22) % 240;
  const chaiY = Y0 + 80 + frame * 5.5;
  const pulse = 1 + Math.sin(frame / 4) * 0.08;
  const label = usePop(150);

  const bays = new Array(6).fill(0).map((_, b) => Y0 + b * BAY_H);

  return (
    <AbsoluteFill style={{ background: C.field, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${riya.x}px ${riya.y}px`,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }}
      >
        <svg width={1080} height={1920} style={{ overflow: "visible", position: "absolute" }}>
          {/* passing ground */}
          <g transform={`translate(0 ${groundShift})`}>
            {new Array(14).fill(0).map((_, i) => (
              <g key={i}>
                <rect x={-600} y={-480 + i * 240} width={820} height={230} fill={i % 3 === 0 ? C.mustard : i % 2 ? C.fieldLight : C.field} />
                <rect x={870} y={-480 + i * 240} width={820} height={230} fill={i % 2 ? C.fieldDark : C.fieldLight} />
                <circle cx={150} cy={-380 + i * 240} r={34} fill={C.tree} />
                <circle cx={950} cy={-300 + i * 240} r={40} fill={C.treeDark} />
              </g>
            ))}
            <rect x={210} y={-600} width={660} height={3600} fill={C.ballast} />
            {new Array(90).fill(0).map((_, i) => (
              <rect key={i} x={250} y={-600 + i * 40} width={580} height={14} fill="#8A6A4A" opacity={0.7} />
            ))}
          </g>
          {/* neighbouring coaches */}
          <rect x={X0} y={-1300} width={X1 - X0} height={Y0 - 20 + 1300} rx={20} fill={C.train} />
          <rect x={X0} y={Y1 + 20} width={X1 - X0} height={1400} rx={20} fill={C.train} />
          <rect x={X0 + 20} y={-1300} width={X1 - X0 - 40} height={Y0 - 40 + 1300} rx={14} fill="#5DB8F7" />
          <rect x={X0 + 20} y={Y1 + 40} width={X1 - X0 - 40} height={1400} rx={14} fill="#5DB8F7" />

          {/* coach shell + floor */}
          <rect x={X0 + 10} y={Y0 + 14} width={X1 - X0} height={Y1 - Y0} rx={26} fill="rgba(0,0,0,0.25)" />
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} rx={26} fill={C.train} />
          <rect x={X0 + 16} y={Y0 + 16} width={X1 - X0 - 32} height={Y1 - Y0 - 32} rx={14} fill="#EEF2F7" />
          <rect x={AISLE_X} y={Y0 + 16} width={60} height={Y1 - Y0 - 32} fill="#DCE3EC" />

          {bays.map((by, b) => (
            <g key={b}>
              {/* windows */}
              <rect x={X0 + 2} y={by + 60} width={12} height={130} rx={4} fill="#BFE7FF" />
              <rect x={X1 - 14} y={by + 60} width={12} height={130} rx={4} fill="#BFE7FF" />
              {/* facing benches */}
              <rect x={X0 + 20} y={by + 18} width={AISLE_X - X0 - 26} height={62} rx={12} fill="#2F6FA8" />
              <rect x={X0 + 20} y={by + BAY_H - 80} width={AISLE_X - X0 - 26} height={62} rx={12} fill="#2F6FA8" />
              <rect x={X0 + 20} y={by + BAY_H / 2 - 22} width={70} height={44} rx={6} fill="#C9B79C" />
              {/* side berth */}
              <rect x={AISLE_X + 64} y={by + 20} width={X1 - AISLE_X - 82} height={BAY_H - 40} rx={12} fill="#2F6FA8" />
              {/* passengers */}
              {[350, 450, 550].map((px, k) =>
                random(`a${b}${k}`) > 0.25 && !(b === 3 && k === 0) ? (
                  <Person key={`a${k}`} x={px} y={by + 58} facing={1} seed={`a${b}${k}`} />
                ) : null,
              )}
              {[350, 450, 550].map((px, k) =>
                random(`b${b}${k}`) > 0.3 ? <Person key={`b${k}`} x={px} y={by + BAY_H - 50} facing={-1} seed={`b${b}${k}`} /> : null,
              )}
              {b === 1 ? (
                <g>
                  {/* family tiffin */}
                  <circle cx={X0 + 55} cy={by + BAY_H / 2} r={14} fill="#E5E7EB" stroke="#9CA3AF" strokeWidth={3} />
                  <circle cx={X0 + 55} cy={by + BAY_H / 2} r={7} fill="#F59E0B" />
                </g>
              ) : null}
              {b === 2 ? (
                <g>
                  {/* student sleeping on side berth */}
                  <rect x={AISLE_X + 74} y={by + 40} width={56} height={160} rx={26} fill="#6366F1" />
                  <circle cx={AISLE_X + 102} cy={by + 52} r={20} fill="#1A1A1A" />
                </g>
              ) : null}
            </g>
          ))}

          {/* Riya */}
          <g>
            <circle cx={riya.x} cy={riya.y} r={58 * pulse} fill="none" stroke={C.stripe} strokeWidth={8} opacity={interpolate(frame, [80, 100], [0, 1], clamp)} />
            <Person x={riya.x} y={riya.y} facing={1} seed="riya" shirt={C.pink} hair="#2B1B12" />
            <rect x={riya.x - 13} y={riya.y + 26} width={26} height={40} rx={5} fill={C.ink} />
            <rect x={riya.x - 10} y={riya.y + 29} width={20} height={34} rx={3} fill="#7DD3FC" opacity={0.8 + Math.sin(frame / 3) * 0.2} />
          </g>

          {/* chaiwala in the aisle */}
          <g transform={`translate(${AISLE_X + 30} ${chaiY})`}>
            <ellipse cx={0} cy={0} rx={34} ry={20} fill="#F1F5F9" />
            <circle cx={0} cy={2} r={17} fill="#3B2A20" />
            <circle cx={30} cy={22} r={13} fill="#CBD5E1" stroke="#64748B" strokeWidth={3} />
          </g>

          {/* roof that turns to glass */}
          <g opacity={roof}>
            <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} rx={26} fill={C.train} />
            <rect x={X0 + 22} y={Y0 + 22} width={X1 - X0 - 44} height={Y1 - Y0 - 44} rx={16} fill="#5DB8F7" />
            <rect x={X0 + 22} y={(Y0 + Y1) / 2 - 10} width={X1 - X0 - 44} height={20} fill={C.stripe} />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={480} y={Y0 + 120 + i * 300} width={120} height={50} rx={12} fill="rgba(255,255,255,0.4)" />
            ))}
            <text x={540} y={Y0 + 520} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={120} fill="rgba(255,255,255,0.85)">
              S4
            </text>
          </g>
          {/* glass shine sweep */}
          <rect
            x={sweep}
            y={Y0 - 200}
            width={160}
            height={2000}
            fill="rgba(255,255,255,0.55)"
            transform={`rotate(20 ${sweep} ${Y0})`}
            opacity={interpolate(frame, [25, 40, 70, 80], [0, 1, 1, 0], clamp)}
          />
        </svg>
      </div>

      <Headline lines={[["Andar", "chalo..."]]} delay={4} top={210} exitAt={95} />
      <Headline
        lines={[
          ["Riya", "ka", "sawaal:"],
          [
            { t: "Main", c: C.stripe },
            { t: "kahan", c: C.stripe },
            { t: "pahunchi?", c: C.stripe },
          ],
        ]}
        delay={105}
        top={210}
        size={80}
      />
      <div style={{ position: "absolute", left: 600, top: 940, ...popStyle(label), transformOrigin: "left center" }}>
        <Chip color={C.pink} size={38}>
          Coach S4 · Seat 32
        </Chip>
      </div>
    </AbsoluteFill>
  );
};
