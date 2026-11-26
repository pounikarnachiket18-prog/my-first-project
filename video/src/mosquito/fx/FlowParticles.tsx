/**
 * Deterministic GPU particles. Each particle's position is a closed-form
 * function of time evaluated in the vertex shader (no simulation state),
 * so any frame or motion-blur sub-sample renders identically.
 *
 * Modes:
 *  plume — emitted from uSrc along uDir, widening + turbulent (exhaled CO₂)
 *  rise  — born on a horizontal area, rising and swaying (heat/odour)
 *  drift — suspended in a box, slow Brownian wander (dust in a light beam)
 *  orbit — swirling shell around uSrc (chemical "signature" aura)
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useTick } from "../core/Stage";
import { rng } from "../core/anim";

export type FlowMode = "plume" | "rise" | "drift" | "orbit";

export type FlowProps = {
  count: number;
  mode: FlowMode;
  seed?: number;
  src?: [number, number, number];
  dir?: [number, number, number];
  speed?: number; // world units / s
  life?: number; // seconds
  spread?: number; // lateral growth
  turb?: number; // turbulence amplitude
  box?: [number, number, number]; // area/box half extents
  size?: number; // world-space sprite diameter
  color?: string;
  color2?: string;
  additive?: boolean;
  opacity?: (t: number) => number;
  /** time warp, e.g. slow motion */
  timeScale?: number;
};

const VERT = /* glsl */ `
attribute vec4 aRand; // xyz random in [0,1], w = phase
uniform float uTime; uniform float uLife; uniform float uSpeed; uniform float uSpread; uniform float uTurb;
uniform vec3 uSrc; uniform vec3 uDir; uniform vec3 uBox; uniform float uSize; uniform float uViewH; uniform int uMode;
varying float vFade; varying float vMix;
vec3 turb(vec3 p, float t){
  return vec3(
    sin(p.y * 1.7 + t * 1.3 + aRand.x * 6.28) + 0.5 * sin(p.z * 3.1 - t * 2.1),
    sin(p.z * 1.9 + t * 1.1 + aRand.y * 6.28) + 0.5 * sin(p.x * 2.7 + t * 1.7),
    sin(p.x * 1.5 - t * 1.2 + aRand.z * 6.28) + 0.5 * sin(p.y * 2.3 + t * 1.9)
  );
}
void main(){
  float age = fract(uTime / uLife + aRand.w);
  vec3 r = aRand.xyz * 2.0 - 1.0;
  vec3 pos;
  if (uMode == 0) {
    vec3 d = normalize(uDir);
    vec3 side = normalize(cross(d, abs(d.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 up = cross(side, d);
    float dist = uSpeed * uLife * age;
    float w = uSpread * (0.15 + age);
    pos = uSrc + d * dist + (side * r.x + up * r.y) * w + turb(vec3(dist), uTime) * uTurb * age;
  } else if (uMode == 1) {
    pos = uSrc + vec3(r.x * uBox.x, 0.0, r.z * uBox.z);
    pos.y += uSpeed * uLife * age;
    pos += turb(pos * 0.8, uTime) * uTurb * (0.3 + age);
  } else if (uMode == 2) {
    pos = uSrc + r * uBox + turb(r * 3.0, uTime * 0.25) * uTurb;
    age = 0.5;
  } else {
    float a = aRand.x * 6.2831 + uTime * uSpeed * (0.6 + aRand.y);
    float e = (aRand.z - 0.5) * 3.0;
    float rad = uSpread * (0.85 + 0.3 * aRand.y);
    pos = uSrc + vec3(cos(a) * rad * uBox.x, e * uBox.y, sin(a) * rad * uBox.z) + turb(r * 2.0, uTime) * uTurb;
    age = fract(uTime / uLife + aRand.w);
  }
  vFade = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.7, 1.0, age));
  vMix = aRand.y;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * (0.6 + 0.8 * aRand.z) * projectionMatrix[1][1] * uViewH * 0.5 / max(0.0001, -mv.z), 0.0, 256.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity;
varying float vFade; varying float vMix;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = a * a;
  vec3 col = mix(uColor, uColor2, vMix);
  gl_FragColor = vec4(col, a * vFade * uOpacity);
}`;

export const FlowParticles: React.FC<FlowProps> = (p) => {
  const { size } = useThree();
  const obj = useMemo(() => {
    const r = rng(p.seed ?? 3);
    const n = p.count;
    const pos = new Float32Array(n * 3);
    const rand = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) rand[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mode = { plume: 0, rise: 1, drift: 2, orbit: 3 }[p.mode];
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLife: { value: p.life ?? 3 },
        uSpeed: { value: p.speed ?? 1 },
        uSpread: { value: p.spread ?? 0.3 },
        uTurb: { value: p.turb ?? 0.1 },
        uSrc: { value: new THREE.Vector3(...(p.src ?? [0, 0, 0])) },
        uDir: { value: new THREE.Vector3(...(p.dir ?? [1, 0, 0])) },
        uBox: { value: new THREE.Vector3(...(p.box ?? [1, 1, 1])) },
        uSize: { value: p.size ?? 0.05 },
        uViewH: { value: size.height },
        uMode: { value: mode },
        uColor: { value: new THREE.Color(p.color ?? "#cfefff") },
        uColor2: { value: new THREE.Color(p.color2 ?? p.color ?? "#cfefff") },
        uOpacity: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: p.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useTick((t) => {
    const u = (obj.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = t * (p.timeScale ?? 1);
    u.uOpacity.value = p.opacity ? p.opacity(t) : 1;
    obj.visible = u.uOpacity.value > 0.001;
  });
  return <primitive object={obj} />;
};
