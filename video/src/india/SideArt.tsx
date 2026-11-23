import React from "react";
import { F } from "./theme";

// Side-view illustration pieces, drawn in PIXELS. (0,0) = ground contact, centre.

export const Wheel: React.FC<{ x: number; r: number; spin?: number }> = ({ x, r, spin = 0 }) => (
  <g transform={`translate(${x} ${-r})`}>
    <circle r={r} fill="#151515" />
    <circle r={r * 0.55} fill="#9DA3A8" />
    <g transform={`rotate(${spin})`}>
      {[0, 60, 120].map((a) => (
        <rect key={a} x={-r * 0.5} y={-r * 0.06} width={r} height={r * 0.12} fill="#6B7075" transform={`rotate(${a})`} />
      ))}
    </g>
    <circle r={r * 0.15} fill="#333" />
  </g>
);

export const CarSide: React.FC<{ color: string; dent?: boolean; spin?: number; lights?: boolean }> = ({
  color,
  dent,
  spin = 0,
  lights,
}) => (
  <g>
    <ellipse cx={0} cy={2} rx={210} ry={14} fill="#000" opacity={0.3} />
    <path
      d="M -200 -40 Q -205 -95 -170 -100 L -110 -105 Q -70 -170 0 -172 L 60 -170 Q 110 -165 140 -110 L 190 -100 Q 210 -95 205 -40 Z"
      fill={color}
    />
    <path d="M -95 -108 Q -62 -158 -5 -160 L -5 -108 Z" fill="url(#sideglass)" />
    <path d="M 8 -160 L 55 -158 Q 98 -152 122 -108 L 8 -108 Z" fill="url(#sideglass)" />
    <rect x={-200} y={-62} width={405} height={8} fill="rgba(0,0,0,0.15)" />
    <rect x={198} y={-92} width={10} height={20} rx={4} fill={lights ? "#FFF6D6" : "#E9E2C8"} />
    <rect x={-205} y={-92} width={10} height={22} rx={4} fill="#D0281F" />
    {dent && (
      <g>
        <path d="M -200 -80 L -180 -70 L -192 -58 L -175 -48 L -200 -40" stroke="#333" strokeWidth={3} fill="none" />
        <path d="M -198 -76 Q -170 -66 -186 -50" stroke="#fff" strokeWidth={2} opacity={0.6} fill="none" />
      </g>
    )}
    <Wheel x={-125} r={36} spin={spin} />
    <Wheel x={130} r={36} spin={spin} />
  </g>
);

export const AutoSide: React.FC<{ spin?: number }> = ({ spin = 0 }) => (
  <g>
    <ellipse cx={0} cy={2} rx={130} ry={12} fill="#000" opacity={0.3} />
    {/* black lower body */}
    <path d="M -120 -30 L -120 -95 Q -60 -110 40 -105 L 110 -80 Q 125 -60 118 -30 Z" fill="#1E1E1E" />
    {/* yellow canopy */}
    <path d="M -125 -95 Q -125 -190 -40 -195 L 60 -190 Q 85 -185 90 -150 L 95 -100 L -125 -95 Z" fill="#F2C400" />
    <path d="M -110 -105 L -110 -175 Q -60 -182 -10 -178 L -10 -105 Z" fill="#2B2B2B" opacity={0.85} />
    <path d="M 70 -150 L 110 -85" stroke="#9DA3A8" strokeWidth={5} />
    <rect x={-125} y={-100} width={220} height={8} fill="#1E7F3A" />
    <text x={-25} y={-112} fontFamily={F.fun} fontWeight={800} fontSize={16} fill="#F2C400" textAnchor="middle">
      MH 12 R 7781
    </text>
    <Wheel x={-80} r={24} spin={spin} />
    <Wheel x={95} r={24} spin={spin} />
  </g>
);

