import React from "react";
import { useCurrentFrame } from "remotion";
import timeline from "./timeline.json";
import { Cam, V3, camAt, prog, lerp, clamp01, project, path, poly, BASE_CAM, mixColor } from "../engine";
import { C, Carrier, Jet, MigJet, Trail, Label, Box, L, RAMP0, RAMP_H, deckZ, SEA, angPoint, ANG_HEADING, WIRES, jetLocal, GEAR_H } from "../world";
import { Timer, IndianFlag } from "../ui";
import { Ocean, SkyHorizon, LightRays, Keyword, Tag, Sparks, Puffs, Stage, shakeCam, slowmo, horizonY } from "./fx";

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

const JS = 2.1; // jet scale (stylised, matches v1)
const GH = GEAR_H * JS; // height of the jet reference point when standing on its wheels
const AH = ANG_HEADING;
const cam0 = (c: Partial<Cam>): Cam => ({ ...BASE_CAM, ...c });

/** ski-jump launch, t = s since release, T = s to reach the bow */
const ski = (t: number, T: number, y0 = 150, x0 = -4) => {
  const a = (2 * (L - y0)) / (T * T);
  if (t <= 0) return { pos: [x0, y0, GH] as V3, pitch: 0, gear: 1 };
  if (t < T) {
    const y = y0 + 0.5 * a * t * t;
    const slope = y > RAMP0 ? (2 * RAMP_H * (y - RAMP0)) / Math.pow(L - RAMP0, 2) : 0;
    return { pos: [x0, y, deckZ(y) + GH] as V3, pitch: (Math.atan(slope) * 180) / Math.PI, gear: 1 };
  }
  const v = a * T, dt = t - T;
  return { pos: [x0, L + v * dt, RAMP_H + GH + v * dt * 0.22 + 5 * dt * dt] as V3, pitch: 14, gear: 1 - clamp01((dt - 0.4) / 0.6) };
};
const trail = (fn: (t: number) => V3, t: number, span = 0.7, n = 18) => Array.from({ length: n }, (_, i) => fn(t - span + (span * i) / (n - 1)));

/** approach along the angled deck: s = metres past the stern ramp (negative = still in the air) */
const appr = (s: number): V3 => angPoint(s, 0, s < 0 ? -s * 0.07 + GH : GH);
const hookPt = (pos: V3, pitch: number, down: boolean): V3 => {
  const h = jetLocal([0, -8.5, -1.2], pos, AH, pitch, JS);
  return down ? [h[0], h[1], 0.3] : h;
};
const pieces = (f: number, keys: [number, number][]) => {
  let i = 0; while (i < keys.length - 2 && f > keys[i + 1][0]) i++;
  const [fa, a] = keys[i], [fb, b] = keys[Math.min(i + 1, keys.length - 1)];
  return lerp(a, b, clamp01((f - fa) / Math.max(1, fb - fa)));
};
/** motion-blur ghosts for a fast jet */
const Ghosts: React.FC<{ n?: number; render: (k: number, o: number) => React.ReactNode }> = ({ n = 3, render }) => (
  <g>{Array.from({ length: n }, (_, i) => render(n - i, 0.22 / (n - i)))}</g>
);

// ======================= 0. COLD OPEN =======================
export const Cold: React.FC = () => {
  const { f, dur } = useS("cold");
  const FZ = 96;
  const ft = Math.min(f, FZ);
  const s = -236 + 70 * (ft / FPS);
  const pos = appr(s);
  const gearPt = jetLocal([1.25, -1.2, -0.55 - 1.4], pos, AH, 4, JS);
  const A: Partial<Cam> = { tx: gearPt[0], ty: gearPt[1], tz: gearPt[2], yaw: -AH + 78, pitch: 78, zoom: 24, F: 260 };
  const Bk: Partial<Cam> = { tx: angPoint(-70)[0], ty: angPoint(-70)[1], tz: 2, yaw: -AH + 30, pitch: 62, zoom: 2.0, F: 900 };
  const Ck: Partial<Cam> = { tx: angPoint(-12)[0], ty: angPoint(-12)[1], tz: 3, yaw: -AH + 12, pitch: 70, zoom: 4.2, F: 620 };
  let cam = camAt(f, A, [{ f: 0, ...A }, { f: 26, ...A }, { f: 58, ...Bk }, { f: 92, ...Ck }]);
  if (f < 26) cam = { ...cam, tx: gearPt[0], ty: gearPt[1], tz: gearPt[2] };
  else if (f < 92) {
    const w = prog(f, 26, 92);
    const deckP = angPoint(-12, 0, 3);
    cam = { ...cam, tx: lerp(pos[0], deckP[0], w), ty: lerp(pos[1], deckP[1], w), tz: lerp(pos[2], deckP[2], w) };
  }
  const frozen = f >= FZ;
  const kick = frozen ? Math.exp(-(f - FZ) / 6) : 0;
  cam = { ...cam, ...shakeCam(f, 9 * kick) };
  return (
    <Stage dur={dur} enter="cut" exit="cut" tint={frozen ? 1 : 0} flash={frozen ? 0.55 * kick : 0}>
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={ft} blur={f < 30 ? 2 : 0} />
      <Carrier cam={cam} t={ft} v2 gid="c0" parkedType="mig" wireGlow={frozen ? 1 : 0} />
      <Jet cam={cam} pos={pos} heading={AH} pitch={4} scale={JS} gear={1} volume hook={1} exhaust={0.35} t={ft} />
      {frozen && <Keyword text={"SECONDS\nTO LAND"} f={f} at={FZ + 2} until={dur + 20} y={500} size={100} />}
    </Stage>
  );
};

