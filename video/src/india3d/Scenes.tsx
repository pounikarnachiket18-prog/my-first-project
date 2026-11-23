import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Auto, Bus, Car, Cow, Dhaba, Gantry, MileStone, Person, Ping, Shop, Truck } from "./kit";
import { CameraRig, Highway, InstancedJam, LANE_A, LANE_B, Lights, makeJam, PAL, rng, Sky, V3 } from "./World";
import { Captions, Chip, DataCard, Header, Honk, Phrase, SpeechBubble, Title } from "./Overlay";

const ease = Easing.bezier(0.45, 0, 0.55, 1);
const lerp3 = (a: V3, b: V3, p: number): V3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

const Stage: React.FC<{ cam: V3; target: V3; fov?: number; focus: V3; fog?: [number, number]; children: React.ReactNode; shadow?: number }> = ({
  cam,
  target,
  fov = 40,
  focus,
  fog = [70, 650],
  children,
  shadow,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov, near: 0.3, far: 2000, position: cam }}
    >
      <CameraRig position={cam} target={target} fov={fov} />
      <fog attach="fog" args={[PAL.fog, fog[0], fog[1]]} />
      <Sky center={cam} />
      <Lights focus={focus} shadowSize={shadow} />
      {children}
    </ThreeCanvas>
  );
};

// ------------------------------------------------------------------ shared traffic
const PLATES = ["MH 12 KT 4581", "MH 01 AB 2207", "MH 14 BX 9034", "MH 43 CD 1188", "MH 04 GR 6612", "GJ 05 RT 7781", "KA 01 MJ 3345", "MH 12 NE 5050", "MH 02 DN 8899", "MH 15 FG 2468"];
const COLS = ["#F4F4F4", "#D7263D", "#2E86AB", "#1B1B1B", "#9AA0A6", "#3D5A80", "#C2A878", "#6A994E"];

type NearV = { kind: "car" | "suv" | "auto" | "truck" | "bus"; x: number; z: number; color?: string; plate: string; ev?: boolean };

const NearTraffic: React.FC<{ list: NearV[]; dz: number; brake?: (i: number) => boolean; onc?: boolean }> = ({ list, dz, brake = () => false, onc }) => (
  <>
    {list.map((v, i) => {
      const p: V3 = [v.x, 0, v.z + dz];
      const rot = onc ? Math.PI : 0;
      if (v.kind === "auto") return <Auto key={i} position={p} rotY={rot} plate={v.plate} brake={brake(i)} />;
      if (v.kind === "truck") return <Truck key={i} position={p} rotY={rot} plate={v.plate} brake={brake(i)} />;
      if (v.kind === "bus") return <Bus key={i} position={p} rotY={rot} plate={v.plate} />;
      return <Car key={i} position={p} rotY={rot} color={v.color ?? "#ccc"} plate={v.plate} plateKind={v.ev ? "ev" : "private"} suv={v.kind === "suv"} brake={brake(i)} head={onc} />;
    })}
  </>
);

const genNear = (seed: number, z0: number, z1: number, lanes: number[]): NearV[] => {
  const r = rng(seed);
  const out: NearV[] = [];
  let k = 0;
  for (const x of lanes) {
    let z = z0 - r() * 5;
    while (z > z1) {
      const q = r();
      const kind: NearV["kind"] = q < 0.1 ? "truck" : q < 0.22 ? "auto" : q < 0.27 ? "bus" : q < 0.5 ? "suv" : "car";
      out.push({ kind, x: x + (r() - 0.5) * 0.3, z, color: COLS[Math.floor(r() * COLS.length)], plate: kind === "auto" ? `MH 12 R ${7700 + k}` : kind === "truck" || kind === "bus" ? `MH 46 AF ${3300 + k}` : PLATES[k % PLATES.length], ev: k % 9 === 4 });
      z -= (kind === "truck" ? 9 : kind === "bus" ? 12 : kind === "auto" ? 3 : 4.4) + 2.4 + r() * 2.5;
      k++;
    }
  }
  return out;
};

