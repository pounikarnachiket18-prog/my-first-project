import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import T from "./timeline.json";
import { setTheme, TH } from "./theme";
import { Callout, CamState, Cursor, EqBars, FocusRing, GapBracket, KeyPops, KineticTitle, MG, PlayTrack, project, Rings, Seg, SpeedLines, TrainProgress, Wipe } from "./mg";
import { useFontsReady } from "./three/fonts";
import { Board, Cabin, Cam, Card3D, ClockBadge, Lights, Room, ROOM, Speaker, Station, Train, trainLength, trainOffset, V3 } from "./three/Parts";
import { drawScreen, ROW_H, ROW_Y0, SCREEN_H, SCREEN_W, ScreenState, SEQUENCE } from "./three/screenUI";
import { BOARD, CardState, pillTex } from "./three/textures";

/* ---------------------------------------------------------------- helpers */
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outC = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const l3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const R = (p: V3): V3 => [p[0] + ROOM[0], p[1] + ROOM[1], p[2] + ROOM[2]];

type Move = { p0: V3; t0: V3; p1: V3; t1: V3; fov?: number; fov1?: number };
const camAt = (m: Move, f: number, dur: number, ease = inOut) => {
  const t = ease(clamp(f / dur));
  return { pos: l3(m.p0, m.p1, t), target: l3(m.t0, m.t1, t), fov: lerp(m.fov ?? 50, m.fov1 ?? m.fov ?? 50, t) };
};

export const SPEAKER: V3 = [0, 5.75, 2.3];
export const BOARD_POS: V3 = [3.6, 4.7, 3.0];

const Canvas3D: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThreeCanvas
    width={1080}
    height={1920}
    gl={{ antialias: true, preserveDrawingBuffer: true }}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1.05;
    }}
  >
    {children}
  </ThreeCanvas>
);

export const StationSet: React.FC<{ dist: number; speed: number; trainX?: number; nose?: boolean; children?: React.ReactNode }> = ({ dist, speed, trainX, nose, children }) => (
  <>
    <Lights />
    <Station />
    <Speaker position={SPEAKER} />
    <Speaker position={[-34, 5.75, 2.3]} />
    <Speaker position={[30, 5.75, 2.3]} />
    <Board position={BOARD_POS} />
    <Board position={[-40, 4.7, 3.0]} />
    <Cabin />
    <Train x={trainX ?? trainOffset(dist)} blur={speed > 0.22} nose={nose} />
    {children}
  </>
);

/* -------------------------------------------------------------- the cards */
type CardDef = { label: string; aspect: number; gold?: boolean };
const ROW1: CardDef[] = [
  { label: "गाड़ी संख्या", aspect: 2.0 },
  { label: "एक", aspect: 0.85 },
  { label: "दो", aspect: 0.85 },
  { label: "आठ", aspect: 0.85 },
  { label: "चार", aspect: 0.85 },
  { label: "छह", aspect: 0.85 },
];
const ROW2: CardDef[] = [
  { label: "सूरज नगर एक्सप्रेस", aspect: 2.6, gold: true },
  { label: "प्लेटफ़ॉर्म क्रमांक", aspect: 2.4 },
  { label: "तीन", aspect: 0.85 },
  { label: "पर आ रही है", aspect: 2.0 },
];
const layoutRow = (row: CardDef[], h: number, y: number, z: number, gap = 0.1) => {
  const total = row.reduce((a, c) => a + c.aspect * h, 0) + gap * (row.length - 1);
  let x = -total / 2;
  return row.map((c) => {
    const w = c.aspect * h;
    const cx = x + w / 2;
    x += w + gap;
    return { ...c, pos: [cx, y, z] as V3, w, h };
  });
};
export const CARDS = [...layoutRow(ROW1, 0.62, 3.4, 1.0), ...layoutRow(ROW2, 0.58, 2.62, 1.0)];
const GAPS = CARDS.slice(0, -1)
  .map((c, i) => ({ a: c, b: CARDS[i + 1], i }))
  .filter(({ a, b }) => a.pos[1] === b.pos[1])
  .map(({ a, b, i }) => ({ i, pos: [(a.pos[0] + a.w / 2 + b.pos[0] - b.w / 2) / 2, a.pos[1], 1.02] as V3 }));