// ======================= 1. HOOK =======================
export const Hook: React.FC = () => {
  const { f, Ls, W, dur } = useS("hook");
  const push = Ls(3);
  const cam = camAt(f, { tx: -70, ty: 330, zoom: 0.92, yaw: 0, pitch: 4, F: 2400 }, [
    { f: 0 },
    { f: push, tx: -60, ty: 300, zoom: 1.05, yaw: -10 },
    { f: push + 40, tx: 0, ty: 150, zoom: 2.5, yaw: -28, pitch: 46, F: 1400 },
    { f: dur, tx: 0, ty: 150, zoom: 2.7, yaw: -32, pitch: 48, F: 1400 },
  ]);
  const rel = W(3, 7);
  const T = 1.4;
  const st = ski((f - rel) / FPS, T);
  const tr = trail((t) => ski(t, T).pos, (f - rel) / FPS, 0.9);
  // a second jet coming in to land on "utarte"
  const la = W(3, 12) - 30;
  const s2 = -220 + 75 * Math.max(0, (f - la) / FPS);
  const p2 = appr(Math.min(s2, 20));
  return (
    <Stage dur={dur}>
      <Ocean cam={cam} t={f} />
      <polygon points={poly(cam, [[-420, -500, -0.2], [120, -500, -0.2], [120, 3200, -0.2], [-420, 3200, -0.2]] as V3[])} fill="#0c131c" opacity={1 - prog(f, push, push + 20)} />
      <g opacity={1 - prog(f, push, push + 20)}>
        <RunwayV2 cam={cam} x={-150} y0={-300} y1={3200} t={f} highlight={{ y0: 0, y1: L, p: prog(f, W(2, 6) - 6, W(2, 6) + 10) }} />
      </g>
      <Carrier cam={cam} t={f} v2 gid="h" parkedType="mig" wake={0.8} />
      {f > rel && <Trail cam={cam} pts={tr} width={8} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JS} gear={st.gear} volume exhaust={f > rel - 12 ? 1 : 0.15} t={f} />
      {f > la && s2 < 40 && <Jet cam={cam} pos={p2} heading={AH} pitch={4} scale={JS} gear={1} volume hook={1} exhaust={0.3} t={f} />}
      <Label cam={cam} anchor={[-150, 900, 0]} dx={40} dy={-80} text="AIRPORT RUNWAY" p={prog(f, W(2, 3) - 4, W(2, 3) + 14) * (1 - prog(f, push, push + 10))} />
      <Label cam={cam} anchor={[24, 150, 0]} dx={70} dy={-60} text="INS VIKRANT" p={prog(f, Ls(1), Ls(1) + 16) * (1 - prog(f, push, push + 10))} />
      <Keyword text={"SUPER SHORT\nRUNWAY"} f={f} at={W(2, 6) - 2} until={push - 4} y={470} size={84} />
      <Tag text="NAVAL LCA TEJAS · PROTOTYPE · DECK TRIALS 2023" x={48} y={1180} p={prog(f, W(3, 1) - 2, W(3, 1) + 10) * (1 - prog(f, W(3, 1) + 80, W(3, 1) + 90))} />
    </Stage>
  );
};

const RunwayV2: React.FC<{ cam: Cam; x: number; y0: number; y1: number; t: number; w?: number; highlight?: { y0: number; y1: number; p: number } }> = ({ cam, x, y0, y1, w = 46, highlight }) => {
  const zm = cam.zoom * (cam.boost ?? 1);
  const lw = Math.max(1, zm * 0.3);
  const lights: React.ReactNode[] = [];
  for (let y = y0 + 20; y < y1; y += 60) {
    [-1, 1].forEach((sx) => {
      const p = project(cam, [x + (sx * w) / 2 + sx * 2, y, 0]);
      if (p[0] < -20 || p[0] > 1100 || p[1] < -20 || p[1] > 1940) return;
      lights.push(<circle key={`${y}${sx}`} cx={p[0]} cy={p[1]} r={Math.max(1.5, zm * 0.5)} fill={y > y1 - 700 ? "#ffb45a" : "#f2f6ff"} opacity={0.85} />);
    });
  }
  return (
    <g>
      <polygon points={poly(cam, [[x - w / 2, y0, 0], [x + w / 2, y0, 0], [x + w / 2, y1, 0], [x - w / 2, y1, 0]])} fill="#232c38" stroke="rgba(235,242,250,0.55)" strokeWidth={lw} />
      <path d={path(cam, [[x, y0 + 40, 0], [x, y1, 0]])} stroke="rgba(235,242,250,0.8)" strokeWidth={lw} strokeDasharray={`${zm * 24} ${zm * 20}`} />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={path(cam, [[x - w / 2 + 5 + i * 5.2, y0 + 6, 0], [x - w / 2 + 5 + i * 5.2, y0 + 30, 0]])} stroke="rgba(235,242,250,0.8)" strokeWidth={lw * 1.4} />)}
      {lights}
      {highlight && highlight.p > 0 && (
        <polygon points={poly(cam, [[x - w / 2 - 4, highlight.y0, 0], [x + w / 2 + 4, highlight.y0, 0], [x + w / 2 + 4, highlight.y1, 0], [x - w / 2 - 4, highlight.y1, 0]])}
          fill="rgba(56,198,255,0.14)" stroke={C.cyan} strokeWidth={lw * 1.6} strokeDasharray="10 8" opacity={highlight.p} />
      )}
    </g>
  );
};

// ======================= 2. IMAGINE =======================
export const Imagine: React.FC = () => {
  const { f, Ls, W, dur } = useS("imagine");
  const cut1 = Ls(5) - 3; // -> low-angle taxi
  const cut2 = Ls(6) - 3; // -> side view launch
  const rel = W(6, 3);
  if (f < cut1) {
    const cam = camAt(f, { tx: 0, ty: 130, zoom: 1.35, yaw: -95, pitch: 56, F: 1600 }, [{ f: 0 }, { f: cut1, yaw: 5, pitch: 64, zoom: 2.1 }]);
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="i1" parkedType="mig" wake={1} />
        <Jet cam={cam} pos={[-4, 112, GH]} scale={JS} gear={1} volume t={f} />
        <LightRays t={f} />
      </Stage>
    );
  }
  if (f < cut2) {
    const g = f - cut1;
    const taxi = prog(g, 0, cut2 - cut1 - 10);
    const jp: V3 = [-4, lerp(108, 150, taxi), GH];
    const cam = cam0({ tx: jp[0] + 2, ty: jp[1] + 6, tz: 2.5, yaw: 150, pitch: 82, zoom: 10, F: 360 });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Carrier cam={cam} t={f} v2 gid="i2" parkedType="mig" />
        <Jet cam={cam} pos={jp} scale={JS} gear={1} volume exhaust={0.15} t={f} />
        <Tag text="TAKE-OFF POSITION" x={48} y={1180} p={prog(g, 30, 42)} />
      </Stage>
    );
  }
  // side view from the port deck edge: jet runs right -> left and up the ramp
  const T = 1.45;
  const tt = (f - rel) / FPS;
  const st = ski(tt, T);
  const tilt = prog(f, rel + 40, dur);
  const cam = cam0({ tx: -4, ty: lerp(205, 250, tilt), tz: lerp(6, 30, tilt), yaw: 90, pitch: lerp(80, 72, tilt), zoom: lerp(4.2, 2.6, tilt), F: 520, ...shakeCam(f, 5 * Math.exp(-Math.abs(tt - T * 0.8) * 4)) });
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="i3" parkedType="mig" rampGlow={prog(f, rel + 20, rel + 34) * 0.6} />
      {tt > 0 && <Trail cam={cam} pts={trail((t) => ski(t, T).pos, tt, 0.6)} width={9} />}
      {tt > 0 && tt < T + 0.6 && <Ghosts render={(k, o) => { const g = ski(tt - k / FPS, T); return <Jet key={k} cam={cam} pos={g.pos} pitch={g.pitch} scale={JS} gear={g.gear} volume opacity={o} shadow={0} />; }} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JS} gear={st.gear} volume exhaust={f > rel - 14 ? 1 : 0.2} t={f} />
    </Stage>
  );
};

