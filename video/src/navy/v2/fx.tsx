// v2 cinematic layer: ocean surface, sky/horizon, light rays, keyword typography, transitions.
import React from "react";
import { useCurrentFrame } from "remotion";
import { Cam, V3, project, depthOf, clamp01, lerp } from "../engine";
import { Defs, SEA, C } from "../world";
import { SkyDef } from "../ui";
import { useTheme } from "../theme";
import { useMotion } from "./ctx";

const D = Math.PI / 180;
const zmOf = (c: Cam) => c.zoom * (c.boost ?? 1);

/** world point on plane z=Z under screen pixel (sx, sy); null if above the horizon */
export const unproject = (c: Cam, sx: number, sy: number, Z: number): V3 | null => {
  const zm = zmOf(c), a = c.yaw * D, p = c.pitch * D, F = c.F;
  const A = (c.cy - sy) / zm, B = (sx - c.cx) / zm;
  const zr = Z - c.tz;
  const den = A * Math.sin(p) - F * Math.cos(p);
  if (Math.abs(den) < 1e-6) return null;
  const y1 = (F * zr * Math.sin(p) - A * F + A * zr * Math.cos(p)) / den;
  const depth = y1 * Math.sin(p) - zr * Math.cos(p);
  if (F + depth <= 1) return null;
  const s = F / (F + depth);
  const x1 = B / s;
  const x = x1 * Math.cos(a) + y1 * Math.sin(a);
  const y = -x1 * Math.sin(a) + y1 * Math.cos(a);
  return [x + c.tx, y + c.ty, Z];
};

/** screen y of the horizon (sea level at infinity straight ahead) */
export const horizonY = (c: Cam) => {
  const a = c.yaw * D, R = 1e6;
  return project(c, [c.tx + Math.sin(a) * R, c.ty + Math.cos(a) * R, SEA])[1];
};

