import React from "react";
import { F, SIGN_GREEN } from "./theme";

// All sprites are drawn in METRES, ground contact at y = 0, "up" is negative y.
// The highway engine places them with translate(screenX, groundY) scale(pxPerMetre).

export type PlateType = "private" | "commercial" | "ev";

export const NumberPlate: React.FC<{
  text: string;
  type?: PlateType;
  w?: number;
  h?: number;
  y: number;
}> = ({ text, type = "private", w = 0.66, h = 0.16, y }) => {
  const bg = type === "commercial" ? "#FFD400" : type === "ev" ? "#1E8E3E" : "#FFFFFF";
  const fg = type === "ev" ? "#FFFFFF" : "#111111";
  const strip = 0.075;
  return (
    <g>
      <rect x={-w / 2} y={y} width={w} height={h} rx={0.02} fill={bg} stroke="#111" strokeWidth={0.012} />
      {/* HSRP "IND" strip */}
      <rect x={-w / 2 + 0.01} y={y + 0.01} width={strip} height={h - 0.02} fill="#1A3E9A" />
      <text
        x={-w / 2 + 0.01 + strip / 2}
        y={y + h - 0.025}
        fontSize={0.035}
        fill="#fff"
        fontFamily={F.ui}
        fontWeight={800}
        textAnchor="middle"
      >
        IND
      </text>
      <circle cx={-w / 2 + 0.01 + strip / 2} cy={y + 0.045} r={0.02} fill="none" stroke="#fff" strokeWidth={0.006} />
      <text
        x={strip / 2}
        y={y + h * 0.74}
        fontSize={h * 0.62}
        fill={fg}
        fontFamily={F.ui}
        fontWeight={800}
        textAnchor="middle"
        textLength={w - strip - 0.06}
        lengthAdjust="spacingAndGlyphs"
      >
        {text}
      </text>
    </g>
  );
};

const Glow: React.FC<{ cx: number; cy: number; r: number; color: string; o?: number }> = ({
  cx,
  cy,
  r,
  color,
  o = 1,
}) => <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.7} fill={`url(#glow-${color.replace("#", "")})`} opacity={o} />;

export const GlowDefs: React.FC = () => (
  <defs>
    {["FF3B30", "FFF2C4", "FFB347", "FFE08A"].map((c) => (
      <radialGradient key={c} id={`glow-${c}`}>
        <stop offset="0%" stopColor={`#${c}`} stopOpacity={0.9} />
        <stop offset="35%" stopColor={`#${c}`} stopOpacity={0.35} />
        <stop offset="100%" stopColor={`#${c}`} stopOpacity={0} />
      </radialGradient>
    ))}
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#CFE8EE" stopOpacity={0.85} />
      <stop offset="100%" stopColor="#3F6670" stopOpacity={0.9} />
    </linearGradient>
  </defs>
);

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
};