// ======================= 3. RUNWAY (with the humour beat) =======================
export const Runway: React.FC = () => {
  const { f, Ls, W, dur } = useS("runway");
  const cutA = Ls(9) - 3, cutB = Ls(10) - 2;
  if (f < cutA) {
    const go = 4;
    const t = Math.max(0, (f - go) / FPS);
    const acc = 2 * 1500 / Math.pow((cutA - go) / FPS, 2);
    const y = 0.5 * acc * t * t;
    const lift = y > 1150 ? (y - 1150) * 0.1 : 0;
    const jp: V3 = [0, y, GH + lift];
    const crane = prog(f, cutA - 52, cutA - 6);
    const cam = cam0({ tx: 0, ty: lerp(y + 8, 650, crane), tz: lerp(3, 0, crane), yaw: lerp(90, 0, crane), pitch: lerp(80, 6, crane), zoom: lerp(8.5, 0.42, crane), F: lerp(420, 3000, crane) });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <polygon points={poly(cam, [[-260, -300, -0.1], [260, -300, -0.1], [260, 3000, -0.1], [-260, 3000, -0.1]] as V3[])} fill="#0e161f" />
        <RunwayV2 cam={cam} x={0} y0={-80} y1={2400} t={f} />
        {crane > 0.2 && <Trail cam={cam} pts={Array.from({ length: 30 }, (_, i) => { const yy = y * (i / 29); return [0, yy, GH + (yy > 1150 ? (yy - 1150) * 0.1 : 0)] as V3; })} width={6} opacity={crane} />}
        <Ghosts render={(k, o) => { const tk = Math.max(0, t - k / FPS); const yk = 0.5 * acc * tk * tk; return <Jet key={k} cam={cam} pos={[0, yk, GH + (yk > 1150 ? (yk - 1150) * 0.1 : 0)]} scale={JS} gear={1} volume dim opacity={o * (1 - crane)} shadow={0} />; }} />
        <Jet cam={cam} pos={jp} pitch={lift > 0 ? 8 : 0} scale={JS} gear={1 - clamp01(lift / 30)} volume dim exhaust={0.7} t={f} />
        <Label cam={cam} anchor={[0, 1600, 0]} dx={60} dy={-90} text="AIRPORT RUNWAY" p={prog(f, cutA - 40, cutA - 26)} />
      </Stage>
    );
  }
  if (f < cutB) {
    // tiny carrier, crash zoom, comedic pause
    const zf = W(9, 3);
    const z = f < zf ? 0.32 : lerp(0.32, 2.3, Math.pow(clamp01((f - zf) / 5), 0.6));
    const cam = cam0({ tx: -6, ty: 130, zoom: z, yaw: -6, pitch: 8, F: 3000 });
    const a = project(cam, [36, 0, 0]), b = project(cam, [36, L, 0]);
    const ruler = prog(f, zf + 8, zf + 20);
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="r2" parkedType="mig" wake={0.7} />
        <g opacity={ruler}>
          <line x1={a[0]} y1={a[1]} x2={lerp(a[0], b[0], ruler)} y2={lerp(a[1], b[1], ruler)} stroke={C.cyan} strokeWidth={4} />
          <line x1={a[0] - 14} y1={a[1]} x2={a[0] + 14} y2={a[1]} stroke={C.cyan} strokeWidth={4} />
          {ruler > 0.95 && <line x1={b[0] - 14} y1={b[1]} x2={b[0] + 14} y2={b[1]} stroke={C.cyan} strokeWidth={4} />}
        </g>
        <Keyword text={"ITNI SI\nJAGAH?!"} f={f} at={W(9, 5) - 2} until={cutB} y={470} size={96} wobble color="#ffd166" />
      </Stage>
    );
  }
  // fast push-in to the ski-jump
  const g = f - cutB;
  const cam = camAt(g, { tx: -6, ty: 140, zoom: 2.3, yaw: -6, pitch: 8, F: 3000 }, [{ f: 0 }, { f: 16, tx: -2, ty: 238, tz: 4, zoom: 6.0, yaw: 70, pitch: 79, F: 520 }, { f: dur - cutB, tx: -2, ty: 240, tz: 4, zoom: 6.4, yaw: 76, pitch: 80, F: 520 }]);
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="r3" parkedType="mig" rampGlow={prog(f, W(10, 5) - 4, W(10, 5) + 8)} />
      <Jet cam={cam} pos={[-4, 150, GH]} scale={JS} gear={1} volume t={f} />
      <Keyword text="SKI-JUMP" f={f} at={W(10, 5) - 2} until={dur + 20} y={480} size={104} color={C.cyan} />
    </Stage>
  );
};

