import React from "react";
import { useCurrentFrame } from "remotion";
import timeline from "./timeline.json";
import { Cam, V3, camAt, prog, lerp, clamp01, project, easeOut, BASE_CAM } from "./engine";
import { C, Carrier, Jet, Runway, Trail, Label, Defs, Box, L, RAMP0, RAMP_H, deckZ, SEA, angPoint, ANG_HEADING, WIRES, jetLocal } from "./world";
import { SideCard, SkyDef, Timer, IndianFlag } from "./ui";

const FPS = timeline.fps;
const sceneOf = (id: string) => timeline.scenes.find((s) => s.id === id)!;

export const useS = (id: string) => {
  const f = useCurrentFrame();
  const s0 = Math.round(sceneOf(id).start * FPS);
  const Ls = (i: number) => Math.round(timeline.lines[i].t0 * FPS) - s0;
  const Le = (i: number) => Math.round(timeline.lines[i].t1 * FPS) - s0;
  const W = (i: number, j: number) => Math.round(timeline.lines[i].words[j].t0 * FPS) - s0;
  const dur = Math.round((sceneOf(id).end - sceneOf(id).start) * FPS);
  return { f, Ls, Le, W, dur };
};

const JET_SCALE = 2.1;

/** ski-jump launch. t = seconds since release, T = seconds to reach the bow */
export const skiLaunch = (t: number, T: number, y0 = 150, x0 = -4) => {
  const a = (2 * (L - y0)) / (T * T);
  if (t <= 0) return { pos: [x0, y0, 0.4] as V3, pitch: 0 };
  if (t < T) {
    const y = y0 + 0.5 * a * t * t;
    const slope = y > RAMP0 ? (2 * RAMP_H * (y - RAMP0)) / Math.pow(L - RAMP0, 2) : 0;
    return { pos: [x0, y, deckZ(y) + 0.4] as V3, pitch: (Math.atan(slope) * 180) / Math.PI };
  }
  const v = a * T, dt = t - T;
  return { pos: [x0, L + v * dt, RAMP_H + 0.4 + v * dt * 0.2 + 5 * dt * dt] as V3, pitch: 14 };
};
const trailOf = (fn: (t: number) => V3, t: number, span = 0.7, n = 18) =>
  Array.from({ length: n }, (_, i) => fn(t - span + (span * i) / (n - 1)));

// approach / roll along the angled deck. s = distance along the landing line (m)
const glide = (s: number): V3 => angPoint(s, 0, s < 0 ? -s * 0.07 + 0.5 : 0.5);

const Bg: React.FC<{ children: React.ReactNode; fadeIn?: number }> = ({ children, fadeIn = 6 }) => {
  const f = useCurrentFrame();
  const o = clamp01(f / fadeIn);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <SkyDef />
      <g opacity={o}>{children}</g>
    </svg>
  );
};

const shake = (f: number, amt: number): Partial<Cam> => ({ cx: 540 + Math.sin(f * 1.9) * amt, cy: 900 + Math.cos(f * 2.3) * amt });

// ======================= 1. HOOK =======================
export const HookScene: React.FC = () => {
  const { f, Ls, W, dur } = useS("hook");
  const cam = camAt(f, { tx: -20, ty: 150, zoom: 2.9, yaw: -28, pitch: 36, cy: 900 }, [
    { f: 0 },
    { f: Ls(1) - 4, tx: -25, ty: 165, zoom: 2.7 },
    { f: Ls(1) + 26, tx: -75, ty: 330, zoom: 1.45 },
    { f: dur, tx: -70, ty: 380, zoom: 1.35 },
  ]);
  const rel = W(2, 7) - 6;
  const T = 1.4;
  const st = skiLaunch((f - rel) / FPS, T);
  const tr = trailOf((t) => skiLaunch(t, T).pos, (f - rel) / FPS, 0.9);
  return (
    <Bg>
      <Runway cam={cam} x={-112} y0={-140} y1={1500} />
      <Carrier cam={cam} t={f} wake={0.6} />
      {f > rel && <Trail cam={cam} pts={tr} width={6} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JET_SCALE} exhaust={f > rel - 10 ? 1 : 0} t={f} />
      <Label cam={cam} anchor={[20, 105, 0]} dx={150} dy={-60} text="INS VIKRANT DECK" p={prog(f, 6, 26)} />
      <Label cam={cam} anchor={[-112, 520, 0]} dx={-30} dy={-110} text="AIRPORT RUNWAY" p={prog(f, W(1, 3) - 4, W(1, 3) + 16)} />
    </Bg>
  );
};