// ------------------------------------------------------------------ Car (rear view)
export const CarRear: React.FC<{
  color: string;
  plate: string;
  plateType?: PlateType;
  suv?: boolean;
  brake?: boolean;
  night?: boolean;
}> = ({ color, plate, plateType, suv, brake, night }) => {
  const w = suv ? 1.9 : 1.75;
  const hb = suv ? 1.05 : 0.92; // top of lower body
  const hr = suv ? 1.75 : 1.45; // roof
  const tail = brake || night;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={w * 0.62} ry={0.14} fill="#000" opacity={0.4} />
      <rect x={-w / 2 + 0.05} y={-0.38} width={0.32} height={0.38} rx={0.06} fill="#151515" />
      <rect x={w / 2 - 0.37} y={-0.38} width={0.32} height={0.38} rx={0.06} fill="#151515" />
      <rect x={-w / 2} y={-hb} width={w} height={hb - 0.22} rx={0.14} fill={color} />
      <path
        d={`M ${-w / 2 + 0.12} ${-hb} L ${-w / 2 + 0.3} ${-hr} L ${w / 2 - 0.3} ${-hr} L ${w / 2 - 0.12} ${-hb} Z`}
        fill={shade(color, -25)}
      />
      <path
        d={`M ${-w / 2 + 0.24} ${-hb - 0.04} L ${-w / 2 + 0.38} ${-hr + 0.08} L ${w / 2 - 0.38} ${-hr + 0.08} L ${w / 2 - 0.24} ${-hb - 0.04} Z`}
        fill="url(#glass)"
      />
      {suv && <rect x={-w / 2 + 0.35} y={-hr - 0.06} width={w - 0.7} height={0.06} fill="#222" />}
      {/* tail lights */}
      <rect x={-w / 2 + 0.03} y={-hb + 0.12} width={0.36} height={0.14} rx={0.03} fill={tail ? "#FF3B30" : "#A3241C"} />
      <rect x={w / 2 - 0.39} y={-hb + 0.12} width={0.36} height={0.14} rx={0.03} fill={tail ? "#FF3B30" : "#A3241C"} />
      {tail && (
        <>
          <Glow cx={-w / 2 + 0.21} cy={-hb + 0.19} r={brake ? 0.9 : 0.6} color="#FF3B30" />
          <Glow cx={w / 2 - 0.21} cy={-hb + 0.19} r={brake ? 0.9 : 0.6} color="#FF3B30" />
        </>
      )}
      <rect x={-w / 2} y={-0.36} width={w} height={0.16} rx={0.05} fill={shade(color, -45)} />
      <NumberPlate text={plate} type={plateType} y={-0.68} />
    </g>
  );
};

// Oncoming car (front view, headlights)
export const CarFront: React.FC<{ color: string; night?: boolean }> = ({ color, night }) => {
  const w = 1.75;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={1.1} ry={0.13} fill="#000" opacity={0.4} />
      <rect x={-w / 2} y={-0.92} width={w} height={0.7} rx={0.14} fill={color} />
      <path d={`M -0.75 -0.92 L -0.55 -1.42 L 0.55 -1.42 L 0.75 -0.92 Z`} fill="url(#glass)" />
      <rect x={-0.8} y={-0.75} width={0.36} height={0.14} rx={0.05} fill="#FFF6D6" />
      <rect x={0.44} y={-0.75} width={0.36} height={0.14} rx={0.05} fill="#FFF6D6" />
      <Glow cx={-0.62} cy={-0.68} r={night ? 1.6 : 0.5} color="#FFF2C4" />
      <Glow cx={0.62} cy={-0.68} r={night ? 1.6 : 0.5} color="#FFF2C4" />
    </g>
  );
};

