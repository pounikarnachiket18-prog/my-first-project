import React from "react";
import { Cam, V3, project, poly, path, depthOf, rotZ, clamp01, mixColor, lerp } from "./engine";
import { useTheme, Theme, NIGHT } from "./theme";

export const C = {
  bg0: "#070b12",
  bg1: "#172131",
  deck: "#4d5869",
  deckHi: "#5a6678",
  ramp: "#56627400",
  hullA: "#1b232f",
  hullB: "#3a4657",
  line: "rgba(235,242,250,0.78)",
  lineDim: "rgba(235,242,250,0.32)",
  cyan: "#38c6ff",
  orange: "#ff9a3c",
  red: "#ff4d5e",
  jet: "#cdd5e0",
  jetDark: "#9aa6b6",
  saffron: "#FF9933",
  green: "#138808",
  navy: "#000080",
};

// ---------------- INS Vikrant geometry (metres) ----------------
export const L = 262;
export const H = 15; // freeboard
export const SEA = -H;
export const RAMP0 = 208;
export const RAMP_H = 7;
export const deckZ = (y: number) => (y <= RAMP0 ? 0 : RAMP_H * Math.pow(Math.min(1, (y - RAMP0) / (L - RAMP0)), 2));

const OUTLINE2D: [number, number][] = [
  [-24, 0], [20, 0], [27, 14], [29, 40], [30, 120], [30, 165], [27, 195], [20, 222], [13, 244], [8, 262],
  [-10, 262], [-16, 244], [-23, 214], [-30, 180], [-34, 140], [-35, 95], [-33, 50], [-29, 18],
];
// densify so the ski-jump curve shows on the outline
const densify = (pts: [number, number][], step = 6) => {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
};
const OUT = densify(OUTLINE2D);
export const TOP: V3[] = OUT.map(([x, y]) => [x, y, deckZ(y)]);
const BOT: V3[] = OUT.map(([x, y]) => [x * 0.8, 9 + y * 0.925, SEA]);

/** x-extent of deck at a given y (for ramp cross lines) */
const xRange = (y: number): [number, number] => {
  let lo = 99, hi = -99;
  for (let i = 0; i < OUTLINE2D.length; i++) {
    const a = OUTLINE2D[i], b = OUTLINE2D[(i + 1) % OUTLINE2D.length];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
      const x = lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1]));
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return [lo, hi];
};
export const onDeck = (x: number, y: number) => {
  if (y < 0 || y > L) return false;
  const [a, b] = xRange(y);
  return x >= a && x <= b;
};

// angled landing deck
const A0: [number, number] = [-3, 2];
const A1: [number, number] = [-27, 168];
const AL = Math.hypot(A1[0] - A0[0], A1[1] - A0[1]);
export const ANG_DIR: [number, number] = [(A1[0] - A0[0]) / AL, (A1[1] - A0[1]) / AL];
export const ANG_HEADING = (Math.atan2(-ANG_DIR[0], ANG_DIR[1]) * 180) / Math.PI; // deg, + = turn to port
const PERP: [number, number] = [ANG_DIR[1], -ANG_DIR[0]];
export const angPoint = (s: number, off = 0, z = 0): V3 => [A0[0] + ANG_DIR[0] * s + PERP[0] * off, A0[1] + ANG_DIR[1] * s + PERP[1] * off, z];
export const WIRES = [38, 50, 62];

export const Defs: React.FC = () => (
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="softglow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" />
    </filter>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" />
    </filter>
  </defs>
);

const sideShade = (a: V3, b: V3, th: Theme = NIGHT) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const nx = dy / n, ny = -dx / n; // outward normal (outline is clockwise from stern-port)
  const lit = clamp01(0.5 + 0.5 * (nx * 0.55 + ny * -0.35) * -1);
  return mixColor(th.hullA, th.hullB, lit);
};

type Prism = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; top?: string };
export const Box: React.FC<{ cam: Cam; b: Prism }> = ({ cam, b }) => {
  const th = useTheme();
  const corners: [number, number][] = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  const sides = corners.map((p, i) => {
    const q = corners[(i + 1) % 4];
    const quad: V3[] = [[p[0], p[1], b.z0], [q[0], q[1], b.z0], [q[0], q[1], b.z1], [p[0], p[1], b.z1]];
    const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (b.z0 + b.z1) / 2];
    return { quad, d: depthOf(cam, mid), col: sideShade([p[0], p[1], 0], [q[0], q[1], 0], th) };
  }).sort((u, v) => v.d - u.d);
  return (
    <g>
      {sides.map((s, i) => <polygon key={i} points={poly(cam, s.quad)} fill={s.col} />)}
      <polygon points={poly(cam, corners.map(([x, y]) => [x, y, b.z1] as V3))} fill={b.top ?? th.boxTop} />
    </g>
  );
};