// ======================= 2. IMAGINE =======================
export const ImagineScene: React.FC = () => {
  const { f, Ls, W } = useS("imagine");
  const cut = Ls(4) - 4;
  if (f < cut) {
    const cam = camAt(f, { tx: 0, ty: 150, zoom: 4.2, yaw: -30, pitch: 40 }, [
      { f: 0 },
      { f: cut, zoom: 0.95, ty: 110, pitch: 34 },
    ]);
    return (
      <Bg>
        <Carrier cam={cam} t={f} wake={1} />
        <Jet cam={cam} pos={[-4, 150, 0.4]} scale={JET_SCALE} t={f} />
      </Bg>
    );
  }
  const g = f - cut;
  const taxi = prog(g, 4, 42);
  const rel = W(5, 3) - 2;
  const T = 1.5;
  const tt = (f - rel) / FPS;
  const st = tt > 0 ? skiLaunch(tt, T) : { pos: [-4, lerp(122, 150, taxi), 0.4] as V3, pitch: 0 };
  const follow = clamp01((f - rel) / 40);
  const base = camAt(g, { tx: -4, ty: 168, zoom: 7.2, yaw: -30, pitch: 46 }, [{ f: 0 }, { f: rel - cut, ty: 176, zoom: 6.8 }]);
  const cam: Cam = {
    ...base,
    ty: lerp(base.ty, st.pos[1] - 40, easeOut(follow)),
    tz: lerp(0, st.pos[2] * 0.6, follow),
    zoom: lerp(base.zoom, 2.4, prog(f, rel, rel + 70)),
  };
  const tr = trailOf((t) => skiLaunch(t, T).pos, tt, 0.8);
  return (
    <Bg fadeIn={4}>
      <Carrier cam={cam} t={f} wake={0.4} />
      {tt > 0 && <Trail cam={cam} pts={tr} width={8} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JET_SCALE} exhaust={f > rel - 14 ? 1 : 0.15} t={f} />
      <Label cam={cam} anchor={[-4, lerp(122, 150, taxi) + 8, 2]} dx={-60} dy={-170} text="TAKE-OFF" p={prog(g, 18, 36) * (1 - prog(f, rel - 6, rel + 4))} />
    </Bg>
  );
};

// ======================= 3. RUNWAY vs DECK =======================
export const RunwayScene: React.FC = () => {
  const { f, Ls, W, dur } = useS("runway");
  const cam = camAt(f, { tx: -55, ty: 300, zoom: 1.5, yaw: -28, pitch: 36 }, [
    { f: 0 },
    { f: Ls(9) - 2, tx: -60, ty: 330, zoom: 1.45 },
    { f: Ls(9) + 34, tx: -6, ty: 222, zoom: 4.6, pitch: 44 },
    { f: dur, tx: -4, ty: 226, zoom: 4.9, pitch: 44 },
  ]);
  const go = W(7, 3);
  const t = Math.max(0, (f - go) / FPS);
  const ry = -110 + 0.5 * 55 * t * t;
  const rz = ry > 650 ? (ry - 650) * 0.12 : 0;
  const rpos: V3 = [-112, ry, rz + 0.4];
  const rtrail = Array.from({ length: 16 }, (_, i) => { const tt = Math.max(0, t - 0.8 + (0.8 * i) / 15); const y = -110 + 0.5 * 55 * tt * tt; return [-112, y, (y > 650 ? (y - 650) * 0.12 : 0) + 0.4] as V3; });
  return (
    <Bg>
      <Runway cam={cam} x={-112} y0={-140} y1={1500} highlight={{ y0: 0, y1: L, p: prog(f, Ls(8) + 6, Ls(8) + 22) }} />
      <Carrier cam={cam} t={f} rampGlow={prog(f, W(9, 4) - 4, W(9, 4) + 10)} outlineGlow={0.6 * prog(f, Ls(8), Ls(8) + 14) * (1 - prog(f, Ls(9), Ls(9) + 20))} />
      {t > 0 && <Trail cam={cam} pts={rtrail} width={5} />}
      <Jet cam={cam} pos={rpos} pitch={rz > 0 ? 8 : 0} scale={JET_SCALE} exhaust={t > 0 ? 0.8 : 0} t={f} />
      <Label cam={cam} anchor={[-112, 760, 0]} dx={-20} dy={-120} text="AIRPORT RUNWAY" p={prog(f, W(7, 7) - 6, W(7, 7) + 12) * (1 - prog(f, Ls(9), Ls(9) + 10))} />
      <Label cam={cam} anchor={[25, 170, 0]} dx={130} dy={-70} text="INS VIKRANT DECK" p={prog(f, Ls(8) + 4, Ls(8) + 20) * (1 - prog(f, Ls(9), Ls(9) + 10))} />
      <Label cam={cam} anchor={[-1, 246, deckZ(246)]} dx={80} dy={-190} text="SKI-JUMP" p={prog(f, W(9, 4) - 2, W(9, 4) + 14)} color={C.cyan} />
    </Bg>
  );
};