export const TruckSide: React.FC<{ color?: string; flip?: boolean }> = ({ color = "#1F4E9A", flip }) => (
  <g transform={flip ? "scale(-1 1)" : undefined}>
    <ellipse cx={0} cy={2} rx={330} ry={16} fill="#000" opacity={0.3} />
    {/* cargo body */}
    <rect x={-320} y={-300} width={430} height={240} rx={8} fill="#E0592A" />
    <rect x={-310} y={-290} width={410} height={50} fill={color} />
    <text x={-105} y={-255} fontFamily={F.fun} fontWeight={800} fontSize={34} fill="#FFD400" textAnchor="middle">
      HORN OK PLEASE
    </text>
    <rect x={-310} y={-235} width={410} height={10} fill="#FF9933" />
    <rect x={-310} y={-225} width={410} height={10} fill="#FFFFFF" />
    <rect x={-310} y={-215} width={410} height={10} fill="#138808" />
    <text x={-105} y={-160} fontFamily={F.deva} fontWeight={800} fontSize={34} fill="#FFF" textAnchor="middle">
      जय माता दी
    </text>
    <text x={-105} y={-110} fontFamily={F.fun} fontWeight={800} fontSize={24} fill="#FFE08A" textAnchor="middle">
      SARDAR TRANSPORT · LUDHIANA
    </text>
    {/* cab */}
    <path d="M 120 -60 L 120 -250 Q 120 -270 140 -270 L 250 -270 Q 300 -260 320 -180 L 330 -60 Z" fill={color} />
    <path d="M 150 -250 L 245 -250 Q 280 -240 295 -180 L 150 -180 Z" fill="url(#sideglass)" />
    <rect x={120} y={-70} width={215} height={14} fill="#C0C0C0" />
    <rect x={-325} y={-62} width={660} height={16} fill="#2A2A2A" />
    <Wheel x={-240} r={44} />
    <Wheel x={-140} r={44} />
    <Wheel x={250} r={44} />
  </g>
);

export const SideGlassDef: React.FC = () => (
  <defs>
    <linearGradient id="sideglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#D6EEF2" />
      <stop offset="100%" stopColor="#4A7480" />
    </linearGradient>
  </defs>
);

// ------------------------------------------------------------------ People
export type PersonProps = {
  x: number;
  y: number;
  s?: number;
  facing?: 1 | -1;
  shirt: string;
  pants?: string;
  skin?: string;
  head?: "turban" | "cap" | "hair" | "copcap" | "dupatta";
  headColor?: string;
  armL?: [number, number]; // shoulder angle, elbow angle (deg, 0 = hanging down, positive = forward)
  armR?: [number, number];
  mouth?: number; // 0..1 open
  angry?: boolean;
  sitting?: boolean;
  lean?: number;
  hold?: "cup" | "phone" | "whistle" | null;
  moustache?: boolean;
};

const Arm: React.FC<{ sx: number; sy: number; a: [number, number]; shirt: string; skin: string; hold?: PersonProps["hold"] }> = ({
  sx,
  sy,
  a,
  shirt,
  skin,
  hold,
}) => {
  const [sh, el] = a;
  const r1 = (sh * Math.PI) / 180;
  const ex = sx + Math.sin(r1) * 42;
  const ey = sy + Math.cos(r1) * 42;
  const r2 = ((sh + el) * Math.PI) / 180;
  const hx = ex + Math.sin(r2) * 38;
  const hy = ey + Math.cos(r2) * 38;
  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={shirt} strokeWidth={17} strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={hx} y2={hy} stroke={skin} strokeWidth={13} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={9} fill={skin} />
      {hold === "cup" && (
        <g transform={`translate(${hx + 4} ${hy - 14})`}>
          <path d="M -8 0 L 8 0 L 6 18 L -6 18 Z" fill="#F4F1EA" opacity={0.9} />
          <rect x={-7} y={2} width={14} height={6} fill="#B5651D" />
        </g>
      )}
      {hold === "phone" && (
        <g transform={`translate(${hx} ${hy - 18})`}>
          <rect x={-9} y={-16} width={18} height={32} rx={3} fill="#111" />
          <rect x={-7} y={-13} width={14} height={24} fill="#5AC8FA" />
          <circle cx={-3} cy={-12} r={2} fill="#FF3B30" />
        </g>
      )}
      {hold === "whistle" && <rect x={hx - 4} y={hy - 6} width={14} height={7} rx={3} fill="#C0C0C0" />}
    </g>
  );
};