// ------------------------------------------------------------------ Truck (Indian goods carrier, rear)
export const TruckRear: React.FC<{ plate: string; body?: string; night?: boolean; brake?: boolean }> = ({
  plate,
  body = "#E0592A",
  night,
  brake,
}) => {
  const w = 2.5;
  const h = 3.6;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={1.6} ry={0.18} fill="#000" opacity={0.45} />
      {[-1.05, -0.65, 0.65, 1.05].map((x) => (
        <rect key={x} x={x - 0.18} y={-0.55} width={0.36} height={0.55} rx={0.06} fill="#121212" />
      ))}
      {/* chassis + mudflaps */}
      <rect x={-w / 2} y={-0.85} width={w} height={0.3} fill="#2A2A2A" />
      <rect x={-1.2} y={-0.55} width={0.4} height={0.45} fill="#1B1B1B" />
      <rect x={0.8} y={-0.55} width={0.4} height={0.45} fill="#1B1B1B" />
      {/* tall painted tailgate */}
      <rect x={-w / 2} y={-h} width={w} height={h - 0.85} rx={0.05} fill={body} />
      <rect x={-w / 2 + 0.08} y={-h + 0.08} width={w - 0.16} height={0.5} fill="#1F4E9A" />
      {/* tri-colour + truck-art stripes */}
      <rect x={-w / 2 + 0.08} y={-h + 0.62} width={w - 0.16} height={0.08} fill="#FF9933" />
      <rect x={-w / 2 + 0.08} y={-h + 0.7} width={w - 0.16} height={0.08} fill="#FFFFFF" />
      <rect x={-w / 2 + 0.08} y={-h + 0.78} width={w - 0.16} height={0.08} fill="#138808" />
      <text x={0} y={-h + 0.45} fontSize={0.3} fill="#FFD400" fontFamily={F.fun} fontWeight={800} textAnchor="middle">
        HORN OK PLEASE
      </text>
      <text x={0} y={-h + 1.25} fontSize={0.2} fill="#FFF" fontFamily={F.fun} fontWeight={800} textAnchor="middle">
        USE DIPPER AT NIGHT
      </text>
      <text x={0} y={-h + 1.62} fontSize={0.22} fill="#FFE08A" fontFamily={F.deva} fontWeight={800} textAnchor="middle">
        बुरी नज़र वाले तेरा मुँह काला
      </text>
      {/* lotus / eyes motif */}
      <circle cx={-0.75} cy={-h + 2.15} r={0.22} fill="#FFD400" />
      <circle cx={-0.75} cy={-h + 2.15} r={0.1} fill="#1F4E9A" />
      <circle cx={0.75} cy={-h + 2.15} r={0.22} fill="#FFD400" />
      <circle cx={0.75} cy={-h + 2.15} r={0.1} fill="#1F4E9A" />
      <text x={0} y={-h + 2.25} fontSize={0.24} fill="#FFF" fontFamily={F.fun} fontWeight={800} textAnchor="middle">
        TATA
      </text>
      <rect x={-w / 2 + 0.05} y={-1.05} width={0.32} height={0.14} fill={night || brake ? "#FF3B30" : "#A3241C"} />
      <rect x={w / 2 - 0.37} y={-1.05} width={0.32} height={0.14} fill={night || brake ? "#FF3B30" : "#A3241C"} />
      {(night || brake) && (
        <>
          <Glow cx={-w / 2 + 0.21} cy={-0.98} r={0.8} color="#FF3B30" />
          <Glow cx={w / 2 - 0.21} cy={-0.98} r={0.8} color="#FF3B30" />
        </>
      )}
      <NumberPlate text={plate} type="commercial" y={-1.25} w={0.8} h={0.2} />
    </g>
  );
};

// ------------------------------------------------------------------ Auto-rickshaw (rear)
export const AutoRear: React.FC<{ plate: string; night?: boolean }> = ({ plate, night }) => (
  <g>
    <ellipse cx={0} cy={0} rx={0.85} ry={0.12} fill="#000" opacity={0.4} />
    <rect x={-0.68} y={-0.36} width={0.22} height={0.36} rx={0.05} fill="#111" />
    <rect x={0.46} y={-0.36} width={0.22} height={0.36} rx={0.05} fill="#111" />
    <path d="M -0.7 -0.3 L -0.7 -1.0 Q 0 -1.15 0.7 -1.0 L 0.7 -0.3 Z" fill="#1A1A1A" />
    <path d="M -0.74 -1.0 Q -0.7 -1.75 0 -1.8 Q 0.7 -1.75 0.74 -1.0 Z" fill="#F2C400" />
    <rect x={-0.4} y={-1.55} width={0.8} height={0.35} rx={0.08} fill="#2B2B2B" />
    <path d="M -0.74 -0.95 L 0.74 -0.95 L 0.74 -0.85 L -0.74 -0.85 Z" fill="#1E7F3A" />
    <circle cx={-0.55} cy={-0.5} r={0.07} fill={night ? "#FF3B30" : "#A3241C"} />
    <circle cx={0.55} cy={-0.5} r={0.07} fill={night ? "#FF3B30" : "#A3241C"} />
    {night && <Glow cx={0} cy={-0.5} r={0.9} color="#FF3B30" o={0.6} />}
    <NumberPlate text={plate} type="commercial" y={-0.62} w={0.5} h={0.14} />
  </g>
);

