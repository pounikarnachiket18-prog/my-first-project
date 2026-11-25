// Models for the supersonic-vs-hypersonic reel: unmarked target ship, two missile types,
// shock cone, heated-air glow, explosions, shore launcher. Same 2.5D engine as the Navy reels.
import React from "react";
import { Cam, V3, project, poly, path, depthOf, clamp01, lerp } from "../engine";
import { Box, SEA, C } from "../world";
import { useTheme } from "../theme";

const zmOf = (c: Cam) => c.zoom * (c.boost ?? 1);
export const DECK = SEA + 6;
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (v: V3): V3 => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const pxPerM = (cam: Cam, p: V3) => { const a = project(cam, p), b = project(cam, add(p, [0, 0, 1])); return Math.max(0.2, Math.hypot(a[0] - b[0], a[1] - b[1])); };

// ---------------- target ship (decommissioned hulk, no national markings) ----------------
const SHIP_OUT: [number, number][] = [[-6, 0], [6, 0], [7.5, 15], [7.5, 80], [6, 100], [3, 112], [0, 121], [-3, 112], [-6, 100], [-7.5, 80], [-7.5, 15]];
export type ShipState = { hit1?: number; hit2?: number; sink?: number; t: number; label?: number };

export const TargetShip: React.FC<{ cam: Cam; origin: V3; st: ShipState }> = ({ cam, origin, st }) => {
  const th = useTheme();
  const sink = st.sink ?? 0;
  const tf = (p: V3): V3 => [origin[0] + p[0], origin[1] + p[1], origin[2] + p[2] - sink * 7 - p[0] * sink * 0.35 + (p[1] - 60) * sink * 0.04];
  const top = SHIP_OUT.map(([x, y]) => tf([x, y, DECK]));
  const bot = SHIP_OUT.map(([x, y]) => tf([x * 0.82, 3 + y * 0.95, SEA - 1]));
  const sides = top.map((_, i) => {
    const j = (i + 1) % top.length;
    const mid: V3 = [(top[i][0] + top[j][0]) / 2, (top[i][1] + top[j][1]) / 2, (top[i][2] + bot[i][2]) / 2];
    return { q: [top[i], top[j], bot[j], bot[i]], d: depthOf(cam, mid), col: i % 2 ? "#5c6672" : "#6a7480" };
  }).sort((a, b) => b.d - a.d);
  const ring = (cx: number, cy: number, r: number) => Array.from({ length: 24 }, (_, k) => tf([cx + Math.cos((k / 24) * Math.PI * 2) * r, cy + Math.sin((k / 24) * Math.PI * 2) * r, DECK + 0.05]));
  const burn = (st.hit1 ?? 0) > 0 || (st.hit2 ?? 0) > 0;
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top?: string) => {
    const a = tf([x0, y0, DECK + z0]);
    return <Box cam={cam} b={{ x0: a[0], x1: a[0] + (x1 - x0), y0: a[1], y1: a[1] + (y1 - y0), z0: a[2], z1: a[2] + (z1 - z0), top }} />;
  };
  return (
    <g>
      <polygon points={poly(cam, bot.map(([x, y]) => [x + 5, y - 3, SEA] as V3))} fill={th.seaShadow} filter="url(#shadow)" />
      <polygon points={poly(cam, bot)} fill="#4a535e" />
      {sides.map((s, i) => <polygon key={i} points={poly(cam, s.q as V3[])} fill={s.col} stroke={s.col} strokeWidth={0.5} />)}
      <path d={path(cam, bot, true)} fill="none" stroke={th.foam} strokeWidth={Math.max(1, zmOf(cam) * 0.4)} filter="url(#shadow)" />
      <polygon points={poly(cam, top)} fill={burn ? "#5d6268" : "#7e8792"} />
      {/* painted target bullseye on the foredeck */}
      <polygon points={poly(cam, ring(0, 92, 6.2))} fill="#e8453c" />
      <polygon points={poly(cam, ring(0, 92, 4.2))} fill="#f4f1ea" />
      <polygon points={poly(cam, ring(0, 92, 2.2))} fill="#e8453c" />
      {box(-5, 5, 38, 68, 0, 7, "#a6aeb8")}
      {box(-2.2, 2.2, 44, 51, 7, 13, "#5a636e")}
      {box(-4, 4, 60, 68, 7, 11, "#b6bec8")}
      {box(-1.5, 1.5, 96, 100, 0, 2.5, "#8f98a3")}
      <path d={path(cam, [tf([0, 56, DECK + 7]), tf([0, 56, DECK + 21])])} stroke="#cfd5dc" strokeWidth={Math.max(1.2, zmOf(cam) * 0.3)} />
      <path d={path(cam, [tf([-3, 56, DECK + 18]), tf([3, 56, DECK + 18])])} stroke="#cfd5dc" strokeWidth={Math.max(1, zmOf(cam) * 0.25)} />
      {(st.hit1 ?? 0) > 0 && <Fire cam={cam} at={tf([0, 92, DECK + 1])} amt={st.hit1!} t={st.t} seed={1} />}
      {(st.hit2 ?? 0) > 0 && <Fire cam={cam} at={tf([0, 52, DECK + 3])} amt={st.hit2!} t={st.t} seed={2} />}
    </g>
  );
};

