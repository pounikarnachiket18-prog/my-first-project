/**
 * SCENE 3 — YOUR BODY'S CHEMICAL SIGNALS (11–19 s). Units: millimetres.
 * Extreme-macro tracking shot over skin. The three cues mosquitoes use
 * arrive in sync with the narration:
 *   CO₂ (exhaled breath) → BODY HEAT (convection rising off skin) →
 *   SKIN ODOUR (sweat beads swell; real odour molecules lift off).
 * Ends diving into one rising carboxylic-acid molecule (match-cut → Scene 4).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { Stage, Shot, V3, useTick } from "../core/Stage";
import { track, smoothstep, lerp, clamp, fbm1, SC, FPS, CUE, logLerp, cine } from "../core/anim";
import { Skin } from "../models/Skin";
import { Molecule, CO2, LACTIC, NH3, carboxylicAcid } from "../models/Molecule";
import { FlowParticles } from "../fx/FlowParticles";

const T0 = SC.signals.from / FPS; // 11
const T1 = (SC.signals.from + SC.signals.duration) / FPS; // 19
export const MOL_SCALE = 0.06; // Å → mm (symbolic magnification for legibility)
export const ACID = carboxylicAcid(10);
const SHORT_ACID = carboxylicAcid(6);

/** The hero carboxylic-acid molecule the camera dives into. */
export const heroMol = (t: number): V3 => {
  const u = cine(clamp((t - 15.4) / 2.7));
  return [lerp(5.6, 5.72, u) + fbm1(t * 0.4, 61) * 0.03, lerp(0.35, 2.35, u) + fbm1(t * 0.5, 62) * 0.02, 5.0 + fbm1(t * 0.45, 63) * 0.03];
};
export const heroMolRot = (t: number) => new THREE.Euler(0.35 + t * 0.12, 0.6 + t * 0.18, 0.1);

const COOH_LOCAL = (() => {
  const c = ACID.atoms.filter((a) => a.tag === "cooh");
  const v = new THREE.Vector3();
  c.forEach((a) => v.add(new THREE.Vector3(...a.p)));
  return v.divideScalar(c.length);
})();
/** World position of the hero molecule's carboxyl (–COOH) group. */
export const coohWorld = (t: number): V3 =>
  COOH_LOCAL.clone().applyEuler(heroMolRot(t)).multiplyScalar(MOL_SCALE).add(new THREE.Vector3(...heroMol(t))).toArray() as V3;

/** End-of-scene camera offset from the hero molecule (shared with Scene 4 for the match cut). */
export const MATCH_OFFSET = new THREE.Vector3(0.1, 0.08, 0.42);

export const signalsShot = (t: number): Shot => {
  const flashIn = 1 - smoothstep(T0, T0 + 0.4, t);
  const grade = {
    exposure: lerp(1.0, 3.0, flashIn),
    lift: [0.02, 0.008, 0.0] as [number, number, number],
    gain: [1.02, 0.99, 0.96] as [number, number, number],
    saturation: 0.95,
    contrast: 1.05,
    vignette: 0.6,
    grain: 0.035,
  };
  const bloom = { strength: 0.45 + flashIn, radius: 0.6, threshold: 0.75 - flashIn * 0.4 };
  if (t < 17.6) {
    const pos = track<number[]>(t, [
      [T0, [1.6, 1.15, 8.9]],
      [12.6, [3.0, 1.25, 7.6]],
      [14.4, [4.4, 1.05, 7.1]],
      [16.2, [5.0, 1.9, 8.1]],
      [17.6, [5.45, 2.35, 6.9]],
    ]);
    const target = track<number[]>(t, [
      [T0, [3.6, 0.3, 6.2]],
      [12.6, [4.6, 0.4, 5.3]],
      [14.4, [5.5, 0.55, 4.8]],
      [16.2, [5.55, 1.2, 4.9]],
      [17.6, heroMol(17.6) as number[]],
    ]);
    const d = Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
    return { pos: pos as V3, target: target as V3, fov: 34, focus: d, aperture: 0.55, maxBlur: 26, grade, bloom, samples: t < T0 + 0.35 ? 4 : 1 };
  }
  // Dive into the hero molecule (log distance), ending on the match-cut framing
  const u = cine(clamp((t - 17.6) / (T1 - 17.6)));
  const m = new THREE.Vector3(...heroMol(t)).lerp(new THREE.Vector3(...coohWorld(t)), smoothstep(0, 0.7, u));
  const startOff = new THREE.Vector3(5.45, 2.35, 6.9).sub(new THREE.Vector3(...heroMol(17.6)));
  const dist = logLerp(startOff.length(), MATCH_OFFSET.length(), u);
  const dir = startOff.clone().normalize().lerp(MATCH_OFFSET.clone().normalize(), u).normalize();
  const pos = m.clone().add(dir.multiplyScalar(dist));
  return { pos: pos.toArray() as V3, target: m.toArray() as V3, fov: 34, focus: dist, aperture: 0.55 * (dist / 1.6), maxBlur: 26, grade, bloom, samples: u > 0.1 && u < 0.9 ? 3 : 1 };
};

