// Reel 2 v2: Tejas fires a SUPERSONIC and a HYPERSONIC missile at one target; the race freezes,
// the difference is explained (chase cams, radar screen, travel time), the race resumes, both hit.
// Night / moonlight look inspired by the user's reference videos.
import React from "react";
import { useCurrentFrame } from "remotion";
import { useTL, useSceneX } from "../v2/ctx";
import { useTheme } from "../theme";
import { Cam, V3, camAt, prog, lerp, clamp01, project, BASE_CAM, ease } from "../engine";
import { C, Jet, Trail, Label, SEA } from "../world";
import { IndianFlag } from "../ui";
import { Ocean, SkyHorizon, Keyword, Tag, Stage, shakeCam, SpeedLines, horizonY } from "../v2/fx";
import { TargetShip, CruiseMissile, GlideVehicle, MachCone, BoomRing, Explosion, DECK } from "../hyper/models";
import { WaveDiagram } from "../hyper/scenes_h";

const FPS = 30;
const SUP = "#ffd166", HYP = "#ff6fb0";
const useS = (id: string) => {
  const timeline = useTL();
  const sc = timeline.scenes.find((s) => s.id === id)!;
  const f = useCurrentFrame() - useSceneX().shift;
  const s0 = Math.round(sc.start * FPS);
  const Ls = (i: number) => Math.round(timeline.lines[i].t0 * FPS) - s0;
  const Le = (i: number) => Math.round(timeline.lines[i].t1 * FPS) - s0;
  const W = (i: number, j: number) => Math.round(timeline.lines[i].words[Math.min(j, timeline.lines[i].words.length - 1)].t0 * FPS) - s0;
  const dur = Math.round((sc.end - sc.start) * FPS);
  return { f, Ls, Le, W, dur, s0 };
};
const cam0 = (c: Partial<Cam>): Cam => ({ ...BASE_CAM, ...c });
const JS = 2.1;

/** moon + moonlight path on the water (screen space, follows the horizon) */
const Moon: React.FC<{ cam: Cam; x?: number }> = ({ cam, x = 800 }) => {
  const fr = useCurrentFrame();
  const hy = horizonY(cam);
  if (!(hy > 0) || hy > 1900) return null;
  const my = hy - Math.min(320, Math.max(90, hy - 140));
  const showDisc = hy > 200;
  const glints = Array.from({ length: 34 }, (_, i) => {
    const d = (i + 0.5) / 34;
    const y = hy + 8 + Math.pow(d, 1.6) * (1920 - hy);
    const spread = 18 + d * 200;
    const w = 14 + d * 70 * (0.5 + 0.5 * Math.sin(i * 7.1 + fr * 0.21));
    const xo = Math.sin(i * 12.9898 + fr * 0.13) * spread * 0.55;
    return { x: x + xo - w / 2, y, w, o: (1 - d) * 0.5 * (0.55 + 0.45 * Math.sin(i * 3.3 + fr * 0.35)) };
  });
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <defs>
        <radialGradient id="moonglow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#e8f0ff" stopOpacity={0.55} /><stop offset="1" stopColor="#e8f0ff" stopOpacity={0} /></radialGradient>
        <linearGradient id="moonpath" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe9ff" stopOpacity={0.45} /><stop offset="1" stopColor="#dfe9ff" stopOpacity={0} /></linearGradient>
      </defs>
      {showDisc && <circle cx={x} cy={my} r={160} fill="url(#moonglow)" />}
      {showDisc && <circle cx={x} cy={my} r={34} fill="#f4f7ff" />}
      <path d={`M${x - 20} ${hy} L${x + 20} ${hy} L${x + 150} 1920 L${x - 150} 1920 Z`} fill="url(#moonpath)" opacity={0.28} />
      {glints.map((g, i) => <rect key={i} x={g.x} y={g.y} width={g.w} height={2 + (g.y - hy) / 260} rx={2} fill="#eef4ff" opacity={g.o} />)}
    </g>
  );
};

