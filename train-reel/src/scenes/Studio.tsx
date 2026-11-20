import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F, KIND_COLOR } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop, useT } from "../ui";

const S = T.studio;

const PIECES = [
  { t: "Yatrigan", k: "phrase", w: 200 },
  { t: "1", k: "num", w: 80 },
  { t: "Howrah", k: "name", w: 170 },
  { t: "platform", k: "phrase", w: 180 },
  { t: "7", k: "num", w: 80 },
  { t: "der se", k: "phrase", w: 150 },
];
const TOTAL_W = PIECES.reduce((a, p) => a + p.w, 0);

const Reel: React.FC<{ x: number; spin: number }> = ({ x, spin }) => (
  <g transform={`translate(${x} 0) rotate(${spin})`}>
    <circle r={78} fill="#1C2A52" stroke="#9AA6C8" strokeWidth={6} />
    {[0, 120, 240].map((a) => (
      <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 42} cy={Math.sin((a * Math.PI) / 180) * 42} r={22} fill={C.night} />
    ))}
    <circle r={12} fill="#9AA6C8" />
  </g>
);

export const Studio: React.FC = () => {
  const frame = useCurrentFrame();
  const machine = usePop(S.reel);
  const cut = useT(S.cut, 14);
  const drop = useT(S.clips, 24);
  const ribbonIn = useT(S.reel + 6, 50);

  let acc = 0;
  return (
    <AbsoluteFill>
      <NightBg glow="#2B2350" />
      <Tag text="RECORDED ONCE" color={C.coral} />

      <div style={{ position: "absolute", top: 350, left: 60, right: 60 }}>
        <PopLine start={4} size={72}>
          A voice artist recorded <Hi c={C.coral}>every piece</Hi> in a studio
        </PopLine>
      </div>

      {/* tape machine */}
      <svg width={1080} height={300} style={{ position: "absolute", top: 560, opacity: machine, transform: `scale(${0.8 + 0.2 * machine})` }}>
        <rect x={300} y={40} width={480} height={220} rx={26} fill="#121F45" stroke="#3B4F8E" strokeWidth={5} />
        <g transform="translate(0 140)">
          <Reel x={420} spin={frame * 9} />
          <Reel x={660} spin={frame * 9} />
        </g>
        <path d="M 420 218 L 540 236 L 660 218" stroke="#7C5A3A" strokeWidth={6} fill="none" />
        <circle cx={540} cy={236} r={10} fill={C.red} opacity={frame % 16 < 8 ? 1 : 0.3} />
        <text x={540} y={30} textAnchor="middle" fill={C.red} fontFamily="Inter" fontWeight={900} fontSize={26} opacity={frame % 16 < 8 ? 1 : 0.4}>
          ● REC
        </text>
      </svg>

      {/* ribbon of recorded audio being cut into pieces */}
      <div style={{ position: "absolute", top: 920, left: (1080 - TOTAL_W) / 2 - 40, width: TOTAL_W + 80, height: 300 }}>
        {PIECES.map((p, i) => {
          const x0 = acc;
          acc += p.w;
          const col = KIND_COLOR[p.k];
          const spread = cut * (i - (PIECES.length - 1) / 2) * 22;
          const fallY = drop * (220 + random(`fy${i}`) * 40);
          const rot = drop * (random(`fr${i}`) - 0.5) * 30;
          const visible = interpolate(ribbonIn, [x0 / TOTAL_W, (x0 + p.w) / TOTAL_W], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 40 + x0 + spread,
                top: fallY,
                width: p.w,
                height: 120,
                transform: `rotate(${rot}deg) scale(${1 - drop * 0.25})`,
                opacity: visible * (1 - drop * 0.15),
              }}
            >
              <svg width={p.w} height={120}>
                <rect x={1} y={1} width={p.w - 2} height={118} rx={cut > 0.1 ? 14 : 0} fill={`${col}22`} stroke={cut > 0.1 ? col : "none"} strokeWidth={3} />
                {new Array(Math.floor(p.w / 10)).fill(0).map((_, k) => {
                  const h = 10 + random(`sp${i}${k}`) * 70;
                  return <rect key={k} x={6 + k * 10} y={60 - h / 2} width={5} height={h} rx={2.5} fill={col} />;
                })}
              </svg>
              <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 28, color: C.cream, textAlign: "center", marginTop: 6, opacity: cut }}>{p.t}</div>
            </div>
          );
        })}
        {/* scissors cut flashes */}
        {cut > 0 && cut < 1 &&
          PIECES.slice(0, -1).map((_, i) => {
            const xx = 40 + PIECES.slice(0, i + 1).reduce((a, p) => a + p.w, 0);
            return <div key={i} style={{ position: "absolute", left: xx - 2, top: -20, width: 4, height: 160, background: "#fff", opacity: 1 - cut, boxShadow: "0 0 20px #fff" }} />;
          })}
      </div>

      {/* clip library folder */}
      <svg width={360} height={200} style={{ position: "absolute", left: 360, top: 1180, opacity: drop }}>
        <path d="M10 40 L130 40 L160 70 L350 70 L350 190 L10 190 Z" fill="#2A3B6E" stroke={C.teal} strokeWidth={5} />
        <text x={180} y={150} textAnchor="middle" fill={C.cream} fontFamily="Inter" fontWeight={900} fontSize={34}>
          CLIP LIBRARY
        </text>
      </svg>

      <div style={{ position: "absolute", top: 1420, left: 60, right: 60 }}>
        <PopLine start={S.cap} size={64} font={F.sans} weight={900}>
          …then chopped into <Hi c={C.teal}>thousands of tiny clips</Hi>
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