// ---------------- fire + smoke left after a hit ----------------
const hash = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
export const Fire: React.FC<{ cam: Cam; at: V3; amt: number; t: number; seed?: number }> = ({ cam, at, amt, t, seed = 1 }) => {
  const k = pxPerM(cam, at);
  const [x, y] = project(cam, at);
  return (
    <g opacity={clamp01(amt)}>
      {Array.from({ length: 7 }, (_, i) => {
        const h = hash(i, seed), age = ((t * 0.9 + h * 60) % 60) / 60;
        return <circle key={`s${i}`} cx={x + (h - 0.5) * 30 * k * 0.3 + age * 40 * k * 0.4} cy={y - age * 180 * k * 0.25} r={(4 + age * 10) * k} fill="#3d3f44" opacity={(1 - age) * 0.55} />;
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const h = hash(seed, i);
        const fl = 0.7 + 0.3 * Math.sin(t * 0.8 + i * 2);
        return <ellipse key={`f${i}`} cx={x + (h - 0.5) * 6 * k} cy={y - 2 * k * fl} rx={(2 + h * 2) * k} ry={(4 + h * 3) * k * fl} fill={i % 2 ? "#ffb347" : "#ff6a2b"} opacity={0.9} />;
      })}
    </g>
  );
};

// ---------------- explosion (screen-space, scaled by distance) ----------------
export const Explosion: React.FC<{ cam: Cam; at: V3; age: number; size?: number; water?: boolean }> = ({ cam, at, age, size = 1, water = true }) => {
  if (age < 0 || age > 90) return null;
  const k = pxPerM(cam, at) * size;
  const [x, y] = project(cam, at);
  const a = age / 90;
  const ball = clamp01(age / 6);
  const fade = 1 - clamp01((age - 10) / 40);
  return (
    <g>
      <defs>
        <radialGradient id={`xb${Math.round(x)}${Math.round(y)}`} cx="50%" cy="55%" r="50%">
          <stop offset="0" stopColor="#fffbe0" /><stop offset="0.35" stopColor="#ffd166" /><stop offset="0.7" stopColor="#ff7a2b" /><stop offset="1" stopColor="#b8321c" stopOpacity={0} />
        </radialGradient>
      </defs>
      {water && Array.from({ length: 9 }, (_, i) => {
        const h = hash(i, 9), ang = (-90 + (h - 0.5) * 70) * Math.PI / 180;
        const r = (20 + 40 * h) * k * clamp01(age / 20);
        return <ellipse key={`w${i}`} cx={x + Math.cos(ang) * r * 0.6} cy={y + Math.sin(ang) * r - 4 * k * a * a * 20} rx={(3 + 4 * h) * k} ry={(6 + 10 * h) * k} fill="#f3f8fc" opacity={0.85 * (1 - a)} />;
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const h = hash(i, 3);
        const r = (10 + 22 * a) * k * (0.6 + h * 0.6);
        return <circle key={`s${i}`} cx={x + (h - 0.5) * 30 * k} cy={y - (10 + 40 * a) * k * (0.5 + h)} r={r} fill="#45474c" opacity={0.55 * (1 - a)} />;
      })}
      <circle cx={x} cy={y - 6 * k} r={(14 + 16 * ball) * k} fill={`url(#xb${Math.round(x)}${Math.round(y)})`} opacity={fade} />
      {Array.from({ length: 10 }, (_, i) => {
        const h = hash(i, 5), ang = (h * 360) * Math.PI / 180, r = (8 + 60 * clamp01(age / 25)) * k;
        return <line key={`d${i}`} x1={x + Math.cos(ang) * r * 0.8} y1={y + Math.sin(ang) * r * 0.6 - 10 * k} x2={x + Math.cos(ang) * r} y2={y + Math.sin(ang) * r * 0.75 - 10 * k + age * 0.4 * k} stroke="#2a2a2e" strokeWidth={Math.max(1.5, 1.2 * k)} opacity={1 - a} />;
      })}
      {age < 4 && <circle cx={x} cy={y - 6 * k} r={(26 + 10 * age) * k} fill="#fff6d6" opacity={(1 - age / 4) * 0.7} filter="url(#softglow)" />}
    </g>
  );
};