/** R2-style title card: name, Mach range, speed bar */
const TitleCard: React.FC<{ f: number; at: number; name: string; mach: string; sub?: string; color: string; bar: number; flag?: boolean }> = ({ f, at, name, mach, sub, color, bar, flag }) => {
  const p = prog(f, at, at + 8);
  if (p <= 0) return null;
  const bp = prog(f, at + 6, at + 26);
  return (
    <g opacity={p} transform={`translate(${(1 - p) * -60},0)`}>
      <text x={60} y={402} fill="rgba(255,255,255,0.75)" fontFamily="JetBrains Mono" fontWeight={600} fontSize={26} letterSpacing={4}>MISSILE TYPE</text>
      <text x={60} y={486} fill={color} fontFamily="Unbounded" fontWeight={800} fontSize={74} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.7)", strokeWidth: 8 }}>{name}</text>
      <text x={60} y={556} fill="#7fdcff" fontFamily="Inter" fontWeight={700} fontSize={50} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.7)", strokeWidth: 6 }}>{mach}</text>
      {sub && <text x={60} y={604} fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={26}>{sub}</text>}
      {flag && <IndianFlag x={sub ? 60 + sub.length * 15.6 + 24 : 340} y={582} w={36} t={f} amp={0.4} pole={false} />}
      <rect x={60} y={626} width={520} height={10} rx={5} fill="rgba(255,255,255,0.18)" />
      <rect x={60} y={626} width={520 * bar * bp} height={10} rx={5} fill={color} />
    </g>
  );
};

// shared race geometry: launch at y=-5000, target ship at y=0..121 (bow toward the launch point is the stern... ship faces +y)
const raceSup = (t: number): V3 => [-6, -4800 + t * 950, SEA + 160 - Math.min(t, 4) * 30];
const raceHyp = (t: number): V3 => [6, -4800 + t * 1800, SEA + 160 + Math.min(t, 1.5) * 120];

// ======================= 0. COLD OPEN: twin launch =======================
export const H2Cold: React.FC = () => {
  const { f, Ls, W, dur } = useS("cold");
  const rel = W(0, 5);
  const jet: V3 = [0, -5000 + f * 7, SEA + 170];
  const tt = (f - rel) / FPS;
  const drop = Math.min(Math.max(0, tt), 0.35);
  const mount = (sx: number): V3 => [jet[0] + sx * 4.2, jet[1] - 2, jet[2] - 1.8 - drop * drop * 30];
  const supP: V3 = tt <= 0.35 ? mount(-1) : [jet[0] - 4.2, jet[1] - 2 + Math.pow(tt - 0.35, 2) * 260, jet[2] - 5.5];
  const hypP: V3 = tt <= 0.35 ? mount(1) : [jet[0] + 4.2, jet[1] - 2 + Math.pow(tt - 0.35, 2) * 330, jet[2] - 5.5 + (tt - 0.35) * 8];
  const wide = prog(f, Ls(1) - 4, Ls(1) + 30);
  // after release the camera chases the missiles (rides just behind the slower supersonic one)
  const chase = clamp01((tt - 0.25) / 0.9);
  const chaseY = lerp(jet[1] + 14 + Math.max(0, tt) * 60, supP[1] - 34, ease(chase));
  const cam = cam0({
    tx: lerp(jet[0] + 2, 0, wide), ty: lerp(chaseY, jet[1] + 600, wide), tz: lerp(lerp(jet[2], supP[2] + 3, chase), SEA + 120, wide),
    yaw: lerp(lerp(-28, -16, chase), -12, wide), pitch: lerp(lerp(80, 84, chase), 86, wide), zoom: lerp(lerp(9, 6, chase), 1.2, wide), F: lerp(380, 1800, wide),
    ...shakeCam(f, tt > 0.3 && tt < 1.2 ? 4 : 0),
  });
  const sTrail = Array.from({ length: 14 }, (_, i) => { const q = Math.max(0.36, tt - (13 - i) * 0.05); return [jet[0] - 4.2, jet[1] - 2 + Math.pow(q - 0.35, 2) * 260, jet[2] - 5.5] as V3; });
  const hTrail = Array.from({ length: 14 }, (_, i) => { const q = Math.max(0.36, tt - (13 - i) * 0.05); return [jet[0] + 4.2, jet[1] - 2 + Math.pow(q - 0.35, 2) * 330, jet[2] - 5.5 + (q - 0.35) * 8] as V3; });
  return (
    <Stage dur={dur} enter="cut" exit="cut">
      <SkyHorizon cam={cam} />
      <Moon cam={cam} />
      <Ocean cam={cam} t={f} />
      <TargetShip cam={cam} origin={[0, 0, 0]} st={{ t: f }} />
      {tt > 0.36 && <Trail cam={cam} pts={sTrail} width={10} color="#ffffff" opacity={0.6} />}
      {tt > 0.36 && <Trail cam={cam} pts={hTrail} width={12} color={HYP} opacity={0.8} />}
      <Jet cam={cam} pos={jet} scale={JS} volume exhaust={1} t={f} />
      <CruiseMissile cam={cam} nose={[supP[0], supP[1] + 6, supP[2]]} dir={[0, 1, 0]} len={10} diam={0.9} burn={tt > 0.35 ? 1 : 0} t={f} />
      <GlideVehicle cam={cam} nose={[hypP[0], hypP[1] + 6, hypP[2]]} dir={[0, 1, 0.02]} len={9} span={3.6} heat={clamp01((tt - 0.4) / 0.6)} t={f} />
      <Label cam={cam} anchor={supP} dx={-80} dy={-170} text="SUPERSONIC" color={SUP} p={prog(f, W(0, 7) - 2, W(0, 7) + 10) * (1 - wide)} />
      <Label cam={cam} anchor={hypP} dx={-230} dy={-150} text="HYPERSONIC" color={HYP} p={prog(f, W(0, 10) - 2, W(0, 10) + 10) * (1 - wide)} />
      <SpeedLines f={f} amt={tt > 0.3 ? 0.8 * (1 - wide) : 0} dir={90} seed={31} />
      <Tag text="ILLUSTRATION · Tejas carries no hypersonic missile today" x={48} y={1180} p={prog(f, rel, rel + 10) * (1 - prog(f, Ls(1) + 20, Ls(1) + 30))} color="#c0c8d4" />
      <Label cam={cam} anchor={[0, 60, DECK + 6]} dx={-60} dy={-160} text="TARGET" color="#ff6b5e" p={prog(f, Ls(1) + 24, Ls(1) + 36)} />
      <Keyword text={"KAUN\nPEHLE?"} f={f} at={W(1, 5) - 2} until={dur + 20} y={470} size={104} />
    </Stage>
  );
};

