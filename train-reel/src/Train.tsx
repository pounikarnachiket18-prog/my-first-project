import React from "react";
import { C } from "./tokens";

const LOCO_W = 470;
const COACH_W = 400;
const GAP = 14;
const H = 300; // viewBox height (includes pantograph above)
const TOP = 70; // y of roof in viewBox

export const trainWidth = (coaches: number) => coaches * (COACH_W + GAP) + LOCO_W;
const WHEEL_R = 20;

const Wheel: React.FC<{ cx: number; cy: number; rot: number }> = ({ cx, cy, rot }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
    <circle r={WHEEL_R} fill="#2A2D36" stroke="#9AA3B8" strokeWidth={4} />
    {[0, 60, 120].map((a) => (
      <line
        key={a}
        x1={-WHEEL_R + 4}
        y1={0}
        x2={WHEEL_R - 4}
        y2={0}
        stroke="#9AA3B8"
        strokeWidth={3}
        transform={`rotate(${a})`}
      />
    ))}
    <circle r={5} fill="#C9D0E0" />
  </g>
);

const Bogie: React.FC<{ x: number; rot: number }> = ({ x, rot }) => (
  <g>
    <rect x={x - 52} y={TOP + 158} width={104} height={16} rx={5} fill="#3A3F4D" />
    <Wheel cx={x - 28} cy={TOP + 178} rot={rot} />
    <Wheel cx={x + 28} cy={TOP + 178} rot={rot} />
  </g>
);

const Coach: React.FC<{ x: number; rot: number; lit: boolean; idx: number }> = ({ x, rot, lit, idx }) => (
  <g transform={`translate(${x} 0)`}>
    {/* roof */}
    <rect x={6} y={TOP} width={COACH_W - 12} height={24} rx={12} fill="#B9C3DD" />
    {/* body */}
    <rect x={0} y={TOP + 12} width={COACH_W} height={140} rx={16} fill="#1F4BA8" />
    <rect x={0} y={TOP + 12} width={COACH_W} height={22} rx={10} fill="#2A5CC4" />
    {/* cream stripes */}
    <rect x={0} y={TOP + 108} width={COACH_W} height={9} fill="#F5E6B8" />
    <rect x={0} y={TOP + 124} width={COACH_W} height={5} fill="#F5E6B8" />
    {/* doors */}
    {[12, COACH_W - 50].map((dx) => (
      <g key={dx}>
        <rect x={dx} y={TOP + 32} width={38} height={118} rx={5} fill="#163A86" />
        <rect x={dx + 9} y={TOP + 44} width={20} height={30} rx={4} fill={lit ? "#FFE7A0" : "#5C7AB8"} />
      </g>
    ))}
    {/* windows with bars */}
    {new Array(6).fill(0).map((_, i) => {
      const wx = 66 + i * 47;
      return (
        <g key={i}>
          <rect x={wx} y={TOP + 44} width={36} height={46} rx={6} fill={lit ? "#FFD25E" : "#6F8BC6"} />
          {lit && <rect x={wx} y={TOP + 44} width={36} height={46} rx={6} fill="#FFF3C4" opacity={0.35 + 0.3 * ((i + idx) % 2)} />}
          {[0, 1, 2].map((b) => (
            <rect key={b} x={wx} y={TOP + 54 + b * 12} width={36} height={3} fill="#1F4BA8" opacity={0.85} />
          ))}
        </g>
      );
    })}
    {/* underframe */}
    <rect x={20} y={TOP + 150} width={COACH_W - 40} height={12} fill="#272B36" />
    <Bogie x={78} rot={rot} />
    <Bogie x={COACH_W - 78} rot={rot} />
    {/* coupler */}
    <rect x={COACH_W - 2} y={TOP + 132} width={GAP + 4} height={10} fill="#3A3F4D" />
  </g>
);