// ------------------------------------------------------------------ Bus (rear)
export const BusRear: React.FC<{ plate: string; night?: boolean }> = ({ plate, night }) => (
  <g>
    <ellipse cx={0} cy={0} rx={1.6} ry={0.18} fill="#000" opacity={0.45} />
    <rect x={-1.0} y={-0.5} width={0.4} height={0.5} fill="#111" />
    <rect x={0.6} y={-0.5} width={0.4} height={0.5} fill="#111" />
    <rect x={-1.27} y={-3.3} width={2.54} height={2.95} rx={0.15} fill="#C8102E" />
    <rect x={-1.27} y={-1.3} width={2.54} height={0.22} fill="#F2F2F2" />
    <rect x={-1.1} y={-3.1} width={2.2} height={1.0} rx={0.08} fill="url(#glass)" />
    <text x={0} y={-1.55} fontSize={0.3} fill="#FFF" fontFamily={F.fun} fontWeight={800} textAnchor="middle">
      PUNE ⇄ MUMBAI
    </text>
    <rect x={-1.22} y={-0.95} width={0.3} height={0.2} fill={night ? "#FF3B30" : "#A3241C"} />
    <rect x={0.92} y={-0.95} width={0.3} height={0.2} fill={night ? "#FF3B30" : "#A3241C"} />
    {night && (
      <>
        <Glow cx={-1.07} cy={-0.85} r={0.9} color="#FF3B30" />
        <Glow cx={1.07} cy={-0.85} r={0.9} color="#FF3B30" />
      </>
    )}
    <NumberPlate text={plate} type="commercial" y={-0.72} w={0.8} h={0.2} />
  </g>
);

