import React from "react";
import { useCurrentFrame } from "remotion";
import { useTL } from "../v2/ctx";
import { useTheme } from "../theme";
import { Cam, V3, camAt, prog, lerp, clamp01, project, path, BASE_CAM } from "../engine";
import { C, Jet, Trail, Label, SEA, GEAR_H } from "../world";
import { IndianFlag } from "../ui";
import { Ocean, SkyHorizon, Keyword, Tag, Stage, shakeCam, SpeedLines, FocusBrackets } from "../v2/fx";
import { TargetShip, CruiseMissile, GlideVehicle, MachCone, BoomRing, Explosion, Coast, Launcher, DECK } from "./models";

const FPS = 30;
const useS = (id: string) => {
  const timeline = useTL();
  const sc = timeline.scenes.find((s) => s.id === id)!;
  const f = useCurrentFrame();
  const s0 = Math.round(sc.start * FPS);
  const Ls = (i: number) => Math.round(timeline.lines[i].t0 * FPS) - s0;
  const Le = (i: number) => Math.round(timeline.lines[i].t1 * FPS) - s0;
  const W = (i: number, j: number) => Math.round(timeline.lines[i].words[Math.min(j, timeline.lines[i].words.length - 1)].t0 * FPS) - s0;
  const dur = Math.round((sc.end - sc.start) * FPS);
  return { f, Ls, Le, W, dur, timeline };
};
const cam0 = (c: Partial<Cam>): Cam => ({ ...BASE_CAM, ...c });
const SHIP: V3 = [0, 0, 0];
const SHIP_C: V3 = [0, 60, DECK];
const JS = 2.1;

// ======================= 0. COLD OPEN =======================
export const HCold: React.FC = () => {
  const { f, Ls, W, dur, timeline } = useS("cold");
  const kw = (timeline as unknown as { coldKeyword?: string }).coldKeyword ?? "SUPERSONIC\nVS\nHYPERSONIC?";
  const pass = Ls(0) + Math.round((timeline.lines[0].t1 - timeline.lines[0].t0) * FPS) - 6; // jet over the ship on "Tejas!"
  const jy = 60 + (pass - f) * 4.2;
  const jet: V3 = [28, jy, DECK + 42];
  const rise = prog(f, Ls(1), Ls(1) + 40);
  const cam = cam0({ tx: lerp(0, 0, rise), ty: lerp(60, 70, rise), tz: lerp(DECK + 8, DECK, rise), yaw: lerp(-90, -62, rise), pitch: lerp(84, 58, rise), zoom: lerp(4.6, 3.0, rise), F: lerp(480, 1100, rise), ...shakeCam(f, 6 * Math.exp(-Math.abs(f - pass) / 5)) });
  const trail = Array.from({ length: 14 }, (_, i) => [28, jy + (13 - i) * 6, DECK + 42] as V3);
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <TargetShip cam={cam} origin={SHIP} st={{ t: f }} />
      <Trail cam={cam} pts={trail} width={5} color="#ffffff" opacity={0.5} />
      <Jet cam={cam} pos={jet} heading={180} bank={-10} scale={JS} volume exhaust={0.9} t={f} />
      <SpeedLines f={f} amt={f < pass + 6 ? 0.8 : 0} dir={180} seed={21} />
      <Label cam={cam} anchor={[0, 92, DECK + 1]} dx={-60} dy={-200} text="TARGET SHIP" color="#ffd166" p={prog(f, 8, 22) * (1 - rise)} />
      <Keyword text={kw} f={f} at={W(1, 5) - 2} until={dur + 20} y={420} size={86} />
    </Stage>
  );
};