// ---------------- Indian flag (3D, on the mast) ----------------
export const MastFlag: React.FC<{ cam: Cam; base: V3; size: number; t: number }> = ({ cam, base, size, t }) => {
  const w = size * 1.5, h = size, N = 8;
  const pt = (u: number, v: number): V3 => {
    const wave = Math.sin(u * 5 - t * 0.25) * size * 0.12 * u;
    return [base[0] + wave, base[1] - u * w, base[2] - v * h];
  };
  const band = (v0: number, v1: number) => {
    const top = Array.from({ length: N + 1 }, (_, i) => pt(i / N, v0));
    const bot = Array.from({ length: N + 1 }, (_, i) => pt(1 - i / N, v1));
    return poly(cam, [...top, ...bot]);
  };
  const c = project(cam, pt(0.5, 0.5));
  const r = Math.abs(project(cam, pt(0.5, 0.5 + 0.13))[1] - c[1]);
  return (
    <g>
      <line x1={project(cam, [base[0], base[1], base[2] - h * 2.2])[0]} y1={project(cam, [base[0], base[1], base[2] - h * 2.2])[1]}
        x2={project(cam, base)[0]} y2={project(cam, base)[1] - 2} stroke="#c9d2de" strokeWidth={Math.max(1, cam.zoom * 0.18)} />
      <polygon points={band(0, 1 / 3)} fill={C.saffron} />
      <polygon points={band(1 / 3, 2 / 3)} fill="#ffffff" />
      <polygon points={band(2 / 3, 1)} fill={C.green} />
      {r > 2 && <circle cx={c[0]} cy={c[1]} r={r} fill="none" stroke={C.navy} strokeWidth={Math.max(0.6, r * 0.22)} />}
    </g>
  );
};

// ---------------- Branding painted on the ship (v3) ----------------
export type Brand = { deck: [string, string]; hull: string } | null;
export const BrandCtx = React.createContext<Brand>(null);