// ======================= 4. SKI-JUMP =======================
export const SkiJumpScene: React.FC = () => {
  const { f, Ls, W } = useS("skijump");
  const power = prog(f, W(10, 3) - 4, W(10, 3) + 10);
  const blocksOn = prog(f, W(11, 3) - 4, W(11, 3) + 8);
  const rel = W(12, 1) + 4;
  const bowAt = W(13, 3);
  const T = Math.max(1.2, (bowAt - rel) / FPS);
  const tt = (f - rel) / FPS;
  const st = skiLaunch(tt, T);
  const follow = clamp01((f - rel) / (T * FPS));
  const base: Cam = { ...BASE_CAM, tx: -4, ty: 168, tz: 0, zoom: 9, yaw: -32, pitch: 50, ...shake(f, power * (1 - follow) * 2.2) };
  const cam: Cam = {
    ...base,
    ty: lerp(base.ty, st.pos[1] + 10, easeOut(follow)),
    tz: st.pos[2] * 0.7,
    zoom: lerp(9, 3.0, prog(f, rel + 10, bowAt + 60)),
  };
  const drop = prog(f, rel - 6, rel + 6);
  const blocks = [-1, 1].map((s) => ({ x0: -4 + s * 2.6 - 1.1, x1: -4 + s * 2.6 + 1.1, y0: 152.5, y1: 154.3, z0: 0, z1: lerp(1.3, -0.2, drop), top: C.orange }));
  const tr = trailOf((t) => skiLaunch(t, T).pos, tt, 0.6);
  const card = prog(f, Ls(13) - 4, Ls(13) + 10);
  const cardP = clamp01((f - (Ls(13) - 4)) / (Ls(14) + 40 - Ls(13)));
  return (
    <Bg>
      <Carrier cam={cam} t={f} rampGlow={prog(f, Ls(13) - 8, Ls(13) + 4) * (1 - prog(f, Ls(14) + 20, Ls(14) + 40))} />
      {drop < 1 && blocks.map((b, i) => (
        <g key={i} opacity={1 - drop} filter={blocksOn > 0.5 ? "url(#glow)" : undefined}><Box cam={cam} b={b} /></g>
      ))}
      {tt > 0 && <Trail cam={cam} pts={tr} width={9} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JET_SCALE} exhaust={Math.max(0.12, power)} t={f} />
      <Label cam={cam} anchor={jetLocal([0, -9, 0.4], [-4, 150, 0.4], 0, 0, JET_SCALE)} dx={-40} dy={170} text="FULL POWER" color={C.cyan} p={prog(f, W(10, 3), W(10, 3) + 16) * (1 - prog(f, Ls(11) + 4, Ls(11) + 12))} />
      <Label cam={cam} anchor={[-6.6, 153.4, 1.3]} dx={-70} dy={-210} text="BLOCKS" color={C.orange} p={prog(f, W(11, 3) - 2, W(11, 3) + 14) * (1 - drop)} />
      <SideCard kind="skijump" x={580} y={1050} w={440} h={260} p={cardP} t={f} opacity={card} caption="side view" />
    </Bg>
  );
};

