// Reel 2 v3: same story/voice as v2, re-staged as 3D night-ocean shots (WebGL) in the style of the references:
// big close-up missiles with plasma, moonlit water, minimal reference-style cards and labels.
import React from "react";
import { useCurrentFrame } from "remotion";
import { useTL, useSceneX } from "../v2/ctx";
import { prog, lerp, clamp01, ease } from "../engine";
import { GLView, GLState, Vec3, Missile, projectGL, pxPerMetre } from "./GLView";

const FPS = 30;
const SUP = "#ffd166", HYP = "#ff6fb0", TEAL = "#39d0ff";
const GLS = 0.75; // internal render scale of the 3D view

export const useS = (id: string) => {
  const timeline = useTL();
  const sc = timeline.scenes.find((s) => s.id === id)!;
  const f = useCurrentFrame() - useSceneX().shift;
  const s0 = Math.round(sc.start * FPS);
  const Ls = (i: number) => Math.round(timeline.lines[i].t0 * FPS) - s0;
  const Le = (i: number) => Math.round(timeline.lines[i].t1 * FPS) - s0;
  const W = (i: number, j: number) => Math.round(timeline.lines[i].words[Math.min(j, timeline.lines[i].words.length - 1)].t0 * FPS) - s0;
  const dur = Math.round((sc.end - sc.start) * FPS);
  return { f, Ls, Le, W, dur, s0, T: (s0 + f) / FPS };
};

const v = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const nrm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const shake = (f: number, amt: number): Vec3 => [Math.sin(f * 2.3) * amt + Math.sin(f * 5.1) * amt * 0.4, Math.cos(f * 1.9) * amt, 0];

// ---------------------------------------------------------------- overlays (reference style)
export const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>{children}</svg>
);

/** small-caps tag with a thin leader line to a 3D point */
export const Lbl: React.FC<{ cam: GLState["cam"]; at: Vec3; dx: number; dy: number; text: string; color?: string; p: number }> = ({ cam, at, dx, dy, text, color = "#e9eef5", p }) => {
  if (p <= 0) return null;
  const a = projectGL(cam, at);
  if (!a) return null;
  const w = text.length * 13.2 + 28;
  let bx = a[0] + dx, by = a[1] + dy;
  bx = Math.max(40 + (dx < 0 ? w : 0), Math.min(1040 - (dx < 0 ? 0 : w), bx));
  const x0 = dx < 0 ? bx - w : bx;
  const lp = clamp01(p * 1.6);
  return (
    <g opacity={Math.min(1, p * 1.4)}>
      <circle cx={a[0]} cy={a[1]} r={4} fill={color} />
      <line x1={a[0]} y1={a[1]} x2={lerp(a[0], bx, lp)} y2={lerp(a[1], by + 18, lp)} stroke={color} strokeWidth={1.6} opacity={0.85} />
      <rect x={x0} y={by} width={w} height={36} rx={4} fill="rgba(4,8,14,0.72)" stroke="rgba(255,255,255,0.12)" />
      <text x={x0 + 14} y={by + 25} fill={color} fontFamily="Inter" fontWeight={700} fontSize={20} letterSpacing={2.2}>{text}</text>
    </g>
  );
};

/** big centre word that pops (RUKO!, KAUN PEHLE?, HIT!) */
export const Big: React.FC<{ text: string; f: number; at: number; until: number; y?: number; size?: number; color?: string }> = ({ text, f, at, until, y = 760, size = 120, color = "#ffffff" }) => {
  if (f < at || f > until + 8) return null;
  const k = clamp01((f - at) / 5), out = clamp01((f - until) / 8);
  const sc = 1.35 - 0.35 * (1 - Math.pow(1 - k, 3));
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: y - size * 0.6, textAlign: "center", opacity: k * (1 - out), transform: `scale(${sc}) translateY(${-out * 16}px)`, whiteSpace: "pre-line",
      fontFamily: "Inter", fontWeight: 900, fontSize: size, lineHeight: 0.95, letterSpacing: -2, color, textShadow: "0 3px 0 rgba(0,0,0,0.35), 0 6px 30px rgba(0,0,0,0.65)", WebkitTextStroke: "2px rgba(0,0,0,0.25)" }}>
      <span style={{ display: "inline-block", transform: "scaleX(0.86)" }}>{text}</span>
    </div>
  );
};

