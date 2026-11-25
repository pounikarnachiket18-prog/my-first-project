// Reel 2 v4 (day): the user's own 3D models (Tripo turntables -> sprites) in a daytime WebGL ocean,
// with motion-graphic labelling. Same story, voice timeline and transitions as v2/v3.
import React from "react";
import { prog, lerp, clamp01, ease } from "../engine";
import { GLView, GLState, Vec3, Missile, projectGL, pxPerMetre } from "./GLView";
import { Sprite } from "./Sprite";
import { useS, Svg, Big, Card, Flag, Illus, DayCtx, SUN, H3Radar, H3Time } from "./scenes_h3";
import { useTL } from "../v2/ctx";
import { SpeedLines } from "../v2/fx";

const FPS = 30;
const SUP = "#ffb703", HYP = "#ff3d9a", INK = "#0b1622";
const GLS = 0.75;
const L_JET = 13.2, L_SUP = 6.2, L_HYP = 5.8; // display lengths (illustrative)

const v = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const nrm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const shake = (f: number, amt: number): Vec3 => [Math.sin(f * 2.3) * amt + Math.sin(f * 5.1) * amt * 0.4, Math.cos(f * 1.9) * amt, 0];
type Cam = GLState["cam"];

const day = (s: Omit<GLState, "t"> & { t: number }): GLState => ({ exposure: 0.85, ...s, day: true, hideObjects: true, moonDir: SUN });
const Bg: React.FC<{ s: GLState; filter?: string }> = ({ s, filter }) => <div style={{ position: "absolute", inset: 0, filter }}><GLView s={s} scale={GLS} /></div>;
const Fx: React.FC<{ s: GLState }> = ({ s }) => <div style={{ position: "absolute", inset: 0 }}><GLView s={s} scale={GLS} layer="fx" /></div>;