// ======================= wavefront diagram (sound -> Mach 1 -> supersonic) =======================
const WaveDiagram: React.FC<{ f: number; speed: (fr: number) => number; v0?: number; title?: string }> = ({ f, speed }) => {
  const th = useTheme();
  const c = 7; // px per frame = speed of sound
  // integrate source position
  let x = 0; const xs: number[] = [];
  for (let k = 0; k <= f; k++) { xs.push(x); x += speed(k) * c; }
  const srcX = xs[f];
  const SX = 640, SY = 820;
  const waves: React.ReactNode[] = [];
  for (let e = f - (f % 6); e >= 0 && f - e < 130; e -= 6) {
    const r = (f - e) * c;
    const cx = SX + (xs[e] - srcX);
    waves.push(<circle key={e} cx={cx} cy={SY} r={r} fill="none" stroke="#ffffff" strokeWidth={3} strokeOpacity={Math.max(0, 0.85 - (f - e) / 150)} />);
  }
  const m = speed(f);
  const kmh = Math.round(m * 1235);
  return (
    <g>
      <defs>
        <linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={th.sky[0]} /><stop offset="1" stopColor={th.sky[2]} /></linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#wsky)" />
      <rect y={1000} width={1080} height={920} fill={th.seaGrad[1]} />
      <g clipPath="url(#wclip)">{waves}</g>
      <defs><clipPath id="wclip"><rect x={0} y={330} width={1080} height={940} /></clipPath></defs>
      {/* source: small jet silhouette pointing right */}
      <g transform={`translate(${SX - 60},${SY}) scale(1.2)`}>
        <path d="M100 1 L90 -1.5 L80 -4.5 L70 -6 L60 -4 L30 -4 L20 -4 L8 -24 L2 -24 L0 -4 L-2 -2 L-2 3 L20 4.5 L58 4.5 L66 6.5 L84 3.5 Z" fill="#f2f5f9" stroke="#2a3442" strokeWidth={1.5} />
      </g>
      <g transform="translate(540,1170)">
        <rect x={-330} y={-50} width={660} height={100} rx={18} fill="rgba(7,11,18,0.78)" />
        <text x={-300} y={14} fill="#9fe2ff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={38}>MACH {m.toFixed(1)}</text>
        <text x={300} y={14} textAnchor="end" fill="#ffffff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={38}>{kmh.toLocaleString("en-IN")} km/h</text>
        <rect x={-300} y={30} width={600} height={6} rx={3} fill="rgba(255,255,255,0.15)" />
        <rect x={-300} y={30} width={600 * clamp01(m / 5)} height={6} rx={3} fill={m >= 1 ? "#ffd166" : C.cyan} />
      </g>
    </g>
  );
};

// ======================= 1. MACH =======================
export const HMach: React.FC = () => {
  const { f, W, dur } = useS("mach");
  const a = W(2, 3), b = W(2, 14);
  const speed = (k: number) => (k < a ? 0 : k < b ? 0.6 * prog(k, a, a + 40) : lerp(0.6, 1.0, prog(k, b, b + 20)));
  return (
    <Stage dur={dur}>
      <WaveDiagram f={f} speed={speed} />
      <Keyword text={"SPEED OF\nSOUND"} f={f} at={a} until={b - 4} y={470} size={86} />
      <Keyword text={"MACH 1\n≈ 1,200 km/h"} f={f} at={b + 2} until={dur + 20} y={470} size={80} color="#ffd166" />
      <FocusBrackets at={[700, 820]} f={f} from={b + 4} to={dur} size={120} color="#ffd166" />
    </Stage>
  );
};

