import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, LedBoard, NightBg, PopLine, Tag, Waveform, usePop } from "../ui";

const S = T.pauses;
const DIGITS = ["1", "2", "9", "5", "1"];

// waveform layout: label phrase then 5 digit blips separated by silence
const SEGS = [
  { a: 0.0, b: 0.26, color: C.teal },
  ...DIGITS.map((_, i) => ({ a: 0.33 + i * 0.137, b: 0.33 + i * 0.137 + 0.06, color: C.yellow })),
];

const DigitTile: React.FC<{ d: string; start: number }> = ({ d, start }) => {
  const p = usePop(start, 10, 220);
  const frame = useCurrentFrame();
  const glow = interpolate(frame - start, [0, 6, 16], [1, 1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: 150,
        height: 190,
        borderRadius: 26,
        background: "#0A0A0C",
        border: `5px solid ${frame >= start ? C.yellow : "#2B2F3A"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.led,
        fontSize: 190,
        color: C.amber,
        textShadow: `0 0 ${10 + 30 * glow}px ${C.amber}`,
        transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 30}px)`,
        opacity: frame >= start ? 1 : 0.25,
        boxShadow: frame >= start ? `0 0 ${50 * glow}px ${C.yellow}88` : "none",
      }}
    >
      {frame >= start ? d : "·"}
    </div>
  );
};

export const Pauses: React.FC = () => {
  const frame = useCurrentFrame();
  const label = usePop(S.label);
  // reveal waveform in time with audio
  const reveal = interpolate(
    frame,
    [S.label, S.label + 18, S.digits[0], ...S.digits.map((d) => d + 6)],
    [0, 0.27, 0.32, ...DIGITS.map((_, i) => 0.33 + i * 0.137 + 0.137)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const br = usePop(S.brackets);

  return (
    <AbsoluteFill>
      <NightBg glow="#1B2450" />
      <Tag text="LISTEN CLOSELY" />

      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: label, transform: `scale(${0.8 + 0.2 * label})` }}>
        <LedBoard width={760} height={130}>
          <span style={{ fontFamily: F.led, fontSize: 96 }}>"GAADI SANKHYA…"</span>
        </LedBoard>
      </div>

      <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 28 }}>
        {DIGITS.map((d, i) => (
          <DigitTile key={i} d={d} start={S.digits[i]} />
        ))}
      </div>

      {/* waveform */}
      <div style={{ position: "absolute", top: 870, left: 70 }}>
        <Waveform width={940} height={200} segments={SEGS} reveal={reveal} bars={110} seed="p" />
        {/* pause brackets */}
        <svg width={940} height={300} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
          {[0.26, ...DIGITS.slice(0, 4).map((_, i) => 0.33 + i * 0.137 + 0.06)].map((a, i) => {
            const b = i === 0 ? 0.33 : a + 0.077;
            const x1 = a * 940 + 4;
            const x2 = b * 940 - 4;
            const pp = Math.max(0, Math.min(1, br * 1.3 - i * 0.12));
            return (
              <g key={i} opacity={pp} transform={`translate(0 ${(1 - pp) * 20})`}>
                <rect x={x1} y={20} width={x2 - x1} height={160} rx={10} fill={C.red} fillOpacity={0.16} stroke={C.red} strokeWidth={3} strokeDasharray="8 6" />
                <text x={(x1 + x2) / 2} y={220} fill={C.red} fontFamily="Inter" fontWeight={900} fontSize={26} textAnchor="middle">
                  PAUSE
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ position: "absolute", top: 1180, left: 50, right: 50 }}>
        <PopLine start={S.cap1} size={96}>
          Those pauses <Hi c={C.red}>aren't a glitch.</Hi>
        </PopLine>
        <PopLine start={S.cap2} size={62} font={F.sans} weight={700} color={C.muted} style={{ marginTop: 24 }}>
          They're a clue to how the whole system works.
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