// ================================================================== S1 aerial hook (150f)
const JAM_A = makeJam(11, 30, -1100, LANE_A);
const JAM_B = makeJam(12, 30, -1100, LANE_B, [14, 30]);

export const S1Aerial: React.FC<{ dur: number; titleOnly?: boolean }> = ({ dur, titleOnly }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = prog(f, 0, dur);
  const cam = lerp3([4, 40, 60], [3, 33, 20], p);
  return (
    <AbsoluteFill>
      <Stage cam={cam} target={[-6, 0, -150]} fov={38} focus={[-6, 0, -60]} shadow={110}>
        <Highway z0={120} z1={-1100} seed={3} />
        <InstancedJam cars={JAM_A} dz={-t * 1.2} />
        <InstancedJam cars={JAM_B} dz={t * 9} tail={0} />
        <Gantry position={[-5.8, 0, -70]} title="NH 48" lines={[["Lonavala", "18 km"], ["Pune", "64 km"]]} />
        <MileStone position={[-12.2, 0, -30]} rotY={Math.PI / 2} />
      </Stage>
      <Header />
      <Chip text="HEAVY TRAFFIC AHEAD" from={2} to={dur} />
      <Title from={0} to={titleOnly ? dur + 10 : 112} />
    </AbsoluteFill>
  );
};

// ================================================================== S2 behind cars, plates + honks (120f)
const S2_NEAR: NearV[] = [
  { kind: "car", x: -5.7, z: 0, color: "#D7263D", plate: "MH 12 KT 4581" },
  { kind: "auto", x: -8.9, z: 4, plate: "MH 12 R 7781" },
  { kind: "suv", x: -2.5, z: -2, color: "#1B1B1B", plate: "MH 01 AB 2207" },
  { kind: "truck", x: -5.7, z: -26, plate: "MH 46 AF 3312" },
  { kind: "car", x: -8.9, z: -6, color: "#F4F4F4", plate: "MH 14 EV 0007", ev: true },
  { kind: "car", x: -2.5, z: -10, color: "#2E86AB", plate: "GJ 05 RT 7781" },
  ...genNear(21, -24, -140, LANE_A),
];
const S2_ONC = genNear(22, -10, -260, LANE_B);

export const S2Plates: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const camZ = 8.5 - t * 1.1;
  return (
    <AbsoluteFill>
      <Stage cam={[-4.6, 2.6, camZ + 3.5]} target={[-5.4, 1.0, camZ - 30]} fov={44} focus={[-5, 0, camZ - 20]} shadow={45}>
        <Highway z0={60} z1={-600} seed={5} />
        <NearTraffic list={S2_NEAR} dz={-t * 1.1} brake={(i) => (i === 0 && f > 10 && f < 60) || (i === 2 && f > 70)} />
        <NearTraffic list={S2_ONC} dz={t * 12} onc />
        <InstancedJam cars={makeJamCached} dz={-t * 1.1} />
      </Stage>
      <Header />
      <Chip text="SO HOW DOES IT KNOW?" from={0} to={dur} dot="#FFB347" />
      <Honk x={540} y={690} text="POM POM!" from={14} />
      <Honk x={200} y={760} text="PEEP PEEP!" from={46} color="#3DDC97" />
      <Honk x={860} y={640} text="PAAAN!" from={80} color="#FF9933" />
    </AbsoluteFill>
  );
};
const makeJamCached = makeJam(23, -150, -900, LANE_A);