/** text painted on a plane: p0 = baseline-left (world), ex = reading direction, ey = "down" on the text (unit vectors, metres) */
const PlaneText: React.FC<{ cam: Cam; p0: V3; ex: V3; ey: V3; w: number; size: number; text: string; font: string; weight: number; fill: string; opacity: number }> =
  ({ cam, p0, ex, ey, w, size, text, font, weight, fill, opacity }) => {
    const add = (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
    const O = project(cam, p0);
    const Uw = project(cam, add(p0, ex, w)), Vh = project(cam, add(p0, ey, -size));
    const U = [(Uw[0] - O[0]) / w, (Uw[1] - O[1]) / w];
    const V = [(Vh[0] - O[0]) / -size, (Vh[1] - O[1]) / -size];
    return (
      <text transform={`matrix(${U[0]},${U[1]},${V[0]},${V[1]},${O[0]},${O[1]})`} x={0} y={0} fontFamily={font} fontWeight={weight} fontSize={size}
        textLength={w} lengthAdjust="spacingAndGlyphs" fill={fill} opacity={opacity}>{text}</text>
    );
  };

const ShipBrand: React.FC<{ cam: Cam; brand: NonNullable<Brand>; paint: string }> = ({ cam, brand, paint }) => {
  // flight deck, forward of the island, read from the stern (letters point toward the bow)
  const deck1 = <PlaneText cam={cam} p0={[-27, 186, 0.05]} ex={[1, 0, 0]} ey={[0, -1, 0]} w={41} size={8.2} text={brand.deck[0]} font="Unbounded" weight={800} fill={paint} opacity={0.82} />;
  const deck2 = <PlaneText cam={cam} p0={[-17, 176.5, 0.05]} ex={[1, 0, 0]} ey={[0, -1, 0]} w={27} size={4.6} text={brand.deck[1]} font="Inter" weight={700} fill={paint} opacity={0.75} />;
  // port hull side, midships (only when that side faces the camera)
  const portVisible = depthOf(cam, [-45, 122, -6]) < depthOf(cam, [-25, 122, -6]);
  const n = Math.hypot(0.46, 1);
  const hull = portVisible ? <PlaneText cam={cam} p0={[-31.4, 151, -7.2]} ex={[0, -1, 0]} ey={[0.46 / n, 0, -1 / n]} w={58} size={4.0} text={brand.hull} font="Unbounded" weight={800} fill="#f4f7fa" opacity={0.9} /> : null;
  return <g>{deck1}{deck2}{hull}</g>;
};

// ---------------- Carrier ----------------
export type CarrierProps = {
  cam: Cam;
  t: number; // frame, for flag animation
  rampGlow?: number;
  catapult?: number; // unused for Vikrant, kept for generic flat deck
  wireGlow?: number; // orange highlight 0..1
  wireRed?: number[]; // per-wire red flash 0..1
  catch?: { wire: number; hook: V3; amt: number } | null;
  parked?: boolean;
  wake?: number;
  outlineGlow?: number;
  dimDeckMarks?: number;
  /** v2 cinematic rendering: depth-sorted hull, shaded deck, sea shadow, waterline foam */
  v2?: boolean;
  gid?: string; // unique id prefix for gradients/clips when several carriers share an svg
  parkedType?: "tejas" | "mig";
  /** 0..1 open the deck around the arresting wires to show cables + arresting engines below */
  cutaway?: number;
  /** 0..1 energy pulses running from the caught wire into the arresting engines */
  wireEnergy?: number;
};

export const Carrier: React.FC<CarrierProps> = ({ cam, t, rampGlow = 0, wireGlow = 0, wireRed = [], catch: ct = null, parked = true, wake = 0, outlineGlow = 0, v2 = false, gid = "cv", parkedType = "tejas", cutaway = 0, wireEnergy = 0 }) => {
  const th = useTheme();
  const brand = React.useContext(BrandCtx);
  const sides0 = TOP.map((a, i) => {
    const j = (i + 1) % TOP.length;
    const mid: V3 = [(TOP[i][0] + TOP[j][0]) / 2, (TOP[i][1] + TOP[j][1]) / 2, -H / 2];
    return { pts: poly(cam, [TOP[i], TOP[j], BOT[j], BOT[i]]), col: sideShade(TOP[i], TOP[j], th), d: depthOf(cam, mid) };
  });
  const sides = v2 ? [...sides0].sort((u, v) => v.d - u.d) : sides0;
  const stern = project(cam, [0, 0, 0]), bow = project(cam, [0, L, 0]);
  const port = project(cam, [-35, 130, 0]), stbd = project(cam, [30, 130, 0]);
  const inner = OUT.map(([x, y]) => [x * 0.9 - 0.5, 4 + y * 0.97, deckZ(4 + y * 0.97)] as V3);
  const rampLines = [RAMP0, 218, 228, 237, 245, 252, 258].map((y) => {
    const [a, b] = xRange(y);
    return [[a + 1.5, y, deckZ(y)], [b - 1.5, y, deckZ(y)]] as V3[];
  });
  const rampPoly: V3[] = [];
  for (let y = RAMP0; y <= L; y += 3) { const [a] = xRange(y); rampPoly.push([a, y, deckZ(y)]); }
  for (let y = L; y >= RAMP0; y -= 3) { const [, b] = xRange(y); rampPoly.push([b, y, deckZ(y)]); }
  const wireCol = (i: number) => (wireRed[i] ?? 0) > 0.05 ? mixColor("#e8edf3", C.red, wireRed[i]) : mixColor("#e8edf3", C.orange, wireGlow);
  const elev = (x0: number, x1: number, y0: number, y1: number) => poly(cam, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]);
  const lw = Math.max(1, cam.zoom * 0.28);

  return (
    <g>
      {v2 && (
        <defs>
          <linearGradient id={`${gid}-deck`} gradientUnits="userSpaceOnUse" x1={stern[0]} y1={stern[1]} x2={bow[0]} y2={bow[1]}>
            <stop offset="0" stopColor={th.deckGrad[0]} /><stop offset="0.55" stopColor={th.deckGrad[1]} /><stop offset="1" stopColor={th.deckGrad[2]} />
          </linearGradient>
          <linearGradient id={`${gid}-sheen`} gradientUnits="userSpaceOnUse" x1={port[0]} y1={port[1]} x2={stbd[0]} y2={stbd[1]}>
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.07} /><stop offset="0.5" stopColor="#ffffff" stopOpacity={0} /><stop offset="1" stopColor="#000000" stopOpacity={0.12} />
          </linearGradient>
        </defs>
      )}
      {v2 && <polygon points={poly(cam, BOT.map(([x, y]) => [x + 10, y - 7, SEA] as V3))} fill={th.seaShadow} filter="url(#shadow)" />}
      {wake > 0 && <Wake cam={cam} amt={wake} t={t} />}
      {/* hull */}
      <polygon points={poly(cam, BOT)} fill={th.hullA} />
      {sides.map((s, i) => <polygon key={i} points={s.pts} fill={s.col} stroke={s.col} strokeWidth={0.6} />)}
      {v2 && <path d={path(cam, BOT, true)} fill="none" stroke={th.foam} strokeWidth={Math.max(1, cam.zoom * 0.5)} filter="url(#shadow)" />}
      {/* gallery band */}
      <path d={path(cam, TOP.map(([x, y, z]) => [x * 0.99, y, z - 2.2] as V3), true)} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={lw} />
      {/* deck */}
      <polygon points={poly(cam, TOP)} fill={v2 ? `url(#${gid}-deck)` : th.deck} />
      {v2 && <polygon points={poly(cam, TOP)} fill={`url(#${gid}-sheen)`} />}
      {brand && <ShipBrand cam={cam} brand={brand} paint={th.day ? "#ffffff" : "rgba(235,242,250,0.85)"} />}
      <polygon points={poly(cam, rampPoly)} fill={th.deckHi} opacity={0.55} />
      {outlineGlow > 0 && <polygon points={poly(cam, TOP)} fill="none" stroke={C.cyan} strokeWidth={lw * 1.6} opacity={outlineGlow} filter="url(#glow)" />}
      <polygon points={poly(cam, inner)} fill="none" stroke={th.lineDim} strokeWidth={lw * 0.8} strokeDasharray={`${cam.zoom * 3} ${cam.zoom * 3}`} />
      {/* elevators */}
      <polygon points={elev(18, 29, 92, 108)} fill="rgba(0,0,0,0.12)" stroke={th.lineDim} strokeWidth={lw * 0.7} />
      <polygon points={elev(17, 28, 170, 184)} fill="rgba(0,0,0,0.12)" stroke={th.lineDim} strokeWidth={lw * 0.7} />
      {/* angled deck */}
      <path d={path(cam, [angPoint(-2, -12), angPoint(AL + 6, -12)])} stroke={th.line} strokeWidth={lw} opacity={0.75} />
      <path d={path(cam, [angPoint(-2, 12), angPoint(AL - 30, 12)])} stroke={th.line} strokeWidth={lw} opacity={0.75} />
      <path d={path(cam, [angPoint(0, 0), angPoint(AL, 0)])} stroke={th.line} strokeWidth={lw} strokeDasharray={`${cam.zoom * 5} ${cam.zoom * 5}`} />
      {/* take-off lines to the ski-jump */}
      <path d={path(cam, [[-4, 112, 0], [-4, RAMP0, 0]])} stroke={th.line} strokeWidth={lw} strokeDasharray={`${cam.zoom * 4} ${cam.zoom * 4}`} />
      <path d={path(cam, [[9, 150, 0], [1, RAMP0, 0]])} stroke={th.lineDim} strokeWidth={lw} strokeDasharray={`${cam.zoom * 4} ${cam.zoom * 4}`} />
      {/* ski-jump ramp */}
      {rampLines.map((l, i) => <path key={i} d={path(cam, l)} stroke={rampGlow > 0 ? mixColor("#c9d3df", C.cyan, rampGlow) : th.lineDim} strokeWidth={lw * (1 + rampGlow)} opacity={0.6 + rampGlow * 0.4} />)}
      {rampGlow > 0 && <polygon points={poly(cam, rampPoly)} fill={C.cyan} opacity={0.18 * rampGlow} stroke={C.cyan} strokeWidth={lw * 1.5} filter="url(#glow)" />}
      {/* arresting wires */}
      {WIRES.map((s, i) => {
        const a = angPoint(s, -12, 0.3), b = angPoint(s, 12, 0.3);
        const col = wireCol(i);
        const glow = wireGlow > 0.05 || (wireRed[i] ?? 0) > 0.05;
        if (ct && ct.wire === i && ct.amt > 0) {
          const m = ct.hook;
          return <path key={i} d={path(cam, [a, m, b])} stroke={C.orange} strokeWidth={lw * 1.6} fill="none" filter="url(#glow)" />;
        }
        return <path key={i} d={path(cam, [a, b])} stroke={col} strokeWidth={lw * (glow ? 1.8 : 1.1)} filter={glow ? "url(#glow)" : undefined} />;
      })}
      {cutaway > 0 && <ArrestingGear cam={cam} gid={gid} amt={cutaway} energy={wireEnergy} t={t} caughtWire={ct && ct.amt > 0 ? ct.wire : -1} />}
      {/* island */}
      <Box cam={cam} b={{ x0: 21, x1: 30, y0: 116, y1: 160, z0: 0, z1: 12 }} />
      <Box cam={cam} b={{ x0: 22.5, x1: 29, y0: 124, y1: 152, z0: 12, z1: 21, top: th.islandTop[0] }} />
      <Box cam={cam} b={{ x0: 23.5, x1: 28, y0: 134, y1: 146, z0: 21, z1: 27, top: th.islandTop[1] }} />
      <MastFlag cam={cam} base={[25.8, 140, 38]} size={3.2} t={t} />
      {parked && (parkedType === "mig" ? <ParkedMig cam={cam} /> : <Parked cam={cam} />)}
    </g>
  );
};