// ======================= 5. CATAPULT vs SKI-JUMP =======================
const FlatDeck: React.FC<{ cam: Cam; p: number; t: number }> = ({ cam, p, t }) => {
  const u = Math.pow(clamp01(p / 0.7), 2);
  const y = lerp(25, 150, u) + (p > 0.7 ? (p - 0.7) * 300 : 0);
  const z = p > 0.7 ? (p - 0.7) * 60 : 0.4;
  return (
    <g>
      <Box cam={cam} b={{ x0: -22, x1: 22, y0: 0, y1: 150, z0: -12, z1: 0, top: C.deck }} />
      <path d={`M${project(cam, [0, 18, 0]).join(" ")} L${project(cam, [0, 148, 0]).join(" ")}`} stroke={C.cyan} strokeWidth={4} opacity={0.35 + 0.65 * Math.min(1, p * 4)} filter="url(#glow)" />
      <Jet cam={cam} pos={[0, y, z]} scale={2.1} exhaust={0.6} t={t} groundZ={y < 150 ? 0 : -12} />
    </g>
  );
};

export const CompareScene: React.FC = () => {
  const { f, Ls, Le } = useS("compare");
  const a1 = prog(f, 2, 14), a2 = prog(f, Ls(16) - 4, Ls(16) + 8);
  const row1 = lerp(1, 0.32, a2), row2 = lerp(0.32, 1, a2);
  const p1 = clamp01((f - 6) / (Le(15) - 6));
  const p2 = clamp01((f - Ls(16)) / (Le(16) - Ls(16)));
  const camFlat: Cam = { ...BASE_CAM, tx: 0, ty: 80, zoom: 2.1, yaw: -32, pitch: 44, cx: 250, cy: 650, boost: 1.15 };
  const camVik: Cam = { ...BASE_CAM, tx: -2, ty: 215, zoom: 3.4, yaw: -32, pitch: 46, cx: 250, cy: 1100, boost: 1.15 };
  const loop = (p: number) => (p * 1.25) % 1;
  return (
    <Bg>
      <defs>
        <clipPath id="r1"><rect x={40} y={500} width={440} height={300} /></clipPath>
        <clipPath id="r2"><rect x={40} y={950} width={440} height={300} /></clipPath>
      </defs>
      <g opacity={row1 * a1}>
        <text x={60} y={430} fill="rgba(255,255,255,0.6)" fontFamily="JetBrains Mono" fontSize={28}>Duniya ke kai carriers</text>
        <text x={60} y={484} fill="#fff" fontFamily="Inter" fontWeight={700} fontSize={46}>Catapult</text>
        <rect x={60} y={500} width={220 * prog(f, 6, 26) * (1 - a2)} height={5} fill={C.cyan} />
        <g clipPath="url(#r1)"><FlatDeck cam={camFlat} p={loop(p1)} t={f} /></g>
        <SideCard kind="catapult" x={530} y={440} w={490} h={300} p={loop(p1)} t={f} caption="illustration" />
      </g>
      <line x1={60} y1={850} x2={1020} y2={850} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
      <g opacity={row2 * a1}>
        <text x={60} y={890} fill="rgba(255,255,255,0.6)" fontFamily="JetBrains Mono" fontSize={28}>INS Vikrant</text>
        <text x={60} y={944} fill="#fff" fontFamily="Inter" fontWeight={700} fontSize={46}>Ski-jump</text>
        <rect x={60} y={960} width={220 * a2} height={5} fill={C.cyan} />
        <g clipPath="url(#r2)">
          <Carrier cam={camVik} t={f} rampGlow={a2} parked={false} />
          <Jet cam={camVik} pos={skiLaunch(loop(p2) * 2.6 - 0.2, 1.6, 170).pos} pitch={skiLaunch(loop(p2) * 2.6 - 0.2, 1.6, 170).pitch} scale={2.1} exhaust={1} t={f} />
        </g>
        <SideCard kind="skijump" x={530} y={900} w={490} h={300} p={loop(p2)} t={f} caption="illustration" />
      </g>
    </Bg>
  );
};

