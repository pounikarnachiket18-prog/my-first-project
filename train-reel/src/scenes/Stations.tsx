import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, NightBg, PopLine, Tag, usePop } from "../ui";

const S = T.stations;
const N = 46;
const NODES = new Array(N).fill(0).map((_, i) => {
  const a = random(`na${i}`) * Math.PI * 2;
  const r = Math.sqrt(random(`nr${i}`)) * 360;
  return { x: 540 + Math.cos(a) * r * 1.15, y: 860 + Math.sin(a) * r, d: Math.hypot(Math.cos(a) * r, Math.sin(a) * r) };
});
// connect each node to its 2 nearest neighbours
const EDGES: [number, number][] = [];
NODES.forEach((n, i) => {
  const near = NODES.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
    .filter((o) => o.j !== i)
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  near.forEach((o) => {
    if (!EDGES.some(([a, b]) => (a === o.j && b === i) || (a === i && b === o.j))) EDGES.push([i, o.j]);
  });
});

export const Stations: React.FC = () => {
  const frame = useCurrentFrame();
  const hub = usePop(S.dots - 4);
  const count = Math.floor(interpolate(frame, [S.dots + 10, S.dots + 60], [0, 7000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill>
      <NightBg glow="#14325A" />
      <Tag text="EVERY STATION, EVERY MINUTE" />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {EDGES.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          const appear = interpolate(frame, [S.dots + na.d / 8, S.dots + na.d / 8 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const tp = ((frame / 30 + random(`e${i}`)) % 1);
          return (
            <g key={i} opacity={appear}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#3C5A9A" strokeWidth={3} />
              <circle cx={na.x + (nb.x - na.x) * tp} cy={na.y + (nb.y - na.y) * tp} r={5} fill={C.yellow} />
            </g>
          );
        })}
        {NODES.map((n, i) => {
          const t0 = S.dots + n.d / 8;
          const p = interpolate(frame, [t0, t0 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const ring = ((frame - t0) / 40 + random(`rg${i}`)) % 1;
          return (
            <g key={i} opacity={p}>
              {frame > t0 && <circle cx={n.x} cy={n.y} r={8 + ring * 40} fill="none" stroke={C.teal} strokeOpacity={(1 - ring) * 0.6} strokeWidth={3} />}
              <circle cx={n.x} cy={n.y} r={9 * p} fill={C.teal} />
            </g>
          );
        })}
        {/* central library hub */}
        <g transform={`translate(540 860) scale(${hub})`}>
          <circle r={70} fill={C.yellow} opacity={0.2 + 0.1 * Math.sin(frame / 5)} />
          <circle r={48} fill={C.yellow} />
          <text y={12} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.night}>
            CLIPS
          </text>
        </g>
      </svg>

      <div style={{ position: "absolute", top: 340, left: 0, right: 0, textAlign: "center", fontFamily: F.display, fontSize: 130, color: C.cream, opacity: hub }}>
        {count.toLocaleString("en-IN")}+ <span style={{ fontSize: 60, color: C.muted }}>stations</span>
      </div>

      <div style={{ position: "absolute", top: 1330, left: 60, right: 60 }}>
        <PopLine start={S.cap} size={68}>
          The same trick runs <Hi>thousands</Hi> of announcements a day
        </PopLine>
      </div>
    </AbsoluteFill>
  );
};
