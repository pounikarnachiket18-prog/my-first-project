// Reel 2 v5 ("best of"): merges the three references
//  - day "10 fastest missiles": low fast flight, mist streaks, motion blur, snowy mountains, rank cards with Mach count-up, finale card
//  - night "hypersonic": plasma close-ups with callouts, radar operator console ("SEEN LATE"), ballistic-vs-steering diagram
//  - our reel: the user's own models (Tejas, INDIA missile, warship), story/voice timing, branding, logo end card
import React from "react";
import { prog, lerp, clamp01, ease } from "../engine";
import { GLState, Vec3, Missile, projectGL } from "./GLView";
import { Sprite, MarkingsCtx, SHIP_NAME, RealismCtx } from "./Sprite";
import { useS, Svg, Big, Flag, Illus, SUN, Panel } from "./scenes_h3";
import { Bg, Fx, Lock as LockBase, Velocity as VelocityBase, MachGauge as MachGaugeBase, Streaks as StreaksBase, coldWorld, ctr } from "./scenes_h4";

// v8 ("reference copy"): only the reference's own graphics -> drop extra brackets/gauges/arrows/overlay streaks
const useRef8 = () => React.useContext(RealismCtx);
const Lock: typeof LockBase = (p) => (useRef8() && !/^(TARGET|TEJAS)/.test(p.tag) ? null : <LockBase {...p} />);
const Velocity: typeof VelocityBase = (p) => (useRef8() ? null : <VelocityBase {...p} />);
const MachGauge: typeof MachGaugeBase = (p) => (useRef8() ? null : <MachGaugeBase {...p} />);
const Streaks: typeof StreaksBase = (p) => (useRef8() ? null : <StreaksBase {...p} />);
import { useTL } from "../v2/ctx";

const FPS = 30;
const SUP = "#ffb703", HYP = "#ff3d9a", ICE = "#7fd3ff", TEAL = "#39d0ff";
const L_JET = 13.2, L_SUP = 6.2, L_HYP = 5.8;
type Cam = GLState["cam"];
type CamFn = (f: number) => Cam;

const v = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const nrm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const shake = (f: number, amt: number): Vec3 => [Math.sin(f * 2.3) * amt + Math.sin(f * 5.1) * amt * 0.4, Math.cos(f * 1.9) * amt, 0];

/** day state with the reference look: mountains, mist, motion blur from the camera's own velocity */
const look = (t: number, camFn: CamFn, f: number, extra: Partial<GLState> = {}, blur = 1): GLState => {
  const ref8 = React.useContext(RealismCtx);
  const a = camFn(f), b = camFn(f + 1);
  const vel: Vec3 = [(b.pos[0] - a.pos[0]) * FPS, (b.pos[1] - a.pos[1]) * FPS, (b.pos[2] - a.pos[2]) * FPS];
  const env: Partial<GLState> = ref8 ? { mountains: 1.3, mist: 0.7, ice: 1, shutter: blur / 24 } : { mountains: 1, mist: 1, shutter: blur / 50 };
  return { t, cam: a, exposure: 0.78, day: true, hideObjects: true, moonDir: SUN, vel, ...env, ...extra };
};

