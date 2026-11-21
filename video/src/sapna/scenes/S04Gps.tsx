import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { BulbIcon, Chip, Headline, popStyle, usePop } from "../ui";
import { Clouds } from "../world";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Satellite: React.FC = () => (
  <svg width={300} height={160} viewBox="0 0 300 160">
    <rect x={0} y={50} width={110} height={60} rx={6} fill="#2563EB" />
    <rect x={190} y={50} width={110} height={60} rx={6} fill="#2563EB" />
    {[0, 1, 2, 3].map((i) => (
      <React.Fragment key={i}>
        <line x1={i * 27 + 14} y1={50} x2={i * 27 + 14} y2={110} stroke="#93C5FD" strokeWidth={2} />
        <line x1={190 + i * 27 + 14} y1={50} x2={190 + i * 27 + 14} y2={110} stroke="#93C5FD" strokeWidth={2} />
      </React.Fragment>
    ))}
    <rect x={105} y={74} width={90} height={12} fill="#94A3B8" />
    <rect x={120} y={40} width={60} height={80} rx={10} fill="#E2E8F0" stroke="#64748B" strokeWidth={4} />
    <circle cx={150} cy={130} r={14} fill="#F59E0B" />
  </svg>
);

/** Scene 4: myth bust. GPS works, but it eats the battery. */
export const S04Gps: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.round(interpolate(frame, [40, 165], [100, 23], clamp));
  const fill = interpolateColors(pct, [23, 60, 100], [C.red, C.stripe, C.green]);
  const out = interpolate(frame, [170, 182], [1, 0], clamp);
  const bulb = usePop(180, 9);
  const chip = usePop(70);
  const beam = 0.35 + Math.sin(frame / 3) * 0.15;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.skyTop} 0%, ${C.sky} 55%, ${C.skyLow} 100%)`, overflow: "hidden" }}>
      {/* sun */}
      <div style={{ position: "absolute", left: 60, top: 380, width: 200, height: 200, borderRadius: 100, background: "#FFE27A", boxShadow: "0 0 120px 40px rgba(255,226,122,0.6)" }} />
      <Clouds seed="gps" count={4} speed={1.2} opacity={0.9} />
      {/* hills */}
      <svg width={1080} height={600} style={{ position: "absolute", bottom: 0 }}>
        <path d="M0 260 C 250 160, 450 300, 700 220 S 1000 180, 1080 240 L1080 600 L0 600 Z" fill={C.fieldLight} />
        <path d="M0 360 C 300 290, 600 400, 1080 320 L1080 600 L0 600 Z" fill={C.field} />
        <rect x={0} y={430} width={1080} height={26} fill={C.ballast} />
        <rect x={0} y={440} width={1080} height={5} fill="#7C8794" />
      </svg>

      <div style={{ opacity: out }}>
        {/* beam from satellite to phone */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <polygon points="830,760 870,760 610,1560 470,1560" fill="url(#beam)" opacity={beam} />
        </svg>
        <div style={{ position: "absolute", left: 700, top: 640, rotate: `${-18 + Math.sin(frame / 20) * 4}deg` }}>
          <Satellite />
        </div>
        {/* battery */}
        <div style={{ position: "absolute", left: 270, top: 920, display: "flex", alignItems: "center" }}>
          <div style={{ width: 480, height: 220, borderRadius: 40, border: `14px solid ${C.ink}`, padding: 14, boxSizing: "border-box", background: C.white }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 20, background: fill }} />
          </div>
          <div style={{ width: 30, height: 90, borderRadius: "0 14px 14px 0", background: C.ink }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              right: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 110,
              color: C.ink,
            }}
          >
            {pct}%
          </div>
        </div>
        <div style={{ position: "absolute", top: 1190, width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={popStyle(chip)}>
            <Chip color={C.red} size={38}>
              GPS ON = BATTERY DOWN
            </Chip>
          </div>
        </div>
        {/* tiny phone receiving the beam */}
        <div style={{ position: "absolute", left: 470, top: 1490, width: 140, height: 240, borderRadius: 26, background: C.ink, padding: 10, boxSizing: "border-box" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 18, background: "#7DD3FC" }} />
        </div>
      </div>

      <Headline
        lines={[
          ["GPS", "="],
          [
            { t: "battery", c: C.pink },
            { t: "khaata!", c: C.pink },
          ],
        ]}
        delay={6}
        top={190}
        size={104}
        exitAt={170}
      />
      <Headline
        lines={[
          ["Isliye..."],
          [
            { t: "smart", c: C.stripe },
            { t: "jugaad!", c: C.stripe },
          ],
        ]}
        delay={186}
        top={190}
        size={104}
      />
      <div style={{ position: "absolute", top: 820, width: "100%", display: "flex", justifyContent: "center", ...popStyle(bulb) }}>
        <div style={{ rotate: `${Math.sin(frame / 7) * 6}deg` }}>
          <BulbIcon size={360} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