// ======================= 4. SKI-JUMP =======================
export const SkiJump: React.FC = () => {
  const { f, Ls, W, dur } = useS("skijump");
  const power = prog(f, W(11, 3) - 4, W(11, 3) + 10);
  const cut1 = Ls(12) - 3; // -> wheel/block close-up
  const rel = W(13, 1) + 6;
  const cut2 = rel + 8; // -> side tracking
  const bowAt = W(14, 3);
  const T = Math.max(1.2, (bowAt - rel) / FPS);
  const tt = (f - rel) / FPS;
  const st = ski(tt, T);
  const drop = prog(f, rel - 4, rel + 6);
  const blocks = [-1, 1].map((sx) => ({ x0: -4 + sx * 2.6 - 0.9, x1: -4 + sx * 2.6 + 0.9, y0: 148.3, y1: 149.5, z0: 0, z1: lerp(1.0, -0.4, drop), top: C.orange }));
  const heat = (cam: Cam) => {
    const tail = project(cam, jetLocal([0, -6.4, 0.1], st.pos, 0, st.pitch, JS));
    return power > 0.1 && tt < 0.2 ? Array.from({ length: 6 }, (_, i) => (
      <path key={i} d={`M${tail[0] - 30 + i * 12} ${tail[1] + 10 + i * 14} q 12 ${-10 - Math.sin(f * 0.5 + i) * 8} 24 0 t 24 0`} stroke="rgba(180,230,255,0.22)" strokeWidth={3} fill="none" opacity={power} />
    )) : null;
  };
  if (f < cut1) {
    const cam = cam0({ tx: -4, ty: 138, tz: 3, yaw: -24, pitch: 77, zoom: 12, F: 400, ...shakeCam(f, power * 3) });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Carrier cam={cam} t={f} v2 gid="s1" parkedType="mig" />
        {blocks.map((b, i) => <Box key={i} cam={cam} b={b} />)}
        <Jet cam={cam} pos={st.pos} scale={JS} gear={1} volume exhaust={Math.max(0.15, power)} t={f} />
        {heat(cam)}
        <Label cam={cam} anchor={jetLocal([0, -9, 0.4], st.pos, 0, 0, JS)} dx={60} dy={190} text="FULL POWER" color={C.cyan} p={prog(f, W(11, 3), W(11, 3) + 14)} />
      </Stage>
    );
  }
  if (f < cut2) {
    const vib = Math.sin(f * 3.1) * 0.03;
    const cam = cam0({ tx: -1.6, ty: 148.2, tz: 0.7, yaw: 58, pitch: 80, zoom: 40, F: 200, ...shakeCam(f, 1.5) });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={3} />
        <Carrier cam={cam} t={f} v2 gid="s2" parkedType="mig" />
        {blocks.map((b, i) => <g key={i} filter={f > W(12, 4) - 2 && drop < 0.5 ? "url(#glow)" : undefined}><Box cam={cam} b={b} /></g>)}
        <Jet cam={cam} pos={[st.pos[0] + vib, st.pos[1], st.pos[2]]} pitch={st.pitch} scale={JS} gear={1} volume exhaust={1} t={f} />
        <Label cam={cam} anchor={[-1.6, 149.3, 1.0]} dx={-60} dy={-260} text="RESTRAINING BLOCKS" color={C.orange} p={prog(f, W(12, 4) - 2, W(12, 4) + 12) * (1 - drop)} />
      </Stage>
    );
  }
  // side tracking along the deck, then the camera parks at the ramp and cranes up
  const atRamp = clamp01((st.pos[1] - 150) / (205 - 150));
  const crane = prog(f, Ls(15) - 6, dur);
  const trackY = lerp(st.pos[1] - 6, 232, atRamp);
  const cam = cam0({ tx: -4, ty: lerp(trackY, st.pos[1] - 40, crane * 0.6), tz: lerp(5, 40 + st.pos[2] * 0.5, crane), yaw: 90, pitch: lerp(80, 60, crane), zoom: lerp(5.2, 1.8, crane), F: 520, ...shakeCam(f, 3 * (1 - atRamp) * (tt < T ? 1 : 0)) });
  const arc = Array.from({ length: 24 }, (_, i) => ski(T + i * 0.08, T).pos);
  return (
    <Stage dur={dur} enter="cut">
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="s3" parkedType="mig" rampGlow={prog(f, bowAt - 16, bowAt - 4) * (1 - prog(f, Ls(15), Ls(15) + 20))} />
      <path d={path(cam, arc)} stroke={C.cyan} strokeWidth={3} strokeDasharray="10 9" fill="none" opacity={prog(f, bowAt - 14, bowAt) * (1 - crane)} />
      {tt > 0 && <Trail cam={cam} pts={trail((t) => ski(t, T).pos, tt, 0.6)} width={10} />}
      {tt > 0 && tt < T + 0.8 && <Ghosts render={(k, o) => { const g = ski(tt - k / FPS, T); return <Jet key={k} cam={cam} pos={g.pos} pitch={g.pitch} scale={JS} gear={g.gear} volume opacity={o} shadow={0} />; }} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JS} gear={st.gear} volume exhaust={1} t={f} />
      <Label cam={cam} anchor={[-4, 246, deckZ(246)]} dx={-120} dy={190} text="SKI-JUMP RAMP" color={C.cyan} p={prog(f, bowAt - 18, bowAt - 4) * (1 - crane)} />
    </Stage>
  );
};

// ======================= 5. CATAPULT (generic CATOBAR cutaway) vs VIKRANT =======================
const CV_OUT: [number, number][] = [[-30, 0], [30, 0], [34, 40], [34, 230], [24, 290], [8, 315], [-8, 315], [-26, 280], [-38, 200], [-38, 40]];
const GenericCarrier: React.FC<{ cam: Cam; open: number; steam: number; shuttleY: number; brake: number; t: number }> = ({ cam, open, steam, shuttleY, brake, t }) => {
  const top = CV_OUT.map(([x, y]) => [x, y, 0] as V3);
  const bot = CV_OUT.map(([x, y]) => [x * 0.82, 10 + y * 0.93, SEA] as V3);
  const lw = Math.max(1, cam.zoom * 0.35);
  const sides = top.map((_, i) => { const j = (i + 1) % top.length; return [top[i], top[j], bot[j], bot[i]]; });
  const X = 6, Y0 = 150, Y1 = 300;
  const holeW = 7 * open;
  const hole: V3[] = [[X - holeW, Y0 - 4, 0.05], [X + holeW, Y0 - 4, 0.05], [X + holeW, Y1 + 2, 0.05], [X - holeW, Y1 + 2, 0.05]];
  const cylZ = -3.2;
  const steamCol = mixColor("#5b6878", C.cyan, steam);
  return (
    <g>
      <polygon points={poly(cam, bot.map(([x, y]) => [x + 10, y - 7, SEA] as V3))} fill="rgba(0,0,0,0.45)" filter="url(#shadow)" />
      <polygon points={poly(cam, bot)} fill={C.hullA} />
      {sides.map((q, i) => <polygon key={i} points={poly(cam, q)} fill={i % 2 ? "#2b3543" : "#323d4c"} stroke="#2b3543" strokeWidth={0.6} />)}
      <polygon points={poly(cam, top)} fill="#4a5566" />
      <path d={path(cam, [[-10, 10, 0], [-30, 200, 0]])} stroke="rgba(235,242,250,0.5)" strokeWidth={lw} strokeDasharray="12 12" />
      <path d={path(cam, [[X, Y0, 0], [X, Y1, 0]])} stroke="rgba(235,242,250,0.75)" strokeWidth={lw} />
      {open > 0 && (
        <g>
          <polygon points={poly(cam, hole)} fill="#0a1018" stroke={C.cyan} strokeOpacity={0.5} strokeWidth={lw} strokeDasharray="8 6" />
          <Box cam={cam} b={{ x0: X - 6, x1: X - 2, y0: Y0 - 24, y1: Y0 - 8, z0: -11, z1: -4, top: "#3c4656" }} />
          {[-1.2, 1.2].map((dx, i) => (
            <g key={i}>
              <Box cam={cam} b={{ x0: X + dx - 0.7, x1: X + dx + 0.7, y0: Y0, y1: Y1 - 6, z0: cylZ - 1.4, z1: cylZ, top: steamCol }} />
              {steam > 0 && <path d={path(cam, [[X + dx, Y0, cylZ + 0.1], [X + dx, lerp(Y0, Y1 - 6, Math.min(1, steam * 1.2)), cylZ + 0.1]])} stroke={C.cyan} strokeWidth={lw * 1.4} filter="url(#glow)" opacity={0.9} />}
            </g>
          ))}
          <path d={path(cam, [[X - 4, Y0 - 10, -5], [X - 4, Y0 - 2, -5], [X, Y0 + 1, cylZ - 0.6]])} stroke="#8a97a8" strokeWidth={lw * 1.6} fill="none" />
          <Box cam={cam} b={{ x0: X - 2.6, x1: X + 2.6, y0: Y1 - 6, y1: Y1, z0: -5.5, z1: -2, top: brake > 0 ? "#6b4a2e" : "#3c4656" }} />
          <Box cam={cam} b={{ x0: X - 1.6, x1: X + 1.6, y0: shuttleY - 1.4, y1: shuttleY + 1.4, z0: cylZ - 1, z1: 0.6, top: C.orange }} />
          {brake > 0 && <Puffs at={project(cam, [X, Y1, 0.5])} age={brake * 40} scale={2.2} />}
        </g>
      )}
      {void t}
    </g>
  );
};