// ================================================================== S3 phone ping (150f)
const S3_NEAR = genNear(31, 30, -120, LANE_A).filter((v) => !(Math.abs(v.x + 5.7) < 1 && v.z > -36 && v.z < 2));
export const S3Ping: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dz = -t * 1.0;
  const car: V3 = [-5.7, 0, -10 + dz];
  const p = prog(f, 0, dur);
  const cam = lerp3([5, 8.5, 6 + dz], [2, 6.5, 2 + dz], p);
  return (
    <AbsoluteFill>
      <Stage cam={cam} target={[car[0], 0.8, car[2] - 2]} fov={42} focus={car} shadow={40}>
        <Highway z0={80} z1={-500} seed={9} />
        <Car position={car} color="#F4F4F4" plate="MH 12 KT 4581" brake />
        <Ping position={[car[0], 2.15, car[2]]} t={t} strength={interpolate(f, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        <NearTraffic list={S3_NEAR} dz={dz} />
        <NearTraffic list={genNearCachedB} dz={t * 12} onc />
      </Stage>
      <Header />
      <Chip text="IT'S WATCHING YOUR PHONE" from={0} to={dur} dot="#5AB8FF" />
      <DataCard x={600} y={560} big="18.7537°N" sub="SENDING · 73.4086°E · 8 KM/H" from={22} to={dur} scale={0.72} bar="#5AB8FF" />
    </AbsoluteFill>
  );
};
const genNearCachedB = genNear(32, 20, -260, LANE_B);

// ================================================================== S4 yellow car pulls over at the dhaba (180f)
const S4_NEAR = genNear(41, 40, -160, [-5.7, -2.5]);
export const S4Dhaba: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  // yellow car path: crawl in left lane, then pull off onto the dhaba forecourt
  const a = prog(f, 0, 100);
  const b = prog(f, 95, 165);
  const pos: V3 = f < 100 ? [-8.9, 0, interpolate(a, [0, 1], [0, -26])] : [interpolate(b, [0, 1], [-8.9, -17.5]), 0, interpolate(b, [0, 1], [-26, -40])];
  const rot = f < 100 ? 0 : interpolate(b, [0, 0.5, 1], [0, 0.55, 0.15]);
  const camP = lerp3([pos[0] + 7, 4.2, pos[2] + 12], [-5, 6.5, -14], prog(f, 90, dur));
  const target = lerp3([pos[0] - 2, 0.8, pos[2] - 8], [-22, 2.5, -44], prog(f, 90, dur));
  return (
    <AbsoluteFill>
      <Stage cam={camP} target={target} fov={42} focus={[pos[0], 0, pos[2] - 10]} shadow={50}>
        <Highway z0={80} z1={-500} seed={13} />
        <Car position={pos} rotY={rot} color="#F2B705" plate="MH 12 KT 4581" brake={f > 140} />
        <NearTraffic list={S4_NEAR} dz={-t * 1.6} />
        <Dhaba position={[-27, 0, -48]} rotY={Math.PI / 2} name="SHER-E-PUNJAB DHABA" deva="शेर-ए-पंजाब ढाबा" t={t} />
        <Truck position={[-19, 0, -60]} rotY={0.2} plate="PB 10 GX 4455" cab="#1F4E9A" />
        <Truck position={[-21, 0, -28]} rotY={-0.15} plate="MH 46 AF 3312" cab="#C8102E" />
      </Stage>
      <Header />
      <Chip text="KHANDALA GHAT · NH 48" from={0} to={dur} />
      <DataCard x={70} y={640} big="8" unit="km/h" sub="ONE PHONE" plate="MH 12 KT 4581" from={12} to={110} scale={0.85} />
    </AbsoluteFill>
  );
};