// ---------------------------------------------------------------- reference-style motion graphics
/** "10 fastest" style rank card: #N, huge condensed name, flags, Mach counter, orange bar. Masked slide-in. */
const RankCard: React.FC<{ f: number; at: number; until?: number; rank: string; name: string; flags?: React.ReactNode; place?: string; mach: number; plus?: boolean; color: string; bar: number }> =
  ({ f, at, until = 1e9, rank, name, flags, place, mach, plus, color, bar }) => {
    const p = prog(f, at, at + 9), out = prog(f, until, until + 8);
    if (p <= 0 || out >= 1) return null;
    const cnt = prog(f, at + 4, at + 34, (x) => 1 - Math.pow(1 - x, 3));
    const m = mach * cnt;
    const shown = cnt >= 1 ? `${mach % 1 === 0 ? mach.toFixed(0) : mach.toFixed(1)}${plus ? "+" : ""}` : m.toFixed(1);
    const reveal = (d: number) => ({ clipPath: `inset(0 ${100 - 100 * prog(f, at + d, at + d + 8)}% 0 0)` });
    const shadow = "0 3px 0 rgba(0,0,0,0.35), 0 4px 18px rgba(0,0,0,0.55)";
    return (
      <div style={{ position: "absolute", left: 54, top: 300, opacity: 1 - out, transform: `translateX(${(1 - ease(p)) * -40 - out * 40}px)`, fontFamily: "Inter", textShadow: shadow }}>
        <div style={{ ...reveal(0), fontWeight: 900, fontSize: 64, color: "#ffc233", transform: "scaleX(0.82)", transformOrigin: "left", lineHeight: 1 }}>{rank}</div>
        <div style={{ ...reveal(2), fontWeight: 900, fontSize: 108, color: "#fff", transform: "scaleX(0.8)", transformOrigin: "left", lineHeight: 0.95, letterSpacing: -2 }}>{name}</div>
        {(flags || place) && <div style={{ ...reveal(5), marginTop: 10, display: "flex", gap: 10, alignItems: "center", fontWeight: 800, fontSize: 26, letterSpacing: 3, color: "#fff" }}>{flags}{place && <span>{place}</span>}</div>}
        <div style={{ ...reveal(7), marginTop: 8, fontWeight: 900, fontSize: 74, color: ICE, transform: "scaleX(0.82)", transformOrigin: "left", WebkitTextStroke: "2px rgba(10,40,70,0.55)", lineHeight: 1 }}>MACH {shown}</div>
        <div style={{ marginTop: 10, width: 560, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.28)", ...reveal(8) }}>
          <div style={{ width: `${bar * cnt * 100}%`, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${color}, #ff5a1f)`, boxShadow: `0 0 12px ${color}` }} />
        </div>
      </div>
    );
  };

const RussiaFlag: React.FC = () => (
  <span style={{ display: "inline-flex", flexDirection: "column", width: 34, height: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
    <span style={{ flex: 1, background: "#fff" }} /><span style={{ flex: 1, background: "#0039a6" }} /><span style={{ flex: 1, background: "#d52b1e" }} />
  </span>
);

/** callout with a thin leader line, typed text (night-reference style), anchored to a 3D point */
const Callout: React.FC<{ cam: Cam; at: Vec3; dx: number; dy: number; text: string; sub?: string; color: string; p: number }> = ({ cam, at, dx, dy, text, sub, color, p }) => {
  if (p <= 0) return null;
  const a = projectGL(cam, at);
  if (!a) return null;
  const lp = ease(clamp01(p * 1.8));
  const bx = Math.max(40, Math.min(1040, a[0] + dx)), by = Math.max(320, Math.min(1200, a[1] + dy));
  const n = Math.round(text.length * clamp01((p - 0.3) * 2.4));
  const w = Math.max(text.length * 14, (sub?.length ?? 0) * 12) + 30;
  const x0 = dx < 0 ? bx - w : bx;
  return (
    <g>
      <circle cx={a[0]} cy={a[1]} r={7} fill="none" stroke={color} strokeWidth={2.5} opacity={lp} />
      <circle cx={a[0]} cy={a[1]} r={3} fill={color} opacity={lp} />
      <path d={`M${a[0]} ${a[1]} L${lerp(a[0], bx, lp)} ${lerp(a[1], by + 22, lp)}`} stroke={color} strokeWidth={2} fill="none" />
      {n > 0 && (
        <g>
          <rect x={x0} y={by} width={w} height={sub ? 74 : 44} rx={4} fill="rgba(4,10,18,0.74)" />
          <rect x={dx < 0 ? x0 + w - 4 : x0} y={by} width={4} height={sub ? 74 : 44} fill={color} />
          <text x={x0 + 16} y={by + 30} fill="#fff" fontFamily="Inter" fontWeight={800} fontSize={22} letterSpacing={2.5}>{text.slice(0, n)}</text>
          {sub && <text x={x0 + 16} y={by + 60} fill={color} fontFamily="JetBrains Mono" fontWeight={600} fontSize={19}>{sub}</text>}
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------- 0. COLD OPEN
export const H5Cold: React.FC = () => {
  const shipTag = React.useContext(MarkingsCtx) ? `TARGET · ${SHIP_NAME}` : "TARGET";
  const { f, Ls, W, dur, T } = useS("cold");
  const rel = W(0, 5);
  const onSup = (fr: number) => fr >= W(0, 7) - 3 && fr < W(0, 9) - 3;
  const onHyp = (fr: number) => fr >= W(0, 9) - 3 && fr < Ls(1) - 4;
  const camFn: CamFn = (fr) => {
    const w = coldWorld(fr, rel);
    const sC = ctr(w.sup), hC = ctr(w.hyp);
    if (fr >= Ls(1) - 4) {
      const g = ease(clamp01((fr - (Ls(1) - 4)) / 40));
      return { pos: [sC[0] - 26, lerp(14, 34, g), sC[2] - 70 - g * 50], target: [w.ship[0], 10, w.ship[2]], fov: lerp(0.6, 0.48, g) };
    }
    if (onHyp(fr)) { const k = fr - (W(0, 9) - 3); return { pos: v(hC, [-12.5 - k * 0.04, 1.2, 4.5 - k * 0.06]), target: v(hC, [0, 0, -0.4]), fov: 0.62 }; }
    if (onSup(fr)) { const k = fr - (W(0, 7) - 3); return { pos: v(sC, [-13 - k * 0.04, 1.3, 4.8 - k * 0.06]), target: v(sC, [0, 0, -0.4]), fov: 0.62 }; }
    // hero fly-by: camera low beside the jet's path, panning as it passes
    const camZ = -300 + (rel / FPS) * 150 + 10 + fr * 2.8;
    return { pos: [-20, 52.5, camZ], target: v(w.jet, [0, -0.5, 4]), fov: 0.66 };
  };
  const w = coldWorld(f, rel);
  const sC = ctr(w.sup), hC = ctr(w.hyp);
  const s = look(T, camFn, f, { m0: w.sup, m1: w.hyp, ship: { pos: w.ship, yaw: 0, damage: 0, fire: 0, sink: 0 } }, onSup(f) || onHyp(f) ? 1.2 : 0.6);
  const cam = { ...s.cam, pos: v(s.cam.pos, w.tt > 0.35 && w.tt < 1.3 ? shake(f, 0.12) : [0, 0, 0]) };
  s.cam = cam;
  const wide = f >= Ls(1) - 4;
  return (
    <>
      <Bg s={s} />
      {wide && <Sprite cam={cam} model="ship" center={w.ship} dir={[1, 0, -0.3]} length={150} waterline />}
      <Sprite cam={cam} model="jet" center={w.jet} dir={[0, 0, 1]} length={L_JET} />
      <Sprite cam={cam} model="missile_cool" center={sC} dir={w.sup.dir} length={L_SUP} />
      <Sprite cam={cam} model="missile" center={hC} dir={w.hyp.dir} length={L_HYP} glow={w.hyp.plasma > 0.2 ? "rgba(255,61,154,0.7)" : undefined} />
      <Fx s={s} />
      {(onSup(f) || onHyp(f)) && <Streaks f={f} amt={0.75} dir={0} />}
      <Svg>
        <Lock cam={cam} at={w.jet} size={L_JET * 0.8} f={f} p={prog(f, 6, 16) * (1 - prog(f, rel + 4, rel + 10))} color="#ffffff" tag="TEJAS · LCA" sub="illustration" />
        <Lock cam={cam} at={sC} size={L_SUP * 0.7} f={f} p={onSup(f) ? prog(f, W(0, 8) - 4, W(0, 8) + 10) : 0} color={SUP} tag="SUPERSONIC" sub={`MACH ${Math.min(2.8, 0.8 + w.ig * 1.4).toFixed(1)}`} side="l" />
        <Lock cam={cam} at={hC} size={L_HYP * 0.7} f={f} p={onHyp(f) ? prog(f, W(0, 11) - 4, W(0, 11) + 10) : 0} color={HYP} tag="HYPERSONIC" sub={`MACH ${Math.min(5.0, 0.8 + w.ig * 2.4).toFixed(1)}`} side="l" />
        <Lock cam={cam} at={v(w.ship, [0, 14, 0])} size={60} f={f} p={wide ? prog(f, Ls(1) + 18, Ls(1) + 34) : 0} color="#ff5a3c" tag={shipTag} side="l" />
      </Svg>
      <Big text={"KAUN\nPEHLE?"} f={f} at={W(1, 5) - 2} until={dur + 20} y={720} size={150} />
      <Illus text="Illustration · Tejas carries no hypersonic missile today" o={prog(f, rel - 4, rel + 6)} />
    </>
  );
};

// ---------------------------------------------------------------- 1. PAUSE (frozen world, camera keeps drifting)
export const H5Pause: React.FC = () => {
  const { f, dur } = useS("pause");
  const tl = useTL();
  const s0 = Math.round(tl.scenes[0].start * FPS);
  const rel = Math.round(tl.lines[0].words[5].t0 * FPS) - s0;
  const w = coldWorld(rel + 32, rel);
  const sC = ctr(w.sup), hC = ctr(w.hyp);
  const mid = mix3(sC, hC, 0.5);
  const camFn: CamFn = (fr) => ({ pos: v(mid, [-104 + fr * 0.35, 5 - fr * 0.02, -2 - fr * 0.25]), target: mid, fov: 0.78 - fr * 0.0012 });
  const s = look((s0 + rel + 32) / FPS, camFn, f, { m0: w.sup, m1: w.hyp, vel: [0, 0, 0] });
  const cam = s.cam;
  const k = prog(f, 0, 5);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: `saturate(${1 - 0.55 * k}) contrast(${1 + 0.1 * k})` }}>
        <Bg s={s} />
        <Sprite cam={cam} model="missile_cool" center={sC} dir={w.sup.dir} length={L_SUP} />
        <Sprite cam={cam} model="missile" center={hC} dir={w.hyp.dir} length={L_HYP} glow="rgba(255,61,154,0.6)" />
        <Fx s={s} />
      </div>
      <Svg>
        <g opacity={k}>{Array.from({ length: 64 }, (_, i) => <rect key={i} x={0} y={i * 30 + (f % 30)} width={1080} height={2} fill="rgba(0,0,0,0.06)" />)}</g>
        <Lock cam={cam} at={sC} size={L_SUP * 0.8} f={f} p={prog(f, 2, 12)} color={SUP} tag="SUPERSONIC" side="l" />
        <Lock cam={cam} at={hC} size={L_HYP * 0.8} f={f} p={prog(f, 6, 16)} color={HYP} tag="HYPERSONIC" />
        <g opacity={k * (0.75 + 0.25 * Math.sin(f * 0.4))} transform="translate(540,1010)">
          <rect x={-44} y={-60} width={30} height={120} rx={6} fill="#fff" />
          <rect x={14} y={-60} width={30} height={120} rx={6} fill="#fff" />
        </g>
      </Svg>
      <Big text="RUKO!" f={f} at={1} until={dur + 20} y={640} size={180} />
    </>
  );
};

// ---------------------------------------------------------------- 2. MACH 1
export const H5Mach: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("mach");
  const hasW = (useTL().lines[3]?.words.length ?? 0) > 13;
  const m1 = hasW ? W(3, 13) : Ls(3) + 90;
  const mach = (fr: number) => lerp(0.55, 1.0, clamp01(fr / Math.max(1, m1)));
  const C = 0.8;
  const xs: number[] = []; let x = 0;
  for (let k = 0; k <= f + 1; k++) { xs.push(x); x += mach(k) * C; }
  const c: Vec3 = [xs[f], 12, 0];
  const camFn: CamFn = (fr) => ({ pos: [xs[Math.min(fr, xs.length - 1)] - 6, 10, -30], target: [xs[Math.min(fr, xs.length - 1)] - 6, 11.5, 0], fov: 0.75 });
  const s = look(T, camFn, f, { m0: { on: true, nose: v(c, [L_SUP / 2, 0, 0]), dir: [1, 0, 0], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 0.8, trail: { len: 30, width: 0.4, pink: false, opacity: 0.5 } } }, 0.5);
  const cam = s.cam;
  const ppm = (() => { const a = projectGL(cam, c), b = projectGL(cam, v(c, [1, 0, 0])); return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0; })();
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
      <Svg><Callout cam={cam} at={v(c, [L_SUP / 2, 0, 0])} dx={60} dy={-220} text="WAVES PILE UP" sub="at the nose" color={ICE} p={prog(f, m1 - 12, m1)} /></Svg>
      <MachGauge mach={m} color={ICE} p={prog(f, 4, 14)} label={`${Math.round(m * 1235).toLocaleString("en-IN")} km/h`} />
      <RankCard f={f} at={2} until={m1 - 4} rank="SPEED OF" name="SOUND" place="IN AIR · SEA LEVEL" mach={1} color={ICE} bar={0.17} />
      <Big text="MACH 1" f={f} at={m1} until={dur + 20} y={560} size={160} color="#ffffff" />
      <Illus text="Illustration · slow motion" />
    </>
  );
};

// ---------------------------------------------------------------- 3. SUPERSONIC: fly-by, then close side chase with the boom
export const H5Super: React.FC = () => {
  const { f, Ls, W, dur, T } = useS("supersonic");
  const boom = W(5, 9);
  const side = (fr: number) => ease(clamp01((fr - (Ls(5) - 8)) / 16));
  const mc = (fr: number): Vec3 => [fr * 24 - 330, 9, 0];
  const camFn: CamFn = (fr) => {
    const c = mc(fr);
    // fly-by: camera travels slower than the missile so it overtakes, then settles into a close side chase
    const flyPos: Vec3 = [fr * 16 - 40, 7.5, -12];
    const flyTgt: Vec3 = v(c, [-1, 0.5, 0]);
    const sidePos = v(c, [-2.2, -0.4, -15]), sideTgt = v(c, [-2.2, 0.6, 0]);
    const k = side(fr);
    return { pos: mix3(flyPos, sidePos, k), target: mix3(flyTgt, sideTgt, k), fov: lerp(0.66, 0.55, k) };
  };
  const c = mc(f);
  const s = look(T, camFn, f, {
    m0: { on: true, nose: v(c, [L_SUP / 2, 0, 0]), dir: [1, 0, 0], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.85 } },
    boom: { amt: f >= boom ? 0.7 + 0.3 * Math.exp(-(f - boom) / 20) : 0, mach: 2.8, phase: ((f - boom) / FPS) * 0.9 },
    flash: f >= boom ? 0.3 * Math.exp(-(f - boom) / 3) : 0,
  }, 1.2);
  const cam = { ...s.cam, pos: v(s.cam.pos, f >= boom ? shake(f, 0.4 * Math.exp(-(f - boom) / 8)) : [0, 0, 0]) };
  s.cam = cam;
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="missile_cool" center={c} dir={[1, 0, 0]} length={L_SUP} />
      <Fx s={s} />
      <Streaks f={f} amt={0.7} dir={180} seed={7} />
      <Svg>
        <Velocity cam={cam} at={v(c, [L_SUP * 0.6, 0, 0])} dir={[1, 0, 0]} len={12} color={SUP} p={prog(f, Ls(5) - 4, Ls(5) + 10) * (1 - prog(f, boom - 6, boom))} />
        <Callout cam={cam} at={v(c, [-1.4, 1.0, 0])} dx={70} dy={-230} text="SHOCK WAVE" sub="air squeezed hard" color="#ffffff" p={prog(f, boom + 3, boom + 14)} />
      </Svg>
      <RankCard f={f} at={4} rank="#2" name="SUPERSONIC" flags={<><Flag /><RussiaFlag /></>} place="e.g. BRAHMOS · MACH 1–5" mach={2.8} color={SUP} bar={0.47} />
      <Big text={"SONIC\nBOOM!"} f={f} at={W(5, 11) - 2} until={dur + 20} y={1010} size={130} color="#ffffff" />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 4. HYPERSONIC: frame-filling plasma close-ups (night-reference callouts)
export const H5Hyper: React.FC = () => {
  const { f, Ls, dur, T } = useS("hypersonic");
  const mc = (fr: number): Vec3 => [fr * 50, 8, 0];
  const close = (fr: number) => ease(clamp01((fr - (Ls(7) - 6)) / 16));
  const camFn: CamFn = (fr) => {
    const c = mc(fr), k = close(fr);
    const a = v(c, [-8.5 + fr * 0.03, 1.4, -10.5]), at = v(c, [0.2, 0, 0]);      // low front-quarter, overflowing the frame
    const b = v(c, [-0.6, 0.5, -13]), bt = v(c, [-0.6, 0.2, 0]);
    return { pos: mix3(a, b, k), target: mix3(at, bt, k), fov: lerp(0.62, 0.56, k) };
  };
  const c = mc(f);
  const heat = lerp(0.6, 1.0, prog(f, Ls(7), Ls(7) + 40));
  const s = look(T, camFn, f, { m0: { on: true, nose: v(c, [L_HYP / 2, 0, 0]), dir: [1, 0, 0], len: L_HYP, radius: 0.35, plasma: heat, glide: true, burn: 0, trail: { len: 220, width: 0.3, pink: true, opacity: 0.55 } } }, 1.4);
  const cam = { ...s.cam, pos: v(s.cam.pos, shake(f, 0.03)) };
  s.cam = cam;
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="missile" center={c} dir={[1, 0, 0]} length={L_HYP} glow={`rgba(255,61,154,${0.35 + 0.3 * heat})`} />
      <Fx s={s} />
      <Streaks f={f} amt={0.95} dir={180} seed={11} />
      <Svg>
        <Callout cam={cam} at={v(c, [L_HYP * 0.42, 0.1, 0])} dx={-40} dy={-250} text="PLASMA" sub="super-heated air glows" color={HYP} p={prog(f, Ls(7) + 16, Ls(7) + 30)} />
        <Callout cam={cam} at={v(c, [L_HYP * 0.49, 0, 0])} dx={60} dy={190} text="NOSE" sub="hottest point" color="#ffd0e6" p={prog(f, Ls(7) + 40, Ls(7) + 52)} />
        <Callout cam={cam} at={v(c, [-L_HYP * 0.1, 0.3, 0])} dx={-80} dy={210} text="RADIO BLACKOUT" sub="plasma blocks signals" color="#9fe2ff" p={prog(f, Ls(7) + 64, Ls(7) + 76)} />
      </Svg>
      <RankCard f={f} at={2} until={Ls(7) + 10} rank="#1" name="HYPERSONIC" place="5× FASTER THAN SOUND" mach={5} plus color={HYP} bar={0.85} />
      <MachGauge mach={lerp(5.0, 5.8, prog(f, 0, dur))} color={HYP} p={prog(f, Ls(7) + 6, Ls(7) + 16)} label="HYPERSONIC" />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 5. RADAR: operator console ("SEEN LATE"), then ballistic vs steering
export const H5Radar: React.FC = () => {
  const shipLbl = React.useContext(MarkingsCtx) ? SHIP_NAME : "SHIP";
  const { f, W, dur, T } = useS("radar");
  const turn = W(8, 20), diag = W(8, 19) - 4;
  if (f < diag) {
    const ts = f / FPS, Tt = (dur + 10) / FPS;
    const supLeft = Math.max(0, 97 - ts * 6), hypLeft = Math.max(0, 58 - ts * 6);
    const R = 250, CX = 690, CY = 840;
    const blip = (d: number, a: number) => [CX + Math.sin(a) * R * d, CY - Math.cos(a) * R * d];
    const sd = clamp01(1 - ts / (Tt * 2.2)), hd = clamp01(1 - ts / Tt);
    const [sx, sy] = blip(0.95 * sd + 0.05, -0.5);
    const hyOn = prog(f, W(8, 7) - 2, W(8, 7) + 4);
    const [hx, hy] = blip(0.95 * hd + 0.05, 0.45);
    const sweep = ((f * 9) % 360) * Math.PI / 180;
    const camFn: CamFn = (fr) => ({ pos: [-260 + fr * 0.6, 22, -260 + fr * 0.4], target: [0, 14, 0], fov: 0.5 });
    const s = look(T, camFn, f, { ship: { pos: [0, 0, 0], yaw: 0, damage: 0, fire: 0, sink: 0 } }, 0.3);
    const seen = prog(f, W(8, 12) - 2, W(8, 12) + 4);
    const zoom = 1 + 0.04 * (f / dur);
    return (
      <>
        <div style={{ position: "absolute", inset: 0, filter: "blur(4px) brightness(0.6)" }}>
          <Bg s={s} />
          <Sprite cam={s.cam} model="ship" center={[0, 0, 0]} dir={[1, 0, -0.3]} length={150} waterline />
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "50% 45%" }}>
          <Svg>
            <Panel y={360} h={900} title="CIC · SHIP RADAR" f={f}>
              {/* map strip (left) */}
              <g transform="translate(86,430)">
                <rect width={300} height={420} rx={6} fill="rgba(57,208,255,0.05)" stroke="rgba(57,208,255,0.3)" />
                {Array.from({ length: 9 }, (_, i) => <line key={i} x1={0} y1={i * 52} x2={300} y2={i * 52} stroke="rgba(57,208,255,0.08)" />)}
                <path d="M40 0 C70 90 30 160 90 230 C140 290 110 360 170 420" stroke="rgba(160,220,255,0.35)" strokeWidth={3} fill="none" />
                <circle cx={230} cy={150} r={7} fill="#fff" />
                <text x={130} y={130} fill="#cfe9ff" fontFamily="JetBrains Mono" fontSize={18}>{shipLbl}</text>
                <path d={`M${20 + f * 0.6} ${380 - f * 0.9} L230 150`} stroke={SUP} strokeWidth={2} strokeDasharray="6 8" opacity={0.8} />
                <path d={`M${30 + f * 1.1} ${400 - f * 1.6} L230 150`} stroke={HYP} strokeWidth={2} strokeDasharray="6 8" opacity={hyOn} />
                <text x={12} y={410} fill="rgba(255,255,255,0.5)" fontFamily="JetBrains Mono" fontSize={15}>TRACKS</text>
              </g>
              {/* scope */}
              {[1, 0.66, 0.33].map((r, i) => <circle key={i} cx={CX} cy={CY} r={R * r} fill="none" stroke="#1d6b55" strokeWidth={2} />)}
              <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#1d6b55" strokeWidth={1.5} />
              <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#1d6b55" strokeWidth={1.5} />
              <path d={`M${CX} ${CY} L${CX + Math.sin(sweep) * R} ${CY - Math.cos(sweep) * R} A ${R} ${R} 0 0 0 ${CX + Math.sin(sweep - 0.7) * R} ${CY - Math.cos(sweep - 0.7) * R} Z`} fill="rgba(60,255,160,0.16)" />
              <circle cx={CX} cy={CY} r={9} fill="#7fffc4" />
              <circle cx={sx} cy={sy} r={12} fill={SUP} />
              <text x={sx + 20} y={sy + 7} fill={SUP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={21}>SUP</text>
              <g opacity={hyOn}>
                <circle cx={hx} cy={hy} r={12} fill={HYP} />
                <circle cx={hx} cy={hy} r={12 + (f % 15) * 2} fill="none" stroke={HYP} strokeWidth={2} opacity={1 - (f % 15) / 15} />
                <text x={hx + 20} y={hy + 7} fill={HYP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={21}>HYP</text>
              </g>
              {/* readouts */}
              {[[86, "SUPERSONIC", "MACH 3", `${supLeft.toFixed(0)} s`, SUP, 1], [570, "HYPERSONIC", "MACH 5", `≤${hypLeft.toFixed(0)} s`, HYP, hyOn]].map(([x, n, m, t, col, o], i) => (
                <g key={i} transform={`translate(${x},1110)`} opacity={o as number}>
                  <rect width={424} height={120} rx={8} fill="rgba(57,208,255,0.06)" stroke="rgba(57,208,255,0.35)" />
                  <text x={18} y={36} fill="rgba(255,255,255,0.75)" fontFamily="JetBrains Mono" fontSize={20}>{n as string} · {m as string}</text>
                  <text x={18} y={96} fill={col as string} fontFamily="JetBrains Mono" fontWeight={600} fontSize={52}>{t as string}</text>
                  <text x={406} y={96} textAnchor="end" fill="rgba(255,255,255,0.5)" fontFamily="JetBrains Mono" fontSize={16}>to impact</text>
                </g>
              ))}
              {seen > 0 && (
                <g opacity={seen * (f % 10 < 6 ? 1 : 0.55)} transform={`translate(${hx},${hy - 60})`}>
                  <rect x={-90} y={-30} width={180} height={44} rx={4} fill="rgba(255,61,154,0.18)" stroke={HYP} strokeWidth={2} />
                  <text x={0} y={0} textAnchor="middle" fill={HYP} fontFamily="Inter" fontWeight={900} fontSize={26} letterSpacing={2}>SEEN LATE</text>
                </g>
              )}
              <text x={540} y={1250} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontFamily="JetBrains Mono" fontSize={16}>time to impact from 100 km · sea-level speed of sound · illustrative</text>
            </Panel>
          </Svg>
        </div>
        <Big text={"LESS TIME\nTO REACT"} f={f} at={W(8, 15) - 2} until={diag - 2} y={1500} size={88} color="#ffffff" />
      </>
    );
  }
  // ballistic (predictable) vs hypersonic (stays low and steers) — drawn over a wide daytime sea
  const g = f - diag;
  const camFn: CamFn = (fr) => { const q = fr - diag; return { pos: [-330 + q * 0.8, 150, -620], target: [0, 70, 80], fov: 0.66 }; };
  const s = look(T, camFn, f, { ship: { pos: [220, 0, 380], yaw: 0, damage: 0, fire: 0, sink: 0 } }, 0.2);
  const cam = s.cam;
  const P = (x: number, y: number, z: number) => projectGL(cam, [x, y, z]);
  const launch: Vec3 = [-230, 0, -120], ship: Vec3 = [220, 0, 380];
  const N = 60;
  const ball: [number, number][] = [], low: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const bx = lerp(launch[0], ship[0], u), bz = lerp(launch[2], ship[2], u);
    const pb = P(bx, Math.sin(u * Math.PI) * 170, bz);
    const pl = P(bx + Math.sin(u * Math.PI * 3) * 70 * Math.sin(u * Math.PI), 12 + 18 * Math.sin(u * Math.PI), bz - Math.sin(u * Math.PI * 3) * 40 * Math.sin(u * Math.PI));
    if (pb) ball.push(pb);
    if (pl) low.push(pl);
  }
  const path = (pts: [number, number][], k: number) => pts.slice(0, Math.max(2, Math.round(pts.length * k))).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const kb = prog(g, 0, 26, (x) => x), kl = prog(g, 8, 40, (x) => x);
  const headB = ball[Math.min(ball.length - 1, Math.round((ball.length - 1) * kb))];
  const headL = low[Math.min(low.length - 1, Math.round((low.length - 1) * kl))];
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="ship" center={ship} dir={[1, 0, -0.3]} length={150} waterline />
      <Svg>
        <path d={path(ball, kb)} stroke="#ffffff" strokeWidth={5} strokeDasharray="14 12" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
        <path d={path(low, kl)} stroke={HYP} strokeWidth={7} fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${HYP})` }} />
        {headB && <circle cx={headB[0]} cy={headB[1]} r={9} fill="#fff" />}
        {headL && <circle cx={headL[0]} cy={headL[1]} r={10} fill={HYP} />}
        {ball[Math.round(ball.length / 2)] && kb > 0.5 && (
          <g opacity={prog(g, 12, 20)}>
            <rect x={ball[Math.round(ball.length / 2)][0] - 190} y={ball[Math.round(ball.length / 2)][1] - 70} width={380} height={48} rx={4} fill="rgba(4,10,18,0.72)" />
            <text x={ball[Math.round(ball.length / 2)][0]} y={ball[Math.round(ball.length / 2)][1] - 37} textAnchor="middle" fill="#fff" fontFamily="Inter" fontWeight={800} fontSize={22} letterSpacing={2}>BALLISTIC · PREDICTABLE</text>
          </g>
        )}
        {headL && kl > 0.35 && (
          <g opacity={prog(g, 18, 26)}>
            <rect x={headL[0] - 130} y={headL[1] + 30} width={260} height={48} rx={4} fill="rgba(4,10,18,0.72)" />
            <rect x={headL[0] - 130} y={headL[1] + 30} width={4} height={48} fill={HYP} />
            <text x={headL[0]} y={headL[1] + 63} textAnchor="middle" fill={HYP} fontFamily="Inter" fontWeight={900} fontSize={24} letterSpacing={2}>STEERS · LOW</text>
          </g>
        )}
      </Svg>
      <Big text="TURNING!" f={f} at={turn + 2} until={dur + 20} y={1500} size={110} color={HYP} />
      <Illus text="Illustration · not to scale" />
    </>
  );
};

// ---------------------------------------------------------------- 6. TRAVEL TIME: "10 fastest" finale card over a fly-over
export const H5Time: React.FC = () => {
  const { f, W, dur, T } = useS("time");
  const p1 = W(9, 4), p2 = W(9, 9);
  const camFn: CamFn = (fr) => ({ pos: [fr * 14, 30, -fr * 4], target: [fr * 14 + 400, 60, 900], fov: 0.7 });
  const streak = (fr: number): Vec3 => [fr * 14 - 900 + fr * 28, 240 + fr * 0.6, 1400];
  const hpos = streak(f);
  const s = look(T, camFn, f, { m0: { on: true, nose: hpos, dir: nrm([42, 0.6, 0]), len: 7, radius: 1.2, plasma: 0, glide: true, burn: 1, trail: { len: 420, width: 2.2, pink: true, opacity: 0.85 } } }, 0.8);
  const k = prog(f, p1, dur - 10, (x) => x);
  const supT = 19 * k, hypT = Math.min(11, 19 * k);
  const phase2 = f >= p2;
  const line = (d: number) => ({ opacity: prog(f, (phase2 ? p2 : p1) + d, (phase2 ? p2 : p1) + d + 6), transform: `translateY(${(1 - prog(f, (phase2 ? p2 : p1) + d, (phase2 ? p2 : p1) + d + 8)) * 18}px)` });
  const shadow = "0 3px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.55)";
  return (
    <>
      <Bg s={s} />
      <Fx s={s} />
      {f >= p1 && (
        <div key={phase2 ? "b" : "a"} style={{ position: "absolute", left: 0, width: 1080, top: 760, textAlign: "center", fontFamily: "Inter", fontWeight: 900, textShadow: shadow }}>
          <div style={{ ...line(0), fontSize: 64, color: phase2 ? HYP : "#ffc233", transform: `${line(0).transform} scaleX(0.84)` }}>AT MACH {phase2 ? "5" : "3"}:</div>
          <div style={{ ...line(3), fontSize: 92, color: "#fff", transform: `${line(3).transform} scaleX(0.82)`, lineHeight: 1.05 }}>DELHI → MUMBAI</div>
          <div style={{ ...line(6), fontSize: 92, color: "#fff", transform: `${line(6).transform} scaleX(0.82)`, lineHeight: 1.05 }}>IN ABOUT {phase2 ? 11 : 19} MINUTES</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 120, width: 840, top: 1160, opacity: prog(f, p1, p1 + 8), fontFamily: "JetBrains Mono" }}>
        {[["SUPERSONIC", supT / 19, `${Math.round(supT)} min`, SUP], ["HYPERSONIC", hypT / 11, `${Math.round(hypT)} min`, HYP]].map(([n, q, t, col], i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: 22, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}><span>{n as string}</span><span>{t as string}</span></div>
            <div style={{ position: "relative", height: 10, borderRadius: 5, background: "rgba(0,0,0,0.3)", marginTop: 4 }}>
              <div style={{ width: `${(q as number) * 100}%`, height: 10, borderRadius: 5, background: col as string, boxShadow: `0 0 10px ${col}` }} />
            </div>
          </div>
        ))}
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>≈ 1,150 km · Mach 3 vs Mach 5 · sea-level speed of sound · illustrative</div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 7. STRIKE
export const H5Strike: React.FC = () => {
  const shipTag = React.useContext(MarkingsCtx) ? `TARGET · ${SHIP_NAME}` : "TARGET";
  const { f, Le, W, dur, T } = useS("strike");
  const hyperHit = Le(10) - 10, superHit = W(11, 1);
  const cut = hyperHit - 26;
  const ship: Vec3 = [0, 0, 0];
  const supAt = W(10, 6) - 2;
  if (f < cut) {
    if (f < supAt) {
      const mc = (fr: number): Vec3 => [fr * 50, 9, 0];
      const camFn: CamFn = (fr) => ({ pos: v(mc(fr), [-8 + fr * 0.05, 1.6, -11]), target: v(mc(fr), [0.6, 0, 0]), fov: 0.6 });
      const c = mc(f);
      const s = look(T, camFn, f, { m0: { on: true, nose: v(c, [L_HYP / 2, 0, 0]), dir: [1, 0, 0], len: L_HYP, radius: 0.35, plasma: 1, glide: true, burn: 0, trail: { len: 220, width: 0.3, pink: true, opacity: 0.55 } } }, 1.4);
      return (
        <>
          <Bg s={s} />
          <Sprite cam={s.cam} model="missile" center={c} dir={[1, 0, 0]} length={L_HYP} glow="rgba(255,61,154,0.75)" />
          <Fx s={s} />
          <Streaks f={f} amt={0.95} seed={13} />
          <Svg><Lock cam={s.cam} at={c} size={L_HYP * 0.7} f={f} p={prog(f, W(10, 4) - 2, W(10, 4) + 10)} color={HYP} tag="HYPERSONIC · AHEAD" sub="MACH 5+" side="l" /></Svg>
          <Big text={"RACE\nRESUMES"} f={f} at={0} until={20} y={660} size={140} />
          <Illus />
        </>
      );
    }
    const mc = (fr: number): Vec3 => [0, 7, -1500 + (fr - supAt) * 24];
    const camFn: CamFn = (fr) => ({ pos: v(mc(fr), [-17, 2.2, 6]), target: v(mc(fr), [0, 0, -1.2]), fov: 0.62 });
    const c = mc(f);
    const s = look(T, camFn, f, { m0: { on: true, nose: v(c, [0, 0, L_SUP / 2]), dir: [0, 0, 1], len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 140, width: 0.55, pink: false, opacity: 0.85 } }, ship: { pos: ship, yaw: 0, damage: 0, fire: 0, sink: 0 } }, 1.2);
    return (
      <>
        <Bg s={s} />
        <Sprite cam={s.cam} model="ship" center={ship} dir={[1, 0, -0.3]} length={150} waterline />
        <Sprite cam={s.cam} model="missile_cool" center={c} dir={[0, 0, 1]} length={L_SUP} />
        <Fx s={s} />
        <Streaks f={f} amt={0.7} dir={0} seed={17} />
        <Svg>
          <Lock cam={s.cam} at={c} size={L_SUP * 0.7} f={f} p={prog(f, supAt + 2, supAt + 14)} color={SUP} tag="SUPERSONIC · BEHIND" sub="MACH 2.8" side="l" />
          <Lock cam={s.cam} at={v(ship, [0, 14, 0])} size={60} f={f} p={prog(f, supAt + 6, supAt + 18)} color="#ff5a3c" tag={shipTag} />
        </Svg>
        <Illus />
      </>
    );
  }
  const shk = (f >= hyperHit ? 1.4 * Math.exp(-(f - hyperHit) / 6) : 0) + (f >= superHit ? 2.2 * Math.exp(-(f - superHit) / 7) : 0);
  const camFn: CamFn = (fr) => ({ pos: [-280 + (fr - cut) * 0.9, 26 - (fr - cut) * 0.03, -250 + (fr - cut) * 0.8], target: [0, 14, 0], fov: 0.42 });
  const hq = clamp01((f - (hyperHit - 22)) / 22);
  const hStart: Vec3 = [-90, 260, -280], hEnd: Vec3 = [0, 12, 0];
  const hC = mix3(hStart, hEnd, hq), hDir = nrm([hEnd[0] - hStart[0], hEnd[1] - hStart[1], hEnd[2] - hStart[2]]);
  const sq = clamp01((f - (superHit - 30)) / 30);
  const sStart: Vec3 = [-460, 6, -360], sEnd: Vec3 = [-6, 6, -4];
  const sC = mix3(sStart, sEnd, sq), sDir = nrm([sEnd[0] - sStart[0], 0, sEnd[2] - sStart[2]]);
  const s = look(T, camFn, f, {
    ship: { pos: ship, yaw: 0, damage: 0.45 * prog(f, hyperHit, hyperHit + 10) + 0.45 * prog(f, superHit, superHit + 10), fire: prog(f, hyperHit, hyperHit + 12), sink: 0 },
    m1: { on: f < hyperHit && hq > 0, nose: v(hC, [hDir[0] * L_HYP / 2, hDir[1] * L_HYP / 2, hDir[2] * L_HYP / 2]), dir: hDir, len: L_HYP, radius: 0.35, plasma: 1, glide: true, burn: 0, trail: { len: 260, width: 1.0, pink: true, opacity: 0.9 } },
    m0: { on: f < superHit && sq > 0, nose: v(sC, [sDir[0] * L_SUP / 2, 0, sDir[2] * L_SUP / 2]), dir: sDir, len: L_SUP, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 160, width: 1.0, pink: false, opacity: 0.9 } },
    ex0: f >= hyperHit ? { pos: [0, 14, 0], age: (f - hyperHit) / FPS, size: 1.3 } : undefined,
    ex1: f >= superHit ? { pos: [-6, 9, -4], age: (f - superHit) / FPS, size: 1.8 } : undefined,
    flash: (f >= hyperHit ? 0.2 * Math.exp(-(f - hyperHit) / 3) : 0) + (f >= superHit ? 0.35 * Math.exp(-(f - superHit) / 3) : 0),
  }, 0.4);
  const cam = { ...s.cam, pos: v(s.cam.pos, shake(f, shk)) };
  s.cam = cam;
  return (
    <>
      <Bg s={s} />
      <Sprite cam={cam} model="ship" center={ship} dir={[1, 0, -0.3]} length={150} waterline />
      {f < hyperHit && hq > 0 && <Sprite cam={cam} model="missile" center={hC} dir={hDir} length={L_HYP * 2.2} glow="rgba(255,61,154,0.9)" />}
      {f < superHit && sq > 0 && <Sprite cam={cam} model="missile_cool" center={sC} dir={sDir} length={L_SUP * 2.2} />}
      <Fx s={s} />
      <Svg>
        <Lock cam={cam} at={v(ship, [0, 16, 0])} size={70} f={f} p={prog(f, 0, 12) * (1 - prog(f, hyperHit - 4, hyperHit))} color="#ff5a3c" tag={shipTag} side="l" />
        <Lock cam={cam} at={[0, 22, 0]} size={20} f={f} p={prog(f, hyperHit + 2, hyperHit + 12)} color={HYP} tag="HYPERSONIC · 1st" side="l" />
        <Lock cam={cam} at={[-6, 12, -4]} size={20} f={f} p={prog(f, superHit + 4, superHit + 14)} color={SUP} tag="SUPERSONIC · 2nd" />
      </Svg>
      <Big text="HIT!" f={f} at={superHit} until={dur + 20} y={600} size={200} color="#ffc233" />
      <Illus />
    </>
  );
};

// ---------------------------------------------------------------- 8. OUTRO
export const H5Outro: React.FC = () => {
  const { f, W, T } = useS("outro");
  const camFn: CamFn = (fr) => { const a = 0.75 + fr * 0.0022; return { pos: [Math.sin(a) * -330, 30, -Math.cos(a) * 330], target: [0, 14, 0], fov: 0.42 }; };
  const s = look(T, camFn, f, { ship: { pos: [0, 0, 0], yaw: 0, damage: 0.9, fire: 1, sink: 0 }, ex0: { pos: [0, 14, 0], age: 3 + f / FPS, size: 1.3 }, ex1: { pos: [-6, 9, -4], age: 2.5 + f / FPS, size: 1.6 } }, 0.3);
  const row = (y: number, rank: string, name: string, mach: string, col: string, p: number, frac: number) => (
    <div style={{ position: "absolute", left: 54, top: y, width: 972, opacity: p, transform: `translateX(${(1 - ease(p)) * -60}px)`, fontFamily: "Inter", textShadow: "0 3px 0 rgba(0,0,0,0.3), 0 4px 18px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontWeight: 900, fontSize: 56, color: "#ffc233", transform: "scaleX(0.82)" }}>{rank}</span>
        <span style={{ fontWeight: 900, fontSize: 80, color: "#fff", transform: "scaleX(0.8)", transformOrigin: "left", letterSpacing: -1 }}>{name}</span>
        <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 60, color: ICE, transform: "scaleX(0.82)", WebkitTextStroke: "2px rgba(10,40,70,0.5)" }}>{mach}</span>
      </div>
      <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.3)" }}>
        <div style={{ width: `${frac * ease(clamp01(p)) * 100}%`, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${col}, #ff5a1f)` }} />
      </div>
    </div>
  );
  return (
    <>
      <Bg s={s} />
      <Sprite cam={s.cam} model="ship" center={[0, 0, 0]} dir={[1, 0, -0.3]} length={150} waterline filter="brightness(0.85) saturate(0.8)" />
      <Fx s={s} />
      {row(380, "#2", "SUPERSONIC", "MACH 1–5", SUP, prog(f, W(12, 0) - 2, W(12, 0) + 10), 0.5)}
      {row(560, "#1", "HYPERSONIC", "MACH 5+", HYP, prog(f, W(12, 3) - 2, W(12, 3) + 10), 1)}
      <Illus />
    </>
  );
};

export const SCENES_H5: Record<string, React.FC> = { cold: H5Cold, pause: H5Pause, mach: H5Mach, supersonic: H5Super, hypersonic: H5Hyper, radar: H5Radar, time: H5Time, strike: H5Strike, outro: H5Outro };
void TEAL;