// ---- CO₂ molecules drifting in from the breath (top-left), tumbling
const co2Paths = Array.from({ length: 9 }, (_, i) => ({
  p0: [3.5 + (i % 3) * 0.6, 0.55 + (i % 4) * 0.22, 4.7 + (i % 5) * 0.42] as V3,
  v: [0.16 + (i % 2) * 0.05, -0.02, -0.05] as V3,
  seed: 100 + i,
}));
export const co2Pos = (i: number, t: number): V3 => {
  const c = co2Paths[i];
  const tt = t - T0;
  return [c.p0[0] + c.v[0] * tt + fbm1(t * 0.6, c.seed) * 0.15, c.p0[1] + c.v[1] * tt + fbm1(t * 0.5, c.seed + 1) * 0.1, c.p0[2] + c.v[2] * tt + fbm1(t * 0.5, c.seed + 2) * 0.1];
};

// ---- Odour molecules lifting off sweat beads
const odour = [
  { data: LACTIC, x: 4.4, z: 5.9, delay: 15.0, sp: 0.42 },
  { data: NH3, x: 5.3, z: 6.2, delay: 15.25, sp: 0.5 },
  { data: SHORT_ACID, x: 4.9, z: 4.9, delay: 15.45, sp: 0.38 },
  { data: LACTIC, x: 6.2, z: 5.6, delay: 15.6, sp: 0.45 },
  { data: NH3, x: 3.9, z: 5.0, delay: 15.8, sp: 0.5 },
  { data: SHORT_ACID, x: 6.6, z: 4.6, delay: 15.9, sp: 0.36 },
];
export const odourPos = (i: number, t: number): V3 => {
  const o = odour[i];
  const a = Math.max(0, t - o.delay);
  return [o.x + fbm1(t * 0.4, 200 + i) * 0.2, 0.15 + a * o.sp + fbm1(t * 0.5, 210 + i) * 0.05, o.z + fbm1(t * 0.45, 220 + i) * 0.15];
};

/** Rising heat convection: animated false-colour shimmer sheets. */
const HeatHaze: React.FC<{ amount: (t: number) => number }> = ({ amount }) => {
  const mats = useMemo(
    () =>
      [0, 1, 2].map(
        (k) =>
          new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uK: { value: k } },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: /* glsl */ `
            uniform float uTime; uniform float uAmt; uniform float uK; varying vec2 vUv;
            void main(){
              float x = vUv.x * 6.0 + uK * 3.1;
              float y = vUv.y;
              float w = sin(x * 1.7 + sin(y * 6.0 - uTime * 1.6 + uK) * 1.3) * 0.5 + 0.5;
              float bands = smoothstep(0.55, 1.0, sin((y * 7.0 - uTime * 0.9) + w * 2.2) * 0.5 + 0.5);
              float fade = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.45, 1.0, y)) * smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
              vec3 hot = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.75, 0.25), w);
              hot = mix(hot, vec3(0.85, 0.15, 0.35), smoothstep(0.35, 0.9, y));
              gl_FragColor = vec4(hot * bands * fade * uAmt * 0.11, 1.0);
            }`,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );
  useTick((t) => mats.forEach((m) => ((m.uniforms.uTime.value = t), (m.uniforms.uAmt.value = amount(t)))));
  return (
    <>
      {mats.map((m, k) => (
        <mesh key={k} material={m} position={[5.2 + k * 0.3, 1.6, 4.1 + k * 0.9]} rotation={[0, -0.35, 0]}>
          <planeGeometry args={[7, 3.4]} />
        </mesh>
      ))}
    </>
  );
};

