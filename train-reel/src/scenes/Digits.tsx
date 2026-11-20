import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, LedBoard, NightBg, PopLine, Tag, usePop, useT } from "../ui";

const S = T.digits;

const Option: React.FC<{ start: number; ok: boolean; text: string; note: string; strikeAt?: number }> = ({ start, ok, text, note, strikeAt }) => {
  const p = usePop(start);
  const strike = useT(strikeAt ?? 99999, 12);
  const col = ok ? C.teal : C.red;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "22px 30px",
        borderRadius: 22,
        background: `${col}14`,
        border: `3px solid ${col}88`,
        opacity: p,
        transform: `translateX(${(1 - p) * (ok ? 200 : -200)}px)`,
      }}
    >
      <div style={{ width: 70, height: 70, borderRadius: 35, background: col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans, fontWeight: 900, fontSize: 46, color: C.night, flexShrink: 0 }}>
        {ok ? "✓" : "✕"}
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 44, color: C.cream }}>{text}</div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 30, color: col }}>{note}</div>
        {!ok && <div style={{ position: "absolute", left: -6, top: 26, height: 6, width: `${strike * 104}%`, background: C.red, borderRadius: 3 }} />}
      </div>
    </div>
  );
};

const NoiseVsDigits: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const p = usePop(start);
  const f = frame - start;
  return (
    <svg width={940} height={180} style={{ opacity: p }}>
      {/* noisy crowd waves */}
      {[0, 1, 2, 3].map((k) => {
        let d = "";
        for (let x = 0; x <= 940; x += 10) {
          const y = 90 + Math.sin(x / (22 + k * 7) + f / (3 + k) + k) * (16 + k * 6) + Math.sin(x / 9 + f + k * 5) * 6;
          d += `${x === 0 ? "M" : "L"} ${x} ${y} `;
        }
        return <path key={k} d={d} fill="none" stroke="#8FA0CC" strokeOpacity={0.28} strokeWidth={3} />;
      })}
      {/* crisp digit pulses travelling through */}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = ((f * 12 + i * 190) % 1040) - 50;
        return (
          <g key={i} transform={`translate(${x} 90)`}>
            <rect x={-22} y={-70} width={44} height={140} rx={14} fill={C.yellow} opacity={0.95} />
            <text y={18} textAnchor="middle" fontFamily="VT323" fontSize={60} fill={C.night}>
              {"12951"[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const Digits: React.FC = () => {
  const frame = useCurrentFrame();
  const board = usePop(6);
  return (
    <AbsoluteFill>
      <NightBg glow="#173057" />
      <Tag text="WHY DIGIT BY DIGIT?" color={C.teal} />
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${0.7 + 0.3 * board})`, opacity: board }}>
        <LedBoard width={560} height={150}>
          <span style={{ fontFamily: F.led, fontSize: 150, letterSpacing: 18 }}>12951</span>
        </LedBoard>
      </div>

      <div style={{ position: "absolute", top: 520, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 20 }}>
        <Option start={14} ok={false} text={`"Twelve thousand nine hundred fifty-one"`} note="would need a clip for every number" strikeAt={S.strike} />
        <Option start={S.good} ok text={`"One… two… nine… five… one"`} note="works for ANY train number" />
      </div>

      {/* Reason 1: only 10 clips */}
      <div style={{ position: "absolute", top: 900, left: 50, right: 50 }}>
        <PopLine start={S.r1} size={58} font={F.sans} weight={900}>
          Just <Hi>10 clips</Hi> cover every train
        </PopLine>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
          {new Array(10).fill(0).map((_, i) => {
            const on = interpolate(frame, [S.r1 + 8 + i * 3, S.r1 + 14 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  width: 82,
                  height: 100,
                  borderRadius: 14,
                  background: "#0A0A0C",
                  border: `3px solid ${on > 0.5 ? C.yellow : "#2B2F3A"}`,
                  fontFamily: F.led,
                  fontSize: 90,
                  color: C.amber,
                  textShadow: `0 0 ${16 * on}px ${C.amber}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.2 + 0.8 * on,
                  transform: `translateY(${(1 - on) * 30}px)`,
                }}
              >
                {i}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reason 2: clarity in noise */}
      <div style={{ position: "absolute", top: 1180, left: 50, right: 50 }}>
        <PopLine start={S.r2} size={58} font={F.sans} weight={900}>
          Short digits <Hi c={C.teal}>cut through</Hi> the noise & echo
        </PopLine>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <NoiseVsDigits start={S.r2 + 6} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