/** Which sequence clip is playing at local frame f (6 frames sound + 3 frames gap). */
const playIdx = (f: number, start: number, on = 6, off = 3) => {
  if (f < start) return { idx: -1, gap: -1 };
  const k = Math.floor((f - start) / (on + off)) % SEQUENCE.length;
  const inGap = (f - start) % (on + off) >= on;
  return { idx: inGap ? -1 : k, gap: inGap ? k : -1 };
};

export const cardState = (i: number, idx: number, gold?: boolean): CardState => (i === idx ? "active" : gold ? "gold" : "normal");

/* ---------------------------------------------------------- screen texture */
export const useScreen = (state: ScreenState) => {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = SCREEN_W;
    c.height = SCREEN_H;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  drawScreen(canvas.getContext("2d")!, state);
  tex.needsUpdate = true;
  return tex;
};

/* screen-space (canvas px) -> world point on the monitor */
const scr = (x: number, y: number, z = 0): V3 => R([(x / SCREEN_W - 0.5) * 1.04, 1.335 + (0.5 - y / SCREEN_H) * 0.62, -1.619 + z]);

/* ================================================================== SHOTS */
type ShotProps = { f: number; dur: number; g: number };

const hornL: V3 = [SPEAKER[0] - 0.95, SPEAKER[1] - 0.35, SPEAKER[2]];
const hornR: V3 = [SPEAKER[0] + 0.95, SPEAKER[1] - 0.35, SPEAKER[2]];
const SpeakerRings: React.FC<{ c: CamState; f: number }> = ({ c, f }) => {
  const [lx, ly] = project(c, hornL);
  const [rx, ry] = project(c, hornR);
  return (
    <>
      <Rings x={lx} y={ly} f={f} />
      <Rings x={rx} y={ry} f={f + 8} />
    </>
  );
};
/** screen-space box of a 3D rectangle centred at p (w x h metres, facing +z) */
const boxOf = (c: CamState, p: V3, w: number, h: number) => {
  const [x1, y1] = project(c, [p[0] - w / 2, p[1] + h / 2, p[2]]);
  const [x2, y2] = project(c, [p[0] + w / 2, p[1] - h / 2, p[2]]);
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
};

const S01: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [-2.6, 2.2, 10.2], t0: [1.4, 4.7, 2.4], p1: [-1.9, 2.35, 9.4], t1: [1.6, 4.7, 2.4], fov: 54 }, f, dur);
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <SpeedLines f={f} amount={0.9} top={1250} bottom={1800} />
      <SpeakerRings c={c} f={f} />
      <KineticTitle f={f} />
    </>
  );
};

const EMERGE = [
  { label: "गाड़ी संख्या", aspect: 2, to: [-0.95, 4.05, 3.5] as V3, at: 2 },
  { label: "एक", aspect: 0.85, to: [0.55, 4.05, 3.5] as V3, at: 20 },
  { label: "दो", aspect: 0.85, to: [1.2, 4.05, 3.5] as V3, at: 34 },
];
const Emerging: React.FC<{ f: number; count?: number }> = ({ f, count = 3 }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {EMERGE.slice(0, count).map((e, i) => {
        const p = spring({ frame: f - e.at, fps, config: { damping: 15, stiffness: 120 } });
        const from: V3 = [SPEAKER[0] + (i === 0 ? -0.7 : 0.7), SPEAKER[1] - 0.25, SPEAKER[2]];
        const newest = EMERGE.filter((x, k) => k < count && f >= x.at).length - 1;
        return <Card3D key={i} label={e.label} aspect={e.aspect} height={0.58} position={l3(from, e.to, p)} appear={clamp(p * 1.2)} state={i === newest ? "active" : "normal"} />;
      })}
    </>
  );
};