const Loco: React.FC<{ x: number; rot: number; headlight: boolean; panto: number }> = ({ x, rot, headlight, panto }) => {
  const L = LOCO_W;
  const ph = 50 * panto; // pantograph height
  return (
    <g transform={`translate(${x} 0)`}>
      {/* headlight beam */}
      {headlight && (
        <path d={`M ${L - 6} ${TOP + 62} L ${L + 520} ${TOP - 10} L ${L + 520} ${TOP + 190} Z`} fill="url(#beam)" />
      )}
      {/* pantograph */}
      <g stroke="#9AA3B8" strokeWidth={5} fill="none" strokeLinecap="round">
        <path d={`M 120 ${TOP} L 150 ${TOP - ph} L 120 ${TOP - ph - 4}`} />
        <path d={`M 190 ${TOP} L 160 ${TOP - ph} L 190 ${TOP - ph - 4}`} />
        <line x1={100} y1={TOP - ph - 6} x2={210} y2={TOP - ph - 6} strokeWidth={6} />
      </g>
      {/* body */}
      <path
        d={`M 0 ${TOP + 8} Q 0 ${TOP} 16 ${TOP} L ${L - 90} ${TOP} L ${L - 10} ${TOP + 70} Q ${L} ${TOP + 80} ${L} ${TOP + 96} L ${L} ${TOP + 152} L 0 ${TOP + 152} Z`}
        fill="#E8ECF5"
      />
      <rect x={0} y={TOP + 100} width={L} height={52} fill="#D7263D" />
      <rect x={0} y={TOP + 92} width={L - 6} height={8} fill={C.yellow} />
      {/* roof equipment */}
      <rect x={60} y={TOP - 10} width={220} height={12} rx={4} fill="#9FA9C2" />
      {/* side windows / grills */}
      <rect x={40} y={TOP + 26} width={60} height={46} rx={6} fill="#14203F" />
      {new Array(4).fill(0).map((_, i) => (
        <rect key={i} x={120 + i * 44} y={TOP + 30} width={30} height={40} rx={3} fill="#C3CADB" />
      ))}
      {/* cab windshield */}
      <path d={`M ${L - 100} ${TOP + 12} L ${L - 44} ${TOP + 12} L ${L - 8} ${TOP + 64} L ${L - 100} ${TOP + 64} Z`} fill="#14203F" />
      <path d={`M ${L - 92} ${TOP + 18} L ${L - 70} ${TOP + 18} L ${L - 90} ${TOP + 56} Z`} fill="#ffffff22" />
      {/* headlight */}
      <circle cx={L - 6} cy={TOP + 62} r={9} fill={headlight ? "#FFF6C8" : "#888"} />
      <circle cx={L - 8} cy={TOP + 130} r={6} fill="#FFDD77" />
      {/* underframe */}
      <rect x={10} y={TOP + 150} width={L - 20} height={12} fill="#272B36" />
      <path d={`M ${L - 30} ${TOP + 160} L ${L + 6} ${TOP + 182} L ${L - 30} ${TOP + 182} Z`} fill="#3A3F4D" />
      <Bogie x={95} rot={rot} />
      <Bogie x={L - 120} rot={rot} />
    </g>
  );
};

/** A side-view Indian-style electric train. Front faces right. */
export const Train: React.FC<{
  coaches?: number;
  distance: number; // px travelled (drives wheel rotation)
  lit?: boolean;
  headlight?: boolean;
  scale?: number;
  x: number;
  y: number; // top of rails line in screen px
  panto?: number;
}> = ({ coaches = 5, distance, lit = true, headlight = true, scale = 0.6, x, y, panto = 1 }) => {
  const W = trainWidth(coaches);
  const rot = (distance / scale / (2 * Math.PI * WHEEL_R)) * 360;
  return (
    <svg
      width={(W + 540) * scale}
      height={H * scale}
      viewBox={`0 0 ${W + 540} ${H}`}
      style={{ position: "absolute", left: x, top: y - (TOP + 198) * scale, overflow: "visible" }}
    >
      <defs>
        <linearGradient id="beam" x1="0" x2="1">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity={0.55} />
          <stop offset="1" stopColor="#FFF3B0" stopOpacity={0} />
        </linearGradient>
      </defs>
      {new Array(coaches).fill(0).map((_, i) => (
        <Coach key={i} x={i * (COACH_W + GAP)} rot={rot} lit={lit} idx={i} />
      ))}
      <Loco x={coaches * (COACH_W + GAP)} rot={rot} headlight={headlight} panto={panto} />
    </svg>
  );
};

/** Rails + sleepers + overhead wire across the whole frame. */
export const Track: React.FC<{ y: number; scroll?: number; wireY?: number; platform?: boolean }> = ({
  y,
  scroll = 0,
  wireY,
  platform = true,
}) => {
  const off = ((-scroll % 70) + 70) % 70;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      {wireY !== undefined && (
        <g>
          <line x1={0} y1={wireY} x2={1080} y2={wireY} stroke="#9AA3B8" strokeWidth={3} />
          <line x1={0} y1={wireY - 26} x2={1080} y2={wireY - 26} stroke="#9AA3B855" strokeWidth={2} />
          {[180, 900].map((mx) => (
            <g key={mx}>
              <rect x={mx} y={wireY - 80} width={14} height={y - wireY + 80} fill="#3B4766" />
              <rect x={mx - 60} y={wireY - 40} width={120} height={8} fill="#3B4766" />
            </g>
          ))}
        </g>
      )}
      {new Array(18).fill(0).map((_, i) => (
        <rect key={i} x={i * 70 - off - 20} y={y + 6} width={44} height={14} rx={3} fill="#3A2E28" />
      ))}
      <rect x={0} y={y} width={1080} height={7} fill="#B9C0CF" />
      <rect x={0} y={y + 14} width={1080} height={5} fill="#7F879A" />
      <rect x={0} y={y + 20} width={1080} height={40} fill="#00000055" />
      {platform && (
        <g>
          <rect x={0} y={y + 40} width={1080} height={420} fill="#1A2440" />
          <rect x={0} y={y + 40} width={1080} height={18} fill={C.yellow} />
          {new Array(14).fill(0).map((_, i) => (
            <rect key={i} x={i * 80} y={y + 40} width={40} height={18} fill="#1A2440" opacity={0.25} />
          ))}
          <rect x={0} y={y + 58} width={1080} height={400} fill="url(#plat)" />
        </g>
      )}
      <defs>
        <linearGradient id="plat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24325A" />
          <stop offset="1" stopColor="#060B1C" />
        </linearGradient>
      </defs>
    </svg>
  );
};
