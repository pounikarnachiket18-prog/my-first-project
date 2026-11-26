/**
 * SCENE 4 — THE SCIENTIFIC REVEAL (19–28 s)
 * 4a (19.0–24.6 s, units Å): match-cut from Scene 3's dive — macro orbit of
 *    a long-chain carboxylic acid, the carboxyl (–COOH) group glowing; pull
 *    back to reveal a field of such molecules.
 * 4b (24.4–28.0 s, units mm): two skin samples side by side. Sample A gives
 *    off more carboxylic acids than sample B; a mosquito arrives and chooses A.
 * Science (De Obaldia et al., Cell 2022): people highly attractive to Aedes
 * aegypti had higher levels of certain skin carboxylic acids. It is one
 * factor among several (CO₂, heat and other odours also matter).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { Stage, Shot, V3 } from "../core/Stage";
import { cine, clamp, lerp, logLerp, smoothstep, fbm1, rng, track, SC, FPS } from "../core/anim";
import { Molecule, MolData, buildMolecule } from "../models/Molecule";
import { Skin } from "../models/Skin";
import { Mosquito } from "../models/Mosquito";
import { FlowParticles } from "../fx/FlowParticles";
import { ACID, MOL_SCALE, MATCH_OFFSET, heroMolRot } from "./S3Signals";
import { useTick } from "../core/Stage";

export const T_A0 = SC.reveal.from / FPS; // 19.0
export const T_B0 = 24.4;
export const T_A1 = 24.7;
const T_END = (SC.reveal.from + SC.reveal.duration) / FPS; // 28.0

// ------------------------------------------------------------------ 4a
const ROT0 = heroMolRot(T_A0);
const COOH_L = (() => {
  const c = ACID.atoms.filter((a) => a.tag === "cooh");
  const v = new THREE.Vector3();
  c.forEach((a) => v.add(new THREE.Vector3(...a.p)));
  return v.divideScalar(c.length);
})();
/** Hero molecule rotation in 4a: continues Scene 3's tumble, then slows. */
const molRotA = (t: number) => new THREE.Euler(ROT0.x + (t - T_A0) * 0.05, ROT0.y + (t - T_A0) * 0.08, ROT0.z);
export const coohA = (t: number): V3 => COOH_L.clone().applyEuler(molRotA(t)).toArray() as V3;

const OFF0 = MATCH_OFFSET.clone().divideScalar(MOL_SCALE); // same framing as Scene 3's last frame

export const moleculeShot = (t: number): Shot => {
  const cooh = new THREE.Vector3(...coohA(t));
  const centre = new THREE.Vector3(0, 0, 0);
  const reveal = cine(clamp((t - 21.7) / 1.6));
  const target = cooh.clone().lerp(centre, reveal);
  // orbit around Y (world) starting from the match-cut direction
  const az = cine(clamp((t - T_A0) / 4.8)) * 1.05;
  const dir = OFF0.clone().normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), az);
  dir.y += 0.12 * reveal;
  dir.normalize();
  const pull = smoothstep(23.6, T_A1, t);
  const dist = logLerp(logLerp(OFF0.length(), 9.5, smoothstep(T_A0, 20.2, t)), 17, reveal) * logLerp(1, 3.4, cine(pull));
  const pos = target.clone().add(dir.multiplyScalar(dist));
  return {
    pos: pos.toArray() as V3,
    target: target.toArray() as V3,
    fov: 34,
    focus: dist,
    aperture: lerp(1.0, 3.0, reveal) * (dist / 8),
    maxBlur: 30,
    samples: pull > 0.05 && pull < 0.95 ? 3 : 1,
    grade: { exposure: 1.05, lift: [0.0, 0.03, 0.045], gain: [0.98, 1.0, 1.02], saturation: 0.95, contrast: 1.08, vignette: 0.7, grain: 0.035 },
    bloom: { strength: 0.5, radius: 0.6, threshold: 0.8 },
  };
};