// ======================= 1. PAUSE: the race freezes =======================
export const H2Pause: React.FC = () => {
  const { f, dur } = useS("pause");
  const cam = cam0({ tx: 0, ty: -3600, tz: SEA + 140, yaw: -12, pitch: 85, zoom: 2.2, F: 1200 });
  const t = 1.25; // frozen race moment
  const s = raceSup(t), h = raceHyp(t);
  return (
    <Stage dur={dur} enter="cut" tint={1}>
      <SkyHorizon cam={cam} />
      <Moon cam={cam} />
      <Ocean cam={cam} t={0} />
      <Trail cam={cam} pts={Array.from({ length: 12 }, (_, i) => raceSup(t - (11 - i) * 0.08))} width={8} color="#ffffff" opacity={0.6} />
      <Trail cam={cam} pts={Array.from({ length: 12 }, (_, i) => raceHyp(t - (11 - i) * 0.08))} width={10} color={HYP} opacity={0.8} />
      <CruiseMissile cam={cam} nose={s} dir={[0, 1, 0]} len={12} diam={1} t={0} />
      <GlideVehicle cam={cam} nose={h} dir={[0, 1, 0]} len={11} span={4.5} heat={1} t={0} />
      <Label cam={cam} anchor={s} dx={-60} dy={160} text="SUPERSONIC" color={SUP} p={1} />
      <Label cam={cam} anchor={h} dx={60} dy={-200} text="HYPERSONIC" color={HYP} p={1} />
      <g opacity={prog(f, 0, 4)}>
        <rect width={1080} height={1920} fill="rgba(6,10,18,0.25)" />
        {Array.from({ length: 48 }, (_, i) => <rect key={i} x={0} y={i * 40} width={1080} height={2} fill="rgba(255,255,255,0.035)" />)}
        <g transform="translate(540,760)">
          <rect x={-58} y={-70} width={40} height={140} rx={10} fill="#fff" opacity={0.92} />
          <rect x={18} y={-70} width={40} height={140} rx={10} fill="#fff" opacity={0.92} />
        </g>
      </g>
      <Keyword text="RUKO!" f={f} at={1} until={dur + 20} y={480} size={140} color="#ffffff" wobble />
    </Stage>
  );
};