export const Catapult: React.FC = () => {
  const { f, Ls, W, dur } = useS("catapult");
  const cut = Ls(17) - 3;
  if (f < cut) {
    const open = prog(f, 2, 16);
    const steam = prog(f, Ls(16) - 4, W(16, 6));
    const rel = W(16, 7);
    const tt = Math.max(0, (f - rel) / FPS);
    const Tl = 0.9;
    const k = Math.min(1, tt / Tl);
    const shuttleY = lerp(162, 296, k * k);
    const brake = tt > Tl ? clamp01((tt - Tl) / 1.3) : 0;
    const jy = tt < Tl ? shuttleY + 4 : 300 + (tt - Tl) * 150;
    const jz = tt < Tl ? 0.4 : 0.4 + (tt - Tl) * 22 + 10 * (tt - Tl) * (tt - Tl);
    const cam = camAt(f, { tx: 6, ty: 205, tz: -2, zoom: 4.1, yaw: -40, pitch: 54, F: 800 }, [{ f: 0 }, { f: rel, zoom: 4.6, ty: 215 }, { f: cut, zoom: 3.6, ty: 255, tz: 8 }]);
    const lab = (txt: string, anchor: V3, at: number, dx: number, dy: number, col: string = "#fff") => <Label cam={cam} anchor={anchor} dx={dx} dy={dy} text={txt} color={col} p={prog(f, at, at + 12) * (1 - prog(f, rel + 4, rel + 12))} />;
    return (
      <Stage dur={dur} exit="cut">
        <Ocean cam={cam} t={f} />
        <GenericCarrier cam={cam} open={open} steam={steam} shuttleY={shuttleY} brake={brake} t={f} />
        {tt > 0 && <Trail cam={cam} pts={Array.from({ length: 14 }, (_, i) => { const q = Math.max(0, tt - 0.5 + i * 0.036); const kk = Math.min(1, q / Tl); return [6, q < Tl ? lerp(162, 296, kk * kk) + 4 : 300 + (q - Tl) * 150, q < Tl ? 0.4 : 0.4 + (q - Tl) * 22] as V3; })} width={8} />}
        <MigJet cam={cam} pos={[6, jy, jz]} heading={0} scale={1.6} />
        {lab("STEAM CYLINDERS", [7.2, 200, -3.2], 14, 110, 170, C.cyan)}
        {lab("SHUTTLE", [6, 163, 0.6], Ls(16), -100, -170, C.orange)}
        {lab("WATER BRAKE", [6, 297, -3], Ls(16) + 14, 90, -150)}
        <Keyword text="CATAPULT" f={f} at={W(16, 6) - 2} until={cut - 2} y={470} size={96} color={C.cyan} />
        <Tag text="GENERIC CATOBAR CARRIER · NOT INS VIKRANT" x={48} y={1180} p={prog(f, 4, 14)} color="#c0c8d4" />
      </Stage>
    );
  }
  // match cut: same framing, INS Vikrant's ski-jump
  const g = f - cut;
  const T = 1.3;
  const tt = (g - 16) / FPS;
  const st = ski(tt, T, 160);
  const cam = camAt(g, { tx: -2, ty: 215, tz: -2, zoom: 2.9, yaw: -36, pitch: 56, F: 900 }, [{ f: 0 }, { f: dur - cut, zoom: 3.2, ty: 235, tz: 6 }]);
  return (
    <Stage dur={dur} enter="cut">
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="k2" parkedType="mig" rampGlow={prog(g, 6, 18)} />
      {tt > 0 && <Trail cam={cam} pts={trail((t) => ski(t, T, 160).pos, tt, 0.7)} width={8} />}
      <Jet cam={cam} pos={st.pos} pitch={st.pitch} scale={JS} gear={st.gear} volume exhaust={1} t={f} />
      <Tag text="INS VIKRANT · SKI-JUMP (STOBAR) · NO CATAPULT" x={48} y={1180} p={prog(g, 4, 14)} />
    </Stage>
  );
};

// ======================= 6. LANDING =======================
const CockpitOverlay: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <path d="M-20 1920 L-20 1500 Q 200 1380 420 1560 L 470 1920 Z" fill="#0a0f16" opacity={0.92} />
    <path d="M1100 1920 L1100 1500 Q 880 1380 660 1560 L 610 1920 Z" fill="#0a0f16" opacity={0.92} />
    <path d="M440 1920 Q 540 1600 640 1920 Z" fill="#7c8796" />
    <path d="M500 1920 Q 540 1720 580 1920 Z" fill="#9aa5b4" />
    <g stroke="#7dffb8" strokeWidth={2.5} fill="none" opacity={0.75}>
      <circle cx={540} cy={900 + Math.sin(f * 0.2) * 4} r={16} />
      <line x1={500} y1={900} x2={524} y2={900} /><line x1={556} y1={900} x2={580} y2={900} /><line x1={540} y1={884} x2={540} y2={872} />
      {[-1, 1].map((k) => <g key={k}><line x1={380} y1={900 + k * 140} x2={470} y2={900 + k * 140} strokeDasharray={k > 0 ? "10 8" : undefined} /><line x1={610} y1={900 + k * 140} x2={700} y2={900 + k * 140} strokeDasharray={k > 0 ? "10 8" : undefined} /></g>)}
    </g>
  </g>
);