export const SignalsScene: React.FC = () => (
  <Stage from={SC.signals.from} shot={signalsShot} env="skin" bg="#0b0605" envIntensity={0.45}>
    <ambientLight intensity={0.04} />
    <directionalLight
      position={[-3, 5, 3]}
      intensity={3.2}
      color="#ffe0c2"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-1}
      shadow-camera-right={11}
      shadow-camera-top={11}
      shadow-camera-bottom={-1}
      shadow-camera-near={0.1}
      shadow-camera-far={20}
      shadow-bias={-0.0005}
      target-position={[5, 0, 5]}
    />
    <directionalLight position={[9, 2.5, -2]} intensity={0.9} color="#c8d6ff" target-position={[5, 0, 5]} />
    <Skin
      size={10}
      seed={5}
      segments={340}
      droplets={34}
      hairs={46}
      sweat={(t) => smoothstep(14.6, 15.9, t)}
      warmth={(t) => smoothstep(13.3, 13.9, t) * (1 - 0.6 * smoothstep(16.5, 17.5, t))}
    />
    {/* CO₂ from breath */}
    {co2Paths.map((_, i) => (
      <Molecule
        key={i}
        data={CO2}
        opacity={(t) => smoothstep(T0 + 0.2, T0 + 0.9, t)}
        glow={(t) => ({ base: 0.25 * smoothstep(11.5, 12, t) * (1 - smoothstep(13.2, 13.8, t)), cooh: 0 })}
        place={(t, g) => {
          g.position.set(...co2Pos(i, t));
          g.rotation.set(t * 0.5 + i, t * 0.3 + i * 2, 0);
          g.scale.setScalar(MOL_SCALE * 2.6);
        }}
      />
    ))}
    <FlowParticles mode="plume" count={1400} seed={8} src={[-1.5, 2.8, 6.5]} dir={[1, -0.25, -0.2]} speed={2.2} life={4.5} spread={1.4} turb={0.25} size={0.05} color="#b8f2ff" opacity={(t) => 0.35 * smoothstep(T0, T0 + 1.0, t) * (1 - 0.5 * smoothstep(13.5, 15, t))} />
    {/* Body heat: convection rising off the skin */}
    <HeatHaze amount={(t) => smoothstep(13.3, 14.0, t) * (1 - 0.55 * smoothstep(15.5, 16.8, t))} />
    <FlowParticles mode="rise" count={1100} seed={21} src={[5.0, 0.1, 5.4]} box={[3.4, 0, 2.6]} speed={0.55} life={4} turb={0.18} size={0.04} color="#ff8a3d" color2="#ff4a6a" opacity={(t) => 0.35 * smoothstep(13.3, 14.0, t) * (1 - 0.5 * smoothstep(15.5, 17, t))} />
    {/* Skin odour: volatiles lifting off sweat beads */}
    <FlowParticles mode="rise" count={900} seed={33} src={[5.0, 0.12, 5.2]} box={[2.8, 0, 2.2]} speed={0.42} life={5} turb={0.12} size={0.03} color="#d8ff7a" color2="#ffd36b" opacity={(t) => 0.4 * smoothstep(14.9, 15.6, t)} />
    {odour.map((o, i) => (
      <Molecule
        key={i}
        data={o.data}
        opacity={(t) => smoothstep(o.delay, o.delay + 0.4, t)}
        place={(t, g) => {
          g.position.set(...odourPos(i, t));
          g.rotation.set(t * 0.4 + i, t * 0.25 + i * 1.7, 0.3);
          g.scale.setScalar(MOL_SCALE * 1.5);
          g.visible = t > o.delay;
        }}
      />
    ))}
    {/* Hero carboxylic acid (dive target) */}
    <Molecule
      data={ACID}
      opacity={(t) => smoothstep(15.4, 15.9, t)}
      glow={(t) => ({ base: 0.05, cooh: smoothstep(16.6, 17.4, t) * (0.7 + 0.3 * Math.sin(t * 6)) })}
      place={(t, g) => {
        g.position.set(...heroMol(t));
        g.rotation.copy(heroMolRot(t));
        g.scale.setScalar(MOL_SCALE);
        g.visible = t > 15.35;
      }}
    />
  </Stage>
);

export const SIGNALS_CUES = { co2: CUE.co2Label, heat: CUE.heatLabel, odour: CUE.odourLabel };