// ------------------------------------------------------------------ Roadside furniture
export const NHSign: React.FC<{ lines: [string, string][]; title?: string; night?: boolean }> = ({
  lines,
  title,
  night,
}) => {
  const bw = 5.2;
  const rowH = 0.72;
  const bh = (title ? 0.8 : 0.2) + lines.length * rowH + 0.2;
  const top = -4.2 - bh;
  return (
    <g>
      <rect x={-2.2} y={-4.3} width={0.18} height={4.3} fill="#9AA0A6" />
      <rect x={2.0} y={-4.3} width={0.18} height={4.3} fill="#9AA0A6" />
      <rect x={-bw / 2} y={top} width={bw} height={bh} rx={0.12} fill={SIGN_GREEN} stroke="#fff" strokeWidth={0.07} />
      {night && <rect x={-bw / 2} y={top} width={bw} height={bh} rx={0.12} fill="#FFF7D6" opacity={0.08} />}
      {title && (
        <>
          <rect x={-bw / 2 + 0.25} y={top + 0.2} width={0.95} height={0.55} rx={0.08} fill="#FFF" />
          <text x={-bw / 2 + 0.72} y={top + 0.62} fontSize={0.4} fill={SIGN_GREEN} fontFamily={F.ui} fontWeight={900} textAnchor="middle">
            {title}
          </text>
        </>
      )}
      {lines.map(([place, km], i) => {
        const y = top + (title ? 0.8 : 0.2) + i * rowH + rowH * 0.72;
        return (
          <g key={place}>
            <text x={-bw / 2 + 0.3} y={y} fontSize={0.5} fill="#fff" fontFamily={F.ui} fontWeight={800}>
              {place}
            </text>
            <text x={bw / 2 - 0.3} y={y} fontSize={0.5} fill="#fff" fontFamily={F.ui} fontWeight={800} textAnchor="end">
              {km}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// Classic Indian NH kilometre stone: white with yellow cap.
export const MileStone: React.FC<{ place: string; km: number; nh?: string }> = ({ place, km, nh = "NH 48" }) => (
  <g>
    <ellipse cx={0} cy={0} rx={0.45} ry={0.07} fill="#000" opacity={0.3} />
    <path d="M -0.35 0 L -0.35 -0.75 A 0.35 0.35 0 0 1 0.35 -0.75 L 0.35 0 Z" fill="#F7F3EA" />
    <path d="M -0.35 -0.75 A 0.35 0.35 0 0 1 0.35 -0.75 L 0.35 -0.68 L -0.35 -0.68 Z" fill="#F2B705" />
    <path d="M -0.35 -0.72 A 0.35 0.35 0 0 1 0.35 -0.72 Q 0 -1.15 -0.35 -0.72 Z" fill="#F2B705" />
    <text x={0} y={-0.82} fontSize={0.1} fill="#111" fontFamily={F.ui} fontWeight={900} textAnchor="middle">
      {nh}
    </text>
    <text x={0} y={-0.5} fontSize={0.13} fill="#111" fontFamily={F.ui} fontWeight={900} textAnchor="middle">
      {place}
    </text>
    <text x={0} y={-0.28} fontSize={0.18} fill="#111" fontFamily={F.ui} fontWeight={900} textAnchor="middle">
      {km}
    </text>
  </g>
);

export const Tree: React.FC<{ hue?: string; s?: number }> = ({ hue = "#3F6B3A", s = 1 }) => (
  <g transform={`scale(${s})`}>
    <ellipse cx={0} cy={0} rx={2.2} ry={0.25} fill="#000" opacity={0.25} />
    <rect x={-0.25} y={-3.2} width={0.5} height={3.2} fill="#5A3E2B" />
    <circle cx={-1.3} cy={-3.6} r={1.6} fill={shade(hue, -15)} />
    <circle cx={1.2} cy={-3.8} r={1.7} fill={shade(hue, -8)} />
    <circle cx={0} cy={-4.8} r={2.1} fill={hue} />
    <circle cx={0.6} cy={-5.3} r={1.1} fill={shade(hue, 20)} />
  </g>
);

export const Palm: React.FC = () => (
  <g>
    <path d="M 0 0 Q 0.3 -4 -0.2 -8" stroke="#6B4F35" strokeWidth={0.35} fill="none" />
    {[-160, -120, -70, -30, 10, 50].map((a) => (
      <path
        key={a}
        d="M 0 0 Q 1.5 -0.6 3 0.6"
        transform={`translate(-0.2 -8) rotate(${a})`}
        stroke="#2F6B3A"
        strokeWidth={0.35}
        fill="none"
        strokeLinecap="round"
      />
    ))}
  </g>
);

export const MedianLamp: React.FC<{ night?: boolean }> = ({ night }) => (
  <g>
    <rect x={-0.1} y={-9.5} width={0.2} height={9.5} fill="#8F969C" />
    <path d="M 0 -9.4 Q -1.2 -9.9 -3.2 -9.7" stroke="#8F969C" strokeWidth={0.14} fill="none" />
    <path d="M 0 -9.4 Q 1.2 -9.9 3.2 -9.7" stroke="#8F969C" strokeWidth={0.14} fill="none" />
    <rect x={-3.6} y={-9.8} width={0.7} height={0.2} rx={0.08} fill={night ? "#FFE08A" : "#D9D9D9"} />
    <rect x={2.9} y={-9.8} width={0.7} height={0.2} rx={0.08} fill={night ? "#FFE08A" : "#D9D9D9"} />
    {night && (
      <>
        <Glow cx={-3.25} cy={-9.6} r={2.4} color="#FFB347" o={0.8} />
        <Glow cx={3.25} cy={-9.6} r={2.4} color="#FFB347" o={0.8} />
      </>
    )}
  </g>
);

// Roadside dhaba seen from the highway (sprite facing camera).
export const RoadsideDhaba: React.FC<{
  name: string;
  deva?: string;
  wall?: string;
  night?: boolean;
  frame: number;
}> = ({ name, deva, wall = "#F2C14E", night, frame }) => {
  const bulbs = Array.from({ length: 18 }, (_, i) => i);
  return (
    <g>
      <ellipse cx={0} cy={0} rx={7} ry={0.5} fill="#000" opacity={0.25} />
      {/* building */}
      <rect x={-6} y={-3.6} width={12} height={3.6} fill={wall} />
      <rect x={-6} y={-0.9} width={12} height={0.9} fill="#3A5BA0" />
      <path d="M -6.6 -3.6 L 6.6 -3.6 L 6 -4.3 L -6 -4.3 Z" fill="#8C8C8C" />
      {/* open front with warm interior */}
      <rect x={-4.6} y={-2.8} width={3.6} height={2.0} fill={night ? "#FFB347" : "#7A4A2A"} opacity={night ? 0.95 : 1} />
      <rect x={1.0} y={-2.8} width={3.6} height={2.0} fill={night ? "#FFB347" : "#7A4A2A"} opacity={night ? 0.95 : 1} />
      {/* sign board on roof */}
      <rect x={-5.2} y={-6.4} width={10.4} height={2.0} rx={0.15} fill="#B3001B" stroke="#FFD400" strokeWidth={0.12} />
      <text x={0} y={-5.25} fontSize={0.95} fill="#FFD400" fontFamily={F.fun} fontWeight={800} textAnchor="middle">
        {name}
      </text>
      {deva && (
        <text x={0} y={-4.6} fontSize={0.5} fill="#FFFFFF" fontFamily={F.deva} fontWeight={800} textAnchor="middle">
          {deva}
        </text>
      )}
      {/* string lights */}
      {bulbs.map((i) => {
        const x = -6 + (12 / 17) * i;
        const y = -3.55 + Math.sin((i / 17) * Math.PI * 3) * 0.12 + 0.2;
        const on = (Math.floor(frame / 6) + i) % 3 !== 0;
        const c = ["#FF5E5B", "#FFD400", "#3DDC97", "#4CC9F0"][i % 4];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={0.09} fill={on ? c : "#555"} />
            {night && on && <circle cx={x} cy={y} r={0.3} fill={c} opacity={0.35} />}
          </g>
        );
      })}
      {/* charpais */}
      {[-4.5, -0.8, 3.0].map((x) => (
        <g key={x}>
          <rect x={x} y={-0.55} width={2.2} height={0.12} fill="#C8A26B" />
          <rect x={x + 0.08} y={-0.66} width={2.04} height={0.12} fill="#E6CFA0" />
          <rect x={x} y={-0.55} width={0.1} height={0.55} fill="#6B4A2B" />
          <rect x={x + 2.1} y={-0.55} width={0.1} height={0.55} fill="#6B4A2B" />
        </g>
      ))}
      {night && <ellipse cx={0} cy={-1.5} rx={9} ry={4} fill="url(#glow-FFB347)" opacity={0.5} />}
    </g>
  );
};

// Comic honk burst (marks where you should drop a horn sound).
export const HonkBurst: React.FC<{ text: string; p: number; color?: string; rot?: number }> = ({
  text,
  p,
  color = "#FFD400",
  rot = -8,
}) => {
  if (p <= 0) return null;
  const s = 0.4 + Math.min(1, p) * 0.6;
  const pts = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.72;
    return `${Math.cos(a) * r * 190},${Math.sin(a) * r * 110}`;
  }).join(" ");
  return (
    <g transform={`rotate(${rot}) scale(${s})`} opacity={Math.min(1, p * 2)}>
      <polygon points={pts} fill={color} stroke="#111" strokeWidth={7} strokeLinejoin="round" />
      <text
        x={0}
        y={18}
        fontSize={56}
        fontFamily={F.fun}
        fontWeight={800}
        textAnchor="middle"
        fill="#111"
      >
        {text}
      </text>
    </g>
  );
};