export const Flag: React.FC<{ w?: number }> = ({ w = 34 }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", width: w, height: w * 0.66, verticalAlign: "middle", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
    <span style={{ flex: 1, background: "#ff9933" }} />
    <span style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: w * 0.2, height: w * 0.2, borderRadius: "50%", border: `${Math.max(1, w * 0.03)}px solid #1a3a8a` }} />
    </span>
    <span style={{ flex: 1, background: "#138808" }} />
  </span>
);

/** reference-2 style card: name, speed in Mach, speed bar */
export const Card: React.FC<{ f: number; at: number; until?: number; name: string; mach: string; sub?: React.ReactNode; color: string; bar: number }> = ({ f, at, until = 1e9, name, mach, sub, color, bar }) => {
  const p = prog(f, at, at + 8), out = prog(f, until, until + 8);
  if (p <= 0 || out >= 1) return null;
  const bp = prog(f, at + 6, at + 30);
  return (
    <div style={{ position: "absolute", left: 60, top: 330, opacity: p * (1 - out), transform: `translateX(${(1 - p) * -50}px)`, fontFamily: "Inter", textShadow: "0 3px 16px rgba(0,0,0,0.7)" }}>
      <div style={{ fontWeight: 900, fontSize: 92, lineHeight: 1, color: "#fff", letterSpacing: -2, transform: "scaleX(0.86)", transformOrigin: "left" }}>{name}</div>
      {sub && <div style={{ marginTop: 10, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: "rgba(255,255,255,0.85)", display: "flex", gap: 12, alignItems: "center" }}>{sub}</div>}
      <div style={{ marginTop: 8, fontWeight: 900, fontSize: 64, color, letterSpacing: -1, transform: "scaleX(0.86)", transformOrigin: "left" }}>{mach}</div>
      <div style={{ marginTop: 6, width: 520, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)" }}>
        <div style={{ width: `${bar * bp * 100}%`, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${color}, #ff5a3c)` }} />
      </div>
    </div>
  );
};

export const Illus: React.FC<{ text?: string; o?: number }> = ({ text = "Illustration", o = 1 }) => (
  <div style={{ position: "absolute", left: 40, top: 1590, opacity: 0.6 * o, fontFamily: "Inter", fontWeight: 600, fontSize: 18, letterSpacing: 1, color: "#cfd6e0" }}>{text}</div>
);

/** day variant switch (v4 reuses the console scenes over a daytime sea) */
export const DayCtx = React.createContext(false);
export const SUN: Vec3 = [0.45, 0.42, 1];
const GLScene: React.FC<{ s: GLState; filter?: string }> = ({ s, filter }) => {
  const day = React.useContext(DayCtx);
  const st: GLState = day ? { ...s, day: true, hideObjects: true, moonDir: SUN, exposure: 0.85 } : s;
  return <div style={{ position: "absolute", inset: 0, filter }}><GLView s={st} scale={GLS} /></div>;
};
const glScene = (s: GLState, filter?: string) => <GLScene s={s} filter={filter} />;

// ---------------------------------------------------------------- 0. COLD OPEN: Tejas fires both
type ColdOut = { s: GLState; sup: Missile; hyp: Missile; ship: Vec3; jet: Vec3; wide: number };
const coldState = (f: number, rel: number, wideAt: number, T: number): ColdOut => {
  const jz = (fr: number) => -300 + (fr / FPS) * 160;
  const jet: Vec3 = [0, 55 + Math.sin(f * 0.05) * 0.4, jz(f)];
  const tt = (f - rel) / FPS;
  const drop = Math.min(Math.max(tt, 0), 0.35);
  const ig = Math.max(0, tt - 0.35);
  const zRel = jz(rel) + 2;
  const mount = (side: number): Vec3 => [side * 3.0, jet[1] - 1.4, jet[2] + 2];
  const fly = (side: number, acc: number, climb: number): Vec3 =>
    tt <= 0 ? mount(side) : [side * (3.0 + ig * 0.6), 55 - 1.4 - 4.9 * drop * drop * 2 + climb * ig, zRel + 160 * tt + acc * ig * ig];
  const supN = fly(-1, 70, -0.4), hypN = fly(1, 135, 1.6);
  const sup: Missile = { on: true, nose: supN, dir: [0, 0, 1], len: 8.4, radius: 0.36, plasma: 0, glide: false, burn: tt > 0.35 ? 1 : 0,
    trail: { len: Math.min(110, ig * 160), width: 0.55, pink: false, opacity: 0.65 } };
  const hyp: Missile = { on: true, nose: hypN, dir: nrm([0, 0.02, 1]), len: 7.2, radius: 0.45, plasma: clamp01((ig - 0.5) / 1.2) * 0.9, glide: true, burn: tt > 0.35 ? 1 : 0,
    trail: { len: Math.min(170, ig * 240), width: 0.4, pink: true, opacity: 0.8 } };
  const ship: Vec3 = [12, 0, zRel + 6000];
  // camera: jet chase -> missile chase -> wide toward the target
  const chase = ease(clamp01((tt - 0.3) / 1.0));
  const wide = ease(clamp01((f - wideAt) / 34));
    const p0 = v(jet, [-9, 4, -24]), t0 = v(jet, [1.5, -1.5, 10]);
  const p1 = v(supN, [-1.4, 3.0, -26]), t1 = v(supN, [0.6, -0.6, 40]);
  const p2: Vec3 = [supN[0] - 20, 88, supN[2] - 170], t2: Vec3 = [ship[0] * 0.6, 0, ship[2]];
  const pos = mix3(mix3(p0, p1, chase), p2, wide), target = mix3(mix3(t0, t1, chase), t2, wide);
  const sh = tt > 0.3 && tt < 1.3 ? shake(f, 0.12) : ([0, 0, 0] as Vec3);
  return {
    s: { t: T, exposure: 0.9, cam: { pos: v(pos, sh), target, fov: lerp(0.72, 0.62, wide), roll: Math.sin(f * 0.03) * 0.02 * (1 - wide) },
      jet: { pos: jet, dir: [0, 0, 1], scale: 1.0 }, m0: sup, m1: hyp, ship: { pos: ship, yaw: 0.0, damage: 0, fire: 0, sink: 0 } },
    sup, hyp, ship, jet, wide,
  };
};

export const H3Cold: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("cold");
  const rel = W(0, 5);
  const c = coldState(f, rel, Ls(1) - 4, T);
  const cam = c.s.cam;
  const labelOff = 1 - c.wide;
  return (
    <>
      {glScene(c.s)}
      <Svg>
        <Lbl cam={cam} at={v(c.sup.nose, [0, 0, -4])} dx={-60} dy={140} text="SUPERSONIC" color={SUP} p={prog(f, W(0, 8) - 2, W(0, 8) + 8) * labelOff} />
        <Lbl cam={cam} at={v(c.hyp.nose, [0, 0, -3])} dx={40} dy={-170} text="HYPERSONIC" color={HYP} p={prog(f, W(0, 11) - 2, W(0, 11) + 8) * labelOff} />
        <Lbl cam={cam} at={v(c.ship, [0, 20, 0])} dx={-40} dy={-150} text="TARGET" color="#ff6b5e" p={prog(f, Ls(1) + 22, Ls(1) + 32)} />
        <Lbl cam={cam} at={v(c.jet, [0, 1.5, 0])} dx={50} dy={-160} text="TEJAS" color="#e9eef5" p={prog(f, 4, 14) * (1 - prog(f, rel + 8, rel + 16))} />
      </Svg>
      <Big text={"KAUN\nPEHLE?"} f={f} at={W(1, 5) - 2} until={dur + 20} y={700} size={140} />
      <Illus text="Illustration · Tejas carries no hypersonic missile today" o={prog(f, rel - 4, rel + 6)} />
    </>
  );
};

// ---------------------------------------------------------------- 1. PAUSE: the race freezes
export const H3Pause: React.FC = () => {
  const { f, dur } = useS("pause");
  const tl = useTL();
  const sc = tl.scenes[0];
  const s0 = Math.round(sc.start * FPS);
  const w5 = Math.round(tl.lines[0].words[5].t0 * FPS) - s0;
  const freeze = w5 + 52; // mid-race, both missiles in shot
  const c = coldState(freeze, w5, 1e9, freeze / FPS);
  const cam = c.s.cam;
  const k = prog(f, 0, 5);
  return (
    <>
      {glScene(c.s, `saturate(${1 - 0.7 * k}) brightness(${1 - 0.25 * k}) contrast(1.1)`)}
      <Svg>
        <g opacity={k}>{Array.from({ length: 64 }, (_, i) => <rect key={i} x={0} y={i * 30} width={1080} height={2} fill="rgba(255,255,255,0.04)" />)}</g>
        <Lbl cam={cam} at={v(c.sup.nose, [0, 0, -4])} dx={-60} dy={140} text="SUPERSONIC" color={SUP} p={1} />
        <Lbl cam={cam} at={v(c.hyp.nose, [0, 0, -3])} dx={40} dy={-170} text="HYPERSONIC" color={HYP} p={1} />
        <g opacity={k * (0.75 + 0.25 * Math.sin(f * 0.4))} transform="translate(540,1000)">
          <rect x={-44} y={-60} width={30} height={120} rx={6} fill="#fff" />
          <rect x={14} y={-60} width={30} height={120} rx={6} fill="#fff" />
        </g>
      </Svg>
      <Big text="RUKO!" f={f} at={1} until={dur + 20} y={640} size={170} />
    </>
  );
};

// ---------------------------------------------------------------- 2. MACH 1: sound waves pile up
export const H3Mach: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("mach");
  const hasW = (useTL().lines[3]?.words.length ?? 0) > 13;
  const m1 = hasW ? W(3, 13) : Ls(3) + 90;
  const mach = (fr: number) => lerp(0.55, 1.0, clamp01(fr / Math.max(1, m1))) ;
  const C = 0.9; // metres per frame = visual speed of sound (slow motion)
  let x = 0; const xs: number[] = [];
  for (let k = 0; k <= f; k++) { xs.push(x); x += mach(k) * C; }
  const nose: Vec3 = [xs[f], 10, 0];
  const cam: GLState["cam"] = { pos: [nose[0] - 8, 9, -34], target: [nose[0] - 8, 9.5, 0], fov: 0.8 };
  const s: GLState = { t: T, exposure: 0.85, cam, m0: { on: true, nose, dir: [1, 0, 0], len: 8.4, radius: 0.36, plasma: 0, glide: false, burn: 0.8, trail: { len: 40, width: 0.4, pink: false, opacity: 0.35 } } };
  const ppm = pxPerMetre(cam, nose);
  const rings: React.ReactNode[] = [];
  for (let e = f - (f % 5); e >= 0 && f - e < 120; e -= 5) {
    const ctr = projectGL(cam, [xs[e], 10, 0]);
    if (!ctr) continue;
    rings.push(<circle key={e} cx={ctr[0]} cy={ctr[1]} r={(f - e) * C * ppm} fill="none" stroke="#dfeaff" strokeWidth={2.5} strokeOpacity={Math.max(0, 0.8 - (f - e) / 130)} />);
  }
  const m = mach(f);
  return (
    <>
      {glScene(s)}
      <Svg>
        {rings}
        <g transform="translate(540,1180)">
          <rect x={-300} y={-46} width={600} height={92} rx={12} fill="rgba(4,8,14,0.7)" stroke="rgba(255,255,255,0.12)" />
          <text x={-270} y={14} fill="#9fe2ff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={36}>MACH {m.toFixed(2)}</text>
          <text x={270} y={14} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={36}>{Math.round(m * 1235).toLocaleString("en-IN")} km/h</text>
        </g>
      </Svg>
      <Card f={f} at={2} until={m1 - 4} name="SPEED OF SOUND" mach="≈ 1,200 km/h" sub={<span>in air · sea level</span>} color="#9fe2ff" bar={0.2} />
      <Big text="MACH 1" f={f} at={m1} until={dur + 20} y={520} size={150} color="#9fe2ff" />
      <Illus text="Illustration · slow motion" />
    </>
  );
};

// ---------------------------------------------------------------- 3. SUPERSONIC: cruise missile, sonic boom
export const H3Super: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("supersonic");
  const nose: Vec3 = [f * 26, 8, 0];
  const side = ease(clamp01((f - (Ls(5) - 6)) / 14));
  const boom = W(5, 9);
  const b = f >= boom ? 1 : 0;
  const sh = f >= boom ? shake(f, 0.6 * Math.exp(-(f - boom) / 8)) : ([0, 0, 0] as Vec3);
  const posA = v(nose, [-20, 3.5, -18]), tgA = v(nose, [-3.0, 0, 0]);
  const posB = v(nose, [-4.2, -0.9, -30]), tgB = v(nose, [-4.2, 0.8, 0]);
  const cam: GLState["cam"] = { pos: v(mix3(posA, posB, side), sh), target: mix3(tgA, tgB, side), fov: lerp(0.7, 0.62, side) };
  const s: GLState = {
    t: T, exposure: 0.9, cam,
    m0: { on: true, nose, dir: [1, 0, 0], len: 8.4, radius: 0.36, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.6 } },
    boom: { amt: b * (0.6 + 0.4 * Math.exp(-(f - boom) / 20)), mach: 2.8, phase: ((f - boom) / FPS) * 0.9 },
    flash: f >= boom ? 0.35 * Math.exp(-(f - boom) / 3) : 0,
  };
  return (
    <>
      {glScene(s)}
      <Svg>
        <Lbl cam={cam} at={v(nose, [-3.5, 1.2, 0])} dx={60} dy={-190} text="SHOCK WAVE" color="#dfeaff" p={prog(f, boom + 3, boom + 12)} />
      </Svg>
      <Card f={f} at={2} name="SUPERSONIC" mach="MACH 1 – 5" color={SUP} bar={0.5}
        sub={<><span>e.g. BrahMos ≈ Mach 2.8</span><Flag /></>} />
      <Big text={"SONIC\nBOOM!"} f={f} at={W(5, 11) - 2} until={dur + 20} y={1010} size={120} color={SUP} />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 4. HYPERSONIC: plasma close-up
export const H3Hyper: React.FC = () => {
  const { f, Ls, dur, T } = useS("hypersonic");
  const nose: Vec3 = [f * 55, 7, 0];
  const close = ease(clamp01((f - (Ls(7) - 6)) / 16));
  const posA = v(nose, [-3.6, -0.8, -23]), tgA = v(nose, [-3.6, 0.6, 0]);
  const posB = v(nose, [-2.0, 1.0, -14]), tgB = v(nose, [-3.0, 0.3, 0]);
  const cam: GLState["cam"] = { pos: v(mix3(posA, posB, close), shake(f, 0.05)), target: mix3(tgA, tgB, close), fov: 0.62 };
  const plasma = lerp(0.55, 1.25, prog(f, Ls(7), Ls(7) + 40));
  const s: GLState = { t: T, exposure: 0.9, cam,
    m0: { on: true, nose, dir: [1, 0, 0], len: 7.2, radius: 0.5, plasma, glide: true, burn: 0, trail: { len: 220, width: 0.32, pink: true, opacity: 0.75 } } };
  return (
    <>
      {glScene(s)}
      <Svg>
        <Lbl cam={cam} at={v(nose, [-2.0, 0.55, 0])} dx={-40} dy={-230} text="PLASMA · SUPER-HEATED AIR" color={HYP} p={prog(f, Ls(7) + 20, Ls(7) + 30)} />
      </Svg>
      <Card f={f} at={2} until={Ls(7) + 14} name="HYPERSONIC" mach="MACH 5+" color={HYP} bar={1}
        sub={<span>5× faster than sound</span>} />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 5. RADAR: the ship's console
export const Panel: React.FC<{ y: number; h: number; title: string; children: React.ReactNode; f: number }> = ({ y, h, title, children, f }) => (
  <g>
    <rect x={56} y={y} width={968} height={h} rx={10} fill="rgba(3,10,16,0.88)" stroke={TEAL} strokeWidth={4} />
    <rect x={56} y={y} width={968} height={h} rx={10} fill="none" stroke={TEAL} strokeWidth={14} opacity={0.12} />
    <rect x={56} y={y} width={968} height={52} rx={10} fill="rgba(57,208,255,0.10)" />
    <text x={84} y={y + 35} fill={TEAL} fontFamily="JetBrains Mono" fontWeight={600} fontSize={24} letterSpacing={4}>{title}</text>
    <circle cx={990} cy={y + 26} r={8} fill="#ff4d5e" opacity={0.55 + 0.45 * Math.sin(f * 0.5)} />
    {children}
    {Array.from({ length: Math.floor(h / 6) }, (_, i) => <rect key={i} x={60} y={y + 4 + i * 6} width={960} height={1} fill="rgba(57,208,255,0.035)" />)}
  </g>
);

const bgShip = (T: number, f: number): GLState => ({
  t: T, exposure: 0.8, cam: { pos: [-230 + f * 0.15, 18, -250], target: [0, 14, 0], fov: 0.5 },
  ship: { pos: [0, 0, 0], yaw: 0.35, damage: 0, fire: 0, sink: 0 },
});

export const H3Radar: React.FC = () => {
  const { f, W, dur, T } = useS("radar");
  const turn = W(8, 20);
  const ts = f / FPS, Tt = (dur + 10) / FPS;
  const supLeft = Math.max(0, 97 - ts * 6), hypLeft = Math.max(0, 58 - ts * 6);
  const R = 270, CX = 540, CY = 760;
  const blip = (d: number, a: number) => [CX + Math.sin(a) * R * d, CY - Math.cos(a) * R * d];
  const sd = clamp01(1 - ts / (Tt * 2.2)), hd = clamp01(1 - ts / Tt);
  const weave = f > turn ? Math.sin((f - turn) * 0.25) * 0.35 * prog(f, turn, turn + 10) : 0;
  const [sx, sy] = blip(0.95 * sd + 0.05, -0.5);
  const [hx, hy] = blip(0.95 * hd + 0.05, 0.45 + weave);
  const sweep = ((f * 9) % 360) * Math.PI / 180;
  const box = (x: number, label: string, val: string, col: string) => (
    <g transform={`translate(${x},1070)`}>
      <rect width={420} height={150} rx={8} fill="rgba(57,208,255,0.06)" stroke="rgba(57,208,255,0.35)" />
      <text x={20} y={40} fill="rgba(255,255,255,0.7)" fontFamily="JetBrains Mono" fontSize={22}>{label}</text>
      <text x={20} y={112} fill={col} fontFamily="JetBrains Mono" fontWeight={600} fontSize={60}>{val}</text>
    </g>
  );
  return (
    <>
      {glScene(bgShip(T, f), "brightness(0.55) blur(3px)")}
      <Svg>
        <Panel y={420} h={830} title="SHIP RADAR · TRACKING" f={f}>
          {[1, 0.66, 0.33].map((r, i) => <circle key={i} cx={CX} cy={CY} r={R * r} fill="none" stroke="#1d6b55" strokeWidth={2} />)}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#1d6b55" strokeWidth={1.5} />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#1d6b55" strokeWidth={1.5} />
          <path d={`M${CX} ${CY} L${CX + Math.sin(sweep) * R} ${CY - Math.cos(sweep) * R} A ${R} ${R} 0 0 0 ${CX + Math.sin(sweep - 0.7) * R} ${CY - Math.cos(sweep - 0.7) * R} Z`} fill="rgba(60,255,160,0.16)" />
          <circle cx={CX} cy={CY} r={9} fill="#7fffc4" />
          <circle cx={sx} cy={sy} r={13} fill={SUP} />
          <circle cx={hx} cy={hy} r={13} fill={HYP} opacity={prog(f, 10, 16)} />
          <text x={sx + 22} y={sy + 8} fill={SUP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={22}>SUP</text>
          <text x={hx + 22} y={hy + 8} fill={HYP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={22} opacity={prog(f, 10, 16)}>HYP</text>
          {f > turn && <text x={hx - 80} y={hy - 28} fill={HYP} fontFamily="Inter" fontWeight={800} fontSize={30}>TURNING!</text>}
          {box(86, "SUPERSONIC · MACH 3", `${supLeft.toFixed(0)} s`, SUP)}
          {box(574, "HYPERSONIC · MACH 5", `≤${hypLeft.toFixed(0)} s`, HYP)}
          <text x={540} y={1240} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontFamily="JetBrains Mono" fontSize={18}>time to impact from 100 km · sea-level speed of sound · illustrative</text>
        </Panel>
      </Svg>
      <Big text={"LESS TIME\nTO REACT"} f={f} at={W(8, 11) - 2} until={turn - 6} y={1500} size={84} color="#ffffff" />
    </>
  );
};

// ---------------------------------------------------------------- 6. TRAVEL TIME: Delhi -> Mumbai
export const H3Time: React.FC = () => {
  const { f, W, dur, T } = useS("time");
  const go = W(9, 1);
  const k = prog(f, go, dur - 12, (x) => x);
  const supT = 19 * k, hypT = Math.min(11, 19 * k);
  const A: [number, number] = [280, 560], B: [number, number] = [790, 980];
  const at = (q: number) => [lerp(A[0], B[0], q), lerp(A[1], B[1], q)];
  const [sx, sy] = at(clamp01(supT / 19)), [hx, hy] = at(clamp01(hypT / 11));
  const sky: GLState = { t: T, exposure: 0.8, cam: { pos: [0, 30, 0], target: [0, 38, 100], fov: 0.9 } };
  return (
    <>
      {glScene(sky, "brightness(0.6) blur(2px)")}
      <Svg>
        <Panel y={420} h={830} title="DELHI → MUMBAI · ≈ 1,150 km" f={f}>
          {Array.from({ length: 14 }, (_, i) => <line key={`v${i}`} x1={90 + i * 70} y1={490} x2={90 + i * 70} y2={1040} stroke="rgba(57,208,255,0.07)" />)}
          {Array.from({ length: 8 }, (_, i) => <line key={`h${i}`} x1={70} y1={500 + i * 72} x2={1010} y2={500 + i * 72} stroke="rgba(57,208,255,0.07)" />)}
          <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="rgba(255,255,255,0.4)" strokeWidth={5} strokeDasharray="14 12" />
          {[[A, "DELHI", -1], [B, "MUMBAI", 1]].map(([p, n, d], i) => (
            <g key={i}>
              <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={16} fill="#fff" />
              <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={30} fill="none" stroke="#fff" strokeWidth={2} opacity={0.5} />
              <text x={(p as number[])[0] + ((d as number) < 0 ? 40 : -40)} y={(p as number[])[1] + ((d as number) < 0 ? -30 : 66)} textAnchor={(d as number) < 0 ? "start" : "end"} fill="#fff" fontFamily="Inter" fontWeight={900} fontSize={44}>{n as string}</text>
            </g>
          ))}
          {f >= go && <circle cx={sx} cy={sy} r={15} fill={SUP} />}
          {f >= go && <circle cx={hx} cy={hy} r={15} fill={HYP} />}
          <g transform="translate(100,1100)">
            <text x={0} y={0} fill={SUP} fontFamily="Inter" fontWeight={900} fontSize={44}>SUPERSONIC</text>
            <text x={880} y={0} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={46}>~{Math.round(supT)} min</text>
            <text x={0} y={66} fill={HYP} fontFamily="Inter" fontWeight={900} fontSize={44}>HYPERSONIC</text>
            <text x={880} y={66} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={46}>~{Math.round(hypT)} min</text>
            <text x={0} y={120} fill="rgba(255,255,255,0.5)" fontFamily="JetBrains Mono" fontSize={18}>at Mach 3 vs Mach 5 · sea-level speed of sound · illustrative</text>
          </g>
        </Panel>
      </Svg>
    </>
  );
};

// ---------------------------------------------------------------- 7. STRIKE: race resumes, both hit
export const H3Strike: React.FC = () => {
  const { f, Le, W, dur, T } = useS("strike");
  const hyperHit = Le(10) - 10, superHit = W(11, 1);
  const cut = hyperHit - 26;
  if (f < cut) {
    const onSup = f >= W(10, 6) - 2;
    const g = onSup ? f - (W(10, 6) - 2) : f;
    if (!onSup) {
      const nose: Vec3 = [f * 55, 9, 0];
      const cam: GLState["cam"] = { pos: v(nose, [-16, 3, -22]), target: v(nose, [-2, 0, 0]), fov: 0.62 };
      return (
        <>
          {glScene({ t: T, exposure: 0.9, cam, m0: { on: true, nose, dir: [1, 0, 0], len: 7.2, radius: 0.5, plasma: 1, glide: true, burn: 0, trail: { len: 220, width: 0.32, pink: true, opacity: 0.75 } } })}
          <Svg><Lbl cam={cam} at={v(nose, [-2, 0.6, 0])} dx={-40} dy={-200} text="HYPERSONIC · AHEAD" color={HYP} p={prog(f, W(10, 4) - 2, W(10, 4) + 8)} /></Svg>
          <Big text={"RACE\nRESUMES"} f={f} at={0} until={20} y={640} size={130} />
          <Illus />
        </>
      );
    }
    // supersonic, sea-skimming toward the ship on the horizon
    const nose: Vec3 = [0, 6, -900 + g * 26];
    const cam: GLState["cam"] = { pos: v(nose, [-1.4, 3.0, -26]), target: v(nose, [0.6, -0.6, 40]), fov: 0.7 };
    return (
      <>
        {glScene({ t: T, exposure: 0.9, cam, m0: { on: true, nose, dir: [0, 0, 1], len: 8.4, radius: 0.36, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.6 } },
          ship: { pos: [25, 0, 1400], yaw: 0.0, damage: 0, fire: 0, sink: 0 } })}
        <Svg><Lbl cam={cam} at={v(nose, [0, 0.5, -3])} dx={-60} dy={-200} text="SUPERSONIC · BEHIND" color={SUP} p={prog(f, W(10, 6), W(10, 6) + 8)} /></Svg>
        <Illus />
      </>
    );
  }
  // wide: the hits
  const shk = (f >= hyperHit ? 1.2 * Math.exp(-(f - hyperHit) / 6) : 0) + (f >= superHit ? 2.0 * Math.exp(-(f - superHit) / 7) : 0);
  const cam: GLState["cam"] = { pos: v([-250 + (f - cut) * 0.8, 30, -230 + (f - cut) * 0.7], shake(f, shk)), target: [0, 12, 0], fov: 0.5 };
  const hq = clamp01((f - (hyperHit - 22)) / 22);
  const hStart: Vec3 = [-90, 240, -260], hEnd: Vec3 = [0, 12, 8];
  const hNose = mix3(hStart, hEnd, hq);
  const sq = clamp01((f - (superHit - 30)) / 30);
  const sStart: Vec3 = [-420, 6, -330], sEnd: Vec3 = [4, 6, -4];
  const sNose = mix3(sStart, sEnd, sq);
  const s: GLState = {
    t: T, exposure: 0.9, cam,
    ship: { pos: [0, 0, 0], yaw: 0.6, damage: 0.45 * prog(f, hyperHit, hyperHit + 10) + 0.45 * prog(f, superHit, superHit + 10), fire: prog(f, hyperHit, hyperHit + 12), sink: 0 },
    m1: { on: f < hyperHit && hq > 0, nose: hNose, dir: nrm([hEnd[0] - hStart[0], hEnd[1] - hStart[1], hEnd[2] - hStart[2]]), len: 7.2, radius: 0.5, plasma: 1.1, glide: true, burn: 0, trail: { len: 240, width: 0.8, pink: true, opacity: 0.9 } },
    m0: { on: f < superHit && sq > 0, nose: sNose, dir: nrm([sEnd[0] - sStart[0], 0, sEnd[2] - sStart[2]]), len: 8.4, radius: 0.36, plasma: 0, glide: false, burn: 1, trail: { len: 150, width: 0.8, pink: false, opacity: 0.7 } },
    ex0: f >= hyperHit ? { pos: [0, 12, 8], age: (f - hyperHit) / FPS, size: 1.3 } : undefined,
    ex1: f >= superHit ? { pos: [3, 8, -2], age: (f - superHit) / FPS, size: 1.8 } : undefined,
    flash: (f >= hyperHit ? 0.25 * Math.exp(-(f - hyperHit) / 3) : 0) + (f >= superHit ? 0.45 * Math.exp(-(f - superHit) / 3) : 0),
  };
  return (
    <>
      {glScene(s)}
      <Svg>
        <Lbl cam={cam} at={[0, 22, 8]} dx={-60} dy={-260} text="HYPERSONIC · 1st" color={HYP} p={prog(f, hyperHit + 2, hyperHit + 10)} />
        <Lbl cam={cam} at={[3, 14, -2]} dx={60} dy={-170} text="SUPERSONIC · 2nd" color={SUP} p={prog(f, superHit + 4, superHit + 12)} />
      </Svg>
      <Big text="HIT!" f={f} at={superHit} until={dur + 20} y={600} size={190} color={SUP} />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 8. OUTRO: comparison
export const H3Outro: React.FC = () => {
  const { f, W, T } = useS("outro");
  const a = 0.6 + f * 0.0016;
  const cam: GLState["cam"] = { pos: [Math.sin(a) * -300, 34 - f * 0.02, -Math.cos(a) * 300], target: [0, 12, 0], fov: 0.5 };
  const s: GLState = { t: T, exposure: 0.85, cam, ship: { pos: [0, 0, 0], yaw: 0.6, damage: 0.9, fire: 1, sink: clamp01(f / 600) * 0.4 } };
  const row = (y: number, name: string, mach: string, col: string, p: number) => (
    <div style={{ position: "absolute", left: 60, top: y, width: 960, height: 120, opacity: p, transform: `translateX(${(1 - p) * -50}px)`, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 36px", boxSizing: "border-box", borderRadius: 14, background: "rgba(4,8,14,0.78)", border: `3px solid ${col}`, fontFamily: "Inter" }}>
      <span style={{ fontWeight: 900, fontSize: 56, color: col, transform: "scaleX(0.86)", transformOrigin: "left", letterSpacing: -1 }}>{name}</span>
      <span style={{ fontWeight: 900, fontSize: 52, color: "#fff", transform: "scaleX(0.86)", transformOrigin: "right" }}>{mach}</span>
    </div>
  );
  return (
    <>
      {glScene(s)}
      {row(420, "SUPERSONIC", "MACH 1–5", SUP, prog(f, W(12, 0) - 2, W(12, 0) + 10))}
      {row(570, "HYPERSONIC", "MACH 5+", HYP, prog(f, W(12, 3) - 2, W(12, 3) + 10))}
      <Illus />
    </>
  );
};

export const SCENES_H3: Record<string, React.FC> = { cold: H3Cold, pause: H3Pause, mach: H3Mach, supersonic: H3Super, hypersonic: H3Hyper, radar: H3Radar, time: H3Time, strike: H3Strike, outro: H3Outro };