/** Out-of-focus field of the same molecule class (becomes visible on the pull-back). */
const field = (() => {
  const r = rng(404);
  return Array.from({ length: 16 }, () => ({
    p: [(r() - 0.5) * 70, (r() - 0.5) * 60, -10 - r() * 45] as V3,
    rot: [r() * 6, r() * 6, r() * 6] as V3,
    s: 0.8 + r() * 0.4,
  }));
})();

const MolField: React.FC<{ data: MolData }> = ({ data }) => {
  const g = useMemo(() => {
    const grp = new THREE.Group();
    field.forEach((f) => {
      const m = buildMolecule(data, "glass");
      m.group.position.set(...f.p);
      m.group.rotation.set(...f.rot);
      m.group.scale.setScalar(f.s);
      m.setGlow(0, 0.35);
      grp.add(m.group);
    });
    return grp;
  }, [data]);
  useTick((t) => {
    g.children.forEach((c, i) => {
      c.rotation.y = field[i].rot[1] + t * 0.15;
      c.position.y = field[i].p[1] + (t - T_A0) * 1.2;
    });
  });
  return <primitive object={g} />;
};

export const MoleculeScene: React.FC = () => (
  <Stage from={SC.reveal.from} shot={moleculeShot} env="lab" bg="#03080c" envIntensity={0.9}>
    <ambientLight intensity={0.05} />
    <directionalLight position={[6, 9, 8]} intensity={2.2} color="#ffffff" />
    <directionalLight position={[-9, 2, -6]} intensity={2.6} color="#3fe0d0" />
    <pointLight position={[3, -4, 6]} intensity={30} distance={40} color="#ffb347" />
    <Molecule
      data={ACID}
      glow={(t) => ({ base: 0.04, cooh: 0.16 + 0.12 * (0.5 + 0.5 * Math.sin((t - T_A0) * 5)) + smoothstep(23.2, 23.5, t) * 0.3 * (1 - smoothstep(23.5, 24.3, t)) })}
      place={(t, g) => {
        g.position.set(0, 0, 0);
        g.rotation.copy(molRotA(t));
      }}
    />
    <MolField data={ACID} />
    <FlowParticles mode="drift" count={500} seed={17} src={[0, 0, -10]} box={[40, 50, 30]} size={0.35} turb={2} color="#5fe6ff" color2="#ffd27a" opacity={() => 0.35} />
  </Stage>
);

// ------------------------------------------------------------------ 4b
const PATCH = 10; // mm
const GAP = 1.2;
// Stacked for the 9:16 frame: A (far, top of screen) and B (near, bottom)
export const A_CENTER: V3 = [0, 0, -(PATCH / 2 + GAP / 2)];
export const B_CENTER: V3 = [0, 0, PATCH / 2 + GAP / 2];

export const compareShot = (t: number): Shot => {
  const u = cine(clamp((t - T_B0) / (T_END - T_B0)));
  const pos = track<number[]>(t, [
    [T_B0, [0, 26, 12]],
    [25.6, [0, 34, 19]],
    [T_END, [1.2, 35, 20]],
  ]);
  const target = track<number[]>(t, [
    [T_B0, [0, 3, -4]],
    [25.6, [0, 2.2, 0.3]],
    [T_END, [0, 2, 0.3]],
  ]);
  const d = Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
  return {
    pos: pos as V3,
    target: target as V3,
    fov: 36,
    focus: d,
    aperture: 0.6,
    maxBlur: 22,
    samples: 1,
    grade: { exposure: 1.05 + 0 * u, lift: [0.0, 0.03, 0.045], gain: [1.0, 1.0, 1.0], saturation: 0.95, contrast: 1.07, vignette: 0.65, grain: 0.035 },
    bloom: { strength: 0.6, radius: 0.6, threshold: 0.7 },
  };
};