/** dashed connectors from the horn to each emerging card, with numbered tags + pause icons */
const EmergeGraphics: React.FC<{ c: CamState; f: number; count?: number }> = ({ c, f, count = 3 }) => {
  const [sx, sy] = project(c, [SPEAKER[0], SPEAKER[1] - 0.3, SPEAKER[2]]);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {EMERGE.slice(0, count).map((e, i) => {
          if (f < e.at) return null;
          const [x, y] = project(c, [e.to[0], e.to[1] + 0.29, e.to[2]]);
          const t = clamp((f - e.at) / 10);
          return (
            <g key={i}>
              <path d={`M ${sx} ${sy} Q ${(sx + x) / 2} ${Math.min(sy, y) - 120} ${sx + (x - sx) * t} ${sy + (y - sy) * t}`} fill="none" stroke={MG.blue()} strokeWidth={5} strokeDasharray="14 12" strokeDashoffset={-f * 3} strokeLinecap="round" />
              <g transform={`translate(${x} ${y - 30}) scale(${t})`}>
                <circle r={30} fill={MG.blue()} />
                <text y={12} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={32} fill="#fff">
                  {i + 1}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      {EMERGE.slice(1, count).map((e, i) => {
        const prev = EMERGE[i];
        const [x, y] = project(c, [(prev.to[0] + prev.aspect * 0.29 + e.to[0] - e.aspect * 0.29) / 2, e.to[1] - 0.45, e.to[2]]);
        return <GapBracket key={i} x={x} y={y} f={f} at={e.at + 6} label="" />;
      })}
    </>
  );
};

const S02: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [0.4, 3.5, 9.6], t0: [0.3, 4.4, 2.6], p1: [0.2, 3.6, 8.8], t1: [0.2, 4.35, 2.6], fov: 50 }, f, dur);
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Emerging f={f} />
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <SpeedLines f={f} amount={0.6} top={1300} bottom={1800} />
      <SpeakerRings c={c} f={f} />
      <EmergeGraphics c={c} f={f} />
    </>
  );
};

const CABIN_SIGN: V3 = [-17.9, 5.05, 5.7];

const S03: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [1.5, 3.4, 6.8], t0: [-8, 3.0, 3.6], p1: [-9.5, 2.9, 6.4], t1: [-18, 3.8, 5.7], fov: 55 }, f, dur, (t) => t);
  const [x, y] = project(c, CABIN_SIGN);
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <SpeedLines f={f} amount={1} dir={1} />
      <Callout x={Math.max(60, Math.min(700, x))} y={Math.max(400, y)} f={f} at={10} label="उद्घोषणा कक्ष" hindi dx={140} dy={-180} />
    </>
  );
};

const S04: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [-10.2, 4.0, 7.6], t0: [-18, 4.7, 5.7], p1: [-16.4, 2.7, 6.2], t1: [-20.5, 2.2, 7.2], fov: 52 }, f, dur, (t) => t * t);
  const b = boxOf(c, CABIN_SIGN, 0.1, 1.2);
  const [w] = [Math.abs(project(c, [CABIN_SIGN[0], CABIN_SIGN[1], CABIN_SIGN[2] - 2.05])[0] - project(c, [CABIN_SIGN[0], CABIN_SIGN[1], CABIN_SIGN[2] + 2.05])[0])];
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      {f < 18 && <FocusRing x={b.x} y={b.y} w={w + 60} h={b.h + 60} f={f} at={0} />}
      <SpeedLines f={f} amount={clamp((f - 14) / 10)} dir={1} />
    </>
  );
};

const RoomShot: React.FC<{ move: Move; f: number; dur: number; screen: ScreenState; typing: number; ease?: (t: number) => number; overlay?: (c: CamState) => React.ReactNode }> = ({ move, f, dur, screen, typing, ease, overlay }) => {
  const tex = useScreen(screen);
  const c = camAt(move, f, dur, ease);
  return (
    <>
      <Canvas3D>
        <Lights />
        <Room screen={tex} typing={typing} />
        <Cam {...c} />
      </Canvas3D>
      {overlay?.(c)}
    </>
  );
};

const MONITOR = R([0, 1.335, -1.62]);
const S05: React.FC<ShotProps> = ({ f, dur }) => (
  <>
    <RoomShot
      f={f}
      dur={dur}
      typing={0}
      screen={{ mode: "trains" }}
      move={{ p0: R([2.1, 1.85, 1.4]), t0: R([0, 1.05, -1.4]), p1: R([1.2, 1.6, 0.4]), t1: R([0, 1.12, -1.45]), fov: 50 }}
      overlay={(c) => {
        const b = boxOf(c, MONITOR, 1.08, 0.66);
        return <FocusRing x={b.x} y={b.y} w={b.w + 50} h={b.h + 50} f={f} at={10} />;
      }}
    />
    <Wipe f={f} />
  </>
);