// ======================= 6. LANDING =======================
export const LandingScene: React.FC = () => {
  const { f, Ls, Le, W, dur } = useS("landing");
  const catchF = W(21, 4);
  // s(f): piecewise slow-motion approach, then real time catch + 2 s stop
  const sKeys: [number, number][] = [[0, -430], [Ls(18), -300], [Ls(19), -170], [Ls(20), -90], [Ls(21), -35], [catchF, WIRES[1] + 10]];
  let s: number;
  if (f >= catchF) {
    const k = clamp01((f - catchF) / (2 * FPS));
    s = WIRES[1] + 10 + 75 * (1 - Math.pow(1 - k, 2.4));
  } else {
    let i = 0; while (i < sKeys.length - 2 && f > sKeys[i + 1][0]) i++;
    const [fa, sa] = sKeys[i], [fb, sb] = sKeys[i + 1];
    s = lerp(sa, sb, clamp01((f - fa) / Math.max(1, fb - fa)));
  }
  const pos = glide(s);
  const jetPitch = s < 0 ? 4 : 1;
  const hookEnd = jetLocal([0, -8.5, -1.6], pos, ANG_HEADING, jetPitch, JET_SCALE);
  const hookDeck: V3 = [hookEnd[0], hookEnd[1], 0.3];
  const caught = f >= catchF;
  const camF: Cam = { ...BASE_CAM, tx: pos[0], ty: pos[1] + 4, tz: pos[2], zoom: 7.2, yaw: -26, pitch: 40 };
  const cam = camAt(f, { tx: -18, ty: 120, zoom: 1.9, yaw: -28, pitch: 38 }, [
    { f: 0 },
    { f: Ls(18) - 10, tx: -22, ty: 60, zoom: 2.0 },
    { f: Ls(18) + 14, ...camF },
    { f: Ls(19) - 4, ...camF },
    { f: Ls(19) + 26, ...{ tx: angPoint(-25)[0], ty: angPoint(-25)[1], tz: 0, zoom: 3.4, yaw: -28, pitch: 44, cy: 980 } },
    { f: W(21, 4) - 10, tx: angPoint(40)[0], ty: angPoint(40)[1], zoom: 4.2, cy: 900 },
    { f: dur, tx: angPoint(80)[0], ty: angPoint(80)[1], zoom: 4.4 },
  ]);
  // when the close-up follows the jet, lock target to it
  const lock = prog(f, Ls(18), Ls(18) + 14) * (1 - prog(f, Ls(19) - 4, Ls(19) + 26));
  const c2: Cam = { ...cam, tx: lerp(cam.tx, pos[0], lock), ty: lerp(cam.ty, pos[1] + 4, lock), tz: lerp(cam.tz, pos[2], lock) };
  const tProg = clamp01((f - catchF) / (2 * FPS));
  return (
    <Bg>
      <Carrier cam={c2} t={f} wireGlow={prog(f, W(20, 4) - 4, W(20, 4) + 8) * (caught ? 0.3 : 1)} catch={caught ? { wire: 1, hook: hookDeck, amt: 1 } : null} />
      <Jet cam={c2} pos={pos} heading={ANG_HEADING} pitch={jetPitch} scale={JET_SCALE} hook={prog(f, W(18, 4) - 6, W(18, 4) + 6)} hookDown={s > -10 ? 1 : 0} t={f} exhaust={0.25} />
      <Label cam={c2} anchor={hookEnd} dx={-140} dy={150} text="HOOK" color={C.orange} p={prog(f, W(18, 4), W(18, 4) + 16) * (1 - prog(f, Ls(19), Ls(19) + 8))} />
      <Label cam={c2} anchor={angPoint(WIRES[2], 12, 0.3)} dx={70} dy={170} text="STEEL CABLES" color={C.orange} p={prog(f, W(20, 4), W(20, 4) + 16) * (1 - prog(f, catchF + 20, catchF + 30))} />
      <SideCard kind="hook" x={560} y={400} w={460} h={260} p={clamp01((f - Ls(19)) / (catchF - Ls(19)) * 0.72)} t={f} opacity={prog(f, Ls(19), Ls(19) + 10) * (1 - prog(f, catchF + 10, catchF + 22))} caption="side view" />
      <Timer x={720} y={1250} p={tProg} show={prog(f, catchF - 6, catchF + 4)} />
      {void Le}
    </Bg>
  );
};