export const Person: React.FC<PersonProps> = ({
  x,
  y,
  s = 1,
  facing = 1,
  shirt,
  pants = "#2D3142",
  skin = "#B7794F",
  head = "hair",
  headColor = "#1A1A1A",
  armL = [8, 10],
  armR = [-8, -10],
  mouth = 0,
  angry,
  sitting,
  lean = 0,
  hold = null,
  moustache,
}) => {
  const hipY = sitting ? -50 : -82;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`}>
      <ellipse cx={0} cy={2} rx={36} ry={7} fill="#000" opacity={0.25} />
      {/* legs */}
      {sitting ? (
        <g>
          <path d={`M -10 ${hipY} L 34 ${hipY} L 36 0`} stroke={pants} strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M 4 ${hipY + 4} L 44 ${hipY + 4} L 48 0`} stroke={pants} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        </g>
      ) : (
        <g>
          <line x1={-9} y1={hipY} x2={-12} y2={-6} stroke={pants} strokeWidth={19} strokeLinecap="round" />
          <line x1={9} y1={hipY} x2={14} y2={-6} stroke={pants} strokeWidth={19} strokeLinecap="round" />
          <ellipse cx={-8} cy={-4} rx={14} ry={6} fill="#2A1C14" />
          <ellipse cx={18} cy={-4} rx={14} ry={6} fill="#2A1C14" />
        </g>
      )}
      <g transform={`translate(0 ${hipY}) rotate(${lean}) translate(0 ${-hipY})`}>
        {/* back arm */}
        <Arm sx={-6} sy={hipY - 62} a={armL} shirt={shirt} skin={skin} />
        {/* torso */}
        <rect x={-27} y={hipY - 74} width={54} height={80} rx={20} fill={shirt} />
        <line x1={4} y1={hipY - 66} x2={4} y2={hipY + 2} stroke="rgba(0,0,0,0.15)" strokeWidth={3} />
        {/* head */}
        <rect x={-7} y={hipY - 86} width={14} height={14} fill={skin} />
        <circle cx={4} cy={hipY - 104} r={23} fill={skin} />
        {head === "hair" && <path d={`M -19 ${hipY - 106} Q -16 ${hipY - 132} 8 ${hipY - 129} Q 28 ${hipY - 126} 26 ${hipY - 110} Q 10 ${hipY - 120} -19 ${hipY - 106} Z`} fill={headColor} />}
        {head === "turban" && (
          <g>
            <path d={`M -22 ${hipY - 108} Q -22 ${hipY - 140} 6 ${hipY - 141} Q 32 ${hipY - 138} 29 ${hipY - 110} Z`} fill={headColor} />
            <path d={`M -20 ${hipY - 118} Q 4 ${hipY - 130} 28 ${hipY - 116}`} stroke="rgba(0,0,0,0.2)" strokeWidth={3} fill="none" />
          </g>
        )}
        {head === "cap" && <path d={`M -20 ${hipY - 110} Q -18 ${hipY - 134} 6 ${hipY - 133} Q 26 ${hipY - 132} 27 ${hipY - 112} L 42 ${hipY - 110} Z`} fill={headColor} />}
        {head === "copcap" && (
          <g>
            <rect x={-20} y={hipY - 136} width={48} height={20} rx={4} fill="#F4F4F4" />
            <rect x={-22} y={hipY - 118} width={60} height={6} rx={3} fill="#1B2A4A" />
          </g>
        )}
        {head === "dupatta" && <path d={`M -24 ${hipY - 96} Q -26 ${hipY - 136} 6 ${hipY - 136} Q 32 ${hipY - 134} 28 ${hipY - 108} L 22 ${hipY - 110} Q 4 ${hipY - 124} -16 ${hipY - 100} L -26 ${hipY - 70} Z`} fill={headColor} />}
        {/* face */}
        <circle cx={14} cy={hipY - 106} r={3} fill="#111" />
        {angry && <line x1={7} y1={hipY - 116} x2={21} y2={hipY - 111} stroke="#111" strokeWidth={4} strokeLinecap="round" />}
        {moustache && <path d={`M 10 ${hipY - 94} Q 20 ${hipY - 99} 27 ${hipY - 92}`} stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />}
        <ellipse cx={20} cy={hipY - 90} rx={6} ry={1.5 + mouth * 7} fill="#5A1A1A" />
        {/* front arm */}
        <Arm sx={8} sy={hipY - 62} a={armR} shirt={shirt} skin={skin} hold={hold} />
      </g>
    </g>
  );
};

