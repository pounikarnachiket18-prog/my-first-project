/**
 * SCENE 5 — FINAL PAYOFF (28–33 s). Split screen, two independent 3D halves.
 * Left: a person with a strong skin "chemical signature" (dense aura).
 * Right: a weaker signature (sparse aura). Mosquitoes — drawn with faint
 * luminous flight trails so their paths read at phone size — converge on
 * the left far more often. Message: attraction depends on several signals
 * (CO₂, heat, skin odour), not "sweet blood".
 * Mosquitoes are drawn at 2× true size here so they stay legible in a
 * half-width frame (noted in the README).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { Stage, Shot, V3, useTick } from "../core/Stage";
import { clamp, fbm1, lerp, smoothstep, cine, SC, FPS, track } from "../core/anim";
import { Person, PersonLook } from "../models/Human";
import { MosquitoLo } from "../models/Mosquito";
import { FlowParticles } from "../fx/FlowParticles";

const T0 = SC.payoff.from / FPS; // 28
const MS2 = 0.0055 * 2.6;

export const halfShot = (side: -1 | 1) => (t: number): Shot => {
  const u = cine(clamp((t - T0) / 5));
  return {
    pos: [0.12 * side * (1 - u) - 0.05 * side, lerp(1.22, 1.28, u), lerp(2.95, 2.55, u)],
    target: [0, 1.28, 0.05],
    fov: 36,
    focus: lerp(2.9, 2.5, u),
    aperture: 0.8,
    maxBlur: 18,
    grade: { exposure: 1.0, lift: [0.0, 0.02, 0.04], saturation: 0.95, contrast: 1.08, vignette: 0.55, grain: 0.035 },
    bloom: { strength: 0.7, radius: 0.7, threshold: 0.6 },
  };
};

type Flight = { seed: number; start: number; from: V3; to: V3; orbit: number };
const leftFlights: Flight[] = [
  { seed: 1, start: 28.0, from: [-0.9, 1.9, 0.6], to: [0.2, 0.8, 0.35], orbit: 0.07 },
  { seed: 2, start: 28.4, from: [0.9, 2.0, 0.2], to: [-0.14, 1.2, 0.18], orbit: 0.06 },
  { seed: 3, start: 29.1, from: [-0.8, 0.7, 0.9], to: [-0.2, 0.85, 0.32], orbit: 0.08 },
  { seed: 4, start: 29.8, from: [0.8, 0.8, 0.8], to: [0.13, 1.32, 0.14], orbit: 0.05 },
  { seed: 5, start: 30.6, from: [-0.7, 2.0, 0.4], to: [0.22, 1.0, 0.25], orbit: 0.07 },
];
const rightFlights: Flight[] = [{ seed: 9, start: 28.6, from: [-0.9, 1.5, 0.5], to: [0.9, 1.9, 0.2], orbit: 0 }];

const flightPos = (f: Flight, t: number): THREE.Vector3 => {
  const a = clamp((t - f.start) / 2.2);
  const e = cine(a);
  const p = new THREE.Vector3(...f.from).lerp(new THREE.Vector3(...f.to), e);
  const w = 3 + f.seed;
  p.x += Math.cos(t * w) * f.orbit * e + fbm1(t * 1.3, f.seed) * 0.05;
  p.y += Math.sin(t * w * 1.3) * f.orbit * 0.5 * e + fbm1(t * 1.1, f.seed + 7) * 0.04;
  p.z += Math.sin(t * w) * f.orbit * e;
  return p;
};

const Trail: React.FC<{ f: Flight; color: string }> = ({ f, color }) => {
  const N = 40;
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const a = new Float32Array(N);
    for (let i = 0; i < N; i++) a[i] = i / (N - 1);
    g.setAttribute("aT", new THREE.BufferAttribute(a, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 0 } },
      vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vT; void main(){ gl_FragColor = vec4(uColor * (0.25 + 1.6 * vT * vT) * uOp, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, [color]);
  useTick((t) => {
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const tt = t - (1 - i / (N - 1)) * 0.9;
      const p = flightPos(f, Math.max(f.start, tt));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    (line.material as THREE.ShaderMaterial).uniforms.uOp.value = 0.9 * smoothstep(f.start, f.start + 0.3, t);
  });
  return <primitive object={line} />;
};

const Half: React.FC<{ side: -1 | 1; look: PersonLook; strong: boolean; flights: Flight[] }> = ({ side, look, strong, flights }) => (
  <Stage from={SC.payoff.from} shot={halfShot(side)} env="lab" bg="#02060a" envIntensity={0.25} width={540}>
    <ambientLight intensity={0.03} />
    {/* backlight rim + soft key */}
    <spotLight position={[0.6 * side, 2.4, -1.6]} target-position={[0, 1.0, 0]} angle={0.7} penumbra={1} intensity={14} distance={6} color="#8fd8ff" />
    <spotLight position={[-1.2 * side, 2.0, 2.2]} target-position={[0, 1.0, 0]} angle={0.6} penumbra={1} intensity={strong ? 0.7 : 0.5} distance={6} color="#ffd9b0" />
    {/* the signature itself lights the person faintly */}
    <pointLight position={[0, 0.82, 0.4]} intensity={strong ? 0.35 : 0.1} distance={1.4} color="#ffc04d" />
    <Person look={look} position={[0, 0, 0]} rotationY={-0.25 * side} />
    <FlowParticles mode="orbit" count={strong ? 1300 : 260} seed={strong ? 51 : 52} src={[0, 1.0, 0.05]} box={[1, 0.22, 0.8]} spread={0.3} speed={0.35} life={3} turb={0.03} size={strong ? 0.01 : 0.008} color="#ffc04d" color2="#ffe9a8" opacity={(t) => (strong ? 0.75 : 0.4) * smoothstep(T0, T0 + 0.6, t)} />
    <FlowParticles mode="rise" count={strong ? 500 : 90} seed={strong ? 53 : 54} src={[0, 0.7, 0.1]} box={[0.28, 0, 0.18]} speed={0.2} life={4} turb={0.1} size={0.008} color="#ffe08a" opacity={(t) => 0.5 * smoothstep(T0, T0 + 0.6, t)} />
    {flights.map((f, i) => (
      <React.Fragment key={i}>
        <Trail f={f} color={strong ? "#ffcf7a" : "#9fdcff"} />
        <MosquitoLo
          place={(t, g) => {
            const p = flightPos(f, Math.max(f.start, t));
            const a = flightPos(f, Math.max(f.start, t) + 0.05);
            g.position.copy(p);
            g.lookAt(a.x, a.y + 0.01, a.z);
            g.scale.setScalar(MS2);
            g.visible = t >= f.start;
          }}
        />
      </React.Fragment>
    ))}
  </Stage>
);

export const PayoffScene: React.FC<{ leftLook: PersonLook; rightLook: PersonLook }> = ({ leftLook, rightLook }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
      <Half side={-1} look={leftLook} strong flights={leftFlights} />
    </div>
    <div style={{ position: "absolute", left: 540, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
      <Half side={1} look={rightLook} strong={false} flights={rightFlights} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1150, height: 770, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.7) 100%)" }} />
    <div style={{ position: "absolute", left: 539, top: 0, width: 2, height: 1920, background: "linear-gradient(180deg, rgba(127,243,255,0) 0%, rgba(127,243,255,0.55) 30%, rgba(127,243,255,0.55) 70%, rgba(127,243,255,0) 100%)" }} />
  </AbsoluteFill>
);

export const payoffTrack = track;