// ======================= 2. SUPERSONIC =======================
export const HSuper: React.FC = () => {
  const { f, Ls, W, dur } = useS("supersonic");
  const c1 = Ls(4) - 3, c2 = Ls(5) - 3;
  if (f < c1) {
    const speed = (k: number) => lerp(1.0, 2.6, prog(k, 4, c1 - 10));
    return (
      <Stage dur={dur} exit="cut">
        <WaveDiagram f={f} speed={speed} />
        <Keyword text={"SUPERSONIC\nMACH 1 – 5"} f={f} at={W(3, 7) - 2} until={c1 + 10} y={470} size={84} color="#ffd166" />
        <Label at={[470, 760]} dx={-150} dy={-160} text="SHOCK CONE" color="#ffd166" p={prog(f, W(3, 14), W(3, 14) + 12)} />
      </Stage>
    );
  }
  // 3D: sea-skimming cruise missile, side tracking, then pull back to show the shock cone + sonic boom
  const g = f - c1;
  const y = -200 + g * 34;
  const nose: V3 = [0, y, SEA + 14];
  const dir: V3 = [0, 1, 0];
  const pull = prog(f, c2, c2 + 30);
  const boomF = W(5, 17);
  const cam = cam0({ tx: 0, ty: y - 12 + pull * 40, tz: SEA + 14, yaw: -90, pitch: lerp(84, 72, pull), zoom: lerp(9, 4.4, pull), F: 420, ...shakeCam(f, f >= boomF ? 10 * Math.exp(-(f - boomF) / 6) : 0) });
  const trail = Array.from({ length: 18 }, (_, i) => [0, y - 22 - (17 - i) * 14, SEA + 14] as V3);
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <BoomRing cam={cam} at={[0, y - 40, SEA]} age={f - boomF} />
      <Trail cam={cam} pts={trail} width={8} color="#ffffff" opacity={0.45} />
      <MachCone cam={cam} nose={nose} dir={dir} mach={2.8} amt={prog(f, Ls(5), Ls(5) + 10) * 0.9 + 0.1} />
      <CruiseMissile cam={cam} nose={nose} dir={dir} t={f} />
      <SpeedLines f={f} amt={0.9} dir={180} seed={22} />
      <Tag text="BrahMos · SUPERSONIC · ≈ MACH 2.8" x={48} y={1180} p={prog(f, c1 + 6, c1 + 16) * (1 - prog(f, c2, c2 + 8))} />
      <Label cam={cam} anchor={[0, y - 30, SEA + 22]} dx={90} dy={-230} text="SHOCK WAVE" color="#ffffff"  p={prog(f, W(5, 8) - 2, W(5, 8) + 12)} />
      <Keyword text="SONIC BOOM!" f={f} at={boomF - 1} until={dur + 20} y={470} size={88} color="#ffd166" wobble />
    </Stage>
  );
};