export const Landing: React.FC = () => {
  const { f, Ls, W, dur } = useS("landing");
  const c1 = Ls(19) - 3, c2 = Ls(20) - 3, c3 = Ls(22) - 3, c4 = Ls(23) - 3;
  const catchF = W(22, 4);
  // ---- 1: first-person approach
  if (f < c1) {
    const s = -520 + 190 * (f / FPS);
    const tgt = angPoint(12);
    const dist = Math.max(60, 12 - s);
    const cam = cam0({ tx: tgt[0], ty: tgt[1], tz: 0, yaw: -AH + Math.sin(f * 0.05) * 1.2, pitch: 83.5, F: dist, zoom: 2300 / (1.4 * dist), ...{ cy: 980 + Math.sin(f * 0.13) * 6 } });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="l1" parkedType="mig" wireGlow={0.4} />
        <CockpitOverlay f={f} />
        <Tag text="FINAL APPROACH" x={48} y={1180} p={prog(f, 6, 16)} />
      </Stage>
    );
  }
  // ---- 2: underside close-up, hook drops
  if (f < c2) {
    const g = f - c1;
    const s = -240 + 60 * (g / FPS);
    const pos = appr(s);
    const piv = jetLocal([0, -4.8, -0.6], pos, AH, 4, JS);
    const cam = cam0({ tx: piv[0], ty: piv[1], tz: piv[2] - 1, yaw: -AH + 100, pitch: 86, zoom: 15, F: 320 });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Jet cam={cam} pos={pos} heading={AH} pitch={4} scale={JS} gear={1} volume hook={prog(f, W(19, 4) - 6, W(19, 4) + 4)} exhaust={0.3} t={f} shadow={0} />
        {f > W(19, 4) - 2 && <circle cx={project(cam, hookPt(pos, 4, false))[0]} cy={project(cam, hookPt(pos, 4, false))[1]} r={22 + 8 * Math.sin(f * 0.4)} fill="none" stroke={C.orange} strokeWidth={3} opacity={0.7} />}
        <Keyword text={"ARRESTING\nHOOK"} f={f} at={W(19, 4) - 2} until={c2 + 10} y={480} size={88} color={C.orange} />
      </Stage>
    );
  }
  // ---- 3: top-down over the stern, then the wires light up
  if (f < c3) {
    const g = f - c2;
    const s = pieces(f, [[c2, -110], [Ls(21), -60], [c3, -22]]);
    const pos = appr(s);
    const cam = camAt(g, { tx: angPoint(36)[0], ty: angPoint(36)[1], zoom: 4.6, yaw: -AH, pitch: 5, F: 2000 }, [{ f: 0 }, { f: c3 - c2, tx: angPoint(42)[0], ty: angPoint(42)[1], zoom: 5.4, yaw: -AH + 22, pitch: 34 }]);
    const wg = prog(f, W(21, 4) - 4, W(21, 4) + 8);
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="l3" parkedType="mig" wireGlow={wg} />
        <Jet cam={cam} pos={pos} heading={AH} pitch={4} scale={JS} gear={1} volume hook={1} exhaust={0.3} t={f} />
        {WIRES.map((w, i) => { const p = project(cam, angPoint(w, 15, 0)); return <text key={i} x={p[0] + 10} y={p[1] + 10} fill={C.orange} fontFamily="JetBrains Mono" fontWeight={600} fontSize={34} opacity={wg}>{i + 1}</text>; })}
        <Label cam={cam} anchor={angPoint(WIRES[2], -12, 0.3)} dx={-80} dy={-190} text="3 ARRESTER WIRES" color={C.orange} p={prog(f, W(21, 4), W(21, 4) + 14)} />
      </Stage>
    );
  }
  // ---- 4: slow-motion engagement close-up
  if (f < c4) {
    const sf = slowmo(f, catchF - 10, catchF + 22, 0.3);
    const s = pieces(sf, [[c3, -38], [catchF, WIRES[1] + 12.5 + 8], [catchF + 60, WIRES[1] + 50]]);
    const pos = appr(s);
    const hd = hookPt(pos, 1, s > -6);
    const caught = f >= catchF;
    const cam = cam0({ tx: angPoint(WIRES[1] + 2)[0], ty: angPoint(WIRES[1] + 2)[1], tz: 1.5, yaw: -AH + 74, pitch: 80, zoom: 12, F: 340, ...shakeCam(f, caught ? 6 * Math.exp(-(f - catchF) / 8) : 0) });
    const hs = project(cam, hd);
    return (
      <Stage dur={dur} enter="cut" exit="cut" flash={caught ? 0.25 * Math.exp(-(f - catchF) / 3) : 0}>
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Carrier cam={cam} t={f} v2 gid="l4" parkedType="mig" wireGlow={0.5} catch={caught ? { wire: 1, hook: hd, amt: 1 } : null} />
        <Jet cam={cam} pos={pos} heading={AH} pitch={1} scale={JS} gear={1} volume hook={1} hookDown={s > -6 ? 1 : 0} exhaust={0.4} t={f} />
        {s > -6 && <Sparks at={hs} f={f} seed={3} size={1.2} />}
        {caught && <Puffs at={project(cam, jetLocal([1.25, -1.2, -0.55 - 1.4], pos, AH, 1, JS))} age={f - catchF} scale={1.4} />}
      </Stage>
    );
  }
  // ---- 5: pull back with deck cutaway, 2-second stop
  const k = clamp01((f - catchF) / (2 * FPS));
  const s = WIRES[1] + 20 + 62 * (1 - Math.pow(1 - k, 2.4));
  const pos = appr(s);
  const hd = hookPt(pos, 1, true);
  const cam = camAt(f - c4, { tx: angPoint(55)[0], ty: angPoint(55)[1], tz: -3, zoom: 7.0, yaw: -AH + 28, pitch: 50, F: 800 }, [{ f: 0 }, { f: dur - c4, zoom: 5.6, tx: angPoint(72)[0], ty: angPoint(72)[1], pitch: 46 }]);
  return (
    <Stage dur={dur} enter="cut">
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="l5" parkedType="mig" catch={{ wire: 1, hook: hd, amt: 1 }} cutaway={prog(f, c4, c4 + 12)} wireEnergy={1 - k * 0.6} />
      <Jet cam={cam} pos={pos} heading={AH} pitch={1} scale={JS} gear={1} volume hook={1} hookDown={1} exhaust={0.4} t={f} />
      <Label cam={cam} anchor={angPoint(WIRES[1] - 6, -10, -9)} dx={-60} dy={-180} text="ARRESTING ENGINES" color={C.orange} p={prog(f, c4 + 10, c4 + 24)} />
      <Label cam={cam} anchor={angPoint(WIRES[1], 0, 0.3)} dx={-40} dy={-300} text="WIRE ABSORBS THE ENERGY" color="#fff" p={prog(f, c4 + 2, c4 + 14)} />
      <Timer x={720} y={1110} p={k} show={prog(f, catchF - 6, catchF + 4)} />
    </Stage>
  );
};

