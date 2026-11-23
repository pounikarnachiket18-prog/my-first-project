import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { H, Palette, W, FPS } from "./theme";
import {
  AutoRear,
  BusRear,
  CarFront,
  CarRear,
  GlowDefs,
  HonkBurst,
  MedianLamp,
  MileStone,
  NHSign,
  Palm,
  PlateType,
  RoadsideDhaba,
  Tree,
  TruckRear,
} from "./Sprites";

// Indian roads keep LEFT: our carriageway is x ∈ [-5.25, 5.25] (3 lanes),
// the median sits on the right, oncoming traffic is to the right of it.
export const LANES = [-3.5, 0, 3.5];
const ROAD_L = -5.6;
const ROAD_R = 5.4;
const MED_L = 5.4;
const MED_R = 7.2;
const ONC_L = 7.2;
const ONC_R = 18;
export const ONC_LANES = [9, 12.5, 16];

export type Vehicle = {
  id: string;
  kind: "car" | "suv" | "truck" | "auto" | "bus";
  x: number;
  s0: number; // world position (m) at frame 0
  v: number; // m/s
  color?: string;
  plate: string;
  plateType?: PlateType;
  brakeAt?: [number, number][]; // frame ranges
};

export type Oncoming = { x: number; s0: number; v: number; color: string };

export type Roadside =
  | { kind: "sign"; s: number; x: number; lines: [string, string][]; title?: string }
  | { kind: "stone"; s: number; x: number; place: string; km: number }
  | { kind: "tree"; s: number; x: number; scale?: number; hue?: string }
  | { kind: "palm"; s: number; x: number }
  | { kind: "dhaba"; s: number; x: number; name: string; deva?: string; wall?: string };

export type Honk = { vehicleId: string; from: number; dur?: number; text: string; color?: string; dx?: number };

export type Camera = {
  start: number; // camera world position at frame 0
  speed: number; // m/s
  x: number;
  h: number;
  f: number;
  horizon: number;
  bob?: number;
};

const SKY_STARS = Array.from({ length: 70 }, (_, i) => ({
  x: random(`sx${i}`) * W,
  y: random(`sy${i}`) * 650,
  r: 1 + random(`sr${i}`) * 2.2,
  tw: random(`st${i}`) * 6,
}));

export const Backdrop: React.FC<{ p: Palette; horizon: number; frame: number; sunY?: number }> = ({
  p,
  horizon,
  frame,
  sunY,
}) => {
  const hz = horizon;
  return (
    <g>
      <defs>
        <linearGradient id={`sky-${p.night}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="62%" stopColor={p.skyMid} />
          <stop offset="100%" stopColor={p.skyLow} />
        </linearGradient>
        <radialGradient id={`sun-${p.night}`}>
          <stop offset="0%" stopColor={p.sun} stopOpacity={1} />
          <stop offset="18%" stopColor={p.sun} stopOpacity={0.95} />
          <stop offset="40%" stopColor={p.sun} stopOpacity={0.25} />
          <stop offset="100%" stopColor={p.sun} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={hz + 4} fill={`url(#sky-${p.night})`} />
      {p.night &&
        SKY_STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#FFF"
            opacity={0.35 + 0.4 * Math.abs(Math.sin(frame / 20 + s.tw))}
          />
        ))}
      {p.night ? (
        <circle cx={820} cy={210} r={46} fill="#F4EBD0" opacity={0.9} />
      ) : (
        <circle cx={360} cy={sunY ?? hz - 120} r={360} fill={`url(#sun-${p.night})`} />
      )}
      {/* Sahyadri ghats silhouettes */}
      <path
        d={`M 0 ${hz - 150} L 90 ${hz - 210} L 170 ${hz - 175} L 260 ${hz - 260} L 330 ${hz - 245} L 420 ${hz - 300} L 470 ${hz - 290} L 560 ${hz - 205} L 650 ${hz - 240} L 760 ${hz - 180} L 840 ${hz - 230} L 960 ${hz - 165} L 1080 ${hz - 205} L 1080 ${hz} L 0 ${hz} Z`}
        fill={p.hillFar}
        opacity={0.85}
      />
      <path
        d={`M 0 ${hz - 70} Q 120 ${hz - 140} 240 ${hz - 90} T 480 ${hz - 80} T 720 ${hz - 120} T 1080 ${hz - 70} L 1080 ${hz} L 0 ${hz} Z`}
        fill={p.hillNear}
      />
      {/* distant ghat-road lights at night */}
      {p.night &&
        Array.from({ length: 14 }, (_, i) => (
          <circle
            key={i}
            cx={300 + i * 30 + ((frame * 1.5 + i * 40) % 30)}
            cy={hz - 95 + Math.sin(i) * 12}
            r={2.5}
            fill={i % 2 ? "#FFE08A" : "#FF5E5B"}
            opacity={0.8}
          />
        ))}
      <rect x={0} y={hz} width={W} height={H - hz} fill={p.ground} />
    </g>
  );
};