// ================================================================== S5 aerial jam with phones + speed (240f)
const JAM5 = makeJam(51, 0, -1200, LANE_A, [3.5, 5]);
const JAM5B = makeJam(52, 0, -1200, LANE_B, [16, 34]);
export const S5Phones: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = prog(f, 0, dur);
  const cam = lerp3([46, 48, -60], [40, 40, -110], p);
  const kmh = Math.round(interpolate(f, [150, 185], [105, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bar = kmh > 60 ? "#3DDC97" : kmh > 35 ? "#FF9933" : "#FF3B30";
  const slow = interpolate(f, [150, 185], [8, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dz = -(f < 150 ? t * 8 : (150 / 30) * 8 + (t - 150 / 30) * slow);
  return (
    <AbsoluteFill>
      <Stage cam={cam} target={[-8, 0, cam[2] - 110]} fov={40} focus={[-6, 0, cam[2] - 90]} fog={[90, 700]} shadow={120}>
        <Highway z0={60} z1={-1200} seed={17} />
        <InstancedJam cars={JAM5} dz={dz} phones={interpolate(f, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} t={t} tail={f > 170 ? 3 : 1.4} />
        <InstancedJam cars={JAM5B} dz={t * 11} tail={0} />
      </Stage>
      <Header />
      <Chip text="HUNDREDS OF PHONES" from={0} to={150} dot="#5AB8FF" />
      <Chip text="JAM DETECTED" from={150} to={dur} />
      <DataCard x={60} y={1160} big={`${kmh}`} unit="km/h" sub="AVG SPEED · THIS STRETCH" bar={bar} from={80} to={dur} />
    </AbsoluteFill>
  );
};

// ================================================================== S6 roadside fight at Katraj (210f)
const S6_JAM = genNear(61, 30, -120, LANE_A);
export const FIGHT_TIMES = { shove: 96, copIn: 140 };
export const S6Fight: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const talkO = (f > 10 && f < 50) || (f > 86 && f < 120);
  const talkA = (f > 48 && f < 90) || (f > 118 && f < 150);
  const shove = interpolate(f, [FIGHT_TIMES.shove, FIGHT_TIMES.shove + 6, FIGHT_TIMES.shove + 30], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const apart = prog(f, 160, 185) * 0.9;
  const copZ = interpolate(f, [FIGHT_TIMES.copIn, FIGHT_TIMES.copIn + 40], [-4, -12.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const copStep = f > FIGHT_TIMES.copIn && f < FIGHT_TIMES.copIn + 40 ? Math.abs(Math.sin(f / 3)) * 0.06 : 0;
  const wave = (k: number) => Math.sin(f / k);
  const cam: V3 = [-25.5 + Math.sin(t * 0.5) * 0.25, 2.5, -9.5 - t * 0.1];
  return (
    <AbsoluteFill>
      <Stage cam={cam} target={[-13.8, 1.2, -16.4]} fov={38} focus={[-14, 0, -16]} shadow={35}>
        <Highway z0={80} z1={-400} seed={21} blocks={false} clear={[[-11, -60, 40, -70]]} />
        {/* the accident */}
        <Car position={[-13.4, 0, -21]} color="#F4F4F4" plate="MH 12 PQ 0420" dent brake={Math.floor(f / 8) % 2 === 0} />
        <Auto position={[-13.3, 0, -16.9 + 0.0]} plate="MH 12 R 7781" />
        {/* fighters: owner (faces +z), auto driver (faces -z) */}
        <Person
          position={[-15.6, 0, -15.3 - apart + shove * 0.15]}
          rotY={Math.PI - 0.15}
          shirt="#2E86AB"
          pants="#22223B"
          scale={1.05}
          pose={{
            armR: talkO ? [1.3 + wave(2.2) * 0.6, 0.3] : shove > 0.1 ? [1.6, 0.1] : [0.2, 0.15],
            armL: talkO ? [0.8 + wave(3) * 0.5, 0.5] : shove > 0.1 ? [1.6, 0.1] : [0.2, 0.15],
            lean: talkO ? 0.12 : 0.05,
          }}
        />
        <Person
          position={[-15.6, 0, -13.9 + apart + shove * 0.7]}
          rotY={0.15}
          shirt="#C2A878"
          pants="#6B5B3E"
          skin="#8C5A3C"
          scale={1.0}
          pose={{
            armR: talkA ? [1.5 + wave(2) * 0.6, 0.4] : [0.15, 0.2],
            armL: talkA ? [1.0 + wave(2.6) * 0.5, 0.6] : [0.15, 0.2],
            lean: talkA ? 0.15 : -shove * 0.35,
          }}
        />
        {/* traffic cop */}
        <Person position={[-16.4, copStep, copZ]} rotY={Math.PI} shirt="#F4F4F4" pants="#1B2A4A" hat="cop" pose={{ armR: f > FIGHT_TIMES.copIn + 30 ? [2.6, 0.2] : [0.3 + Math.sin(f / 3) * 0.4, 0.1] }} />
        {/* crowd */}
        <Person position={[-11.2, 0, -18.5]} rotY={-1.4} shirt="#6A994E" hat="cap" hatColor="#E36414" pose={{ armR: [2.2, 0.1] }} />
        <Person position={[-11.0, 0, -15.2]} rotY={-1.8} shirt="#F7C548" pose={{ armL: [0.8, 0.9], armR: [0.8, 0.9] }} />
        <Person position={[-17.8, 0, -19.4]} rotY={0.9} shirt="#C9184A" hat="turban" hatColor="#7B2CBF" pose={{ armR: [2.1, 0.1] }} />
        <Cow position={[-17.2, 0, -23.5]} rotY={1.2} t={t} />
        {/* jammed traffic behind */}
        <NearTraffic list={S6_JAM.filter((v) => v.x > -8)} dz={-t * 0.3} brake={() => true} />
        <NearTraffic list={S6_JAM.filter((v) => v.x <= -8 && (v.z > 0 || v.z < -30))} dz={-t * 0.3} brake={() => true} />
        {/* shops across the road */}
        <Shop position={[17, 0, -6]} rotY={-Math.PI / 2} name="VADA PAV CENTRE" color="#E36414" />
        <Shop position={[17, 0, -12]} rotY={-Math.PI / 2} name="PUNCTURE" color="#2E86AB" />
        <Shop position={[17, 0, -18]} rotY={-Math.PI / 2} name="MEDICAL" color="#4C956C" />
        <Shop position={[17, 0, -24]} rotY={-Math.PI / 2} name="KIRANA STORES" color="#9A031E" />
      </Stage>
      <Header />
      <Chip text="ROADSIDE DRAMA · KATRAJ, PUNE" from={0} to={dur} />
      <PlatesVs from={4} to={dur - 30} />
      <SpeechBubble x={330} y={760} text="Arre bhai! Dekh ke nahi chala sakta?!" from={10} to={50} />
      <SpeechBubble x={720} y={760} text="Tumne achanak brake kyun maara?!" from={48} to={90} color="#FFE08A" tail="right" />
      <SpeechBubble x={330} y={760} text="Nayi gaadi hai meri!" from={86} to={120} />
      <SpeechBubble x={720} y={760} text="Toh main kya karu?!" from={118} to={150} color="#FFE08A" tail="right" />
      <SpeechBubble x={760} y={700} text="Side mein lo dono!" from={175} to={dur} color="#CDEBFF" tail="right" />
      <Honk x={880} y={540} text="POM POM!" from={30} />
      <Honk x={950} y={620} text="PEEEP!" from={100} color="#3DDC97" />
      <Honk x={420} y={1250} text="TWEEET!" from={FIGHT_TIMES.copIn + 30} color="#4CC9F0" />
    </AbsoluteFill>
  );
};

const PlatesVs: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const o = interpolate(f, [from, from + 6, to - 6, to], [0, 1, 1, 0]);
  const plate = (t: string, y: boolean) => (
    <div style={{ background: y ? "#FFD400" : "#FFF", border: "4px solid #111", borderRadius: 7, padding: "4px 14px 4px 6px", fontFamily: "Montserrat", fontWeight: 900, fontSize: 32, color: "#111", display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ background: "#1A3E9A", color: "#fff", fontSize: 13, padding: "4px 4px", borderRadius: 3 }}>IND</span>
      {t}
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 160, width: "100%", display: "flex", justifyContent: "center", gap: 16, alignItems: "center", opacity: o }}>
      {plate("MH 12 PQ 0420", false)}
      <span style={{ fontFamily: "Montserrat", fontWeight: 900, fontSize: 44, color: "#FFB347", textShadow: "0 3px 0 #000" }}>VS</span>
      {plate("MH 12 R 7781", true)}
    </div>
  );
};

// ================================================================== S7 map: road turns red, reroute (180f)
export const S7Map: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const red = prog(f, 10, 70);
  const route = prog(f, 80, 150);
  const blocks = useMemo(() => {
    const r = rng(77);
    const out: { p: V3; s: V3 }[] = [];
    for (let x = -60; x <= 60; x += 14) {
      for (let z = -110; z <= 110; z += 14) {
        if (Math.abs(x) < 9 || (Math.abs(x - 24) < 5 && z < 40 && z > -60)) continue;
        out.push({ p: [x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 2], s: [9 + r() * 2, 0.5 + r() * 2.5, 9 + r() * 2] });
      }
    }
    return out;
  }, []);
  const roadCol = new THREE.Color("#7FE0B8").lerp(new THREE.Color("#FF5A4A"), red);
  // reroute path: off NH 48 at z=40 -> x=24 -> back at z=-60
  const pts: V3[] = [
    [0, 0.6, 70],
    [0, 0.6, 40],
    [24, 0.6, 40],
    [24, 0.6, -60],
    [0, 0.6, -60],
    [0, 0.6, -100],
  ];
  const segs = pts.slice(1).map((b, i) => [pts[i], b] as [V3, V3]);
  const total = segs.reduce((n, [a, b]) => n + Math.hypot(b[0] - a[0], b[2] - a[2]), 0);
  let acc = 0;
  const camY = 300 - prog(f, 0, dur) * 30;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: true }} camera={{ fov: 30, position: [0, camY, 0.01] }}>
        <CameraRig position={[0, camY, 0.01]} target={[0, 0, 0]} fov={30} />
        <color attach="background" args={["#141432"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[30, 80, 20]} intensity={1.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#1C1B44" />
        </mesh>
        {blocks.map((b, i) => (
          <mesh key={i} position={[b.p[0], b.s[1] / 2, b.p[2]]}>
            <boxGeometry args={b.s} />
            <meshStandardMaterial color="#2C2A66" />
          </mesh>
        ))}
        {/* NH 48 */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[7, 0.4, 260]} />
          <meshBasicMaterial color={roadCol} toneMapped={false} />
        </mesh>
        {/* side road used for reroute */}
        <mesh position={[24, 0.25, -10]}>
          <boxGeometry args={[3.5, 0.3, 100]} />
          <meshBasicMaterial color="#4B4A8A" />
        </mesh>
        {[40, -60].map((z) => (
          <mesh key={z} position={[12, 0.25, z]}>
            <boxGeometry args={[24, 0.3, 3.5]} />
            <meshBasicMaterial color="#4B4A8A" />
          </mesh>
        ))}
        {segs.map(([a, b], i) => {
          const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
          const start = acc / total;
          acc += L;
          const k = Math.max(0, Math.min(1, (route - start) / (L / total)));
          if (k <= 0) return null;
          const end: V3 = [a[0] + (b[0] - a[0]) * k, 0.8, a[2] + (b[2] - a[2]) * k];
          const c: V3 = [(a[0] + end[0]) / 2, 0.8, (a[2] + end[2]) / 2];
          const horiz = Math.abs(b[0] - a[0]) > 0.1;
          const len = Math.hypot(end[0] - a[0], end[2] - a[2]) + 1.6;
          return (
            <mesh key={i} position={c}>
              <boxGeometry args={horiz ? [len, 0.3, 1.6] : [1.6, 0.3, len]} />
              <meshBasicMaterial color="#9FD8FF" toneMapped={false} />
            </mesh>
          );
        })}
      </ThreeCanvas>
      <Header />
      <Chip text={f < 80 ? "JAM DETECTED" : "REROUTING AROUND IT"} from={0} to={dur} dot={f < 80 ? "#FF3B30" : "#5AB8FF"} />
      <MapLabel x={560} y={300} text="NH 48 · TO MUMBAI" />
      <MapLabel x={560} y={1340} text="TO PUNE" />
      <MapLabel x={190} y={880} text="Heavy traffic" sub="KATRAJ · 24 KM/H" from={40} red />
    </AbsoluteFill>
  );
};

const MapLabel: React.FC<{ x: number; y: number; text: string; sub?: string; from?: number; red?: boolean }> = ({ x, y, text, sub, from = 0, red }) => {
  const f = useCurrentFrame();
  if (f < from) return null;
  const o = interpolate(f, [from, from + 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translateX(-50%)", opacity: o, background: "rgba(16,18,28,0.88)", borderLeft: red ? "6px solid #FF3B30" : undefined, borderRadius: 6, padding: "8px 14px", color: "#FFF", fontFamily: "Montserrat", fontWeight: 800, fontSize: 26 }}>
      {text}
      {sub && <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 400, fontSize: 16, letterSpacing: 2, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
};

// ================================================================== S8 look around — dhaba at dusk (180f)
const S8_JAM = makeJam(81, 40, -700, LANE_A);
const S8_ONC = makeJam(82, 40, -700, LANE_B, [18, 40]);
export const S8LookAround: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = prog(f, 0, dur);
  const cam = lerp3([-30, 7, 30], [-24, 10, 8], p);
  return (
    <AbsoluteFill>
      <Stage cam={cam} target={[-6, 1, -60]} fov={42} focus={[-14, 0, -20]} shadow={70}>
        <Highway z0={80} z1={-700} seed={29} lampsOn={0.9} clear={[[-11, -60, 70, -70]]} />
        <InstancedJam cars={S8_JAM} dz={-t * 0.8} phones={interpolate(f, [60, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} t={t} tail={2.5} />
        <InstancedJam cars={S8_ONC} dz={t * 10} tail={0} />
        <Dhaba position={[-24, 0, -30]} rotY={Math.PI / 2} name="HOTEL HIGHWAY KING" deva="हाईवे किंग ढाबा" sub="FAMILY DHABA · AC HALL · PARKING" wall="#4CC9F0" signBg="#1F4E9A" t={t} />
        <Truck position={[-18, 0, -12]} rotY={0.1} plate="RJ 14 GB 2121" cab="#2E7D32" />
      </Stage>
      <Header />
      <Chip text="STUCK IN TRAFFIC? · NO" from={0} to={95} />
      <Chip text="ONE OF THE SENSORS · YES" from={95} to={dur} dot="#3DDC97" />
    </AbsoluteFill>
  );
};

// ================================================================== captions (global frames)
export const CAPTIONS: Phrase[] = [
  { from: 4, to: 50, text: "Google Maps can see" },
  { from: 50, to: 96, text: "a traffic jam before", hl: ["jam"] },
  { from: 96, to: 148, text: "you ever get there." },
  { from: 152, to: 200, text: "So how does it know?" },
  { from: 200, to: 268, text: "It's watching your phone.", hl: ["phone"] },
  { from: 272, to: 316, text: "Every phone with Maps" },
  { from: 316, to: 360, text: "open quietly sends back" },
  { from: 360, to: 392, text: "where it is and" },
  { from: 392, to: 418, text: "how fast it's moving." },
  { from: 422, to: 466, text: "One phone crawling along" },
  { from: 466, to: 512, text: "at 8 km/h means nothing." },
  { from: 512, to: 556, text: "Maybe they just pulled" },
  { from: 556, to: 598, text: "over for chai.", hl: ["chai"] },
  { from: 602, to: 646, text: "But when hundreds of" },
  { from: 646, to: 690, text: "phones on the same" },
  { from: 690, to: 734, text: "stretch of highway all" },
  { from: 734, to: 770, text: "drop from 105 to", hl: ["105"] },
  { from: 770, to: 800, text: "24 at the same", hl: ["24"] },
  { from: 800, to: 838, text: "time — that's a jam.", hl: ["jam"] },
  { from: 1022, to: 1066, text: "Google Maps turns" },
  { from: 1066, to: 1110, text: "that road red,", hl: ["red"] },
  { from: 1110, to: 1154, text: "and cars start" },
  { from: 1154, to: 1198, text: "rerouting around it." },
  { from: 1202, to: 1244, text: "So next time" },
  { from: 1244, to: 1290, text: "your road turns red," },
  { from: 1290, to: 1320, text: "look around." },
  { from: 1320, to: 1352, text: "You're one of the" },
  { from: 1352, to: 1378, text: "sensors.", hl: ["sensors"] },
];