const hash = (i: number, j: number) => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** world-anchored ocean surface: glinting wave strokes that stay put as the camera moves */
export const Ocean: React.FC<{ cam: Cam; t: number; amt?: number; blur?: number }> = ({ cam, t, amt: amt0 = 1, blur = 0 }) => {
  const th = useTheme();
  const amt = amt0 * th.oceanGain;
  const zm = zmOf(cam);
  const base = Math.min(80, Math.max(3, 42 / zm));
  // probe the screen to find which part of the sea plane is visible, by depth band
  const probes: { p: V3; d: number }[] = [];
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 12; j++) {
    const p = unproject(cam, -80 + (i / 6) * 1240, -40 + (j / 12) * 2000, SEA);
    if (p) probes.push({ p, d: depthOf(cam, p) });
  }
  const levels = [
    { sp: base, d0: -1e9, d1: cam.F * 0.6 },
    { sp: base * 3, d0: cam.F * 0.6, d1: cam.F * 3 },
    { sp: base * 9, d0: cam.F * 3, d1: cam.F * 12 },
  ];
  const strokes: React.ReactNode[] = [];
  let budget = 1700;
  levels.forEach((lv, li) => {
    const inBand = probes.filter((q) => q.d >= lv.d0 - lv.sp * 2 && q.d <= lv.d1 + lv.sp * 2);
    if (!inBand.length) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    inBand.forEach(({ p }) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const sp = lv.sp;
    const i0 = Math.floor(x0 / sp) - 1, i1 = Math.ceil(x1 / sp) + 1, j0 = Math.floor(y0 / sp) - 1, j1 = Math.ceil(y1 / sp) + 1;
    if ((i1 - i0) * (j1 - j0) > budget * 3) return;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (budget <= 0) return;
      const h = hash(i + li * 1000, j);
      const wx = (i + h) * sp, wy = (j + hash(j, i + li * 77)) * sp;
      const dd = depthOf(cam, [wx, wy, SEA]);
      if (dd < lv.d0 || dd >= lv.d1 || dd < -cam.F * 0.85) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 0.09 + h * 40);
      const o = (0.06 + 0.2 * tw * tw) * amt * clamp01(1 - dd / (cam.F * 12));
      if (o < 0.03) continue;
      const len = sp * (0.28 + 0.25 * h);
      const drift = Math.sin(t * 0.03 + h * 9) * sp * 0.15;
      const a = project(cam, [wx - len / 2 + drift, wy, SEA]), b = project(cam, [wx + len / 2 + drift, wy, SEA]);
      if (a[0] < -60 && b[0] < -60) continue;
      if (a[0] > 1140 && b[0] > 1140) continue;
      if (a[1] < -60 || a[1] > 1980) continue;
      const s = cam.F / Math.max(80, cam.F + dd);
      budget--;
      strokes.push(<line key={`${li}-${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={th.oceanStroke} strokeOpacity={Math.min(0.9, o)} strokeWidth={Math.max(0.8, Math.min(4, 2.2 * s * Math.sqrt(zm / 3)))} strokeLinecap="round" />);
    }
  });
  return <g filter={blur > 0 ? `url(#dof${Math.round(blur)})` : undefined}>{strokes}</g>;
};

/** sky + horizon haze for low camera angles (draws nothing when the horizon is off-screen) */
export const SkyHorizon: React.FC<{ cam: Cam; warm?: number }> = ({ cam, warm = 0 }) => {
  const th = useTheme();
  const hy = horizonY(cam);
  if (!(hy > -40) || hy > 1960) return null;
  return (
    <g>
      <defs>
        <linearGradient id="skyv2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.sky[0]} />
          <stop offset="0.7" stopColor={th.sky[1]} />
          <stop offset="1" stopColor={warm > 0 ? th.skyWarm : th.sky[2]} />
        </linearGradient>
        <linearGradient id="seav2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.seaGrad[0]} />
          <stop offset="0.35" stopColor={th.seaGrad[1]} />
          <stop offset="1" stopColor={th.seaGrad[2]} />
        </linearGradient>
        <radialGradient id="sunv2" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={th.sun} stopOpacity={(th.day ? 0.8 : 0.55) * Math.max(warm, th.day ? 0.6 : 0)} />
          <stop offset="1" stopColor={th.sun} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={hy} width={1080} height={Math.max(0, 1920 - hy)} fill="url(#seav2)" />
      <rect x={0} y={0} width={1080} height={Math.max(0, hy)} fill="url(#skyv2)" />
      {(warm > 0 || th.day) && <ellipse cx={760} cy={hy - 10} rx={520} ry={240} fill="url(#sunv2)" />}
      {th.day && <ellipse cx={760} cy={hy + 260} rx={90} ry={300} fill="url(#sunv2)" opacity={0.7} />}
      <rect x={0} y={hy - 3} width={1080} height={6} fill={th.haze} opacity={th.hazeOpacity} filter="url(#softglow)" />
    </g>
  );
};

/** soft volumetric light shafts (screen space, subtle) */
export const LightRays: React.FC<{ t: number; amt?: number; from?: [number, number] }> = ({ t, amt = 1, from = [900, -200] }) => {
  const th = useTheme();
  return (
  <g opacity={0.55 * amt * th.rayGain} style={{ mixBlendMode: "screen" }}>
    <defs>
      <linearGradient id="rayv2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={th.ray} stopOpacity={0.16} />
        <stop offset="1" stopColor={th.ray} stopOpacity={0} />
      </linearGradient>
    </defs>
    {[0, 1, 2, 3].map((k) => {
      const ang = 22 + k * 7 + Math.sin(t * 0.01 + k) * 2;
      const w = 70 + k * 40;
      return <rect key={k} x={from[0] - w / 2} y={from[1]} width={w} height={2600} fill="url(#rayv2)" transform={`rotate(${ang} ${from[0]} ${from[1]})`} opacity={0.5 + 0.5 * Math.sin(t * 0.02 + k * 2)} />;
    })}
  </g>
  );
};

/** big editorial keyword, letters pop in; centred at (x, y) unless align=left */
export const Keyword: React.FC<{ text: string; f: number; at: number; until: number; x?: number; y?: number; size?: number; color?: string; align?: "left" | "center"; wobble?: boolean }> =
  ({ text, f, at, until, x = 540, y = 520, size = 92, color = "#eef3f8", align = "center", wobble = false }) => {
    const { fast } = useMotion();
    const popF = fast ? 3.5 : 6, stag = fast ? 0.4 : 0.8;
    if (f < at - 1 || f > until + 10) return null;
    const out = clamp01((f - until) / (fast ? 5 : 8));
    const lines = text.split("\n");
    return (
      <g opacity={1 - out} transform={`translate(0,${-out * 14})`}>
        {lines.map((ln, li) => {
          const chars = ln.split("");
          const adv = (ch: string) => size * (ch === " " ? 0.36 : ch === "I" || ch === "!" || ch === "?" ? 0.42 : ch === "-" ? 0.55 : /[MW]/.test(ch) ? 1.1 : 0.86);
          const offs: number[] = [];
          let acc = 0;
          chars.forEach((ch) => { offs.push(acc); acc += adv(ch); });
          const total = acc;
          const sx = align === "center" ? x - total / 2 : x;
          return (
            <g key={li}>
              {chars.map((ch, i) => {
                const k = clamp01((f - at - (li * chars.length + i) * stag) / popF);
                const sc = fast ? (k < 1 ? lerp(1.8, 0.94, 1 - Math.pow(1 - k, 3)) : 1 + 0.06 * Math.exp(-(f - at - (li * chars.length + i) * stag - popF) / 3) * Math.cos((f - at) * 0.9) * -1) : lerp(1.6, 1, 1 - Math.pow(1 - k, 3));
                const wob = wobble ? Math.sin((f - at) * 0.6 + i) * 4 * (1 - clamp01((f - at) / 30)) : 0;
                const cx = sx + offs[i] + adv(ch) / 2, cy = y + li * size * 1.08;
                return (
                  <text key={i} x={cx} y={cy + wob} textAnchor="middle" fontFamily="Unbounded" fontWeight={800} fontSize={size}
                    fill={color} opacity={k} transform={`translate(${cx},${cy}) scale(${sc}) translate(${-cx},${-cy})`}
                    style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.55)", strokeWidth: size * 0.08 }}>{ch}</text>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  };

/** small mono fact tag (used for the Naval LCA prototype note etc.) */
export const Tag: React.FC<{ text: string; x: number; y: number; p: number; color?: string }> = ({ text, x, y, p: p0, color = C.cyan }) => {
  const { fast } = useMotion();
  const p = fast ? Math.min(1, p0 * 1.8) : p0;
  if (p <= 0) return null;
  const w = text.length * 15.6 + 34;
  return (
    <g opacity={p} transform={`translate(${(1 - p) * -16},0)`}>
      <rect x={x} y={y} width={w} height={44} rx={8} fill="rgba(7,11,18,0.85)" stroke="rgba(255,255,255,0.1)" />
      <rect x={x} y={y} width={5} height={44} rx={2} fill={color} />
      <text x={x + 20} y={y + 29} fill="#dbe6f2" fontFamily="JetBrains Mono" fontSize={24} fontWeight={600}>{text}</text>
    </g>
  );
};

/** spark particles at a screen point */
export const Sparks: React.FC<{ at: [number, number]; f: number; seed?: number; n?: number; dir?: number; size?: number }> = ({ at, f, seed = 1, n = 18, dir = -1, size = 1 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const h = hash(i, seed), h2 = hash(seed, i);
      const life = 10 + h * 14;
      const age = (f + h * 30) % life;
      const k = age / life;
      const ang = (dir * 160 + (h2 - 0.5) * 70) * D;
      const v = (60 + 140 * h) * size;
      const x = at[0] + Math.cos(ang) * v * k, y = at[1] + Math.sin(ang) * v * k * 0.6 + 40 * k * k * size;
      const x2 = x - Math.cos(ang) * 14 * size, y2 = y - Math.sin(ang) * 8 * size;
      return <line key={i} x1={x} y1={y} x2={x2} y2={y2} stroke={h > 0.5 ? "#ffd38a" : "#fff3dc"} strokeWidth={2.2 * size} strokeLinecap="round" opacity={1 - k} />;
    })}
  </g>
);

/** tyre smoke puffs at a screen point */
export const Puffs: React.FC<{ at: [number, number]; age: number; scale?: number }> = ({ at, age, scale = 1 }) => {
  if (age < 0 || age > 40) return null;
  const k = age / 40;
  return (
    <g opacity={(1 - k) * 0.7} filter="url(#softglow)">
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={at[0] - i * 18 * scale * (0.5 + k)} cy={at[1] - i * 6 * scale} r={(14 + 40 * k) * scale * (1 - i * 0.15)} fill="#d7dee6" />)}
    </g>
  );
};

/** scene wrapper: own svg, defs, zoom-through enter/exit, optional camera shake and freeze tint */
export const Stage: React.FC<{ children: React.ReactNode; dur: number; enter?: "zoom" | "cut" | "fade"; exit?: "zoom" | "cut"; tint?: number; flash?: number }> =
  ({ children, dur, enter = "zoom", exit = "zoom", tint = 0, flash = 0 }) => {
    const f = useCurrentFrame();
    const { fast } = useMotion();
    const EI = fast ? 6 : 9, EO = fast ? 5 : 7;
    const ein = enter === "zoom" ? 1 - clamp01(f / EI) : 0;
    const eout = exit === "zoom" ? clamp01((f - (dur - EO)) / EO) : 0;
    const fade = enter === "fade" ? clamp01(f / 10) : enter === "zoom" ? clamp01(f / 4) : 1;
    const sc = 1 + 0.22 * Math.pow(ein, 2) + 0.28 * Math.pow(eout, 2);
    const bl = 9 * ein + 8 * eout;
    return (
      <div style={{ position: "absolute", inset: 0, transform: `scale(${sc})`, filter: `${bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : ""} ${tint > 0 ? `saturate(${1 - 0.6 * tint}) brightness(${1 - 0.15 * tint})` : ""}`, opacity: fade }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          <Defs />
          <SkyDef />
          <defs>
            {[1, 2, 3, 4].map((b) => <filter key={b} id={`dof${b}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={b} /></filter>)}
          </defs>
          {children}
          {flash > 0 && <rect width={1080} height={1920} fill="#ffffff" opacity={flash} />}
        </svg>
      </div>
    );
  };

export const shakeCam = (f: number, amt: number): Partial<Cam> => ({ cx: 540 + Math.sin(f * 2.1) * amt + Math.sin(f * 5.3) * amt * 0.4, cy: 900 + Math.cos(f * 1.7) * amt + Math.cos(f * 4.1) * amt * 0.4 });

/** slow-motion time remap: real frames -> story frames, slowed by `k` inside [a, b] */
export const slowmo = (f: number, a: number, b: number, k: number) => (f < a ? f : f < b ? a + (f - a) * k : a + (b - a) * k + (f - b));

/** v3 motion graphic: screen-space speed streaks (dir in degrees, 0 = streaks move right) */
export const SpeedLines: React.FC<{ f: number; amt: number; dir?: number; seed?: number; n?: number }> = ({ f, amt, dir = 180, seed = 1, n = 26 }) => {
  const { fast } = useMotion();
  if (!fast || amt <= 0.01) return null;
  const a = dir * D, ca = Math.cos(a), sa = Math.sin(a);
  return (
    <g opacity={amt} style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: n }, (_, i) => {
        const h = hash(i, seed), h2 = hash(seed, i * 3 + 1);
        const len = 90 + 260 * h;
        const speed = 70 + 90 * h2;
        const across = -300 + 1680 * h2;              // position perpendicular to motion
        const along = ((f * speed + h * 4000) % 2600) - 700; // position along motion
        const cx = 540 + ca * along - sa * across, cy = 960 + sa * along + ca * across;
        return <line key={i} x1={cx} y1={cy} x2={cx - ca * len} y2={cy - sa * len} stroke="#ffffff" strokeOpacity={0.1 + 0.22 * h} strokeWidth={1.5 + 2.5 * h2} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** v3 motion graphic: viewfinder brackets that snap onto a screen point */
export const FocusBrackets: React.FC<{ at: [number, number]; f: number; from: number; to?: number; size?: number; color?: string }> = ({ at, f, from, to = 1e9, size = 90, color = C.orange }) => {
  const { fast } = useMotion();
  if (!fast || f < from || f > to + 6) return null;
  const k = clamp01((f - from) / 5);
  const out = clamp01((f - to) / 6);
  const s = size * lerp(2.2, 1, 1 - Math.pow(1 - k, 3)) * (1 + 0.04 * Math.sin((f - from) * 0.5));
  const c = s * 0.32;
  const [x, y] = at;
  const corner = (sx: number, sy: number) => `M${x + sx * s} ${y + sy * (s - c)} L${x + sx * s} ${y + sy * s} L${x + sx * (s - c)} ${y + sy * s}`;
  return (
    <g opacity={k * (1 - out)} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round">
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => <path key={i} d={corner(sx, sy)} />)}
      <circle cx={x} cy={y} r={5} fill={color} stroke="none" />
    </g>
  );
};