// ---------------- missiles ----------------
/** supersonic cruise missile (BrahMos-like, generic): capsule body, nose cone, fins, ramjet glow */
export const CruiseMissile: React.FC<{ cam: Cam; nose: V3; dir: V3; len?: number; diam?: number; burn?: number; t: number }> = ({ cam, nose, dir, len = 22, diam = 1.8, burn = 1, t }) => {
  const d = norm(dir);
  const tail = add(nose, d, -len), mid = add(nose, d, -len * 0.5), coneEnd = add(nose, d, -len * 0.16);
  const k = pxPerM(cam, mid);
  const [nx, ny] = project(cam, nose), [tx, ty] = project(cam, tail), [cx, cy] = project(cam, coneEnd);
  const sx = nx - tx, sy = ny - ty, sl = Math.hypot(sx, sy) || 1, px = -sy / sl, py = sx / sl;
  const w = Math.max(3, diam * k);
  const fin = (f: number, s: number) => { const b = project(cam, add(nose, d, -len * f)); return `M${b[0] + px * w * 0.4 * s} ${b[1] + py * w * 0.4 * s} L${b[0] + px * w * 1.5 * s - sx / sl * w} ${b[1] + py * w * 1.5 * s - sy / sl * w} L${b[0] + px * w * 0.4 * s - sx / sl * w * 1.4} ${b[1] + py * w * 0.4 * s - sy / sl * w * 1.4} Z`; };
  const fl = 0.85 + 0.15 * Math.sin(t * 2.1);
  return (
    <g>
      {burn > 0 && <line x1={tx} y1={ty} x2={tx - sx / sl * w * 6 * fl * burn} y2={ty - sy / sl * w * 6 * fl * burn} stroke="#ffb347" strokeWidth={w * 0.8} strokeLinecap="round" filter="url(#glow)" opacity={0.9} />}
      <path d={fin(0.92, 1)} fill="#8d96a2" /><path d={fin(0.92, -1)} fill="#8d96a2" />
      <path d={fin(0.45, 1)} fill="#a2aab5" /><path d={fin(0.45, -1)} fill="#a2aab5" />
      <line x1={tx} y1={ty} x2={cx} y2={cy} stroke="#eef1f5" strokeWidth={w} strokeLinecap="round" />
      <line x1={tx} y1={ty} x2={cx} y2={cy} stroke="#b9c1cb" strokeWidth={w * 0.35} strokeLinecap="round" transform={`translate(${px * w * 0.25},${py * w * 0.25})`} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#3b4250" strokeWidth={w * 0.85} strokeLinecap="round" />
    </g>
  );
};