const Parked: React.FC<{ cam: Cam }> = ({ cam }) => (
  <g>
    {[[23, 62, 225], [23, 76, 225], [22, 176, 225], [22, 192, 225], [19, 206, 230]].map(([x, y, h], i) => (
      <Jet key={i} cam={cam} pos={[x, y, 0.4]} heading={h} scale={1.25} groundZ={0} dim />
    ))}
  </g>
);

const ParkedMig: React.FC<{ cam: Cam }> = ({ cam }) => (
  <g>
    {[[22, 60, 128], [22, 80, 128], [21, 178, 128], [21, 196, 128], [-26, 108, 52]].map(([x, y, h], i) => (
      <MigJet key={i} cam={cam} pos={[x, y, 0.4]} heading={h} />
    ))}
  </g>
);

// MiG-29K (the fighter that operates from INS Vikrant) — parked, wings spread, top-down silhouette
const MIG_HALF: [number, number][] = [
  [0, 8.6], [0.45, 7.2], [0.75, 5.4], [1.05, 3.8], [2.3, 1.2], [5.6, -2.0], [5.7, -2.9], [2.4, -2.6], [1.9, -3.9],
  [3.9, -6.3], [3.95, -7.2], [1.6, -6.7], [1.0, -8.5], [0, -8.3],
];
export const MigJet: React.FC<{ cam: Cam; pos: V3; heading: number; scale?: number }> = ({ cam, pos, heading, scale = 1.15 }) => {
  const th = useTheme();
  const W = (lp: V3) => jetLocal(lp, pos, heading, 0, scale);
  const body = [...MIG_HALF.map(([x, y]) => [x, y, 0] as V3), ...[...MIG_HALF].reverse().map(([x, y]) => [-x, y, 0] as V3)].map(W);
  const fins = [-1, 1].map((sx) => ([[sx * 1.5, -3.8, 0.3], [sx * 1.9, -6.6, 3.4], [sx * 1.9, -7.6, 3.4], [sx * 1.6, -8.0, 0.3]] as V3[]).map(W));
  const sh = body.map(([x, y]) => [x + 1.0, y - 0.6, 0.05] as V3);
  return (
    <g>
      <polygon points={poly(cam, sh)} fill="rgba(0,0,0,0.4)" filter="url(#shadow)" />
      <polygon points={poly(cam, body)} fill={th.migBody} stroke="rgba(20,28,40,0.35)" strokeWidth={0.7} />
      <polygon points={poly(cam, ([[0, 6.0, 0.4], [0.35, 4.9, 0.5], [0, 4.2, 0.45], [-0.35, 4.9, 0.5]] as V3[]).map(W))} fill="#3b4656" />
      {fins.map((f, i) => <polygon key={i} points={poly(cam, f)} fill={th.migFin} stroke="rgba(20,28,40,0.3)" strokeWidth={0.5} />)}
    </g>
  );
};