// ======================= 7. TWIST =======================
export const Twist: React.FC = () => {
  const { f, Ls, W, dur } = useS("twist");
  const td = W(25, 4), full = W(26, 4);
  const c1 = Ls(25) - 3, c2 = Ls(26) - 3, c3 = Ls(28) - 3, c4 = Ls(29) - 3, c5 = Ls(30) - 3;
  const edge = 172;
  // story time: slow motion through the roll and the miss
  const sf = slowmo(f, td + 6, c4, 0.45);
  const go = slowmo(c4, td + 6, c4, 0.45);
  const sFn = (q: number) => q < td ? pieces(q, [[0, -170], [td, 8]]) : q < go ? 8 + (q - td) * (70 - 8) / Math.max(1, go - td) : 70 + 30 * ((q - go) / FPS) + 34 * Math.pow((q - go) / FPS, 2);
  const s = sFn(sf);
  const sAt = (ss: number): V3 => ss < edge ? appr(ss) : (() => { const p = angPoint(ss, 0, 0); return [p[0], p[1], GH + (ss - edge) * 0.14 + 0.0004 * Math.pow(ss - edge, 2)] as V3; })();
  const pos = sAt(s);
  const pitch = s < 0 ? 4 : s > edge ? 12 : 1;
  const hd = hookPt(pos, pitch, s > -4 && s < edge);
  const hookS = s - 8.5 * JS;
  const wireRed = WIRES.map((w) => (f >= c3 && hookS > w - 2 ? 1 : 0));
  const ex = 0.25 + 0.75 * prog(f, full - 4, full + 6);
  const jet = (cam: Cam, extra: Partial<React.ComponentProps<typeof Jet>> = {}) => <Jet cam={cam} pos={pos} heading={AH} pitch={pitch} scale={JS} gear={s > edge + 40 ? 0 : 1} volume hook={1} hookDown={s > -4 && s < edge ? 1 : 0} exhaust={ex} t={f} {...extra} />;

  if (f < c1) {
    const cam = cam0({ tx: pos[0], ty: pos[1] + 10, tz: pos[2] - 1, yaw: -AH + 34, pitch: 80, zoom: 6.5, F: 460 });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="t1" parkedType="mig" />
        {jet(cam)}
      </Stage>
    );
  }
  if (f < c3) {
    const impact = f >= td ? Math.exp(-(f - td) / 6) : 0;
    const roar = f >= full ? Math.exp(-(f - full) / 10) : 0;
    const orbit = prog(f, Ls(27), c3);
    const cam = cam0({ tx: angPoint(22)[0], ty: angPoint(22)[1], tz: 2, yaw: -AH + lerp(82, 40, orbit), pitch: 81, zoom: 8.5, F: 380, ...shakeCam(f, 8 * impact + 4 * roar) });
    const wheel = project(cam, jetLocal([1.25, -1.2, -0.55 - 1.4], pos, AH, pitch, JS));
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Carrier cam={cam} t={f} v2 gid="t2" parkedType="mig" />
        {jet(cam)}
        <Puffs at={wheel} age={f - td} scale={1.6} />
        <Label cam={cam} anchor={jetLocal([1.25, -1.2, -2.6], pos, AH, pitch, JS)} dx={70} dy={210} text="WHEELS DOWN" p={prog(f, td - 2, td + 12) * (1 - prog(f, full - 6, full))} />
        <Keyword text={"FULL\nPOWER"} f={f} at={full - 2} until={Ls(27) + 10} y={470} size={104} color={C.cyan} />
      </Stage>
    );
  }
  if (f < c4) {
    const cam = cam0({ tx: angPoint(50)[0], ty: angPoint(50)[1], tz: 1, yaw: -AH + 84, pitch: 80, zoom: 11, F: 360 });
    const hs = project(cam, hd);
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} blur={2} />
        <Carrier cam={cam} t={f} v2 gid="t3" parkedType="mig" wireRed={wireRed} />
        {jet(cam)}
        <Sparks at={hs} f={f} seed={7} n={22} size={1.3} />
        <Label cam={cam} anchor={angPoint(WIRES[1], 12, 0.3)} dx={60} dy={220} text="MISSED!" color={C.red} p={prog(f, W(28, 6) - 4, W(28, 6) + 8)} />
      </Stage>
    );
  }
  if (f < c5) {
    const cam = cam0({ tx: pos[0], ty: Math.min(pos[1], angPoint(edge + 30)[1]) - 6, tz: Math.min(pos[2], 30), yaw: -AH + 90, pitch: 78, zoom: 4.2, F: 520 });
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="t4" parkedType="mig" wireRed={wireRed} />
        <Trail cam={cam} pts={Array.from({ length: 16 }, (_, i) => sAt(s - 50 + (50 * i) / 15))} width={8} />
        <Ghosts render={(k, o) => <Jet key={k} cam={cam} pos={sAt(sFn(sf - k))} heading={AH} pitch={pitch} scale={JS} gear={1} volume opacity={o} shadow={0} />} />
        {jet(cam)}
      </Stage>
    );
  }
  // the version without enough speed: off the edge and into the sea
  const gt = (f - c5) / FPS;
  const gS = edge + Math.min(gt, 1.4) * 34;
  const gp = angPoint(gS, -Math.min(gt, 1.4) * 22, GH - 24.5 * Math.pow(Math.min(gt, 1.4), 2));
  const gz = Math.max(SEA - 2, gp[2]);
  const cam = cam0({ tx: angPoint(edge + 10)[0], ty: angPoint(edge + 10)[1], tz: -4, yaw: -AH + 40, pitch: 56, zoom: 4.6, F: 700 });
  const splash = clamp01((gt - 0.85) / 1.2);
  const sc = project(cam, [gp[0], gp[1], SEA]);
  return (
    <Stage dur={dur} enter="cut">
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="t5" parkedType="mig" wireRed={[1, 1, 1]} />
      <path d={path(cam, Array.from({ length: 14 }, (_, i) => { const q = Math.min(gt, 1.4) * (i / 13); return angPoint(edge + q * 34, -q * 22, Math.max(SEA, GH - 24.5 * q * q)); }))} stroke={C.red} strokeWidth={3} strokeDasharray="10 8" fill="none" opacity={0.85} />
      {splash > 0 && [0, 1, 2].map((k) => <ellipse key={k} cx={sc[0]} cy={sc[1]} rx={(30 + 110 * splash + k * 30)} ry={(12 + 40 * splash + k * 11)} fill="none" stroke="#dfe8f0" strokeWidth={3} opacity={(1 - splash) * 0.8} />)}
      {splash > 0 && <Puffs at={sc} age={splash * 40} scale={2.4} />}
      {splash < 0.35 && <Jet cam={cam} pos={[gp[0], gp[1], gz]} heading={AH} pitch={-20} scale={JS} ghost groundZ={SEA} />}
      <Label cam={cam} anchor={angPoint(edge, 0, 0)} dx={80} dy={-200} text="NOT ENOUGH SPEED" color={C.red} p={prog(f, c5 + 4, c5 + 16)} />
    </Stage>
  );
};