// ======================= 2. MACH =======================
export const H2Mach: React.FC = () => {
  const { f, Ls, W, dur } = useS("mach");
  const a = Ls(3), b = W(3, 11);
  const speed = (k: number) => (k < a + 4 ? 0 : k < b ? 0.6 * prog(k, a + 4, a + 40) : lerp(0.6, 1.0, prog(k, b, b + 20)));
  return (
    <Stage dur={dur}>
      <WaveDiagram f={f} speed={speed} />
      <Keyword text={"SPEED OF\nSOUND"} f={f} at={a + 4} until={b - 4} y={470} size={86} />
      <Keyword text={"MACH 1\n≈ 1,200 km/h"} f={f} at={b + 2} until={dur + 20} y={470} size={80} color={SUP} />
    </Stage>
  );
};

// ======================= 3. SUPERSONIC: chase cam =======================
export const H2Super: React.FC = () => {
  const { f, Ls, W, dur } = useS("supersonic");
  const y = f * 32;
  const nose: V3 = [0, y, SEA + 18];
  const boom = W(5, 9);
  const side = prog(f, Ls(5) - 4, Ls(5) + 20);
  const cam = cam0({ tx: lerp(-2, 0, side), ty: y - lerp(4, 16, side), tz: SEA + 20, yaw: lerp(-22, -90, side), pitch: lerp(80, 84, side), zoom: lerp(16, 7, side), F: 380, ...shakeCam(f, f >= boom ? 10 * Math.exp(-(f - boom) / 6) : 0) });
  const trail = Array.from({ length: 16 }, (_, i) => [0, y - 12 - (15 - i) * 10, SEA + 18] as V3);
  return (
    <Stage dur={dur}>
      <SkyHorizon cam={cam} />
      <Moon cam={cam} />
      <Ocean cam={cam} t={f} />
      <BoomRing cam={cam} at={[0, y - 30, SEA]} age={f - boom} />
      <Trail cam={cam} pts={trail} width={10} color="#ffffff" opacity={0.5} />
      <MachCone cam={cam} nose={nose} dir={[0, 1, 0]} mach={2.8} amt={side} lenPx={560} />
      <CruiseMissile cam={cam} nose={nose} dir={[0, 1, 0]} len={14} diam={1.2} t={f} />
      <SpeedLines f={f} amt={0.9} dir={90 + side * 90} seed={32} />
      <TitleCard f={f} at={2} name="SUPERSONIC" mach="MACH 1 – 5" sub="e.g. BrahMos ≈ MACH 2.8" color={SUP} bar={0.48} flag />
      <Label cam={cam} anchor={[0, y - 20, SEA + 24]} dx={90} dy={-230} text="SHOCK WAVE" p={prog(f, W(5, 5) - 2, W(5, 5) + 12)} />
      <Keyword text="SONIC BOOM!" f={f} at={boom - 1} until={dur + 20} y={760} size={86} color={SUP} wobble />
    </Stage>
  );
};

// ======================= 4. HYPERSONIC: chase cam + glow close-up =======================
export const H2Hyper: React.FC = () => {
  const { f, Ls, W, dur } = useS("hypersonic");
  const close = f >= Ls(7) - 3;
  const y = f * 60;
  const nose: V3 = [0, y, SEA + 14];
  const cam = close
    ? cam0({ tx: 0, ty: y - 6, tz: SEA + 14, yaw: -90, pitch: 86, zoom: 22, F: 260 })
    : cam0({ tx: -2, ty: y - 5, tz: SEA + 16, yaw: -18, pitch: 80, zoom: 16, F: 380 });
  const trail = Array.from({ length: 20 }, (_, i) => [0, y - 10 - (19 - i) * 14, SEA + 14] as V3);
  return (
    <Stage dur={dur} exit={close ? "zoom" : "zoom"}>
      <SkyHorizon cam={cam} />
      <Moon cam={cam} />
      <Ocean cam={cam} t={f} blur={close ? 3 : 0} />
      <Trail cam={cam} pts={trail} width={close ? 34 : 14} color={HYP} opacity={0.8} />
      <GlideVehicle cam={cam} nose={nose} dir={[0, 1, 0]} len={12} span={5} heat={1} t={f} />
      <SpeedLines f={f} amt={1} dir={close ? 180 : 90} seed={33} />
      {!close && <TitleCard f={f} at={2} name="HYPERSONIC" mach="MACH 5+" sub="5× faster than sound" color={HYP} bar={0.95} />}
      {close && <Label at={[560, 905]} dx={60} dy={-300} text="SUPER-HEATED AIR GLOWS" color={SUP} p={prog(f, W(7, 13) - 4, W(7, 13) + 10)} />}
    </Stage>
  );
};

