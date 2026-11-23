import React from "react";
import { Cam, V3, project, poly, path, depthOf, rotZ, clamp01, mixColor, lerp } from "./engine";

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

const sideShade = (a: V3, b: V3) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const nx = dy / n, ny = -dx / n; // outward normal (outline is clockwise from stern-port)
  const lit = clamp01(0.5 + 0.5 * (nx * 0.55 + ny * -0.35) * -1);
  return mixColor(C.hullA, C.hullB, lit);
};

type Prism = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; top?: string };
export const Box: React.FC<{ cam: Cam; b: Prism }> = ({ cam, b }) => {
  const corners: [number, number][] = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  const sides = corners.map((p, i) => {
    const q = corners[(i + 1) % 4];
    const quad: V3[] = [[p[0], p[1], b.z0], [q[0], q[1], b.z0], [q[0], q[1], b.z1], [p[0], p[1], b.z1]];
    const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (b.z0 + b.z1) / 2];
    return { quad, d: depthOf(cam, mid), col: sideShade([p[0], p[1], 0], [q[0], q[1], 0]) };
  }).sort((u, v) => v.d - u.d);
  return (
    <g>
      {sides.map((s, i) => <polygon key={i} points={poly(cam, s.quad)} fill={s.col} />)}
      <polygon points={poly(cam, corners.map(([x, y]) => [x, y, b.z1] as V3))} fill={b.top ?? "#5f6c7f"} />
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
};

export const Carrier: React.FC<CarrierProps> = ({ cam, t, rampGlow = 0, wireGlow = 0, wireRed = [], catch: ct = null, parked = true, wake = 0, outlineGlow = 0 }) => {
  const sides = TOP.map((a, i) => {
    const j = (i + 1) % TOP.length;
    return { pts: poly(cam, [TOP[i], TOP[j], BOT[j], BOT[i]]), col: sideShade(TOP[i], TOP[j]) };
  });
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
      {wake > 0 && <Wake cam={cam} amt={wake} t={t} />}
      {/* hull */}
      <polygon points={poly(cam, BOT)} fill={C.hullA} />
      {sides.map((s, i) => <polygon key={i} points={s.pts} fill={s.col} stroke={s.col} strokeWidth={0.6} />)}
      {/* gallery band */}
      <path d={path(cam, TOP.map(([x, y, z]) => [x * 0.99, y, z - 2.2] as V3), true)} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={lw} />
      {/* deck */}
      <polygon points={poly(cam, TOP)} fill={C.deck} />
      <polygon points={poly(cam, rampPoly)} fill={C.deckHi} opacity={0.55} />
      {outlineGlow > 0 && <polygon points={poly(cam, TOP)} fill="none" stroke={C.cyan} strokeWidth={lw * 1.6} opacity={outlineGlow} filter="url(#glow)" />}
      <polygon points={poly(cam, inner)} fill="none" stroke={C.lineDim} strokeWidth={lw * 0.8} strokeDasharray={`${cam.zoom * 3} ${cam.zoom * 3}`} />
      {/* elevators */}
      <polygon points={elev(18, 29, 92, 108)} fill="rgba(0,0,0,0.12)" stroke={C.lineDim} strokeWidth={lw * 0.7} />
      <polygon points={elev(17, 28, 170, 184)} fill="rgba(0,0,0,0.12)" stroke={C.lineDim} strokeWidth={lw * 0.7} />
      {/* angled deck */}
      <path d={path(cam, [angPoint(-2, -12), angPoint(AL + 6, -12)])} stroke={C.line} strokeWidth={lw} opacity={0.75} />
      <path d={path(cam, [angPoint(-2, 12), angPoint(AL - 30, 12)])} stroke={C.line} strokeWidth={lw} opacity={0.75} />
      <path d={path(cam, [angPoint(0, 0), angPoint(AL, 0)])} stroke={C.line} strokeWidth={lw} strokeDasharray={`${cam.zoom * 5} ${cam.zoom * 5}`} />
      {/* take-off lines to the ski-jump */}
      <path d={path(cam, [[-4, 112, 0], [-4, RAMP0, 0]])} stroke={C.line} strokeWidth={lw} strokeDasharray={`${cam.zoom * 4} ${cam.zoom * 4}`} />
      <path d={path(cam, [[9, 150, 0], [1, RAMP0, 0]])} stroke={C.lineDim} strokeWidth={lw} strokeDasharray={`${cam.zoom * 4} ${cam.zoom * 4}`} />
      {/* ski-jump ramp */}
      {rampLines.map((l, i) => <path key={i} d={path(cam, l)} stroke={rampGlow > 0 ? mixColor("#c9d3df", C.cyan, rampGlow) : C.lineDim} strokeWidth={lw * (1 + rampGlow)} opacity={0.6 + rampGlow * 0.4} />)}
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
      {/* island */}
      <Box cam={cam} b={{ x0: 21, x1: 30, y0: 116, y1: 160, z0: 0, z1: 12 }} />
      <Box cam={cam} b={{ x0: 22.5, x1: 29, y0: 124, y1: 152, z0: 12, z1: 21, top: "#6a778b" }} />
      <Box cam={cam} b={{ x0: 23.5, x1: 28, y0: 134, y1: 146, z0: 21, z1: 27, top: "#72809a" }} />
      <MastFlag cam={cam} base={[25.8, 140, 38]} size={3.2} t={t} />
      {parked && <Parked cam={cam} />}
    </g>
  );
};