/** cutaway of the arresting gear: cables run from the wire ends over sheaves, down into hydraulic engines below deck */
const ArrestingGear: React.FC<{ cam: Cam; gid: string; amt: number; energy: number; t: number; caughtWire: number }> = ({ cam, gid, amt, energy, t, caughtWire }) => {
  const th = useTheme();
  const hole: V3[] = [angPoint(28, -16, 0.05), angPoint(28, 16, 0.05), angPoint(74, 16, 0.05), angPoint(74, -16, 0.05)];
  const lw = Math.max(1, cam.zoom * 0.3);
  const engines = WIRES.map((s, i) => {
    const a = angPoint(s, -12, 0), b = angPoint(s, 12, 0);
    const ea = angPoint(s - 6, -10, -9), eb = angPoint(s - 6, 10, -9);
    return { i, a, b, ea, eb };
  });
  return (
    <g opacity={amt}>
      <clipPath id={`${gid}-hole`}><polygon points={poly(cam, hole)} /></clipPath>
      <polygon points={poly(cam, hole)} fill={th.cutHole} stroke={C.orange} strokeOpacity={0.5} strokeWidth={lw} strokeDasharray="8 6" />
      <g clipPath={`url(#${gid}-hole)`}>
        {engines.map((e) => {
          const hot = e.i === caughtWire;
          const col = hot ? C.orange : "#aab6c6";
          return (
            <g key={e.i}>
              {[e.ea, e.eb].map((p, k) => (
                <g key={k}>
                  <Box cam={cam} b={{ x0: p[0] - 2.2, x1: p[0] + 2.2, y0: p[1] - 5, y1: p[1] + 1, z0: -12, z1: -7, top: hot ? "#9a6a3c" : th.engine }} />
                  <path d={path(cam, [k ? e.b : e.a, [(k ? e.b : e.a)[0], (k ? e.b : e.a)[1], -6.5], p])} stroke={col} strokeWidth={lw * 1.3} fill="none"
                    strokeDasharray={hot && energy > 0 ? "10 8" : undefined} strokeDashoffset={-t * 6} filter={hot && energy > 0 ? "url(#glow)" : undefined} />
                </g>
              ))}
            </g>
          );
        })}
      </g>
    </g>
  );
};