// ======================= 7. TWIST =======================
export const TwistScene: React.FC = () => {
  const { f, Ls, W, dur } = useS("twist");
  const td = W(24, 4);
  const full = W(25, 4);
  const go = Ls(28);
  const sKeys: [number, number][] = [[0, -100], [td, 12], [Ls(27), 30], [go, 70]];
  let s: number;
  if (f >= go) {
    const t = (f - go) / FPS;
    s = 70 + 30 * t + 30 * t * t;
  } else {
    let i = 0; while (i < sKeys.length - 2 && f > sKeys[i + 1][0]) i++;
    const [fa, sa] = sKeys[i], [fb, sb] = sKeys[i + 1];
    s = lerp(sa, sb, clamp01((f - fa) / Math.max(1, fb - fa)));
  }
  const edge = 172;
  const sAt = (ss: number): V3 => (ss < edge ? glide(ss) : (() => { const p = angPoint(ss, 0, 0.5); return [p[0], p[1], 0.5 + (ss - edge) * 0.14 + 0.0004 * Math.pow(ss - edge, 2)] as V3; })());
  const pos = sAt(s);
  const pitch = s < 0 ? 4 : s > edge ? 12 : 1;
  const hookS = s - 8.5 * JET_SCALE;
  const wireRed = WIRES.map((w) => (f >= Ls(27) && hookS > w - 2 ? 1 : 0));
  const follow = prog(f, go, go + 50);
  const edgeP = angPoint(edge + 10);
  const camBase = camAt(f, { tx: angPoint(-35)[0], ty: angPoint(-35)[1], zoom: 3.2, yaw: -26, pitch: 42 }, [
    { f: 0 },
    { f: td, tx: angPoint(28)[0], ty: angPoint(28)[1], zoom: 5.2 },
    { f: Ls(27), tx: angPoint(45)[0], ty: angPoint(45)[1], zoom: 5.0 },
    { f: go, zoom: 5.0 },
    { f: dur, zoom: 3.8 },
  ]);
  const cam: Cam = { ...camBase, tx: lerp(camBase.tx, edgeP[0], follow), ty: lerp(camBase.ty, edgeP[1] - 20, follow), tz: lerp(0, 6, follow) };
  // ghost: the jet that didn't have the speed
  const gt = (f - (Ls(29) - 4)) / FPS;
  const ghostOn = gt > 0;
  const gS = edge + Math.min(gt, 1.4) * 40;
  const gp = angPoint(gS, -Math.min(gt, 1.4) * 26, 0.5 - 4.9 * Math.pow(Math.min(gt, 1.4), 2) * 5);
  const gz = Math.max(SEA - 2, gp[2]);
  const splash = clamp01((gt - 1.0) / 1.2);
  const splashC = project(cam, [gp[0], gp[1], SEA]);
  const trail = Array.from({ length: 16 }, (_, i) => { const ss = s - 60 + (60 * i) / 15; return sAt(ss); });
  return (
    <Bg>
      <Carrier cam={cam} t={f} wireRed={wireRed} />
      {ghostOn && (
        <g>
          <path d={`M${project(cam, angPoint(edge, 0, 0.5)).join(" ")} Q${project(cam, angPoint(edge + 30, -14, -2)).join(" ")} ${project(cam, [gp[0], gp[1], gz]).join(" ")}`} stroke={C.red} strokeWidth={3} strokeDasharray="10 8" fill="none" opacity={0.8} />
          {splash > 0 && [0, 1, 2].map((k) => (
            <ellipse key={k} cx={splashC[0]} cy={splashC[1]} rx={(20 + 60 * splash + k * 22) * (cam.zoom / 3)} ry={(8 + 24 * splash + k * 9) * (cam.zoom / 3)} fill="none" stroke={C.red} strokeWidth={2} opacity={(1 - splash) * 0.8} />
          ))}
          {splash < 0.4 && <Jet cam={cam} pos={[gp[0], gp[1], gz]} heading={ANG_HEADING} pitch={-18} scale={JET_SCALE} ghost groundZ={SEA} />}
        </g>
      )}
      {f > go && <Trail cam={cam} pts={trail} width={7} />}
      <Jet cam={cam} pos={pos} heading={ANG_HEADING} pitch={pitch} scale={JET_SCALE} hook={1} hookDown={s > 0 && s < edge ? 1 : 0} exhaust={prog(f, full - 4, full + 6) * 1 + 0.2} t={f} />
      <Label cam={cam} anchor={glide(12)} dx={120} dy={180} text="WHEELS DOWN" p={prog(f, td - 2, td + 14) * (1 - prog(f, full - 6, full))} />
      <Label cam={cam} anchor={jetLocal([0, -12, 0.4], pos, ANG_HEADING, 0, JET_SCALE)} dx={110} dy={170} text="FULL POWER" color={C.cyan} p={prog(f, full, full + 14) * (1 - prog(f, Ls(27) - 6, Ls(27)))} />
      <SideCard kind="burner" x={560} y={400} w={460} h={260} p={prog(f, full - 4, full + 8)} t={f} opacity={prog(f, full - 4, full + 8) * (1 - prog(f, Ls(27) - 6, Ls(27) + 4))} caption="side view" />
      <Label cam={cam} anchor={angPoint(WIRES[1], -12, 0.3)} dx={-80} dy={180} text="MISSED!" color={C.red} p={prog(f, W(27, 6) - 4, W(27, 6) + 10) * (1 - prog(f, go + 10, go + 20))} />
    </Bg>
  );
};