// ======================= 3. HYPERSONIC =======================
export const HHyper: React.FC = () => {
  const { f, Ls, W, dur } = useS("hypersonic");
  const c1 = Ls(7) - 3, c2 = Ls(8) - 3, c3 = Ls(9) - 3;
  if (f < c2) {
    // glide vehicle streaking down through the sky; close-up glow on line 7
    const close = f >= c1;
    const y = -300 + f * 50;
    const z = 900 - f * 6;
    const nose: V3 = [0, y, z];
    const dir: V3 = [0, 1, -0.12];
    const cam = close
      ? cam0({ tx: 0, ty: y - 9, tz: z, yaw: -90, pitch: 86, zoom: 14, F: 300 })
      : cam0({ tx: 0, ty: y - 60, tz: z - 30, yaw: -90, pitch: 87, zoom: 2.6, F: 900 });
    const trail = Array.from({ length: 22 }, (_, i) => [0, y - 20 - (21 - i) * 22, z + (21 - i) * 2.6] as V3);
    const bars = prog(f, W(6, 7) - 2, W(6, 7) + 14);
    return (
      <Stage dur={dur} exit={close ? "cut" : "zoom"} enter="zoom">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={close ? 3 : 0} />
        <Trail cam={cam} pts={trail} width={close ? 30 : 10} color="#ff8a4c" opacity={0.75} />
        <GlideVehicle cam={cam} nose={nose} dir={dir} heat={close ? 1 : 0.85} t={f} />
        <SpeedLines f={f} amt={1} dir={180} seed={23} />
        {!close && <Keyword text={"HYPERSONIC\nMACH 5+"} f={f} at={W(6, 2) - 2} until={c1} y={470} size={86} color="#ff8a4c" />}
        {!close && bars > 0 && (
          <g transform="translate(90,1040)" opacity={bars}>
            {[["SOUND", 1, "#cfd8e3"], ["BRAHMOS", 2.8, "#ffd166"], ["HYPERSONIC", 5.6, "#ff8a4c"]].map(([lab, m, col], i) => (
              <g key={i} transform={`translate(0,${i * 64})`}>
                <text x={0} y={30} fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={26}>{lab as string}</text>
                <rect x={250} y={8} width={640 * clamp01(bars * 1.2) * ((m as number) / 6)} height={30} rx={15} fill={col as string} />
                <text x={260 + 640 * clamp01(bars * 1.2) * ((m as number) / 6)} y={32} fill="#fff" fontFamily="JetBrains Mono" fontSize={24}>{i === 2 ? "MACH 5+" : `MACH ${m}`}</text>
              </g>
            ))}
          </g>
        )}
        {close && <Label at={[540, 900]} dx={60} dy={-300} text="SUPER-HEATED AIR GLOWS" color="#ffd166" p={prog(f, W(7, 12) - 4, W(7, 12) + 10)} />}
      </Stage>
    );
  }
  if (f < c3) {
    // top-down: predictable straight line vs weaving glide path
    const g = f - c2;
    const L = c3 - c2;
    const u = clamp01(g / L);
    const yAt = (q: number) => -350 + q * 700;
    const xAt = (q: number) => Math.sin(q * Math.PI * 2.5) * 120 * prog(f, W(8, 9) - 2, W(8, 9) + 20);
    const nose: V3 = [xAt(u), yAt(u), SEA + 60];
    const ahead: V3 = [xAt(u + 0.01), yAt(u + 0.01), SEA + 60];
    const cam = cam0({ tx: 0, ty: 0, tz: SEA, yaw: 0, pitch: 6, zoom: 1.0, F: 3000 });
    const pathPts = Array.from({ length: 60 }, (_, i) => { const q = (i / 59) * u; return [xAt(q), yAt(q), SEA + 60] as V3; });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <Ocean cam={cam} t={f} />
        <path d={path(cam, [[0, -350, SEA + 60], [0, 380, SEA + 60]])} stroke="#ffffff" strokeWidth={5} strokeDasharray="18 16" opacity={prog(f, W(8, 4) - 4, W(8, 4) + 8) * 0.8} />
        <path d={path(cam, pathPts)} stroke="#ff8a4c" strokeWidth={16} fill="none" filter="url(#glow)" />
        <GlideVehicle cam={cam} nose={ahead} dir={[ahead[0] - nose[0], ahead[1] - nose[1], 0]} len={70} span={36} heat={1} t={f} />
        <Label at={project(cam, [0, 200, SEA + 60])} dx={60} dy={-120} text="EXPECTED PATH" color="#ffffff" p={prog(f, W(8, 4), W(8, 4) + 12)} />
        <Keyword text={"HARD TO\nSTOP"} f={f} at={W(8, 14) - 2} until={L + 20} y={470} size={96} color="#ff8a4c" />
      </Stage>
    );
  }
  // India's LRAShM-type shore launcher
  const g = f - c3;
  const cam = camAt(g, { tx: -650, ty: 60, tz: SEA + 6, yaw: -40, pitch: 70, zoom: 7, F: 500 }, [{ f: 0 }, { f: dur - c3, zoom: 8.5, yaw: -50 }]);
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <Coast cam={cam} x0={-700} />
      <Launcher cam={cam} at={[-650, 60, SEA + 2]} elev={lerp(0, 55, prog(g, 6, 40))} fired={0} t={f} />
      <Tag text="INDIA · LRAShM · 1st flight test NOV 2024 (DRDO)" x={48} y={1180} p={prog(g, 6, 16)} />
      <Label cam={cam} anchor={[-650, 66, SEA + 9]} dx={-40} dy={-250} text="HYPERSONIC MISSILE" color="#ff8a4c" p={prog(g, 14, 28)} />
    </Stage>
  );
};