// ======================= 5. RADAR OPERATOR =======================
export const H2Radar: React.FC = () => {
  const { f, W, dur } = useS("radar");
  const turn = W(8, 20); // "mud"
  const T = (dur + 10) / FPS;
  const ts = f / FPS;
  // time-to-impact from 100 km: Mach 2.8 ≈ 97 s, Mach 5 ≈ 58 s (sea-level speed of sound)
  const supLeft = Math.max(0, 97 - ts * 6), hypLeft = Math.max(0, 58 - ts * 6);
  const R = 290, CX = 540, CY = 760;
  const blip = (dist: number, ang: number) => [CX + Math.sin(ang) * R * dist, CY - Math.cos(ang) * R * dist];
  const sd = clamp01(1 - ts / (T * 2.2)), hd = clamp01(1 - ts / T);
  const weave = f > turn ? Math.sin((f - turn) * 0.25) * 0.35 * prog(f, turn, turn + 10) : 0;
  const [sx, sy] = blip(0.95 * sd + 0.05, -0.5);
  const [hx, hy] = blip(0.95 * hd + 0.05, 0.45 + weave);
  const sweep = (f * 9) % 360;
  return (
    <Stage dur={dur}>
      <rect width={1080} height={1920} fill="#060c14" />
      {/* console frame */}
      <rect x={60} y={420} width={960} height={860} rx={26} fill="#0a1622" stroke="#1f6f8f" strokeWidth={4} />
      <text x={100} y={474} fill="#7fdcff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={28} letterSpacing={4}>SHIP RADAR</text>
      <circle cx={1000 - 40} cy={464} r={10} fill="#ff4d5e" opacity={0.6 + 0.4 * Math.sin(f * 0.5)} />
      <g>
        {[1, 0.66, 0.33].map((r, i) => <circle key={i} cx={CX} cy={CY} r={R * r} fill="none" stroke="#1d6b55" strokeWidth={2} />)}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#1d6b55" strokeWidth={1.5} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#1d6b55" strokeWidth={1.5} />
        <path d={`M${CX} ${CY} L${CX + Math.sin((sweep * Math.PI) / 180) * R} ${CY - Math.cos((sweep * Math.PI) / 180) * R} A ${R} ${R} 0 0 0 ${CX + Math.sin(((sweep - 40) * Math.PI) / 180) * R} ${CY - Math.cos(((sweep - 40) * Math.PI) / 180) * R} Z`} fill="rgba(60,255,160,0.18)" />
        <circle cx={CX} cy={CY} r={10} fill="#7fffc4" />
        <circle cx={sx} cy={sy} r={14} fill={SUP} filter="url(#glow)" />
        <circle cx={hx} cy={hy} r={14} fill={HYP} filter="url(#glow)" opacity={prog(f, 10, 16)} />
        <text x={sx + 22} y={sy + 8} fill={SUP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={24}>SUP</text>
        <text x={hx + 22} y={hy + 8} fill={HYP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={24} opacity={prog(f, 10, 16)}>HYP</text>
        {f > turn && <text x={hx - 70} y={hy - 30} fill={HYP} fontFamily="Inter" fontWeight={700} fontSize={30}>TURNING!</text>}
      </g>
      <g transform="translate(100,1116)">
        <rect x={-20} y={-50} width={920} height={160} rx={18} fill="rgba(10,22,34,0.95)" stroke="#1f6f8f" strokeWidth={2} />
        <text x={0} y={-16} fill="rgba(255,255,255,0.7)" fontFamily="JetBrains Mono" fontSize={24}>TIME TO IMPACT · from 100 km</text>
        <text x={0} y={36} fill={SUP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={40}>SUPERSONIC {supLeft.toFixed(0)} s</text>
        <text x={0} y={90} fill={HYP} fontFamily="JetBrains Mono" fontWeight={600} fontSize={40}>HYPERSONIC ≤{hypLeft.toFixed(0)} s</text>
      </g>
      <Keyword text={"LESS TIME\nTO REACT"} f={f} at={W(8, 11) - 2} until={turn - 6} y={1480} size={64} color="#ffffff" />
    </Stage>
  );
};

// ======================= 6. TRAVEL TIME: Delhi -> Mumbai =======================
export const H2Time: React.FC = () => {
  const { f, W, dur } = useS("time");
  const th = useTheme();
  const go = W(9, 1);
  const k = prog(f, go, dur - 12, (x) => x);
  const supT = 19 * k * 1.0, hypT = Math.min(11, 19 * k);
  const A: [number, number] = [260, 500], B: [number, number] = [780, 960];
  const at = (q: number) => [lerp(A[0], B[0], q), lerp(A[1], B[1], q)];
  const [sx, sy] = at(clamp01(supT / 19)), [hx, hy] = at(clamp01(hypT / 11));
  return (
    <Stage dur={dur}>
      <rect width={1080} height={1920} fill={th.day ? "#0e2a44" : "#081321"} />
      <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="rgba(255,255,255,0.35)" strokeWidth={6} strokeDasharray="16 14" />
      {[[A, "DELHI"], [B, "MUMBAI"]].map(([p, n], i) => (
        <g key={i}>
          <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={22} fill="#fff" />
          <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={38} fill="none" stroke="#fff" strokeWidth={3} opacity={0.5} />
          <text x={(p as number[])[0] + (i ? -40 : 40)} y={(p as number[])[1] + (i ? 80 : -40)} textAnchor={i ? "end" : "start"} fill="#fff" fontFamily="Unbounded" fontWeight={800} fontSize={46}>{n as string}</text>
        </g>
      ))}
      <text x={520} y={730} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontFamily="JetBrains Mono" fontSize={28} transform="rotate(42.7 520 730) translate(0,-30)">≈ 1,150 km</text>
      {f >= go && <circle cx={sx} cy={sy} r={18} fill={SUP} filter="url(#glow)" />}
      {f >= go && <circle cx={hx} cy={hy} r={18} fill={HYP} filter="url(#glow)" />}
      <g transform="translate(100,1140)">
        <text x={0} y={0} fill={SUP} fontFamily="Unbounded" fontWeight={800} fontSize={44}>SUPERSONIC</text>
        <text x={880} y={0} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={44}>~{Math.round(supT)} min</text>
        <text x={0} y={70} fill={HYP} fontFamily="Unbounded" fontWeight={800} fontSize={44}>HYPERSONIC</text>
        <text x={880} y={70} textAnchor="end" fill="#fff" fontFamily="JetBrains Mono" fontWeight={600} fontSize={44}>~{Math.round(hypT)} min</text>
        <text x={0} y={118} fill="rgba(255,255,255,0.55)" fontFamily="JetBrains Mono" fontSize={22}>at Mach 3 vs Mach 5 · sea-level speed of sound · illustrative</text>
      </g>
    </Stage>
  );
};

// ======================= 7. STRIKE: race resumes, both hit =======================
export const H2Strike: React.FC = () => {
  const { f, Le, W, dur } = useS("strike");
  const hyperHit = Le(10) - 10, superHit = W(11, 1);
  const cut = hyperHit - 24;
  if (f < cut) {
    const t = 1.25 + (f / FPS) * 0.9;
    const s = raceSup(t), h = raceHyp(t);
    // two chase shots: "Hypersonic pehle" rides the glide vehicle, "aur Supersonic uske peeche" rides the cruise missile
    const onSup = f >= W(10, 6) - 2;
    const tgt = onSup ? s : h;
    const cam = cam0({ tx: tgt[0] - 2, ty: tgt[1] - 34, tz: tgt[2] + 3, yaw: onSup ? -18 : -24, pitch: 84, zoom: 6, F: 380, ...shakeCam(f, 3) });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Moon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Trail cam={cam} pts={Array.from({ length: 12 }, (_, i) => raceSup(t - (11 - i) * 0.08))} width={8} color="#ffffff" opacity={0.6} />
        <Trail cam={cam} pts={Array.from({ length: 12 }, (_, i) => raceHyp(t - (11 - i) * 0.08))} width={10} color={HYP} opacity={0.8} />
        <CruiseMissile cam={cam} nose={s} dir={[0, 1, 0]} len={12} diam={1} t={f} />
        <GlideVehicle cam={cam} nose={h} dir={[0, 1, 0]} len={11} span={4.5} heat={1} t={f} />
        <Label cam={cam} anchor={h} dx={-90} dy={-200} text="HYPERSONIC · AHEAD" color={HYP} p={onSup ? 0 : prog(f, W(10, 4) - 2, W(10, 4) + 8)} />
        <Label cam={cam} anchor={s} dx={-80} dy={-200} text="SUPERSONIC · BEHIND" color={SUP} p={onSup ? prog(f, W(10, 6), W(10, 6) + 8) : 0} />
        <SpeedLines f={f} amt={0.8} dir={90} seed={34} />
        <g opacity={1 - prog(f, 10, 18)} transform="translate(540,760)"><path d="M-40 -60 L60 0 L-40 60 Z" fill="#fff" /></g>
        <Keyword text={"RACE\nRESUMES"} f={f} at={0} until={18} y={470} size={90} />
      </Stage>
    );
  }
  const camI = cam0({ tx: 0, ty: 64, tz: DECK, yaw: -64, pitch: 72, zoom: 3.1, F: 900, ...shakeCam(f, (f >= hyperHit ? 7 * Math.exp(-(f - hyperHit) / 6) : 0) + (f >= superHit ? 14 * Math.exp(-(f - superHit) / 7) : 0)) });
  const hNose: V3 = f < hyperHit ? [-(hyperHit - f) * 14, 92, DECK + 1 + (hyperHit - f) * 22] : [0, 92, DECK + 1];
  const sNose: V3 = f < superHit ? [7.5 + (superHit - f) * 16, 52, DECK + 2] : [7.5, 52, DECK + 2];
  return (
    <Stage dur={dur} enter="cut" exit="cut" flash={f >= superHit ? 0.5 * Math.exp(-(f - superHit) / 3) : 0}>
      <SkyHorizon cam={camI} />
      <Moon cam={camI} />
      <Ocean cam={camI} t={f} />
      <TargetShip cam={camI} origin={[0, 0, 0]} st={{ t: f, hit1: prog(f, hyperHit, hyperHit + 8), hit2: prog(f, superHit, superHit + 8) }} />
      {f < hyperHit && <Trail cam={camI} pts={Array.from({ length: 12 }, (_, i) => { const k = hyperHit - f + (11 - i) * 2; return [-k * 14, 92, DECK + 1 + k * 22] as V3; })} width={12} color={HYP} opacity={0.85} />}
      {f < hyperHit && <GlideVehicle cam={camI} nose={hNose} dir={[14, 0, -22]} len={14} span={6} heat={1} t={f} />}
      {f < superHit && <CruiseMissile cam={camI} nose={sNose} dir={[-1, 0, 0]} len={12} diam={1.2} t={f} />}
      <Explosion cam={camI} at={[0, 92, DECK + 1]} age={f - hyperHit} size={0.9} />
      <Explosion cam={camI} at={[6, 52, DECK + 2]} age={f - superHit} size={1.4} />
      <Label cam={camI} anchor={[0, 92, DECK + 1]} dx={-80} dy={-220} text="HYPERSONIC · 1st" color={HYP} p={prog(f, hyperHit + 2, hyperHit + 12)} />
      <Keyword text="HIT!" f={f} at={superHit} until={dur + 20} y={470} size={150} color={SUP} wobble />
    </Stage>
  );
};

// ======================= 8. OUTRO =======================
export const H2Outro: React.FC = () => {
  const { f, Ls, W, dur } = useS("outro");
  const c1 = Ls(13) - 3;
  const cam = camAt(f, { tx: 0, ty: 64, tz: DECK, yaw: -64, pitch: 72, zoom: 3.1, F: 900 }, [{ f: 0 }, { f: c1, zoom: 1.8, pitch: 66, yaw: -40 }]);
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
      <Moon cam={cam} />
      <Ocean cam={cam} t={f} />
      <TargetShip cam={cam} origin={[0, 0, 0]} st={{ t: f, hit1: 1, hit2: 1, sink: prog(f, 0, c1 + 60) * 0.7 }} />
      {card(420, "SUPERSONIC", "MACH 1–5", SUP, prog(f, W(12, 0) - 2, W(12, 0) + 10))}
      {card(570, "HYPERSONIC", "MACH 5+", HYP, prog(f, W(12, 3) - 2, W(12, 3) + 10))}
    </Stage>
  );
};

export const SCENES_H2: Record<string, React.FC> = { cold: H2Cold, pause: H2Pause, mach: H2Mach, supersonic: H2Super, hypersonic: H2Hyper, radar: H2Radar, time: H2Time, strike: H2Strike, outro: H2Outro };