const Wake: React.FC<{ cam: Cam; amt: number; t: number }> = ({ cam, amt, t }) => {
  const th = useTheme();
  const lines = [-1, 1].map((s) => {
    const pts: V3[] = [];
    for (let k = 0; k <= 30; k++) { const y = 10 - k * 18; pts.push([s * (16 + k * 4.2) + Math.sin(k + t * 0.05) * 1.5, y, SEA]); }
    return pts;
  });
  const center: V3[] = Array.from({ length: 31 }, (_, k) => [Math.sin(k * 0.7 + t * 0.06) * 2, 6 - k * 18, SEA] as V3);
  return (
    <g opacity={amt}>
      <path d={path(cam, center)} stroke={th.wakeCore} strokeWidth={cam.zoom * 14} fill="none" strokeLinecap="round" filter="url(#softglow)" />
      {lines.map((l, i) => <path key={i} d={path(cam, l)} stroke={th.wakeLine} strokeWidth={Math.max(1.2, cam.zoom * 1.2)} fill="none" filter="url(#shadow)" />)}
    </g>
  );
};

// ---------------- Tejas ----------------
// top-down half outline (x>=0), real metres; nose +y
const TJ_HALF: [number, number][] = [
  [0, 6.7], [0.32, 5.9], [0.55, 4.8], [0.72, 3.4], [0.95, 2.3], [1.15, 1.6], [2.0, -0.6], [4.1, -4.4], [4.15, -4.95],
  [1.0, -4.95], [0.75, -5.6], [0.5, -6.4],
];
const TJ_FIN: [number, number][] = [[-2.4, 0.4], [-5.5, 3.6], [-6.2, 3.6], [-6.4, 0.4]];

export type JetProps = {
  cam: Cam; pos: V3; heading?: number; pitch?: number; bank?: number; scale?: number;
  exhaust?: number; hook?: number; hookDown?: number; groundZ?: number; dim?: boolean; ghost?: boolean; shadow?: number; t?: number;
  /** v2: landing gear extension 0..1 (wheels sit 1.75*scale m below pos) */
  gear?: number;
  /** v2: draw the fuselage side profile so the jet has volume at low camera angles */
  volume?: boolean;
  opacity?: number;
};
/** height of the jet's reference point above the ground when standing on its wheels */
export const GEAR_H = 1.75;

export const jetLocal = (lp: V3, pos: V3, heading: number, pitch: number, scale: number, bank = 0): V3 => {
  let [x, y, z] = [lp[0] * scale, lp[1] * scale, lp[2] * scale];
  const b = (bank * Math.PI) / 180;
  [x, z] = [x * Math.cos(b) - z * Math.sin(b), x * Math.sin(b) + z * Math.cos(b)];
  const p = (pitch * Math.PI) / 180;
  [y, z] = [y * Math.cos(p) - z * Math.sin(p), y * Math.sin(p) + z * Math.cos(p)];
  const r = rotZ([x, y, z], heading);
  return [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]];
};

