import React, { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { C, FONT } from "./theme";

/* ---------------- Aerial countryside ---------------- */

const FIELD_COLORS = [C.field, C.fieldLight, C.fieldDark, C.mustard, "#8CCB6A", "#B7DD7A"];

type Rect = { x: number; y: number; w: number; h: number; fill: string; rot: number };

const buildFields = (w: number, h: number, seed: string): Rect[] => {
  const out: Rect[] = [];
  const cw = 280;
  const ch = 240;
  for (let gx = -1; gx < w / cw + 1; gx++) {
    for (let gy = -1; gy < h / ch + 1; gy++) {
      const s = `${seed}-${gx}-${gy}`;
      const splits = 1 + Math.floor(random(s + "n") * 3);
      for (let k = 0; k < splits; k++) {
        out.push({
          x: gx * cw + 6,
          y: gy * ch + (ch / splits) * k + 6,
          w: cw - 12,
          h: ch / splits - 12,
          fill: FIELD_COLORS[Math.floor(random(s + k) * FIELD_COLORS.length)],
          rot: (random(s + "r") - 0.5) * 4,
        });
      }
    }
  }
  return out;
};

type Tree = { x: number; y: number; r: number };

const buildTrees = (w: number, h: number, seed: string, count: number): Tree[] =>
  new Array(count).fill(0).map((_, i) => ({
    x: random(`${seed}tx${i}`) * w,
    y: random(`${seed}ty${i}`) * h,
    r: 18 + random(`${seed}tr${i}`) * 26,
  }));

type House = { x: number; y: number; w: number; h: number; c: string };

const buildVillage = (cx: number, cy: number, seed: string): House[] =>
  new Array(14).fill(0).map((_, i) => ({
    x: cx + (random(`${seed}hx${i}`) - 0.5) * 320,
    y: cy + (random(`${seed}hy${i}`) - 0.5) * 260,
    w: 36 + random(`${seed}hw${i}`) * 30,
    h: 30 + random(`${seed}hh${i}`) * 24,
    c: [C.roof, "#F2A65A", "#E9E3D5", "#C96A4A"][i % 4],
  }));

export const Countryside: React.FC<{
  width: number;
  height: number;
  seed?: string;
  river?: string;
  villages?: [number, number][];
}> = ({ width, height, seed = "land", river, villages = [] }) => {
  const fields = useMemo(() => buildFields(width, height, seed), [width, height, seed]);
  const trees = useMemo(() => buildTrees(width, height, seed, Math.round((width * height) / 26000)), [
    width,
    height,
    seed,
  ]);
  const houses = useMemo(
    () => villages.flatMap(([x, y], i) => buildVillage(x, y, `${seed}v${i}`)),
    [villages, seed],
  );
  return (
    <g>
      <rect x={-200} y={-200} width={width + 400} height={height + 400} fill={C.soil} />
      {fields.map((f, i) => (
        <rect
          key={i}
          x={f.x}
          y={f.y}
          width={f.w}
          height={f.h}
          rx={10}
          fill={f.fill}
          transform={`rotate(${f.rot} ${f.x + f.w / 2} ${f.y + f.h / 2})`}
        />
      ))}
      {river ? (
        <g>
          <path d={river} stroke={C.riverEdge} strokeWidth={150} fill="none" strokeLinecap="round" />
          <path d={river} stroke={C.river} strokeWidth={110} fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {houses.map((h, i) => (
        <g key={i}>
          <rect x={h.x + 6} y={h.y + 8} width={h.w} height={h.h} rx={3} fill="rgba(0,0,0,0.18)" />
          <rect x={h.x} y={h.y} width={h.w} height={h.h} rx={3} fill={h.c} />
          <line x1={h.x} y1={h.y + h.h / 2} x2={h.x + h.w} y2={h.y + h.h / 2} stroke="rgba(0,0,0,0.15)" strokeWidth={3} />
        </g>
      ))}
      {trees.map((t, i) => (
        <g key={i}>
          <circle cx={t.x + 8} cy={t.y + 10} r={t.r} fill="rgba(0,0,0,0.18)" />
          <circle cx={t.x} cy={t.y} r={t.r} fill={i % 3 === 0 ? C.treeDark : C.tree} />
          <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.45} fill="rgba(255,255,255,0.12)" />
        </g>
      ))}
    </g>
  );
};

/* ---------------- Track ---------------- */

export const Track: React.FC<{ d: string; scale?: number }> = ({ d, scale = 1 }) => (
  <g>
    <path d={d} stroke="rgba(0,0,0,0.12)" strokeWidth={84 * scale} fill="none" />
    <path d={d} stroke={C.ballast} strokeWidth={70 * scale} fill="none" />
    <path d={d} stroke="#8A6A4A" strokeWidth={36 * scale} strokeDasharray={`${6 * scale} ${10 * scale}`} fill="none" />
    <path d={d} stroke="#7C8794" strokeWidth={24 * scale} fill="none" opacity={0.9} />
    <path d={d} stroke="#9C7A55" strokeWidth={17 * scale} strokeDasharray={`${6 * scale} ${10 * scale}`} fill="none" />
    <path d={d} stroke={C.ballast} strokeWidth={17 * scale} fill="none" opacity={0.55} />
  </g>
);

/* ---------------- Train (top-down) ---------------- */

export const COACH_LEN = 150;
export const COACH_GAP = 10;
export const COACH_W = 44;

export const coachPose = (d: string, len: number) => {
  const total = getLength(d);
  const l = Math.max(0, Math.min(total, len));
  const p = getPointAtLength(d, l);
  const t = getTangentAtLength(d, l);
  return { x: p.x, y: p.y, angle: (Math.atan2(t.y, t.x) * 180) / Math.PI };
};

const Coach: React.FC<{ engine?: boolean; label?: string; s?: number }> = ({ engine, label, s = 1 }) => {
  const L = COACH_LEN * s;
  const W = COACH_W * s;
  return (
    <g>
      <rect x={-L / 2 + 8 * s} y={-W / 2 + 12 * s} width={L} height={W} rx={10 * s} fill="rgba(0,0,0,0.22)" />
      <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={engine ? 22 * s : 8 * s} fill={engine ? C.trainDark : C.train} />
      <rect x={-L / 2 + 6 * s} y={-W / 2 + 6 * s} width={L - 12 * s} height={W - 12 * s} rx={6 * s} fill={engine ? C.train : "#5DB8F7"} />
      <rect x={-L / 2 + 6 * s} y={-3 * s} width={L - 12 * s} height={6 * s} fill={C.stripe} />
      {engine ? (
        <>
          <rect x={L / 2 - 34 * s} y={-W / 2 + 8 * s} width={22 * s} height={W - 16 * s} rx={5 * s} fill={C.ink} />
          <circle cx={L / 2 - 4 * s} cy={-W / 4} r={4 * s} fill="#FFF6C8" />
          <circle cx={L / 2 - 4 * s} cy={W / 4} r={4 * s} fill="#FFF6C8" />
        </>
      ) : (
        [0, 1, 2, 3].map((i) => (
          <rect key={i} x={-L / 2 + (20 + i * 32) * s} y={-W / 2 + 10 * s} width={14 * s} height={6 * s} rx={2 * s} fill="rgba(255,255,255,0.45)" />
        ))
      )}
      {label ? (
        <text x={0} y={W / 2 - 9 * s} textAnchor="middle" fontSize={11 * s} fontWeight={800} fill="#fff" fontFamily={FONT}>
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Places an engine + coaches along an SVG path. `head` is the path length of the engine's nose. */
export const TrainOnPath: React.FC<{ d: string; head: number; coaches?: number; s?: number; glow?: boolean }> = ({
  d,
  head,
  coaches = 9,
  s = 1,
  glow = true,
}) => {
  const frame = useCurrentFrame();
  const items = new Array(coaches + 1).fill(0).map((_, i) => {
    const center = head - (COACH_LEN * s) / 2 - i * (COACH_LEN + COACH_GAP) * s;
    return { i, ...coachPose(d, center) };
  });
  const front = coachPose(d, head);
  return (
    <g>
      {glow ? (
        <g transform={`translate(${front.x} ${front.y}) rotate(${front.angle})`}>
          <path
            d={`M0 ${-12 * s} L${150 * s} ${-60 * s} L${150 * s} ${60 * s} L0 ${12 * s} Z`}
            fill="#FFF3B0"
            opacity={0.35 + Math.sin(frame / 5) * 0.05}
          />
        </g>
      ) : null}
      {items
        .slice()
        .reverse()
        .map((c) => (
          <g key={c.i} transform={`translate(${c.x} ${c.y}) rotate(${c.angle})`}>
            <Coach engine={c.i === 0} s={s} label={c.i === 4 ? "S4" : undefined} />
          </g>
        ))}
    </g>
  );
};

/* ---------------- Clouds ---------------- */

export const Clouds: React.FC<{ seed?: string; count?: number; speed?: number; opacity?: number }> = ({
  seed = "c",
  count = 5,
  speed = 1.4,
  opacity = 0.85,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const x0 = random(`${seed}x${i}`) * 1400 - 300;
        const y = random(`${seed}y${i}`) * 1700 + 100;
        const w = 360 + random(`${seed}w${i}`) * 300;
        const x = ((x0 + frame * speed * (0.6 + random(`${seed}s${i}`))) % 1700) - 300;
        return (
          <React.Fragment key={i}>
            {/* shadow on ground */}
            <div
              style={{
                position: "absolute",
                left: x + 120,
                top: y + 160,
                width: w,
                height: w * 0.45,
                borderRadius: "50%",
                background: "rgba(19,35,58,0.16)",
                filter: "blur(30px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: w * 0.45,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                filter: "blur(22px)",
                opacity,
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

/** Warm sunlight wash over the whole frame for a daytime feel. */
export const SunWash: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(circle at 85% 5%, rgba(255,236,170,0.55) 0%, rgba(255,236,170,0.0) 55%), linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))",
      pointerEvents: "none",
    }}
  />
);
