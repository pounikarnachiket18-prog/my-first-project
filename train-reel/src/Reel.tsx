import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import T from "./timeline.json";
import { setTheme, TH } from "./theme";
import { useFontsReady } from "./three/fonts";
import { Board, Cabin, Cam, Card3D, ClockBadge, Lights, Room, ROOM, Speaker, Station, Train, trainOffset, V3 } from "./three/Parts";
import { drawScreen, ROW_H, ROW_Y0, SCREEN_H, SCREEN_W, ScreenState, SEQUENCE } from "./three/screenUI";
import { BOARD, CardState, pillTex } from "./three/textures";

/* ---------------------------------------------------------------- helpers */
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outC = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const l3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const R = (p: V3): V3 => [p[0] + ROOM[0], p[1] + ROOM[1], p[2] + ROOM[2]];

type Move = { p0: V3; t0: V3; p1: V3; t1: V3; fov?: number; fov1?: number };
const camAt = (m: Move, f: number, dur: number, ease = inOut) => {
  const t = ease(clamp(f / dur));
  return { pos: l3(m.p0, m.p1, t), target: l3(m.t0, m.t1, t), fov: lerp(m.fov ?? 50, m.fov1 ?? m.fov ?? 50, t) };
};

const SPEAKER: V3 = [0, 5.75, 2.3];
const BOARD_POS: V3 = [3.6, 4.7, 3.0];

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

const StationSet: React.FC<{ dist: number; speed: number; children?: React.ReactNode }> = ({ dist, speed, children }) => (
  <>
    <Lights />
    <Station />
    <Speaker position={SPEAKER} />
    <Speaker position={[-34, 5.75, 2.3]} />
    <Speaker position={[30, 5.75, 2.3]} />
    <Board position={BOARD_POS} />
    <Board position={[-40, 4.7, 3.0]} />
    <Cabin />
    <Train x={trainOffset(dist)} blur={speed > 0.22} />
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
const CARDS = [...layoutRow(ROW1, 0.62, 3.4, 1.0), ...layoutRow(ROW2, 0.58, 2.62, 1.0)];
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

const cardState = (i: number, idx: number, gold?: boolean): CardState => (i === idx ? "active" : gold ? "gold" : "normal");

/* ------------------------------------------------------------------ title */
const Title: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 2, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 250, opacity: a }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          width: 1100,
          height: 560,
          background: `radial-gradient(ellipse 55% 48% at 50% 50%, rgba(${TH().titleGlow},1) 35%, rgba(${TH().titleGlow},0.85) 55%, rgba(${TH().titleGlow},0) 75%)`,
        }}
      />
      <div style={{ position: "relative", textAlign: "center", transform: `translateY(${(1 - a) * -40}px)`, textShadow: `0 0 12px rgb(${TH().titleGlow}), 0 0 28px rgb(${TH().titleGlow}), 0 0 50px rgb(${TH().titleGlow})` }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: 112, color: TH().title1, letterSpacing: -2, lineHeight: 1.05 }}>Announcement</div>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: 104, color: TH().title2, letterSpacing: -2, lineHeight: 1.05 }}>ruk-ruk ke kyun?</div>
      </div>
    </AbsoluteFill>
  );
};

const Flash: React.FC<{ f: number; len?: number }> = ({ f, len = 7 }) => (
  <AbsoluteFill style={{ background: TH().bg, opacity: interpolate(f, [0, len], [1, 0], { extrapolateRight: "clamp" }) }} />
);

/* ---------------------------------------------------------- screen texture */
const useScreen = (state: ScreenState) => {
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

const S01: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [-2.6, 2.2, 10.2], t0: [1.4, 4.7, 2.4], p1: [-1.9, 2.35, 9.4], t1: [1.6, 4.7, 2.4], fov: 54 }, f, dur);
  return (
    <>
      <Canvas3D>
        <StationSet dist={g * 0.9} speed={0.9}>
          <Cam {...c} />
        </StationSet>
      </Canvas3D>
      <Title f={f} />
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

const S02: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [0.4, 3.5, 9.6], t0: [0.3, 4.4, 2.6], p1: [0.2, 3.6, 8.8], t1: [0.2, 4.35, 2.6], fov: 50 }, f, dur);
  return (
    <Canvas3D>
      <StationSet dist={g * 0.9} speed={0.9}>
        <Emerging f={f} />
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
  );
};

const S03: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [1.5, 3.4, 6.8], t0: [-8, 3.0, 3.6], p1: [-9.5, 2.9, 6.4], t1: [-18, 3.8, 5.7], fov: 55 }, f, dur, (t) => t);
  return (
    <Canvas3D>
      <StationSet dist={g * 0.9} speed={0.9}>
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
  );
};

const S04: React.FC<ShotProps> = ({ f, dur, g }) => {
  const c = camAt({ p0: [-10.2, 4.0, 7.6], t0: [-18, 4.7, 5.7], p1: [-16.4, 2.7, 6.2], t1: [-20.5, 2.2, 7.2], fov: 52 }, f, dur, (t) => t * t);
  return (
    <Canvas3D>
      <StationSet dist={g * 0.9} speed={0.9}>
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
  );
};

const RoomShot: React.FC<{ move: Move; f: number; dur: number; screen: ScreenState; typing: number; ease?: (t: number) => number }> = ({ move, f, dur, screen, typing, ease }) => {
  const tex = useScreen(screen);
  const c = camAt(move, f, dur, ease);
  return (
    <Canvas3D>
      <Lights />
      <Room screen={tex} typing={typing} />
      <Cam {...c} />
    </Canvas3D>
  );
};