// ======================= 8. BACKUP =======================
export const Backup: React.FC = () => {
  const { f, W, dur } = useS("backup");
  const s = WIRES[1] + 70;
  const pos = appr(s);
  const hd = hookPt(pos, 1, true);
  const cam = camAt(f, { tx: pos[0], ty: pos[1] + 4, tz: 2.5, yaw: -AH + 152, pitch: 81, zoom: 7.6, F: 380 }, [{ f: 0 }, { f: dur, yaw: -AH + 168, zoom: 9.4 }]);
  const title = prog(f, W(32, 2) - 2, W(32, 2) + 10);
  return (
    <Stage dur={dur}>
      <SkyHorizon cam={cam} />
      <Ocean cam={cam} t={f} blur={2} />
      <Carrier cam={cam} t={f} v2 gid="b" parkedType="mig" catch={{ wire: 1, hook: hd, amt: 1 }} />
      <Jet cam={cam} pos={pos} heading={AH} pitch={1} scale={JS} gear={1} volume hook={1} hookDown={1} exhaust={1} t={f} />
      <g opacity={title} transform={`translate(${(1 - title) * -30},0)`}>
        <text x={60} y={470} fill="#eef2f7" fontFamily="Unbounded" fontWeight={800} fontSize={100} letterSpacing={-2} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.6)", strokeWidth: 8 }}>Controlled</text>
        <text x={60} y={582} fill="#eef2f7" fontFamily="Unbounded" fontWeight={800} fontSize={100} letterSpacing={-2} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.6)", strokeWidth: 8 }}>crash.</text>
        <rect x={64} y={612} width={260 * title} height={6} fill={C.orange} />
      </g>
      <Tag text="HOOK CAUGHT + ENGINE AT FULL POWER" x={48} y={1180} p={prog(f, W(33, 2), W(33, 2) + 10)} color={C.orange} />
    </Stage>
  );
};

// ======================= 9. FINALE =======================
export const Finale: React.FC = () => {
  const { f, Ls, W, dur } = useS("finale");
  const c1 = Ls(35) - 3, c2 = Ls(36) - 3;
  if (f < c1) {
    // a clean, successful trap + mechanism close-up
    const catchF = W(34, 4);
    const sf = slowmo(f, catchF - 6, catchF + 14, 0.4);
    const s = sf < catchF ? pieces(sf, [[0, -120], [catchF, WIRES[0] + 20]]) : WIRES[0] + 20 + 60 * (1 - Math.pow(1 - clamp01((f - catchF) / 60), 2.4));
    const pos = appr(s);
    const caught = f >= catchF;
    const hd = hookPt(pos, 1, s > -4);
    const push = prog(f, catchF + 10, c1);
    const cam = cam0({ tx: lerp(angPoint(40)[0], hd[0], push), ty: lerp(angPoint(40)[1], hd[1], push), tz: 2, yaw: -AH + 44, pitch: lerp(74, 70, push), zoom: lerp(5, 11, push), F: 480, ...shakeCam(f, caught ? 5 * Math.exp(-(f - catchF) / 8) : 0) });
    return (
      <Stage dur={dur} exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="f1" parkedType="mig" catch={caught ? { wire: 0, hook: hd, amt: 1 } : null} />
        <Jet cam={cam} pos={pos} heading={AH} pitch={1} scale={JS} gear={1} volume hook={1} hookDown={s > -4 ? 1 : 0} exhaust={caught ? 1 : 0.35} t={f} />
        {s > -4 && !caught && <Sparks at={project(cam, hd)} f={f} seed={11} />}
      </Stage>
    );
  }
  if (f < c2) {
    const g = f - c1;
    const cam = camAt(g, { tx: angPoint(110)[0], ty: angPoint(110)[1], tz: 2, zoom: 7, yaw: -AH + 40, pitch: 66, F: 900 }, [{ f: 0 }, { f: c2 - c1, tx: 0, ty: 130, tz: 0, zoom: 1.5, yaw: -50, pitch: 58, F: 1600 }]);
    return (
      <Stage dur={dur} enter="cut" exit="cut">
        <SkyHorizon cam={cam} />
        <Ocean cam={cam} t={f} />
        <Carrier cam={cam} t={f} v2 gid="f2" parkedType="mig" wake={prog(g, 0, 30)} catch={{ wire: 0, hook: hookPt(appr(WIRES[0] + 80), 1, true), amt: 1 }} />
        <Jet cam={cam} pos={appr(WIRES[0] + 80)} heading={AH} pitch={1} scale={JS} gear={1} volume hook={1} hookDown={1} t={f} />
        <LightRays t={f} amt={prog(g, 10, 40)} />
      </Stage>
    );
  }
  // tricolour over the horizon, ship sailing, title
  const g = f - c2;
  const cam = camAt(g, { tx: 0, ty: 140, tz: 0, zoom: 1.45, yaw: -38, pitch: 83.5, F: 1500, cy: 940 }, [{ f: 0 }, { f: dur - c2, yaw: -26, zoom: 1.6 }]);
  const hy = horizonY(cam);
  const flag = prog(g, 2, 26);
  const title = prog(f, W(37, 0) - 4, W(37, 0) + 12);
  return (
    <Stage dur={dur} enter="fade">
      <SkyHorizon cam={cam} warm={1} />
      <LightRays t={f} amt={0.9} from={[780, hy - 260]} />
      <Ocean cam={cam} t={f} />
      <Carrier cam={cam} t={f} v2 gid="f3" parkedType="mig" wake={1} />
      <g opacity={flag} transform={`translate(0,${(1 - flag) * 40})`}>
        <IndianFlag x={350} y={Math.max(380, Math.min(hy - 330, 420))} w={380} t={f} />
      </g>
      <g opacity={title}>
        <text x={540} y={1110} textAnchor="middle" fill="#f2f5f9" fontFamily="Unbounded" fontWeight={800} fontSize={92} letterSpacing={2} style={{ paintOrder: "stroke", stroke: "rgba(4,7,12,0.6)", strokeWidth: 8 }}>INS VIKRANT</text>
        <rect x={540 - 170 * title} y={1136} width={340 * title} height={4} fill={C.saffron} />
        <text x={540} y={1190} textAnchor="middle" fill="rgba(235,242,250,0.8)" fontFamily="JetBrains Mono" fontWeight={600} fontSize={30} letterSpacing={6}>BHARATIYA NAUSENA</text>
      </g>
    </Stage>
  );
};

export const SCENES_V2: Record<string, React.FC> = { cold: Cold, hook: Hook, imagine: Imagine, runway: Runway, skijump: SkiJump, catapult: Catapult, landing: Landing, twist: Twist, backup: Backup, finale: Finale };