export const Jet: React.FC<JetProps> = ({ cam, pos, heading = 0, pitch = 0, bank = 0, scale = 1.5, exhaust = 0, hook = 0, hookDown = 0, groundZ, dim = false, ghost = false, shadow = 1, t = 0, gear = 0, volume = false, opacity = 1 }) => {
  const W = (lp: V3) => jetLocal(lp, pos, heading, pitch, scale, bank);
  const right = TJ_HALF.map(([x, y]) => [x, y, 0] as V3);
  const left = [...TJ_HALF].reverse().map(([x, y]) => [-x, y, 0] as V3);
  const body = [...right, ...left].map(W);
  const halfR = [[0, 6.7, 0], ...right, [0, -6.4, 0]].map((p) => W(p as V3));
  const fin = TJ_FIN.map(([y, z]) => W([0, y, z]));
  const canopy = ([[0, 5.3, 0.45], [0.33, 4.4, 0.5], [0.3, 3.2, 0.5], [0, 2.7, 0.45], [-0.3, 3.2, 0.5], [-0.33, 4.4, 0.5]] as V3[]).map(W);
  const gz = groundZ ?? (onDeck(pos[0], pos[1]) ? deckZ(pos[1]) : SEA);
  const alt = Math.max(0, pos[2] - gz - (gear > 0 ? GEAR_H * scale * gear : 0));
  const sh = (p: V3): V3 => [p[0] + alt * 0.55 + 1.0, p[1] - alt * 0.35 - 0.6, gz + 0.05];
  const shadowPts = body.map(sh);
  const col = ghost ? "rgba(255,77,94,0.55)" : dim ? "#8f9bab" : C.jet;
  const colR = ghost ? "rgba(255,77,94,0.25)" : dim ? "#7b8797" : C.jetDark;
  const tail = W([0, -6.4, 0.1]);
  const exEnd = W([0, -6.4 - (3 + exhaust * 16) * (0.85 + 0.15 * Math.sin(t * 1.7)), 0.1]);
  const roundel = (x: number) => [W([x, -2.6, 0.02]), W([x + 0.9, -2.6, 0.02])];
  const hookA = W([0, -4.8, -0.2]);
  const hookB: V3 = hookDown > 0 ? [lerp(W([0, -8.5, -1.2])[0], W([0, -8.5, -1.2])[0], 1), W([0, -8.5, -1.2])[1], lerp(W([0, -8.5, -1.2])[2], gz + 0.3, hookDown)] : W([0, -8.5, -1.6]);
  const [hx, hy] = project(cam, hookB);
  const r0 = roundel(2.4);
  const rp = project(cam, r0[0]);
  const rr = Math.max(0.5, Math.hypot(...(project(cam, r0[1]).map((v, i) => v - rp[i]) as [number, number])) / 2);
  const rpL = project(cam, roundel(-2.4)[0]);
  const PROFILE: [number, number][] = [[6.7, 0], [5.6, 0.45], [4.8, 0.95], [3.3, 1.05], [2.2, 0.75], [-5.4, 0.6], [-6.4, 0.3], [-6.4, -0.45], [-4.2, -0.75], [2.6, -0.8], [5.2, -0.45]];
  const prof = PROFILE.map(([y, z]) => W([0, y, z]));
  const gl = 1.4 * gear;
  const legs = gear > 0 ? ([[0, 4.2], [1.25, -1.2], [-1.25, -1.2]] as [number, number][]).map(([x, y]) => ({ top: W([x, y, -0.55]), bot: W([x, y, -0.55 - gl]) })) : [];
  const wr = Math.max(1.5, cam.zoom * (cam.boost ?? 1) * scale * 0.33);
  return (
    <g opacity={opacity}>
      {shadow > 0 && !ghost && <polygon points={poly(cam, shadowPts)} fill="rgba(0,0,0,0.5)" opacity={shadow * Math.max(0.25, 1 - alt / 140)} filter="url(#shadow)" />}
      {exhaust > 0 && (
        <g>
          <path d={path(cam, [tail, exEnd])} stroke={C.cyan} strokeWidth={Math.max(2, cam.zoom * scale * 0.9)} strokeLinecap="round" opacity={Math.min(1, exhaust * 1.5)} filter="url(#glow)" />
          <path d={path(cam, [tail, W([0, -6.4 - (2 + exhaust * 6), 0.1])])} stroke="#e8fbff" strokeWidth={Math.max(1, cam.zoom * scale * 0.35)} strokeLinecap="round" opacity={exhaust} />
        </g>
      )}
      {hook > 0 && (
        <g opacity={hook}>
          <path d={path(cam, [hookA, hookB])} stroke={C.orange} strokeWidth={Math.max(1.5, cam.zoom * 0.25)} />
          <circle cx={hx} cy={hy} r={Math.max(3, cam.zoom * 0.6)} fill={C.orange} filter="url(#glow)" />
        </g>
      )}
      {legs.map((g, i) => {
        const a = project(cam, g.top), b = project(cam, g.bot);
        return (
          <g key={i}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#7d8898" strokeWidth={Math.max(1.2, wr * 0.35)} />
            <ellipse cx={b[0]} cy={b[1]} rx={wr * 0.55} ry={wr} fill="#1c232d" stroke="#5c6878" strokeWidth={Math.max(0.6, wr * 0.15)} />
          </g>
        );
      })}
      {volume && !ghost && <polygon points={poly(cam, prof)} fill={dim ? "#6f7b8b" : "#a9b4c3"} stroke="rgba(20,28,40,0.35)" strokeWidth={0.6} />}
      <polygon points={poly(cam, body)} fill={col} stroke={ghost ? C.red : "rgba(20,28,40,0.35)"} strokeWidth={ghost ? 1.5 : 0.8} strokeDasharray={ghost ? "6 5" : undefined} />
      {!ghost && <polygon points={poly(cam, halfR)} fill={colR} opacity={0.55} />}
      {!ghost && !dim && rr > 1.2 && (
        <g>
          {[rp, rpL].map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={rr} fill={C.saffron} />
              <circle cx={p[0]} cy={p[1]} r={rr * 0.64} fill="#fff" />
              <circle cx={p[0]} cy={p[1]} r={rr * 0.3} fill={C.green} />
            </g>
          ))}
        </g>
      )}
      {!ghost && <polygon points={poly(cam, canopy)} fill={dim ? "#3b4656" : "#263446"} />}
      <polygon points={poly(cam, fin)} fill={ghost ? "rgba(255,77,94,0.3)" : dim ? "#a3aebd" : "#e1e7ef"} stroke="rgba(20,28,40,0.3)" strokeWidth={0.6} />
    </g>
  );
};