// ======================= 4. ATTACK =======================
export const HAttack: React.FC = () => {
  const { f, Ls, Le, W, dur } = useS("attack");
  const c1 = Ls(11) - 3, c2 = Ls(12) - 3;
  const hyperHit = Le(12) - 4, superHit = W(13, 1);
  const c3 = hyperHit - 26; // cut to the 3D impact shot
  if (f < c1) {
    // Tejas releases the supersonic missile
    const rel = W(10, 6);
    const jet: V3 = [0, f * 9, SEA + 60];
    const tt = Math.max(0, f - rel);
    const m: V3 = [0, jet[1] + 9 + tt * tt * 0.9, SEA + 60 - 4 - Math.min(tt, 8) * 0.8];
    const cam = cam0({ tx: 0, ty: jet[1] + 10 + Math.min(tt, 30) * 2, tz: SEA + 58, yaw: -64, pitch: 80, zoom: 9, F: 420 });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Jet cam={cam} pos={jet} scale={JS} volume exhaust={1} t={f} />
        {f >= rel - 2 ? <CruiseMissile cam={cam} nose={[m[0], m[1] + 7, m[2]]} dir={[0, 1, 0]} len={14} diam={1.1} burn={clamp01(tt / 6)} t={f} /> : null}
        <SpeedLines f={f} amt={0.6} dir={180} seed={24} />
        <Tag text="BrahMos-NG for Tejas · PLANNED (in development)" x={48} y={1180} p={prog(f, 4, 14)} />
      </Stage>
    );
  }
  if (f < c2) {
    // shore launcher fires the hypersonic missile
    const g = f - c1;
    const fire = Math.max(0, g - 6);
    const up: V3 = [-650, 60 + fire * fire * 0.25, SEA + 14 + fire * fire * 0.8];
    const follow = clamp01(fire / 14);
    const cam = cam0({ tx: -650, ty: lerp(70, up[1] - 10, follow), tz: lerp(SEA + 14, up[2] - 8, follow), yaw: -40, pitch: lerp(76, 82, follow), zoom: lerp(6.5, 5.0, follow), F: 520, ...shakeCam(f, g > 6 ? 5 * Math.exp(-(g - 6) / 10) : 0) });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Coast cam={cam} x0={-700} />
        <Launcher cam={cam} at={[-650, 60, SEA + 2]} elev={55} fired={clamp01(fire / 40)} t={f} />
        {g > 6 && <GlideVehicle cam={cam} nose={up} dir={[0, 0.3, 1]} len={14} span={5} heat={clamp01(fire / 15)} t={f} />}
        {g > 6 && <Trail cam={cam} pts={Array.from({ length: 12 }, (_, i) => { const q = Math.max(0, fire - (11 - i) * 1.5); return [-650, 60 + q * q * 0.25, SEA + 10 + q * q * 0.8] as V3; })} width={14} color="#ffb347" opacity={0.8} />}
      </Stage>
    );
  }
  if (f < c3) {
    // race: same distance, hypersonic gets there first
    const g = f - c2, L = c3 - c2;
    const ps = clamp01(g / (L * 2.4)), ph = clamp01(g / L);
    const row = (y: number, p: number, lab: string, col: string, glow: boolean) => (
      <g transform={`translate(80,${y})`}>
        <text x={0} y={-24} fill="#fff" fontFamily="Inter" fontWeight={700} fontSize={34}>{lab}</text>
        <rect x={0} y={0} width={920} height={14} rx={7} fill="rgba(255,255,255,0.2)" />
        <rect x={0} y={0} width={920 * p} height={14} rx={7} fill={col} filter={glow ? "url(#glow)" : undefined} />
        <circle cx={920} cy={7} r={26} fill="#e8453c" stroke="#fff" strokeWidth={5} />
        <circle cx={920} cy={7} r={10} fill="#fff" />
      </g>
    );
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <rect width={1080} height={1920} fill="#0e2a44" />
        <Keyword text={"SAME TARGET\nSAME DISTANCE"} f={g} at={0} until={L + 10} y={480} size={74} />
        {row(800, ps, "SUPERSONIC  ·  ≈ MACH 3", "#ffd166", false)}
        {row(980, ph, "HYPERSONIC  ·  MACH 5+", "#ff8a4c", true)}
        <SpeedLines f={f} amt={0.5} dir={0} seed={25} />
      </Stage>
    );
  }
  // impact shot: hypersonic dives onto the bow, then the supersonic missile hits amidships on "HIT!"
  const camI = cam0({ tx: 0, ty: 64, tz: DECK, yaw: -64, pitch: 70, zoom: 3.1, F: 900, ...shakeCam(f, (f >= hyperHit ? 7 * Math.exp(-(f - hyperHit) / 6) : 0) + (f >= superHit ? 14 * Math.exp(-(f - superHit) / 7) : 0)) });
  const hNose: V3 = f < hyperHit ? [-(hyperHit - f) * 14, 92, DECK + 1 + (hyperHit - f) * 22] : [0, 92, DECK + 1];
  const sNose: V3 = f < superHit ? [7.5 + (superHit - f) * 16, 52, DECK + 2] : [7.5, 52, DECK + 2];
  return (
    <Stage dur={dur} enter="cut" exit="cut" flash={f >= superHit ? 0.5 * Math.exp(-(f - superHit) / 3) : 0}>
      <SkyHorizon cam={camI} />
      <Ocean cam={camI} t={f} />
      <TargetShip cam={camI} origin={SHIP} st={{ t: f, hit1: prog(f, hyperHit, hyperHit + 8), hit2: prog(f, superHit, superHit + 8) }} />
      {f < hyperHit && <Trail cam={camI} pts={Array.from({ length: 12 }, (_, i) => { const k = hyperHit - f + (11 - i) * 2; return [-k * 14, 92, DECK + 1 + k * 22] as V3; })} width={12} color="#ff8a4c" opacity={0.8} />}
      {f < hyperHit && <GlideVehicle cam={camI} nose={hNose} dir={[14, 0, -22]} len={14} span={6} heat={1} t={f} />}
      {f < superHit && f > superHit - 40 && <CruiseMissile cam={camI} nose={sNose} dir={[-1, 0, 0]} len={12} diam={1.2} t={f} />}
      <Explosion cam={camI} at={[0, 92, DECK + 1]} age={f - hyperHit} size={0.9} />
      <Explosion cam={camI} at={[6, 52, DECK + 2]} age={f - superHit} size={1.4} />
      <Keyword text="HIT!" f={f} at={superHit} until={dur + 20} y={470} size={150} color="#ffd166" wobble />
    </Stage>
  );
};