const S05: React.FC<ShotProps> = ({ f, dur }) => (
  <>
    <RoomShot f={f} dur={dur} typing={0} screen={{ mode: "trains" }} move={{ p0: R([2.1, 1.85, 1.4]), t0: R([0, 1.05, -1.4]), p1: R([1.2, 1.6, 0.4]), t1: R([0, 1.12, -1.45]), fov: 50 }} />
    <Flash f={f} />
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
    />
  );
};

const S07: React.FC<ShotProps> = ({ f, dur }) => {
  const { fps } = useVideoConfig();
  const rowY = ROW_Y0 + ROW_H / 2;
  const badges = [
    { text: BOARD.no, x: 300, y: rowY - 2, at: 6 },
    { text: `PF ${BOARD.pf}`, x: 790, y: rowY - 2, at: 36 },
    { text: BOARD.time, x: 1200, y: rowY - 2, at: 62 },
  ].map((b) => ({ ...b, s: spring({ frame: f - b.at, fps, config: { damping: 11, stiffness: 170 } }) }));
  // camera pans to each badge as it appears
  const tx = interpolate(f, [0, 14, 36, 48, 62, 76], [260, 300, 300, 790, 790, 1200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  const target = scr(tx, rowY + 20);
  const pos: V3 = [target[0] - 0.02, target[1] + 0.05, -1.619 + ROOM[2] + interpolate(f, [0, dur], [0.62, 0.55])];
  const tex = useScreen({ mode: "trains", sel: 0, badges });
  return (
    <Canvas3D>
      <Lights />
      <Room screen={tex} typing={f / 2} />
      <Cam pos={pos} target={target} fov={48} />
    </Canvas3D>
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
  />
);

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
    />
  );
};

const S11: React.FC<ShotProps> = ({ f, dur }) => {
  const v0 = 0.75;
  const dist = 30 + v0 * f - (v0 * 0.8 * f * f) / (2 * dur);
  const speed = v0 - (v0 * 0.8 * f) / dur;
  const c = camAt({ p0: [-19.4, 2.7, 6.6], t0: [-6, 2.7, 0.5], p1: [-6, 3.3, 7.6], t1: [0.2, 4.6, 2.4], fov: 54 }, f, dur);
  return (
    <Canvas3D>
      <StationSet dist={dist} speed={speed}>
        <Emerging f={f - 36} count={2} />
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
  );
};

const CardWall: React.FC<{ f: number; appearStart: number; playStart: number; clocks?: [number, number]; pauseAt?: number }> = ({ f, appearStart, playStart, clocks, pauseAt }) => {
  const { fps } = useVideoConfig();
  const pl = playIdx(f, playStart, 7, 3);
  const pill = pillTex("PAUSE");
  const pauseP = pauseAt !== undefined ? spring({ frame: f - pauseAt, fps, config: { damping: 12, stiffness: 150 } }) : 0;
  const pauseGap = GAPS.find((gp) => gp.i === 6)!; // between train name and "platform kramank"
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
          <mesh position={[pauseGap.pos[0], pauseGap.pos[1] - 0.05, 1.06]} scale={[1, pauseP, 1]}>
            <planeGeometry args={[0.035, 0.95]} />
            <meshBasicMaterial color={TH().pill} toneMapped={false} />
          </mesh>
          <mesh position={[pauseGap.pos[0], pauseGap.pos[1] - 0.6, 1.08]} scale={pauseP}>
            <planeGeometry args={[0.62, 0.22]} />
            <meshBasicMaterial map={pill} transparent toneMapped={false} />
          </mesh>
        </group>
      )}
    </>
  );
};

const S12: React.FC<ShotProps> = ({ f, dur }) => {
  const c = camAt({ p0: [-0.6, 2.95, 10.4], t0: [0.0, 2.95, 0.8], p1: [0.6, 2.95, 9.6], t1: [0.2, 2.95, 0.8], fov: 50 }, f, dur, (t) => t);
  return (
    <Canvas3D>
      <StationSet dist={f * 0.45 + 12} speed={0.45}>
        <CardWall f={f} appearStart={0} playStart={42} clocks={[60, 112]} />
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
  );
};

const S13: React.FC<ShotProps> = ({ f, dur }) => {
  const c = camAt({ p0: [-1.6, 3.15, 5.0], t0: [-1.2, 3.0, 1.0], p1: [-0.6, 3.0, 4.3], t1: [-0.7, 2.85, 1.0], fov: 50 }, f, dur);
  return (
    <Canvas3D>
      <StationSet dist={f * 0.35 + 70} speed={0.35}>
        <CardWall f={f + 60} appearStart={0} playStart={60} pauseAt={60 + 62} />
        <Cam {...c} />
      </StationSet>
    </Canvas3D>
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
      <Title f={f + 6} />
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

export const Reel: React.FC<{ theme?: string }> = ({ theme = "default" }) => {
  setTheme(theme);
  return (
  <AbsoluteFill style={{ background: TH().bg }}>
    {T.shots.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
        <ShotHost id={s.id} from={s.from} dur={s.dur} />
      </Sequence>
    ))}
    <Audio src={staticFile("reference-audio.m4a")} />
  </AbsoluteFill>
  );
};