// ---------------- Runway ----------------
export const Runway: React.FC<{ cam: Cam; x: number; y0: number; y1: number; w?: number; z?: number; highlight?: { y0: number; y1: number; p: number } }> = ({ cam, x, y0, y1, w = 46, z = 0, highlight }) => {
  const lw = Math.max(1, cam.zoom * 0.4);
  const keys = Array.from({ length: 10 }, (_, i) => {
    const xx = x - w / 2 + 4 + i * ((w - 8) / 9.5);
    return path(cam, [[xx, y0 + 4, z], [xx, y0 + 26, z]]);
  });
  return (
    <g>
      <polygon points={poly(cam, [[x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z]])} fill="rgba(36,46,60,0.65)" stroke={C.line} strokeWidth={lw} />
      <path d={path(cam, [[x, y0 + 34, z], [x, y1, z]])} stroke={C.line} strokeWidth={lw} strokeDasharray={`${cam.zoom * 14} ${cam.zoom * 12}`} />
      {keys.map((d, i) => <path key={i} d={d} stroke={C.line} strokeWidth={lw * 1.4} />)}
      {highlight && highlight.p > 0 && (
        <polygon points={poly(cam, [[x - w / 2 - 3, highlight.y0, z], [x + w / 2 + 3, highlight.y0, z], [x + w / 2 + 3, highlight.y1, z], [x - w / 2 - 3, highlight.y1, z]])}
          fill="rgba(56,198,255,0.10)" stroke={C.cyan} strokeWidth={lw * 1.4} strokeDasharray="10 8" opacity={highlight.p} />
      )}
    </g>
  );
};

// ---------------- Trail ----------------
export const Trail: React.FC<{ cam: Cam; pts: V3[]; color?: string; width?: number; opacity?: number }> = ({ cam, pts, color = C.cyan, width = 5, opacity = 1 }) => {
  if (pts.length < 2) return null;
  const n = pts.length;
  return (
    <g opacity={opacity} filter="url(#glow)">
      {pts.slice(1).map((p, i) => (
        <path key={i} d={path(cam, [pts[i], p])} stroke={color} strokeWidth={width * (0.35 + 0.65 * (i / n))} strokeLinecap="round" opacity={0.15 + 0.85 * (i / n)} />
      ))}
    </g>
  );
};

// ---------------- Label ----------------
/** set true (v3) for snappier label animation */
export const FastLabels = React.createContext(false);
export const Label: React.FC<{ cam?: Cam; anchor?: V3; at?: [number, number]; dx: number; dy: number; text: string; p: number; color?: string }> = ({ cam, anchor, at, dx, dy, text, p: p0, color = "#fff" }) => {
  const fast = React.useContext(FastLabels);
  const p = fast ? Math.min(1, p0 * 1.8) : p0;
  if (p <= 0) return null;
  const [ax, ay] = at ?? project(cam!, anchor!);
  const fs = 27, ls = 3.2;
  const tw = text.length * (fs * 0.66 + ls) + 30;
  const bx = ax + dx, by = ay + dy;
  const boxX = dx >= 0 ? bx : bx - tw;
  const lineP = clamp01(p * 2);
  const textP = clamp01(p * 2 - 0.6);
  const ex = lerp(ax, dx >= 0 ? boxX : boxX + tw, lineP), ey = lerp(ay, by, lineP);
  return (
    <g>
      <circle cx={ax} cy={ay} r={6} fill="#fff" opacity={lineP} />
      <circle cx={ax} cy={ay} r={13} fill="none" stroke="#fff" strokeWidth={1.5} opacity={lineP * 0.4} />
      <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
      <g opacity={textP} transform={`translate(${(1 - textP) * (dx >= 0 ? -8 : 8)},0)`}>
        <rect x={boxX} y={by - 26} width={tw} height={52} rx={6} fill="rgba(8,12,19,0.88)" stroke="rgba(255,255,255,0.08)" />
        <text x={boxX + 15} y={by + 9.5} fill={color} fontFamily="Inter" fontWeight={600} fontSize={fs} letterSpacing={ls}>{text}</text>
      </g>
    </g>
  );
};