/** hypersonic glide vehicle: flat delta wedge */
export const GlideVehicle: React.FC<{ cam: Cam; nose: V3; dir: V3; len?: number; span?: number; heat?: number; t: number }> = ({ cam, nose, dir, len = 18, span = 8, heat = 1, t }) => {
  const d = norm(dir);
  const tail = add(nose, d, -len);
  const [nx, ny] = project(cam, nose), [tx, ty] = project(cam, tail);
  const k = pxPerM(cam, tail);
  const sx = nx - tx, sy = ny - ty, sl = Math.hypot(sx, sy) || 1, px = -sy / sl, py = sx / sl;
  const hw = Math.max(4, span * 0.5 * k);
  const fl = 0.9 + 0.1 * Math.sin(t * 3.3);
  return (
    <g>
      {heat > 0 && <HeatGlow at={[(nx + tx) / 2, (ny + ty) / 2]} len={sl * 1.9} wid={hw * 3.2} ang={Math.atan2(sy, sx)} amt={heat * fl} />}
      <polygon points={`${nx},${ny} ${tx + px * hw},${ty + py * hw} ${tx - px * hw * 0.2 - sx / sl * hw * 0.3},${ty - py * hw * 0.2 - sy / sl * hw * 0.3} ${tx - px * hw},${ty - py * hw}`} fill="#2f343c" stroke={heat > 0.3 ? "#ffd7a0" : "#6d7682"} strokeWidth={Math.max(1, hw * 0.12)} />
      <line x1={nx} y1={ny} x2={tx} y2={ty} stroke="#59616d" strokeWidth={Math.max(1, hw * 0.18)} />
    </g>
  );
};

/** heated-air glow around a hypersonic body (screen space) */
export const HeatGlow: React.FC<{ at: [number, number]; len: number; wid: number; ang: number; amt: number }> = ({ at, len, wid, ang, amt }) => (
  <g transform={`translate(${at[0]},${at[1]}) rotate(${(ang * 180) / Math.PI})`} opacity={clamp01(amt)} style={{ mixBlendMode: "screen" }}>
    <defs>
      <radialGradient id="heatg" cx="62%" cy="50%" r="55%">
        <stop offset="0" stopColor="#ffffff" /><stop offset="0.25" stopColor="#ffe3a3" /><stop offset="0.55" stopColor="#ff8a4c" /><stop offset="0.8" stopColor="#ff4f8b" stopOpacity={0.5} /><stop offset="1" stopColor="#ff4f8b" stopOpacity={0} />
      </radialGradient>
    </defs>
    <ellipse cx={len * 0.05} cy={0} rx={len * 0.6} ry={wid * 0.5} fill="url(#heatg)" filter="url(#softglow)" />
    <ellipse cx={len * 0.12} cy={0} rx={len * 0.42} ry={wid * 0.3} fill="url(#heatg)" />
  </g>
);

/** shock (Mach) cone behind a supersonic nose, drawn in screen space; half-angle = asin(1/M) */
export const MachCone: React.FC<{ cam: Cam; nose: V3; dir: V3; mach: number; lenPx?: number; amt?: number }> = ({ cam, nose, dir, mach, lenPx = 520, amt = 1 }) => {
  if (mach <= 1 || amt <= 0) return null;
  const [nx, ny] = project(cam, nose), [bx, by] = project(cam, add(nose, norm(dir), -10));
  const ang = Math.atan2(by - ny, bx - nx);
  const mu = Math.asin(1 / mach);
  const pts = [-1, 1].map((s) => [nx + Math.cos(ang + s * mu) * lenPx, ny + Math.sin(ang + s * mu) * lenPx]);
  return (
    <g opacity={amt}>
      <polygon points={`${nx},${ny} ${pts[0][0]},${pts[0][1]} ${pts[1][0]},${pts[1][1]}`} fill="rgba(255,255,255,0.10)" />
      {pts.map((p, i) => <line key={i} x1={nx} y1={ny} x2={p[0]} y2={p[1]} stroke="#ffffff" strokeWidth={4} strokeOpacity={0.75} filter="url(#glow)" />)}
    </g>
  );
};