const S06: React.FC<ShotProps> = ({ f, dur }) => {
  const sel = interpolate(f, [10, 40], [5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  return (
    <RoomShot
      f={f}
      dur={dur}
      typing={f / 2}
      screen={{ mode: "trains", sel }}
      move={{ p0: R([0.55, 1.5, -0.1]), t0: R([0, 1.2, -1.55]), p1: R([0.3, 1.42, -0.42]), t1: R([0, 1.24, -1.6]), fov: 50 }}
      overlay={(c) => {
        const [x, y] = project(c, scr(470, ROW_Y0 + sel * ROW_H + 30));
        return <Cursor x={x} y={y} f={f} clicks={[44]} from={[900, 1500]} arrive={[0, 14]} />;
      }}
    />
  );
};

const S07: React.FC<ShotProps> = ({ f, dur }) => {
  const { fps } = useVideoConfig();
  const rowY = ROW_Y0 + ROW_H / 2;
  const badges = [
    { text: BOARD.no, x: 300, y: rowY - 2, at: 6, label: "Train No." },
    { text: `PF ${BOARD.pf}`, x: 790, y: rowY - 2, at: 36, label: "Platform" },
    { text: BOARD.time, x: 1200, y: rowY - 2, at: 62, label: "Time" },
  ].map((b) => ({ ...b, s: spring({ frame: f - b.at, fps, config: { damping: 11, stiffness: 170 } }) }));
  // camera pans to each badge as it appears
  const tx = interpolate(f, [0, 14, 36, 48, 62, 76], [260, 300, 300, 790, 790, 1200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  const target = scr(tx, rowY + 20);
  const pos: V3 = [target[0] - 0.02, target[1] + 0.05, -1.619 + ROOM[2] + interpolate(f, [0, dur], [0.62, 0.55])];
  const tex = useScreen({ mode: "trains", sel: 0, badges });
  const c: CamState = { pos, target, fov: 48 };
  return (
    <>
      <Canvas3D>
        <Lights />
        <Room screen={tex} typing={f / 2} />
        <Cam {...c} />
      </Canvas3D>
      {badges.map((b, i) => {
        const [x, y] = project(c, scr(b.x, b.y + 62));
        return <Callout key={i} x={x} y={y} f={f} at={b.at + 6} label={b.label} dx={i === 2 ? -150 : 150} dy={230} color={i === 1 ? MG.red() : MG.blue()} />;
      })}
    </>
  );
};

const S08: React.FC<ShotProps> = ({ f, dur }) => {
  const steps = ["", "1", "18", "18:", "18:4", "18:40"];
  const k = Math.min(steps.length - 1, Math.max(0, Math.floor((f - 6) / 7)));
  const time = f < 6 ? undefined : steps[k];
  const pressed = clamp((f - 52) / 4) * (f < 62 ? 1 : 0);
  const playing = f >= 60;
  return (
    <RoomShot
      f={f}
      dur={dur}
      typing={f < 50 ? f / 1.6 : 0}
      screen={{ mode: "trains", sel: 0, typed: { no: BOARD.no, pf: BOARD.pf, time, caret: f < 50 && f % 10 < 6 }, pressed, playing }}
      move={{ p0: R([0.75, 1.42, -0.72]), t0: R([0.3, 1.32, -1.62]), p1: R([0.5, 1.5, -0.5]), t1: R([0.2, 1.25, -1.62]), fov: 50 }}
      overlay={(c) => {
        const [kx, ky] = project(c, R([0, 0.87, -1.08]));
        const [fx, fy] = project(c, scr(1300, 470));
        const [bx, by] = project(c, scr(1330, 688));
        return (
          <>
            <KeyPops x={kx} y={ky} f={f} tx={fx} ty={fy} keys={["1", "8", ":", "4", "0"].map((ch, i) => ({ ch, at: 13 + i * 7 }))} />
            <Cursor x={bx} y={by} f={f} clicks={[54]} from={[fx + 200, fy + 300]} arrive={[40, 52]} />
            {playing && <Rings x={bx} y={by} f={f - 60} color={MG.blue()} size={200} />}
          </>
        );
      }}
    />
  );
};

const S09: React.FC<ShotProps> = ({ f, dur }) => (
  <RoomShot
    f={f}
    dur={dur}
    typing={0}
    screen={{ mode: "media", playing: true }}
    move={{ p0: R([0.0, 1.36, -0.1]), t0: R([0, 1.3, -1.62]), p1: R([0.0, 1.34, -0.4]), t1: R([0, 1.32, -1.62]), fov: 50 }}
    overlay={(c) => {
      const [x, y] = project(c, scr(150, 140));
      const g0 = project(c, scr(30, 172));
      const g1 = project(c, scr(1570, 830));
      const sweep = interpolate(f, [6, 50], [g0[1], g1[1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            <defs>
              <linearGradient id="sw" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={MG.blue()} stopOpacity={0} />
                <stop offset="1" stopColor={MG.blue()} stopOpacity={0.35} />
              </linearGradient>
            </defs>
            {f > 6 && f < 54 && <rect x={g0[0]} y={sweep - 120} width={g1[0] - g0[0]} height={120} fill="url(#sw)" />}
            {f > 6 && f < 54 && <rect x={g0[0]} y={sweep - 4} width={g1[0] - g0[0]} height={6} fill={MG.blue()} />}
          </svg>
          <Callout x={x} y={y} f={f} at={4} label="24 clips" dx={120} dy={-170} color={MG.red()} />
        </>
      );
    }}
  />
);

/** playback schedule (local frames) for a sequence played with playIdx(on, off) */
const segsFor = (start: number, on: number, off: number): Seg[] => SEQUENCE.map((l, i) => ({ from: start + i * (on + off), to: start + i * (on + off) + on, gold: l === "सूरज नगर एक्सप्रेस" }));

const S10: React.FC<ShotProps> = ({ f, dur }) => {
  const picked = Math.min(SEQUENCE.length, Math.max(0, Math.floor((f - 2) / 6) + 1));
  const pickFlash = f < 62 ? Math.min(SEQUENCE.length - 1, Math.floor((f - 2) / 6)) : undefined;
  const pl = playIdx(f, 66);
  return (
    <RoomShot
      f={f}
      dur={dur}
      typing={0}
      screen={{ mode: "assemble", picked: f < 2 ? 0 : picked, pickFlash, play: pl.idx, gapAfter: pl.gap, playing: true }}
      move={{ p0: R([0.0, 1.33, 0.0]), t0: R([0, 1.3, -1.62]), p1: R([0.0, 1.28, -0.3]), t1: R([0, 1.27, -1.62]), fov: 50 }}
      overlay={() => <PlayTrack f={f} segs={segsFor(66, 6, 3)} y={1640} show={clamp((f - 56) / 8)} />}
    />
  );
};

const S11: React.FC<ShotProps> = ({ f, dur }) => {
  // the driving car's nose glides in and slows to a stop
  const t = clamp(f / dur);
  const tip = -14 + 30 * outC(t);
  const speed = (30 * 3 * Math.pow(1 - t, 2)) / dur;
  const dist = 0;
  const c = camAt({ p0: [-19.4, 2.7, 6.6], t0: [-6, 2.7, 0.5], p1: [-6, 3.3, 7.6], t1: [0.2, 4.6, 2.4], fov: 54 }, f, dur);
  return (
    <>
      <Canvas3D>
        <StationSet dist={dist} speed={speed} trainX={tip - trainLength()} nose>
          <Emerging f={f - 36} count={2} />
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <SpeedLines f={f} amount={clamp(speed * 1.4)} top={1150} bottom={1850} />
      {f > 34 && <SpeakerRings c={c} f={f} />}
      <Wipe f={f} />
    </>
  );
};

export const CardWall: React.FC<{ f: number; appearStart: number; playStart: number; clocks?: [number, number]; pauseAt?: number }> = ({ f, appearStart, playStart, clocks, pauseAt }) => {
  const { fps } = useVideoConfig();
  const pl = playIdx(f, playStart, 7, 3);
  const pill = pillTex("PAUSE");
  const pauseP = pauseAt !== undefined ? spring({ frame: f - pauseAt, fps, config: { damping: 12, stiffness: 150 } }) : 0;
  return (
    <>
      {CARDS.map((c, i) => {
        const a = spring({ frame: f - appearStart - i * 3, fps, config: { damping: 13, stiffness: 140 } });
        return (
          <Card3D
            key={i}
            label={c.label}
            aspect={c.aspect}
            height={c.h}
            position={[c.pos[0], c.pos[1] + (1 - a) * 0.6, c.pos[2]]}
            appear={clamp(a)}
            state={cardState(i, pl.idx, c.gold)}
          />
        );
      })}
      {clocks &&
        GAPS.map((gp, k) => {
          const a = spring({ frame: f - clocks[0] - k * 3, fps, config: { damping: 12, stiffness: 160 } });
          const out = clamp((clocks[1] - f) / 6);
          return <ClockBadge key={k} position={[gp.pos[0], gp.pos[1] + 0.42, 1.08]} appear={clamp(a) * out * 0.7} spin={-f / 6} />;
        })}
      {pauseAt !== undefined && pauseP > 0.01 && (
        <group>
          <mesh position={[PAUSE_GAP.pos[0], PAUSE_GAP.pos[1] - 0.05, 1.06]} scale={[1, pauseP, 1]}>
            <planeGeometry args={[0.035, 0.95]} />
            <meshBasicMaterial color={TH().pill} toneMapped={false} />
          </mesh>
          <mesh position={[PAUSE_GAP.pos[0], PAUSE_GAP.pos[1] - 0.6, 1.08]} scale={pauseP}>
            <planeGeometry args={[0.62, 0.22]} />
            <meshBasicMaterial map={pill} transparent toneMapped={false} />
          </mesh>
        </group>
      )}
    </>
  );
};
const PAUSE_GAP = GAPS.find((gp) => gp.i === 6)!; // between train name and "platform kramank"

/** equaliser over whichever card is playing */
const ActiveEq: React.FC<{ c: CamState; f: number; playStart: number }> = ({ c, f, playStart }) => {
  const pl = playIdx(f, playStart, 7, 3);
  if (pl.idx < 0) return null;
  const card = CARDS[pl.idx];
  const [x, y] = project(c, [card.pos[0], card.pos[1] + card.h / 2 + 0.05, card.pos[2]]);
  return <EqBars x={x} y={y} f={f} on />;
};

const S12: React.FC<ShotProps> = ({ f, dur }) => {
  const c = camAt({ p0: [-0.6, 2.95, 10.4], t0: [0.0, 2.95, 0.8], p1: [0.6, 2.95, 9.6], t1: [0.2, 2.95, 0.8], fov: 50 }, f, dur, (t) => t);
  return (
    <>
      <Canvas3D>
        <StationSet dist={f * 0.12 + 12} speed={0.12}>
          <CardWall f={f} appearStart={0} playStart={42} clocks={[60, 112]} />
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
            <ActiveEq c={c} f={f} playStart={42} />
      <PlayTrack f={f} segs={segsFor(42, 7, 3)} y={1660} show={clamp((f - 34) / 8)} />
    </>
  );
};

const S13: React.FC<ShotProps> = ({ f, dur }) => {
  const c = camAt({ p0: [-1.6, 3.15, 5.0], t0: [-1.2, 3.0, 1.0], p1: [-0.6, 3.0, 4.3], t1: [-0.7, 2.85, 1.0], fov: 50 }, f, dur);
  const b = boxOf(c, [PAUSE_GAP.pos[0], PAUSE_GAP.pos[1] - 0.2, 1.06], 0.5, 1.4);
  return (
    <>
      <Canvas3D>
        <StationSet dist={f * 0.1 + 30} speed={0.1}>
          <CardWall f={f + 60} appearStart={0} playStart={60} pauseAt={60 + 62} />
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <ActiveEq c={c} f={f + 60} playStart={60} />
      <FocusRing x={b.x} y={b.y} w={b.w + 40} h={b.h + 40} f={f} at={64} color={MG.blue()} />
    </>
  );
};

const S14: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [-0.9, 2.4, 7.4], t0: [1.6, 5.0, 2.4], p1: [-1.2, 2.3, 7.7], t1: [1.6, 5.1, 2.4], fov: 56 }, f, dur);
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <SpeedLines f={f} amount={0.9} top={1250} bottom={1800} />
      <SpeakerRings c={c} f={f} />
      <KineticTitle f={f + 16} />
      <Wipe f={f} len={8} />
    </>
  );
};

const SHOTS: Record<string, React.FC<ShotProps>> = { s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08, s09: S09, s10: S10, s11: S11, s12: S12, s13: S13, s14: S14 };

const ShotHost: React.FC<{ id: string; from: number; dur: number }> = ({ id, from, dur }) => {
  const f = useCurrentFrame();
  const ready = useFontsReady();
  const Comp = SHOTS[id];
  if (!ready) return null;
  return <Comp f={f} dur={dur} g={f + from} />;
};

const Progress: React.FC = () => {
  const g = useCurrentFrame();
  return <TrainProgress g={g} total={T.total} />;
};

export const Reel: React.FC<{ theme?: string }> = ({ theme = "classic" }) => {
  setTheme(theme);
  return (
    <AbsoluteFill style={{ background: TH().bg }}>
      {T.shots.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          <ShotHost id={s.id} from={s.from} dur={s.dur} />
        </Sequence>
      ))}
      <Progress />
      <Audio src={staticFile("reference-audio.m4a")} />
    </AbsoluteFill>
  );
};