export const Highway: React.FC<{
  palette: Palette;
  cam: Camera;
  vehicles: Vehicle[];
  oncoming?: Oncoming[];
  roadside?: Roadside[];
  honks?: Honk[];
  frameOffset?: number;
}> = ({ palette: p, cam, vehicles, oncoming = [], roadside = [], honks = [], frameOffset = 0 }) => {
  const frame = useCurrentFrame() + frameOffset;
  const t = frame / FPS;
  const camS = cam.start + cam.speed * t;
  const hz = cam.horizon + Math.sin(t * 7) * (cam.bob ?? 1.5);
  const cx = W / 2;

  const proj = (x: number, z: number) => ({
    sx: cx + (cam.f * (x - cam.x)) / z,
    sy: hz + (cam.f * cam.h) / z,
    k: cam.f / z,
  });

  const quad = (x1: number, x2: number, zn: number, zf: number) => {
    const a = proj(x1, zn);
    const b = proj(x2, zn);
    const c = proj(x2, zf);
    const d = proj(x1, zf);
    return `${a.sx},${a.sy} ${b.sx},${b.sy} ${c.sx},${c.sy} ${d.sx},${d.sy}`;
  };

  const ZN = 0.6;
  const ZF = 600;
  const ZMAX = 170;

  // lane dashes scroll with camera
  const dashes: React.ReactNode[] = [];
  const period = 12;
  const off = camS % period;
  for (let k = 0; k < 40; k++) {
    const z0 = k * period - off;
    const z1 = z0 + 4.5;
    if (z1 < ZN) continue;
    const zs = Math.max(ZN, z0);
    for (const lx of [-1.75, 1.75]) {
      dashes.push(<polygon key={`d${k}${lx}`} points={quad(lx - 0.08, lx + 0.08, zs, z1)} fill={p.lane} opacity={0.9} />);
    }
    for (const lx of [10.75, 14.25]) {
      dashes.push(<polygon key={`o${k}${lx}`} points={quad(lx - 0.08, lx + 0.08, zs, z1)} fill={p.lane} opacity={0.7} />);
    }
  }

  // shoulder texture strips (give a sense of speed on the dirt)
  const shoulder: React.ReactNode[] = [];
  const sp = 7;
  const so = camS % sp;
  for (let k = 0; k < 40; k++) {
    const z0 = k * sp - so;
    const z1 = z0 + 1.2;
    if (z1 < ZN) continue;
    shoulder.push(
      <polygon key={`sh${k}`} points={quad(-9, ROAD_L - 0.3, Math.max(ZN, z0), z1)} fill="#000" opacity={0.08} />,
    );
  }

  type Item = { z: number; node: React.ReactNode };
  const items: Item[] = [];
  const screenPos: Record<string, { sx: number; sy: number; k: number }> = {};

  const fade = (z: number) => interpolate(z, [ZMAX - 50, ZMAX], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  for (const v of vehicles) {
    const z = v.s0 + v.v * t - camS;
    if (z < 1.0 || z > ZMAX) continue;
    const pr = proj(v.x, z);
    const brake = (v.brakeAt ?? []).some(([a, b]) => frame >= a && frame <= b);
    screenPos[v.id] = pr;
    let node: React.ReactNode;
    switch (v.kind) {
      case "truck":
        node = <TruckRear plate={v.plate} body={v.color} night={p.night} brake={brake} />;
        break;
      case "auto":
        node = <AutoRear plate={v.plate} night={p.night} />;
        break;
      case "bus":
        node = <BusRear plate={v.plate} night={p.night} />;
        break;
      default:
        node = (
          <CarRear
            color={v.color ?? "#ccc"}
            plate={v.plate}
            plateType={v.plateType}
            suv={v.kind === "suv"}
            brake={brake}
            night={p.night}
          />
        );
    }
    items.push({
      z,
      node: (
        <g key={v.id} transform={`translate(${pr.sx} ${pr.sy}) scale(${pr.k})`} opacity={fade(z)}>
          {node}
        </g>
      ),
    });
  }

  oncoming.forEach((o, i) => {
    const z = o.s0 - o.v * t - camS;
    if (z < 1.5 || z > ZMAX) return;
    const pr = proj(o.x, z);
    items.push({
      z,
      node: (
        <g key={`on${i}`} transform={`translate(${pr.sx} ${pr.sy}) scale(${pr.k})`} opacity={fade(z)}>
          <CarFront color={o.color} night={p.night} />
        </g>
      ),
    });
  });

  // median lamps every 45 m
  const lampP = 45;
  const lo = camS % lampP;
  for (let k = 0; k < 6; k++) {
    const z = k * lampP - lo + 8;
    if (z < 1.2 || z > ZMAX) continue;
    const pr = proj((MED_L + MED_R) / 2, z);
    items.push({
      z,
      node: (
        <g key={`lamp${k}`} transform={`translate(${pr.sx} ${pr.sy}) scale(${pr.k})`} opacity={fade(z)}>
          <MedianLamp night={p.night} />
        </g>
      ),
    });
  }
  // shrubs on median every 6 m
  const shP = 6;
  const sho = camS % shP;
  for (let k = 0; k < 30; k++) {
    const z = k * shP - sho + 2;
    if (z < 1.2 || z > ZMAX) continue;
    const pr = proj((MED_L + MED_R) / 2, z);
    const flower = (Math.floor((camS + z) / shP) % 3) === 0;
    items.push({
      z,
      node: (
        <g key={`shr${k}`} transform={`translate(${pr.sx} ${pr.sy}) scale(${pr.k})`} opacity={fade(z)}>
          <ellipse cx={0} cy={-0.45} rx={0.9} ry={0.55} fill={p.median} />
          {flower && <ellipse cx={0.1} cy={-0.7} rx={0.55} ry={0.3} fill={p.shrub} />}
        </g>
      ),
    });
  }

  roadside.forEach((r, i) => {
    const z = r.s - camS;
    if (z < 1.2 || z > ZMAX) return;
    const pr = proj(r.x, z);
    let node: React.ReactNode = null;
    if (r.kind === "sign") node = <NHSign lines={r.lines} title={r.title} night={p.night} />;
    if (r.kind === "stone") node = <MileStone place={r.place} km={r.km} />;
    if (r.kind === "tree") node = <Tree s={r.scale} hue={p.night ? "#1D3320" : r.hue} />;
    if (r.kind === "palm") node = <Palm />;
    if (r.kind === "dhaba") node = <RoadsideDhaba name={r.name} deva={r.deva} wall={r.wall} night={p.night} frame={frame} />;
    items.push({
      z,
      node: (
        <g key={`rs${i}`} transform={`translate(${pr.sx} ${pr.sy}) scale(${pr.k})`} opacity={fade(z)}>
          {node}
        </g>
      ),
    });
  });

  items.sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <GlowDefs />
        <Backdrop p={p} horizon={hz} frame={frame} />
        {/* road surfaces */}
        <defs>
          <linearGradient id={`asph-${p.night}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.asphaltFar} />
            <stop offset="12%" stopColor={p.asphalt} />
            <stop offset="100%" stopColor={p.asphalt} />
          </linearGradient>
        </defs>
        <polygon points={quad(-9, ROAD_L, ZN, ZF)} fill="#8A6F4E" opacity={p.night ? 0.35 : 0.6} />
        {shoulder}
        <polygon points={quad(ROAD_L, ROAD_R, ZN, ZF)} fill={`url(#asph-${p.night})`} />
        <polygon points={quad(MED_L, MED_R, ZN, ZF)} fill={p.median} />
        <polygon points={quad(ONC_L, ONC_R, ZN, ZF)} fill={`url(#asph-${p.night})`} />
        <polygon points={quad(-5.3, -5.15, ZN, ZF)} fill={p.lane} />
        <polygon points={quad(5.1, 5.25, ZN, ZF)} fill={p.edgeYellow} />
        <polygon points={quad(7.35, 7.5, ZN, ZF)} fill={p.edgeYellow} />
        {/* crash barrier on median */}
        <polygon points={quad(5.3, 5.42, ZN, ZF)} fill="#B8BCC2" />
        {dashes}
        {/* horizon haze */}
        <rect x={0} y={hz - 40} width={W} height={120} fill={p.skyLow} opacity={p.night ? 0.12 : 0.28} />
        {items.map((it) => it.node)}
        {/* honk bursts in screen space */}
        {honks.map((h, i) => {
          const pos = screenPos[h.vehicleId];
          if (!pos) return null;
          const dur = h.dur ?? 24;
          const local = frame - h.from;
          if (local < 0 || local > dur) return null;
          const pIn = interpolate(local, [0, 5], [0, 1], { extrapolateRight: "clamp" });
          const pOut = interpolate(local, [dur - 5, dur], [1, 0], { extrapolateLeft: "clamp" });
          const shake = Math.sin(local * 2.4) * 6;
          const y = pos.sy - pos.k * 2.6 - 60;
          const x = Math.max(200, Math.min(W - 200, pos.sx + (h.dx ?? 0)));
          return (
            <g key={`h${i}`} transform={`translate(${x + shake} ${Math.max(200, y)})`}>
              <HonkBurst text={h.text} p={Math.min(pIn, pOut)} color={h.color} rot={i % 2 ? 7 : -7} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