/** expanding sonic-boom ring on the sea surface */
export const BoomRing: React.FC<{ cam: Cam; at: V3; age: number }> = ({ cam, at, age }) => {
  if (age < 0 || age > 50) return null;
  const a = age / 50;
  return (
    <g opacity={1 - a}>
      {[0, 1, 2].map((i) => {
        const r = (20 + 180 * a) * (1 - i * 0.18);
        const pts = Array.from({ length: 40 }, (_, k) => [at[0] + Math.cos((k / 40) * Math.PI * 2) * r, at[1] + Math.sin((k / 40) * Math.PI * 2) * r, SEA + 0.1] as V3);
        return <path key={i} d={path(cam, pts, true)} fill="none" stroke="#ffffff" strokeWidth={4 - i} strokeOpacity={0.7} />;
      })}
    </g>
  );
};

// ---------------- coastline + mobile launcher ----------------
export const Coast: React.FC<{ cam: Cam; x0: number }> = ({ cam, x0 }) => {
  const th = useTheme();
  const land: V3[] = [[x0, -600, SEA + 2], [x0 + 900, -600, SEA + 2], [x0 + 900, 900, SEA + 2], [x0, 900, SEA + 2]];
  const beach: V3[] = [[x0 - 14, -600, SEA + 0.2], [x0 + 6, -600, SEA + 0.2], [x0 + 6, 900, SEA + 0.2], [x0 - 14, 900, SEA + 0.2]];
  return (
    <g>
      <polygon points={poly(cam, beach)} fill="#d9c79b" />
      <polygon points={poly(cam, land)} fill={th.day ? th.land : "#1b2a22"} />
    </g>
  );
};

export const Launcher: React.FC<{ cam: Cam; at: V3; elev: number; fired: number; t: number }> = ({ cam, at, elev, fired, t }) => {
  const [x, y, z] = at;
  const tubeBase: V3 = [x, y - 4, z + 4];
  const a = (elev * Math.PI) / 180;
  const tubeTop: V3 = [x, y - 4 + Math.cos(a) * 14, z + 4 + Math.sin(a) * 14];
  const k = pxPerM(cam, at);
  const plume = fired > 0 && fired < 1;
  return (
    <g>
      <polygon points={poly(cam, [[x - 2, y - 9, z + 0.05], [x + 4, y - 9, z + 0.05], [x + 4, y + 10, z + 0.05], [x - 2, y + 10, z + 0.05]] as V3[])} fill="rgba(0,0,0,0.35)" filter="url(#shadow)" />
      <Box cam={cam} b={{ x0: x - 1.6, x1: x + 1.6, y0: y - 8, y1: y + 9, z0: z, z1: z + 2.6, top: "#556b4f" }} />
      <Box cam={cam} b={{ x0: x - 1.5, x1: x + 1.5, y0: y + 6, y1: y + 9.5, z0: z + 2.6, z1: z + 5, top: "#62795b" }} />
      <path d={path(cam, [tubeBase, tubeTop])} stroke="#7c8f72" strokeWidth={Math.max(4, 2.6 * k)} strokeLinecap="round" />
      {plume && Array.from({ length: 8 }, (_, i) => {
        const h = hash(i, 7), age = ((t * 1.3 + h * 40) % 40) / 40;
        const [px, py] = project(cam, [x + (h - 0.5) * 8, y - 8 - age * 18, z + 1 + age * 6]);
        return <circle key={i} cx={px} cy={py} r={(3 + age * 9) * k} fill="#e9ecef" opacity={(1 - age) * 0.7 * (1 - fired)} />;
      })}
    </g>
  );
};

export { lerp, C };