// ======================= 8. BACKUP / OUTRO =======================
export const BackupScene: React.FC = () => {
  const { f, Ls, W, dur } = useS("backup");
  const out = Ls(33);
  const cam = camAt(f, { tx: angPoint(78)[0], ty: angPoint(78)[1], zoom: 4.8, yaw: -24, pitch: 46 }, [
    { f: 0 },
    { f: out - 6, zoom: 5.6 },
    { f: out + 110, tx: 0, ty: 125, zoom: 1.6, pitch: 38, cy: 950 },
    { f: dur, tx: 0, ty: 125, zoom: 1.3, pitch: 36, cy: 950 },
  ]);
  const s = 62 + 58;
  const pos = glide(s);
  const hookEnd = jetLocal([0, -8.5, -1.6], pos, ANG_HEADING, 1, JET_SCALE);
  const title = prog(f, W(31, 2) - 2, W(31, 2) + 12) * (1 - prog(f, out - 4, out + 10));
  const flag = prog(f, Ls(35) - 6, Ls(35) + 20);
  return (
    <Bg>
      <Carrier cam={cam} t={f} wake={prog(f, out, out + 60)} catch={{ wire: 1, hook: [hookEnd[0], hookEnd[1], 0.3], amt: 1 }} />
      <Jet cam={cam} pos={pos} heading={ANG_HEADING} pitch={1} scale={JET_SCALE} hook={1} hookDown={1} exhaust={1} t={f} />
      <g opacity={title} transform={`translate(${(1 - title) * -30},0)`}>
        <text x={60} y={470} fill="#eef2f7" fontFamily="Unbounded" fontWeight={800} fontSize={96} letterSpacing={-2}>Controlled</text>
        <text x={60} y={578} fill="#eef2f7" fontFamily="Unbounded" fontWeight={800} fontSize={96} letterSpacing={-2}>crash.</text>
      </g>
      <g opacity={flag} transform={`translate(0,${(1 - flag) * 20})`}>
        <IndianFlag x={360} y={460} w={360} t={f} />
      </g>
    </Bg>
  );
};