// Rising acids: many over A, few over B (illustrative proportions)
const risers = (() => {
  const r = rng(909);
  const make = (n: number, c: V3, seed: number) =>
    Array.from({ length: n }, (_, i) => ({ x: c[0] + (r() - 0.5) * 7.5, z: c[2] + (r() - 0.5) * 6.5, delay: T_B0 - 1.5 + r() * 3.4, sp: 1.4 + r() * 0.8, seed: seed + i, rot: r() * 6 }));
  return { A: make(11, A_CENTER, 500), B: make(3, B_CENTER, 600) };
})();
const riserPos = (k: { x: number; z: number; delay: number; sp: number; seed: number }, t: number): V3 => {
  const a = Math.max(0, t - k.delay);
  return [k.x + fbm1(t * 0.4, k.seed) * 0.6, 0.3 + a * k.sp * 0.7, k.z + fbm1(t * 0.4, k.seed + 50) * 0.6];
};

/** Mosquito flight: enters from above, hesitates, veers to sample A and lands. */
export const compMosq = (t: number) => {
  const p = track<number[]>(t, [
    [24.9, [3, 9, -24]],
    [25.9, [1.5, 7.5, -13]],
    [26.6, [-0.4, 5, -8]],
    [27.4, [-0.9, 1.9, -6.4]],
    [28.0, [-1.0, 0.75, -6.1]],
  ]);
  return new THREE.Vector3(p[0] + fbm1(t * 2, 3) * 0.25, p[1] + fbm1(t * 2.2, 4) * 0.2, p[2]);
};

export const CompareScene: React.FC = () => (
  <Stage from={Math.round(T_B0 * FPS)} shot={compareShot} env="lab" bg="#03080c" envIntensity={0.6}>
    <ambientLight intensity={0.05} />
    <directionalLight position={[-6, 14, 12]} intensity={2.6} color="#ffe6cc" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={60} />
    <directionalLight position={[10, 4, -10]} intensity={1.6} color="#56d6ff" />
    <Skin size={PATCH} seed={5} segments={200} droplets={18} hairs={22} position={[-PATCH / 2, 0, A_CENTER[2] - PATCH / 2]} />
    <Skin size={PATCH} seed={9} segments={200} droplets={8} hairs={22} position={[-PATCH / 2, 0, B_CENTER[2] - PATCH / 2]} />
    {/* emission columns */}
    <FlowParticles mode="rise" count={1400} seed={41} src={[A_CENTER[0], 0.2, A_CENTER[2]]} box={[4.4, 0, 4.2]} speed={1.6} life={5} turb={0.5} size={0.13} color="#ffc04d" color2="#ffe08a" opacity={(t) => 0.6 * smoothstep(T_B0, T_B0 + 0.6, t)} />
    <FlowParticles mode="rise" count={260} seed={42} src={[B_CENTER[0], 0.2, B_CENTER[2]]} box={[4.4, 0, 4.2]} speed={1.6} life={5} turb={0.5} size={0.13} color="#ffc04d" color2="#ffe08a" opacity={(t) => 0.5 * smoothstep(T_B0, T_B0 + 0.6, t)} />
    {[...risers.A, ...risers.B].map((k, i) => (
      <Molecule
        key={i}
        data={ACID}
        glow={() => ({ base: 0.05, cooh: 0.9 })}
        place={(t, g) => {
          g.position.set(...riserPos(k, t));
          g.rotation.set(k.rot + t * 0.3, k.rot * 2 + t * 0.2, 0.4);
          g.scale.setScalar(0.11);
          g.visible = t > k.delay;
        }}
      />
    ))}
    <Mosquito
      seed={3}
      wingBlur={(t) => 1 - smoothstep(27.6, 27.9, t) * 0.6}
      place={(t, g) => {
        const p = compMosq(t);
        const ahead = compMosq(t + 0.05);
        g.position.copy(p);
        g.lookAt(ahead.x, p.y + 0.4, ahead.z + (ahead.x === p.x ? 0.01 : 0));
        g.scale.setScalar(5.5);
        g.visible = t > 24.85;
      }}
    />
  </Stage>
);

export const anchorA: V3 = [4.6, 2.5, A_CENTER[2]];
export const anchorB: V3 = [4.6, 1.5, B_CENTER[2]];