const Parked: React.FC<{ cam: Cam }> = ({ cam }) => (
  <g>
    {[[23, 62, 225], [23, 76, 225], [22, 176, 225], [22, 192, 225], [19, 206, 230]].map(([x, y, h], i) => (
      <Jet key={i} cam={cam} pos={[x, y, 0.4]} heading={h} scale={0.9} groundZ={0} dim />
    ))}
  </g>
);

const Wake: React.FC<{ cam: Cam; amt: number; t: number }> = ({ cam, amt, t }) => {
  const lines = [-1, 1].map((s) => {
    const pts: V3[] = [];
    for (let k = 0; k <= 30; k++) { const y = 10 - k * 18; pts.push([s * (16 + k * 4.2) + Math.sin(k + t * 0.05) * 1.5, y, SEA]); }
    return pts;
  });
  const center: V3[] = Array.from({ length: 31 }, (_, k) => [Math.sin(k * 0.7 + t * 0.06) * 2, 6 - k * 18, SEA] as V3);
  return (
    <g opacity={amt}>
      <path d={path(cam, center)} stroke="rgba(190,215,235,0.16)" strokeWidth={cam.zoom * 14} fill="none" strokeLinecap="round" filter="url(#softglow)" />
      {lines.map((l, i) => <path key={i} d={path(cam, l)} stroke="rgba(190,215,235,0.22)" strokeWidth={Math.max(1.2, cam.zoom * 1.2)} fill="none" filter="url(#shadow)" />)}
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
};

export const jetLocal = (lp: V3, pos: V3, heading: number, pitch: number, scale: number, bank = 0): V3 => {
  let [x, y, z] = [lp[0] * scale, lp[1] * scale, lp[2] * scale];
  const b = (bank * Math.PI) / 180;
  [x, z] = [x * Math.cos(b) - z * Math.sin(b), x * Math.sin(b) + z * Math.cos(b)];
  const p = (pitch * Math.PI) / 180;
  [y, z] = [y * Math.cos(p) - z * Math.sin(p), y * Math.sin(p) + z * Math.cos(p)];
  const r = rotZ([x, y, z], heading);
  return [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]];
};

export const Jet: React.FC<JetProps> = ({ cam, pos, heading = 0, pitch = 0, bank = 0, scale = 1.5, exhaust = 0, hook = 0, hookDown = 0, groundZ, dim = false, ghost = false, shadow = 1, t = 0 }) => {
  const W = (lp: V3) => jetLocal(lp, pos, heading, pitch, scale, bank);
  const right = TJ_HALF.map(([x, y]) => [x, y, 0] as V3);
  const left = [...TJ_HALF].reverse().map(([x, y]) => [-x, y, 0] as V3);
  const body = [...right, ...left].map(W);
  const halfR = [[0, 6.7, 0], ...right, [0, -6.4, 0]].map((p) => W(p as V3));
  const fin = TJ_FIN.map(([y, z]) => W([0, y, z]));
  const canopy = ([[0, 5.3, 0.45], [0.33, 4.4, 0.5], [0.3, 3.2, 0.5], [0, 2.7, 0.45], [-0.3, 3.2, 0.5], [-0.33, 4.4, 0.5]] as V3[]).map(W);
  const gz = groundZ ?? (onDeck(pos[0], pos[1]) ? deckZ(pos[1]) : SEA);
  const alt = pos[2] - gz;
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
  return (
    <g>
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
export const Label: React.FC<{ cam?: Cam; anchor?: V3; at?: [number, number]; dx: number; dy: number; text: string; p: number; color?: string }> = ({ cam, anchor, at, dx, dy, text, p, color = "#fff" }) => {
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