export const Cow: React.FC<{ x: number; y: number; s?: number; chew: number; tail: number }> = ({ x, y, s = 1, chew, tail }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={2} rx={130} ry={12} fill="#000" opacity={0.25} />
    {/* lying body */}
    <ellipse cx={0} cy={-50} rx={115} ry={50} fill="#F1EDE4" />
    <ellipse cx={-30} cy={-62} rx={30} ry={20} fill="#D9CFC0" />
    <path d={`M 110 -60 Q ${140 + tail * 10} -40 ${132 + tail * 14} -8`} stroke="#E2DACC" strokeWidth={7} fill="none" strokeLinecap="round" />
    {/* hump */}
    <ellipse cx={-70} cy={-95} rx={26} ry={20} fill="#ECE6DA" />
    {/* head */}
    <g transform={`translate(-120 -88) rotate(${chew * 3})`}>
      <ellipse cx={0} cy={0} rx={30} ry={38} fill="#F1EDE4" />
      <ellipse cx={-2} cy={28} rx={20} ry={14} fill="#E8B8A8" />
      <circle cx={-12} cy={-6} r={4} fill="#111" />
      <path d="M -18 -32 Q -38 -60 -26 -66" stroke="#C9B48A" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d="M 16 -32 Q 36 -60 24 -66" stroke="#C9B48A" strokeWidth={8} fill="none" strokeLinecap="round" />
      <ellipse cx={-34} cy={-16} rx={16} ry={7} fill="#E2DACC" />
      <ellipse cx={-2} cy={34 + chew * 3} rx={10} ry={4} fill="#9C6B5F" />
    </g>
    {/* orange tilak garland */}
    <path d="M -100 -60 Q -90 -30 -70 -55" stroke="#FF9933" strokeWidth={8} fill="none" strokeDasharray="6 4" />
  </g>
);

export const SpeechBubble: React.FC<{
  x: number;
  y: number;
  text: string;
  p: number; // 0..1
  tail?: "left" | "right";
  color?: string;
  angry?: boolean;
  w?: number;
}> = ({ x, y, text, p, tail = "left", color = "#FFFFFF", angry, w = 520 }) => {
  if (p <= 0) return null;
  const s = 0.5 + 0.5 * Math.min(1, p);
  const lines = wrap(text, Math.floor(w / 27));
  const h = 40 + lines.length * 56;
  const tx = tail === "left" ? -w / 2 + 70 : w / 2 - 70;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={Math.min(1, p * 1.6)}>
      {angry ? (
        <polygon
          points={spiky(w / 2 + 20, h / 2 + 20)}
          fill={color}
          stroke="#111"
          strokeWidth={6}
          strokeLinejoin="round"
        />
      ) : (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={34} fill={color} stroke="#111" strokeWidth={6} />
          <path d={`M ${tx - 20} ${h / 2 - 3} L ${tx + (tail === "left" ? -30 : 30)} ${h / 2 + 50} L ${tx + 25} ${h / 2 - 3}`} fill={color} stroke="#111" strokeWidth={6} strokeLinejoin="round" />
          <rect x={tx - 17} y={h / 2 - 9} width={40} height={10} fill={color} />
        </>
      )}
      {lines.map((l, i) => (
        <text
          key={i}
          x={0}
          y={-h / 2 + 64 + i * 56 - (angry ? 0 : 6)}
          fontFamily={F.fun}
          fontWeight={800}
          fontSize={46}
          textAnchor="middle"
          fill="#111"
        >
          {l}
        </text>
      ))}
    </g>
  );
};

function wrap(text: string, max: number) {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      out.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function spiky(rx: number, ry: number) {
  return Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 === 0 ? 1.08 : 0.9;
    return `${Math.cos(a) * rx * r},${Math.sin(a) * ry * r}`;
  }).join(" ");
}