// ======================= 5. OUTRO =======================
export const HOutro: React.FC = () => {
  const { f, Ls, W, dur } = useS("outro");
  const c1 = Ls(15) - 3;
  if (f < c1) {
    const cam = camAt(f, { tx: 0, ty: 64, tz: DECK, yaw: -64, pitch: 70, zoom: 3.1, F: 900 }, [{ f: 0 }, { f: c1, zoom: 1.6, pitch: 64, yaw: -40 }]);
    const card = (y: number, t1: string, t2: string, col: string, p: number) => (
      <g opacity={p} transform={`translate(${(1 - p) * -40},0)`}>
        <rect x={60} y={y} width={960} height={120} rx={20} fill="rgba(7,11,18,0.82)" stroke={col} strokeWidth={3} />
        <text x={100} y={y + 76} fill={col} fontFamily="Unbounded" fontWeight={800} fontSize={46}>{t1}</text>
        <text x={980} y={y + 76} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={40}>{t2}</text>
      </g>
    );
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <TargetShip cam={cam} origin={SHIP} st={{ t: f, hit1: 1, hit2: 1, sink: prog(f, 0, c1 + 60) * 0.7 }} />
        {card(420, "SUPERSONIC", "MACH 1–5", "#ffd166", prog(f, W(14, 0) - 2, W(14, 0) + 10))}
        {card(570, "HYPERSONIC", "MACH 5+", "#ff8a4c", prog(f, W(14, 4) - 2, W(14, 4) + 10))}
      </Stage>
    );
  }
  const g = f - c1;
  const cam = camAt(g, { tx: 0, ty: 80, tz: 0, yaw: -30, pitch: 83.5, zoom: 1.2, F: 1500, cy: 940 }, [{ f: 0 }, { f: dur - c1, zoom: 1.35 }]);
  const flag = prog(g, 2, 22), title = prog(g, 8, 22);
  return (
    <Stage dur={dur} enter="fade" exit="cut">
      <SkyHorizon cam={cam} warm={1} />
      <Ocean cam={cam} t={f} />
      <TargetShip cam={cam} origin={SHIP} st={{ t: f, hit1: 1, hit2: 1, sink: 0.85 }} />
      <g opacity={flag} transform={`translate(0,${(1 - flag) * 40})`}><IndianFlag x={350} y={380} w={380} t={f} /></g>
      <g opacity={title}>
        <text x={540} y={1060} textAnchor="middle" fill="#f2f5f9" fontFamily="Unbounded" fontWeight={800} fontSize={84} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.6)", strokeWidth: 8 }}>MINDSET MODE</text>
        <rect x={540 - 170 * title} y={1086} width={340 * title} height={4} fill={C.saffron} />
        <text x={540} y={1140} textAnchor="middle" fill="rgba(235,242,250,0.85)" fontFamily="JetBrains Mono" fontWeight={600} fontSize={30} letterSpacing={6}>EXPLAINERS · FOLLOW</text>
      </g>
    </Stage>
  );
};

export const SCENES_H: Record<string, React.FC> = { cold: HCold, mach: HMach, supersonic: HSuper, hypersonic: HHyper, attack: HAttack, outro: HOutro };
export { GEAR_H };