// ---------------------------------------------------------------- motion-graphic labelling
/** lock-on brackets that snap onto an object, with a typed tag and optional live readout */
const Lock: React.FC<{ cam: Cam; at: Vec3; size: number; p: number; color: string; tag: string; sub?: string; side?: "r" | "l"; f: number }> = ({ cam, at, size, p, color, tag, sub, side = "r", f }) => {
  if (p <= 0) return null;
  const c = projectGL(cam, at);
  if (!c) return null;
  const r = Math.max(46, Math.min(330, (size * pxPerMetre(cam, at)) / 2));
  const k = ease(clamp01(p * 1.6));
  const rr = r * lerp(1.9, 1, k);
  const arm = Math.max(16, rr * 0.32);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const chars = Math.round(tag.length * clamp01((p - 0.25) * 2.2));
  const tx = side === "r" ? c[0] + rr + 18 : c[0] - rr - 18;
  const tw = tag.length * 15 + 30;
  const bx = Math.max(30, Math.min(1050 - tw, side === "r" ? tx : tx - tw));
  const by = Math.max(330, Math.min(1180, c[1] - rr - 8));
  return (
    <g opacity={Math.min(1, p * 2)}>
      <g transform={`rotate(${(1 - k) * 45} ${c[0]} ${c[1]})`}>
        {corners.map(([sx, sy], i) => (
          <path key={i} d={`M${c[0] + sx * rr} ${c[1] + sy * rr - sy * arm} L${c[0] + sx * rr} ${c[1] + sy * rr} L${c[0] + sx * rr - sx * arm} ${c[1] + sy * rr}`}
            fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
        ))}
      </g>
      <circle cx={c[0]} cy={c[1]} r={4 + 3 * Math.sin(f * 0.4) ** 2} fill={color} opacity={0.9} />
      <line x1={side === "r" ? c[0] + rr : c[0] - rr} y1={c[1] - rr} x2={side === "r" ? bx : bx + tw} y2={by + 20} stroke={color} strokeWidth={2} opacity={0.9 * clamp01((p - 0.2) * 3)} />
      {chars > 0 && (
        <g>
          <rect x={bx} y={by} width={tw} height={sub ? 78 : 42} rx={6} fill="rgba(6,12,20,0.78)" stroke={color} strokeWidth={2} />
          <text x={bx + 15} y={by + 29} fill={color} fontFamily="Inter" fontWeight={800} fontSize={24} letterSpacing={2}>{tag.slice(0, chars)}</text>
          {sub && <text x={bx + 15} y={by + 64} fill="#ffffff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={24}>{sub}</text>}
        </g>
      )}
    </g>
  );
};

/** velocity arrow + streaks along the screen-space heading of an object */
const Velocity: React.FC<{ cam: Cam; at: Vec3; dir: Vec3; len: number; color: string; p: number }> = ({ cam, at, dir, len, color, p }) => {
  if (p <= 0) return null;
  const a = projectGL(cam, at), b = projectGL(cam, v(at, [dir[0] * len, dir[1] * len, dir[2] * len]));
  if (!a || !b) return null;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const L = Math.min(260, Math.hypot(b[0] - a[0], b[1] - a[1])) * ease(clamp01(p));
  const ex = a[0] + Math.cos(ang) * L, ey = a[1] + Math.sin(ang) * L;
  return (
    <g opacity={clamp01(p * 2)}>
      <line x1={a[0]} y1={a[1]} x2={ex} y2={ey} stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 12" />
      <path d={`M${ex} ${ey} l${-Math.cos(ang - 0.5) * 22} ${-Math.sin(ang - 0.5) * 22} M${ex} ${ey} l${-Math.cos(ang + 0.5) * 22} ${-Math.sin(ang + 0.5) * 22}`} stroke={color} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
};

/** animated Mach gauge (bottom HUD) */
const MachGauge: React.FC<{ mach: number; color: string; p: number; label: string }> = ({ mach, color, p, label }) => {
  if (p <= 0) return null;
  const frac = clamp01(mach / 6);
  return (
    <div style={{ position: "absolute", left: 90, width: 900, top: 1160, opacity: clamp01(p * 2), transform: `translateY(${(1 - ease(clamp01(p))) * 24}px)`, fontFamily: "Inter" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
        <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: 3 }}>{label}</span>
        <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 40, color }}>MACH {mach.toFixed(1)}</span>
      </div>
      <div style={{ position: "relative", marginTop: 8, height: 14, borderRadius: 7, background: "rgba(6,12,20,0.55)", border: "1px solid rgba(255,255,255,0.25)" }}>
        <div style={{ width: `${frac * 100}%`, height: "100%", borderRadius: 7, background: `linear-gradient(90deg, #4fc3f7, ${color})`, boxShadow: `0 0 14px ${color}` }} />
        {[1, 5].map((m) => (
          <div key={m} style={{ position: "absolute", left: `${(m / 6) * 100}%`, top: -8, height: 30, width: 2, background: "#fff" }}>
            <span style={{ position: "absolute", top: 32, left: -26, width: 60, textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 18, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>M{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Streaks: React.FC<{ f: number; amt: number; dir?: number; seed?: number }> = ({ f, amt, dir = 180, seed = 3 }) => <Svg><SpeedLines f={f} amt={amt} dir={dir} seed={seed} /></Svg>;

// ---------------------------------------------------------------- 0. COLD OPEN: Tejas fires both
type ColdS = { jet: Vec3; sup: Missile; hyp: Missile; ship: Vec3; tt: number; ig: number };
const coldWorld = (f: number, rel: number): ColdS => {
  const jz = (fr: number) => -300 + (fr / FPS) * 150;
  const jet: Vec3 = [0, 55 + Math.sin(f * 0.05) * 0.3, jz(f)];
  const tt = (f - rel) / FPS;
  const drop = Math.min(Math.max(tt, 0), 0.4);
  const ig = Math.max(0, tt - 0.4);
  const zRel = jz(rel);
  const fly = (side: number, acc: number, climb: number): Vec3 =>
    tt <= 0 ? [side * 2.6, jet[1] - 1.2, jet[2] + 1] : [side * (2.6 + ig * 0.5), 55 - 1.2 - 9 * drop * drop + climb * ig, zRel + 1 + 150 * tt + acc * ig * ig];
  const sN = fly(-1, 60, -0.3), hN = fly(1, 120, 1.2);
  return {
    jet, tt, ig, ship: [10, 0, zRel + 5200],
    sup: { on: true, nose: v(sN, [0, 0, L_SUP / 2]), dir: [0, 0, 1], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: tt > 0.4 ? 1 : 0, trail: { len: Math.min(120, ig * 150), width: 0.6, pink: false, opacity: 0.85 } },
    hyp: { on: true, nose: v(hN, [0, 0, L_HYP / 2]), dir: [0, 0, 1], len: L_HYP, radius: 0.35, plasma: clamp01((ig - 0.4) / 1.0), glide: true, burn: tt > 0.4 ? 1 : 0, trail: { len: Math.min(180, ig * 230), width: 0.45, pink: true, opacity: 0.8 } },
  };
};
const ctr = (m: Missile): Vec3 => v(m.nose, [-m.dir[0] * m.len / 2, -m.dir[1] * m.len / 2, -m.dir[2] * m.len / 2]);

export const H4Cold: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("cold");
  const rel = W(0, 5);
  const w = coldWorld(f, rel);
  const sC = ctr(w.sup), hC = ctr(w.hyp);
  const onSup = f >= W(0, 7) - 3 && f < W(0, 9) - 3;
  const onHyp = f >= W(0, 9) - 3 && f < Ls(1) - 4;
  const wide = f >= Ls(1) - 4;
  let cam: Cam;
  if (wide) {
    const g = ease(clamp01((f - (Ls(1) - 4)) / 40));
    cam = { pos: [sC[0] - 30, lerp(20, 60, g), sC[2] - 90 - g * 60], target: [w.ship[0], 10, w.ship[2]], fov: lerp(0.55, 0.45, g) };
  } else if (onHyp) cam = { pos: v(hC, [-19, 1.8, 5]), target: hC, fov: 0.62 };
  else if (onSup) cam = { pos: v(sC, [-19, 1.8, 5]), target: sC, fov: 0.62 };
  else {
    // hero: ahead-left of the jet, looking back at it; the missiles drop and streak past
    const anchor: Vec3 = [w.jet[0], 55, Math.min(w.jet[2], -300 + (rel / FPS) * 150)];
    cam = { pos: v(anchor, [-17, 2.5, 18]), target: v(w.jet, [0, -1, 2]), fov: 0.68 };
  }
  cam = { ...cam, pos: v(cam.pos, w.tt > 0.35 && w.tt < 1.3 ? shake(f, 0.12) : [0, 0, 0]) };
  const s = day({ t: T, cam, m0: w.sup, m1: w.hyp });
  const showShip = wide;
  return (
    <>
      <Bg s={s} />
      {showShip && <Sprite cam={cam} model="ship" center={w.ship} dir={[1, 0, -0.3]} length={150} waterline />}
      <Sprite cam={cam} model="jet" center={w.jet} dir={[0, 0, 1]} length={L_JET} />
      <Sprite cam={cam} model="missile_cool" center={sC} dir={w.sup.dir} length={L_SUP} />
      <Sprite cam={cam} model="missile" center={hC} dir={w.hyp.dir} length={L_HYP} glow={w.hyp.plasma > 0.2 ? "rgba(255,61,154,0.8)" : undefined} />
      <Fx s={s} />
      {(onSup || onHyp) && <Streaks f={f} amt={0.7} />}
      <Svg>
        <Lock cam={cam} at={w.jet} size={L_JET * 0.9} f={f} p={prog(f, 6, 16) * (1 - prog(f, rel + 4, rel + 10))} color="#ffffff" tag="TEJAS · LCA" sub="illustration" />
        <Lock cam={cam} at={sC} size={L_SUP} f={f} p={onSup ? prog(f, W(0, 8) - 4, W(0, 8) + 10) : 0} color={SUP} tag="SUPERSONIC" sub={`MACH ${Math.min(2.8, 0.8 + w.ig * 1.4).toFixed(1)}`} />
        <Lock cam={cam} at={hC} size={L_HYP} f={f} p={onHyp ? prog(f, W(0, 11) - 4, W(0, 11) + 10) : 0} color={HYP} tag="HYPERSONIC" sub={`MACH ${Math.min(5.0, 0.8 + w.ig * 2.4).toFixed(1)}`} />
        <Lock cam={cam} at={v(w.ship, [0, 14, 0])} size={60} f={f} p={wide ? prog(f, Ls(1) + 18, Ls(1) + 34) : 0} color="#ff5a3c" tag="TARGET" side="l" />
      </Svg>
      <Big text={"KAUN\nPEHLE?"} f={f} at={W(1, 5) - 2} until={dur + 20} y={700} size={140} />
      <Illus text="Illustration · Tejas carries no hypersonic missile today" o={prog(f, rel - 4, rel + 6)} />
    </>
  );
};

// ---------------------------------------------------------------- 1. PAUSE: freeze with both missiles side by side
export const H4Pause: React.FC = () => {
  const { f, dur } = useS("pause");
  const tl = useTL();
  const s0 = Math.round(tl.scenes[0].start * FPS);
  const rel = Math.round(tl.lines[0].words[5].t0 * FPS) - s0;
  const w = coldWorld(rel + 32, rel);
  const sC = ctr(w.sup), hC = ctr(w.hyp);
  const mid = mix3(sC, hC, 0.5);
  const cam: Cam = { pos: v(mid, [-112, 5, -2]), target: mid, fov: 0.78 };
  const s = day({ t: (s0 + rel + 32) / FPS, cam, m0: w.sup, m1: w.hyp });
  const k = prog(f, 0, 5);
  return (
    <>
      <Bg s={s} filter={`saturate(${1 - 0.6 * k}) brightness(${1 - 0.15 * k})`} />
      <div style={{ position: "absolute", inset: 0, filter: `saturate(${1 - 0.6 * k})` }}>
        <Sprite cam={cam} model="missile_cool" center={sC} dir={w.sup.dir} length={L_SUP} />
        <Sprite cam={cam} model="missile" center={hC} dir={w.hyp.dir} length={L_HYP} glow="rgba(255,61,154,0.7)" />
      </div>
      <Svg>
        <g opacity={k}>{Array.from({ length: 64 }, (_, i) => <rect key={i} x={0} y={i * 30} width={1080} height={2} fill="rgba(0,0,0,0.06)" />)}</g>
        <Lock cam={cam} at={sC} size={L_SUP} f={f} p={prog(f, 2, 12)} color={SUP} tag="SUPERSONIC" side="l" />
        <Lock cam={cam} at={hC} size={L_HYP} f={f} p={prog(f, 6, 16)} color={HYP} tag="HYPERSONIC" />
        <g opacity={k * (0.75 + 0.25 * Math.sin(f * 0.4))} transform="translate(540,1010)">
          <rect x={-44} y={-60} width={30} height={120} rx={6} fill="#fff" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
          <rect x={14} y={-60} width={30} height={120} rx={6} fill="#fff" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
        </g>
      </Svg>
      <Big text="RUKO!" f={f} at={1} until={dur + 20} y={640} size={170} />
    </>
  );
};

// ---------------------------------------------------------------- 2. MACH 1: sound waves pile up at the nose
export const H4Mach: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("mach");
  const hasW = (useTL().lines[3]?.words.length ?? 0) > 13;
  const m1 = hasW ? W(3, 13) : Ls(3) + 90;
  const mach = (fr: number) => lerp(0.55, 1.0, clamp01(fr / Math.max(1, m1)));
  const C = 0.8;
  let x = 0; const xs: number[] = [];
  for (let k = 0; k <= f; k++) { xs.push(x); x += mach(k) * C; }
  const c: Vec3 = [xs[f], 12, 0];
  const cam: Cam = { pos: [c[0] - 6, 10, -30], target: [c[0] - 6, 11.5, 0], fov: 0.75 };
  const s = day({ t: T, cam, m0: { on: true, nose: v(c, [L_SUP / 2, 0, 0]), dir: [1, 0, 0], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 0.8, trail: { len: 30, width: 0.4, pink: false, opacity: 0.5 } } });
  const ppm = pxPerMetre(cam, c);
  const rings: React.ReactNode[] = [];
  for (let e = f - (f % 5); e >= 0 && f - e < 120; e -= 5) {
    const q = projectGL(cam, [xs[e] + L_SUP / 2, 12, 0]);
    if (!q) continue;
    rings.push(<circle key={e} cx={q[0]} cy={q[1]} r={(f - e) * C * ppm} fill="none" stroke="#ffffff" strokeWidth={3} strokeOpacity={Math.max(0, 0.9 - (f - e) / 125)} />);
  }
  const m = mach(f);
  return (
    <>
      <Bg s={s} />
      <Svg><g style={{ filter: "drop-shadow(0 0 4px rgba(0,60,120,0.6))" }}>{rings}</g></Svg>
      <Sprite cam={cam} model="missile_cool" center={c} dir={[1, 0, 0]} length={L_SUP} />
      <Fx s={s} />
      <Svg><Lock cam={cam} at={v(c, [L_SUP / 2, 0, 0])} size={2.5} f={f} p={prog(f, m1 - 10, m1)} color="#4fc3f7" tag="WAVES PILE UP" /></Svg>
      <MachGauge mach={m} color="#4fc3f7" p={prog(f, 4, 14)} label={`${Math.round(m * 1235).toLocaleString("en-IN")} km/h`} />
      <Card f={f} at={2} until={m1 - 4} name="SPEED OF SOUND" mach="≈ 1,200 km/h" sub={<span>in air · sea level</span>} color="#4fc3f7" bar={0.2} />
      <Big text="MACH 1" f={f} at={m1} until={dur + 20} y={520} size={150} color="#ffffff" />
      <Illus text="Illustration · slow motion" />
    </>
  );
};

// ---------------------------------------------------------------- 3. SUPERSONIC
export const H4Super: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("supersonic");
  const c: Vec3 = [f * 24, 9, 0];
  const side = ease(clamp01((f - (Ls(5) - 6)) / 14));
  const boom = W(5, 9);
  const sh = f >= boom ? shake(f, 0.5 * Math.exp(-(f - boom) / 8)) : ([0, 0, 0] as Vec3);
  const posA = v(c, [-15, 3.5, -14]), tgA = v(c, [0.5, 0, 0]);
  const posB = v(c, [-1.5, -0.5, -26]), tgB = v(c, [-1.5, 0.8, 0]);
  const cam: Cam = { pos: v(mix3(posA, posB, side), sh), target: mix3(tgA, tgB, side), fov: lerp(0.6, 0.55, side) };
  const s = day({
    t: T, cam,
    m0: { on: true, nose: v(c, [L_SUP / 2, 0, 0]), dir: [1, 0, 0], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.85 } },
    boom: { amt: f >= boom ? 0.7 + 0.3 * Math.exp(-(f - boom) / 20) : 0, mach: 2.8, phase: ((f - boom) / FPS) * 0.9 },
    flash: f >= boom ? 0.3 * Math.exp(-(f - boom) / 3) : 0,
  });
  const mach = lerp(1.2, 2.8, prog(f, 4, Ls(5)));
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="missile_cool" center={c} dir={[1, 0, 0]} length={L_SUP} />
      <Fx s={s} />
      <Streaks f={f} amt={0.6} dir={180} seed={7} />
      <Svg>
        <Velocity cam={cam} at={v(c, [L_SUP * 0.6, 0, 0])} dir={[1, 0, 0]} len={12} color={SUP} p={prog(f, 10, 24) * (1 - prog(f, boom - 6, boom))} />
        <Lock cam={cam} at={v(c, [-1.0, 0.8, 0])} size={7} f={f} p={prog(f, boom + 3, boom + 14)} color="#ffffff" tag="SHOCK WAVE" sub="air compressed" />
      </Svg>
      <MachGauge mach={mach} color={SUP} p={prog(f, 6, 16)} label="SUPERSONIC · e.g. BrahMos" />
      <Card f={f} at={2} name="SUPERSONIC" mach="MACH 1 – 5" color={SUP} bar={0.5} sub={<><span>e.g. BrahMos ≈ Mach 2.8</span><Flag /></>} />
      <Big text={"SONIC\nBOOM!"} f={f} at={W(5, 11) - 2} until={dur + 20} y={1000} size={120} color="#ffffff" />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 4. HYPERSONIC
export const H4Hyper: React.FC = () => {
  const { f, Ls, dur, T } = useS("hypersonic");
  const c: Vec3 = [f * 50, 8, 0];
  const close = ease(clamp01((f - (Ls(7) - 6)) / 16));
  const posA = v(c, [-12, 2.5, -15]), tgA = v(c, [0.8, 0, 0]);
  const posB = v(c, [-0.8, 0.6, -17]), tgB = v(c, [-0.6, 0.2, 0]);
  const cam: Cam = { pos: v(mix3(posA, posB, close), shake(f, 0.04)), target: mix3(tgA, tgB, close), fov: 0.58 };
  const heat = lerp(0.5, 1.0, prog(f, Ls(7), Ls(7) + 40));
  const s = day({ t: T, cam, m0: { on: true, nose: v(c, [L_HYP / 2, 0, 0]), dir: [1, 0, 0], len: L_HYP, radius: 0.35, plasma: heat, glide: true, burn: 0, trail: { len: 220, width: 0.3, pink: true, opacity: 0.5 } } });
  const mach = lerp(5.0, 5.8, prog(f, 0, dur));
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="missile" center={c} dir={[1, 0, 0]} length={L_HYP} glow={`rgba(255,61,154,${0.35 + 0.3 * heat})`} />
      <Fx s={s} />
      <Streaks f={f} amt={0.9} dir={180} seed={11} />
      <Svg>
        <Lock cam={cam} at={v(c, [L_HYP * 0.35, 0, 0])} size={2.4} f={f} p={prog(f, Ls(7) + 16, Ls(7) + 30)} color={HYP} tag="SUPER-HEATED AIR" sub="plasma glow" />
        <Velocity cam={cam} at={v(c, [L_HYP * 0.6, 0, 0])} dir={[1, 0, 0]} len={14} color={HYP} p={prog(f, 10, 24) * (1 - prog(f, Ls(7) - 6, Ls(7)))} />
      </Svg>
      <MachGauge mach={mach} color={HYP} p={prog(f, 6, 16)} label="HYPERSONIC" />
      <Card f={f} at={2} until={Ls(7) + 10} name="HYPERSONIC" mach="MACH 5+" color={HYP} bar={1} sub={<span>5× faster than sound</span>} />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 5/6. consoles over a daytime sea
export const H4Radar: React.FC = () => <DayCtx.Provider value={true}><H3Radar /></DayCtx.Provider>;
export const H4Time: React.FC = () => <DayCtx.Provider value={true}><H3Time /></DayCtx.Provider>;

// ---------------------------------------------------------------- 7. STRIKE
export const H4Strike: React.FC = () => {
  const { f, Le, W, dur, T } = useS("strike");
  const hyperHit = Le(10) - 10, superHit = W(11, 1);
  const cut = hyperHit - 26;
  const ship: Vec3 = [0, 0, 0];
  if (f < cut) {
    const onSup = f >= W(10, 6) - 2;
    if (!onSup) {
      const c: Vec3 = [f * 50, 9, 0];
      const cam: Cam = { pos: v(c, [-14, 2.5, -19]), target: c, fov: 0.6 };
      const s = day({ t: T, cam, m0: { on: true, nose: v(c, [L_HYP / 2, 0, 0]), dir: [1, 0, 0], len: L_HYP, radius: 0.35, plasma: 1, glide: true, burn: 0, trail: { len: 220, width: 0.3, pink: true, opacity: 0.5 } } });
      return (
        <>
          <Bg s={s} />
          <Sprite cam={cam} model="missile" center={c} dir={[1, 0, 0]} length={L_HYP} glow="rgba(255,61,154,0.85)" />
          <Fx s={s} />
          <Streaks f={f} amt={0.9} seed={13} />
          <Svg><Lock cam={cam} at={c} size={L_HYP} f={f} p={prog(f, W(10, 4) - 2, W(10, 4) + 10)} color={HYP} tag="HYPERSONIC · AHEAD" sub="MACH 5+" /></Svg>
          <Big text={"RACE\nRESUMES"} f={f} at={0} until={20} y={640} size={130} />
          <Illus />
        </>
      );
    }
    const g = f - (W(10, 6) - 2);
    const c: Vec3 = [0, 7, -1500 + g * 24];
    const cam: Cam = { pos: v(c, [-21, 2.2, 4]), target: v(c, [0, 0, -1.2]), fov: 0.62 };
    const s = day({ t: T, cam, m0: { on: true, nose: v(c, [0, 0, L_SUP / 2]), dir: [0, 0, 1], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.85 } } });
    return (
      <>
        <Bg s={s} />
        <Sprite cam={cam} model="ship" center={ship} dir={[1, 0, -0.3]} length={150} waterline />
        <Sprite cam={cam} model="missile_cool" center={c} dir={[0, 0, 1]} length={L_SUP} />
        <Fx s={s} />
        <Streaks f={f} amt={0.6} seed={17} />
        <Svg>
          <Lock cam={cam} at={c} size={L_SUP} f={f} p={prog(f, W(10, 6), W(10, 6) + 12)} color={SUP} tag="SUPERSONIC · BEHIND" sub="MACH 2.8" side="l" />
          <Lock cam={cam} at={v(ship, [0, 14, 0])} size={60} f={f} p={prog(f, W(10, 6) + 4, W(10, 6) + 16)} color="#ff5a3c" tag="TARGET" />
        </Svg>
        <Illus />
      </>
    );
  }
  // wide: the hits
  const shk = (f >= hyperHit ? 1.4 * Math.exp(-(f - hyperHit) / 6) : 0) + (f >= superHit ? 2.2 * Math.exp(-(f - superHit) / 7) : 0);
  const cam: Cam = { pos: v([-280 + (f - cut) * 0.8, 28, -250 + (f - cut) * 0.7], shake(f, shk)), target: [0, 14, 0], fov: 0.42 };
  const hq = clamp01((f - (hyperHit - 22)) / 22);
  const hStart: Vec3 = [-90, 260, -280], hEnd: Vec3 = [0, 12, 0];
  const hC = mix3(hStart, hEnd, hq), hDir = nrm([hEnd[0] - hStart[0], hEnd[1] - hStart[1], hEnd[2] - hStart[2]]);
  const sq = clamp01((f - (superHit - 30)) / 30);
  const sStart: Vec3 = [-460, 6, -360], sEnd: Vec3 = [-6, 6, -4];
  const sC = mix3(sStart, sEnd, sq), sDir = nrm([sEnd[0] - sStart[0], 0, sEnd[2] - sStart[2]]);
  const s = day({
    t: T, cam,
    ship: { pos: ship, yaw: 0, damage: 0.45 * prog(f, hyperHit, hyperHit + 10) + 0.45 * prog(f, superHit, superHit + 10), fire: prog(f, hyperHit, hyperHit + 12), sink: 0 },
    m1: { on: f < hyperHit && hq > 0, nose: v(hC, [hDir[0] * L_HYP / 2, hDir[1] * L_HYP / 2, hDir[2] * L_HYP / 2]), dir: hDir, len: L_HYP, radius: 0.35, plasma: 1, glide: true, burn: 0, trail: { len: 260, width: 1.0, pink: true, opacity: 0.9 } },
    m0: { on: f < superHit && sq > 0, nose: v(sC, [sDir[0] * L_SUP / 2, 0, sDir[2] * L_SUP / 2]), dir: sDir, len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 160, width: 1.0, pink: false, opacity: 0.9 } },
    ex0: f >= hyperHit ? { pos: [0, 14, 0], age: (f - hyperHit) / FPS, size: 1.3 } : undefined,
    ex1: f >= superHit ? { pos: [-6, 9, -4], age: (f - superHit) / FPS, size: 1.8 } : undefined,
    flash: (f >= hyperHit ? 0.2 * Math.exp(-(f - hyperHit) / 3) : 0) + (f >= superHit ? 0.35 * Math.exp(-(f - superHit) / 3) : 0),
  });
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="ship" center={ship} dir={[1, 0, -0.3]} length={150} waterline />
      {f < hyperHit && hq > 0 && <Sprite cam={cam} model="missile" center={hC} dir={hDir} length={L_HYP * 2.2} glow="rgba(255,61,154,0.9)" />}
      {f < superHit && sq > 0 && <Sprite cam={cam} model="missile_cool" center={sC} dir={sDir} length={L_SUP * 2.2} />}
      <Fx s={s} />
      <Svg>
        <Lock cam={cam} at={v(ship, [0, 16, 0])} size={70} f={f} p={prog(f, 0, 12) * (1 - prog(f, hyperHit - 4, hyperHit))} color="#ff5a3c" tag="TARGET" side="l" />
        <Lock cam={cam} at={[0, 22, 0]} size={20} f={f} p={prog(f, hyperHit + 2, hyperHit + 12)} color={HYP} tag="HYPERSONIC · 1st" side="l" />
        <Lock cam={cam} at={[-6, 12, -4]} size={20} f={f} p={prog(f, superHit + 4, superHit + 14)} color={SUP} tag="SUPERSONIC · 2nd" />
      </Svg>
      <Big text="HIT!" f={f} at={superHit} until={dur + 20} y={600} size={190} color="#ffb703" />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 8. OUTRO
export const H4Outro: React.FC = () => {
  const { f, W, T } = useS("outro");
  const a = 0.75 + f * 0.0016;
  const cam: Cam = { pos: [Math.sin(a) * -330, 32, -Math.cos(a) * 330], target: [0, 14, 0], fov: 0.42 };
  const s = day({ t: T, cam, ship: { pos: [0, 0, 0], yaw: 0, damage: 0.9, fire: 1, sink: 0 }, ex0: { pos: [0, 14, 0], age: 3 + f / FPS, size: 1.3 }, ex1: { pos: [-6, 9, -4], age: 2.5 + f / FPS, size: 1.6 } });
  const row = (y: number, name: string, mach: string, col: string, p: number, frac: number) => (
    <div style={{ position: "absolute", left: 60, top: y, width: 960, opacity: p, transform: `translateX(${(1 - p) * -50}px)`, padding: "18px 34px", boxSizing: "border-box", borderRadius: 14,
      background: "rgba(6,12,20,0.78)", border: `3px solid ${col}`, fontFamily: "Inter" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 900, fontSize: 56, color: col, transform: "scaleX(0.86)", transformOrigin: "left", letterSpacing: -1 }}>{name}</span>
        <span style={{ fontWeight: 900, fontSize: 50, color: "#fff", transform: "scaleX(0.86)", transformOrigin: "right" }}>{mach}</span>
      </div>
      <div style={{ marginTop: 8, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.15)" }}>
        <div style={{ width: `${frac * ease(clamp01(p)) * 100}%`, height: 10, borderRadius: 5, background: col }} />
      </div>
    </div>
  );
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="ship" center={[0, 0, 0]} dir={[1, 0, -0.3]} length={150} waterline filter="brightness(0.85) saturate(0.8)" />
      <Fx s={s} />
      {row(400, "SUPERSONIC", "MACH 1–5", SUP, prog(f, W(12, 0) - 2, W(12, 0) + 10), 0.5)}
      {row(580, "HYPERSONIC", "MACH 5+", HYP, prog(f, W(12, 3) - 2, W(12, 3) + 10), 1)}
      <Illus />
    </>
  );
};

export const SCENES_H4: Record<string, React.FC> = { cold: H4Cold, pause: H4Pause, mach: H4Mach, supersonic: H4Super, hypersonic: H4Hyper, radar: H4Radar, time: H4Time, strike: H4Strike, outro: H4Outro };
void INK;
