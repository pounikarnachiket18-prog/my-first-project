import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop, useT } from "../ui";

const S = T.pitch;
const W = 940;

// natural speech: one smooth melody
const natural = (x: number) => 90 + Math.sin(x / 120) * 40 + Math.sin(x / 47) * 14 - x * 0.04;

// stitched: each clip has its own independent contour
const CLIPS = [
  { a: 0, b: 300, base: 70, slope: 0.12, amp: 18, col: C.teal },
  { a: 330, b: 420, base: 150, slope: -0.2, amp: 8, col: C.yellow },
  { a: 450, b: 540, base: 40, slope: 0.15, amp: 8, col: C.yellow },
  { a: 570, b: 760, base: 120, slope: -0.1, amp: 20, col: C.coral },
  { a: 790, b: 940, base: 60, slope: 0.18, amp: 14, col: C.teal },
];

const pathFor = (fn: (x: number) => number, a: number, b: number, reveal: number) => {
  let d = "";
  const end = a + (b - a) * reveal;
  for (let x = a; x <= end; x += 6) d += `${x === a ? "M" : "L"} ${x} ${fn(x)} `;
  return d;
};

export const Pitch: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useT(S.draw, 40);
  const draw2 = useT(S.draw + 22, 40);
  const joints = usePop(S.joints);
  const p1 = usePop(S.draw - 4);
  const p2 = usePop(S.draw + 18);

  return (
    <AbsoluteFill>
      <NightBg glow="#2E1F4A" />
      <Tag text="WHY IT SOUNDS ROBOTIC" color={C.red} />

      <div style={{ position: "absolute", top: 400, left: 70, opacity: p1 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 40, color: C.teal, marginBottom: 14 }}>
          A real person speaking → one smooth melody
        </div>
        <svg width={W} height={200}>
          <rect width={W} height={200} rx={18} fill="#0A1230" />
          <path d={pathFor(natural, 10, W - 10, draw)} stroke={C.teal} strokeWidth={8} fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ position: "absolute", top: 760, left: 70, opacity: p2 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 40, color: C.red, marginBottom: 14 }}>
          Stitched clips → the tone jumps at every joint
        </div>
        <svg width={W} height={240} style={{ overflow: "visible" }}>
          <rect width={W} height={240} rx={18} fill="#0A1230" />
          {CLIPS.map((c, i) => {
            const fn = (x: number) => 20 + c.base + (x - c.a) * c.slope + Math.sin((x - c.a) / 25) * c.amp;
            const r = Math.max(0, Math.min(1, draw2 * CLIPS.length - i));
            return (
              <g key={i}>
                <rect x={c.a + 4} y={8} width={c.b - c.a - 8} height={224} rx={12} fill={c.col} opacity={0.08} />
                <path d={pathFor(fn, c.a + 12, c.b - 12, r)} stroke={c.col} strokeWidth={8} fill="none" strokeLinecap="round" />
              </g>
            );
          })}
          {CLIPS.slice(0, -1).map((c, i) => {
            const x = (c.b + CLIPS[i + 1].a) / 2;
            const pulse = 1 + 0.15 * Math.sin(frame / 3 + i);
            return (
              <g key={i} opacity={joints} transform={`translate(${x} 120) scale(${joints * pulse})`}>
                <circle r={26} fill={C.red} />
                <text y={11} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={32} fill="#fff">
                  !
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ position: "absolute", top: 1170, left: 60, right: 60 }}>
        <PopLine start={S.cap} size={74}>
          Each clip was recorded <Hi c={C.red}>separately</Hi>
        </PopLine>
        <PopLine start={S.cap + 16} size={46} font={F.sans} weight={700} color={C.muted} style={{ marginTop: 20 }}>
          so pitch, speed & breath never quite line up — that's the "robotic" feel
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
