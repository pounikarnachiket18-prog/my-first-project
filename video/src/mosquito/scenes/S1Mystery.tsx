/**
 * SCENE 1 — THE MYSTERY (0–5 s)
 * One continuous camera move: wide of five people in a dark bedroom →
 * slow push → rack focus to the one person mosquitoes are circling →
 * speed-ramped dive into an extreme macro of a single mosquito.
 */
import React from "react";
import * as THREE from "three";
import { Shot, V3 } from "../core/Stage";
import { track, cine, smoothstep, logLerp, lerp, fbm1, SC, FPS, CUE, clamp } from "../core/anim";
import { Mosquito, MosquitoLo } from "../models/Mosquito";

/** Real scale: female Aedes aegypti body ≈ 5.5 mm. */
export const MS = 0.0055;
/** Bare forearm of the target person (world, metres). */
export const ARM: V3 = [0.7, 0.75, 0.17];
/** Hero mosquito hover point, just above the wrist. */
export const HERO: V3 = [0.7, 0.81, 0.31];
/** Hero heading (where its +Z faces): across the arm, 3/4 toward camera. */
const HERO_DIR = new THREE.Vector3(0.15, -0.1, 1).normalize();
export const HERO_QUAT = (() => {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...HERO).add(HERO_DIR), new THREE.Vector3(...HERO), new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
})();

const T_DIVE = 3.75;
const T_END = (SC.mystery.from + SC.mystery.duration) / FPS; // 5.0
const DIVE_DIR_END = new THREE.Vector3(0.95, 0.12, 0.28).normalize();
export const DIVE_DIST_END = 0.03;

const preShot = (t: number) => {
  const pos = track<number[]>(t, [
    [0, [1.95, 1.45, 5.05]],
    [1.5, [1.72, 1.32, 4.0]],
    [2.6, [1.25, 0.98, 1.35]],
    [T_DIVE, [0.88, 0.87, 0.52]],
  ]);
  const target = track<number[]>(t, [
    [0, [0.12, 0.82, 0]],
    [1.5, [0.26, 0.8, 0.05]],
    [2.6, [0.66, 0.83, 0.28]],
    [T_DIVE, [0.7, 0.83, 0.3]],
  ]);
  const fov = track(t, [
    [0, 42],
    [T_DIVE, 36],
  ]);
  return { pos, target, fov };
};

export const heroBob = (t: number): V3 => {
  // hover drift calms as the macro begins (millimetres matter at that scale)
  const k = 1 - 0.85 * smoothstep(3.9, 5.0, t);
  return [HERO[0] + fbm1(t * 0.9, 21) * 0.004 * k, HERO[1] + fbm1(t * 1.1, 22) * 0.003 * k, HERO[2] + fbm1(t * 0.8, 23) * 0.003 * k];
};

/** Wing-beat rate: real speed (~620 Hz) ramping into slow motion for the macro. */
export const wingRate = (t: number) => lerp(620, 2.6, smoothstep(4.35, 4.95, t)) * (1 - smoothstep(8.85, 9.0, t)) + 620 * smoothstep(8.85, 9.0, t);
export const wingPhase = (t: number) => {
  // integrate rate from 0..t (Simpson, 64 steps) — deterministic
  const n = 64;
  const h = t / n;
  let s = wingRate(0) + wingRate(t);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * wingRate(i * h);
  return (s * h) / 3;
};
export const wingBlur = (t: number) => clamp((wingRate(t) - 6) / 40);

export const mysteryShot = (t: number): Shot => {
  const grade = { exposure: 0.92, lift: [0.0, 0.012, 0.03] as [number, number, number], saturation: 0.92, contrast: 1.06, vignette: 0.6, grain: 0.04 };
  if (t < T_DIVE) {
    const s = preShot(t);
    const armDist = Math.hypot(s.pos[0] - HERO[0], s.pos[1] - HERO[1], s.pos[2] - HERO[2]);
    const tgtDist = Math.hypot(s.pos[0] - s.target[0], s.pos[1] - s.target[1], s.pos[2] - s.target[2]);
    const rack = smoothstep(1.9, 2.7, t);
    return {
      pos: s.pos as V3,
      target: s.target as V3,
      fov: s.fov,
      focus: lerp(tgtDist, armDist, rack),
      aperture: lerp(1.6, 2.6, rack),
      maxBlur: 26,
      samples: 1,
      grade,
      bloom: { strength: 0.45, radius: 0.6, threshold: 0.75 },
    };
  }
  const s0 = preShot(T_DIVE);
  const u = clamp((t - T_DIVE) / (T_END - T_DIVE));
  const e = cine(u);
  const hb = heroBob(t);
  const target = new THREE.Vector3(...(s0.target as V3)).lerp(new THREE.Vector3(...hb), smoothstep(0, 0.55, u));
  const d0 = new THREE.Vector3(...(s0.pos as V3)).sub(new THREE.Vector3(...(s0.target as V3)));
  const dist0 = d0.length();
  const dir = d0.normalize().lerp(DIVE_DIR_END, e).normalize();
  const dist = logLerp(dist0, DIVE_DIST_END, e);
  const pos = target.clone().add(dir.multiplyScalar(dist));
  const speed = Math.sin(Math.PI * u);
  return {
    pos: [pos.x, pos.y, pos.z],
    target: [target.x, target.y, target.z],
    fov: lerp(36, 30, e),
    focus: dist,
    aperture: logLerp(2.6, 0.16, e),
    maxBlur: 30,
    samples: speed > 0.25 ? 5 : 1,
    shutter: 0.6,
    grade,
    bloom: { strength: 0.45, radius: 0.6, threshold: 0.75 },
  };
};

// Swarm around the target forearm (the "why you?" evidence)
const swarm = Array.from({ length: 6 }, (_, i) => ({
  rx: 0.07 + (i % 3) * 0.035,
  ry: 0.03 + (i % 2) * 0.03,
  rz: 0.06 + ((i + 1) % 3) * 0.03,
  w: 1.1 + i * 0.23,
  ph: i * 1.7,
  seed: 40 + i,
}));
const swarmPos = (k: number, t: number): THREE.Vector3 => {
  const s = swarm[k];
  return new THREE.Vector3(
    ARM[0] + Math.cos(t * s.w + s.ph) * s.rx + fbm1(t * 0.7, s.seed) * 0.03,
    ARM[1] + 0.06 + Math.sin(t * s.w * 1.3 + s.ph) * s.ry + fbm1(t * 0.9, s.seed + 1) * 0.02,
    ARM[2] + Math.sin(t * s.w + s.ph) * s.rz + fbm1(t * 0.6, s.seed + 2) * 0.03,
  );
};
const placeAlong = (fn: (t: number) => THREE.Vector3, scale = MS) => (t: number, g: THREE.Group) => {
  const p = fn(t);
  const ahead = fn(t + 0.04);
  g.position.copy(p);
  g.lookAt(ahead.x, ahead.y + 0.002, ahead.z);
  g.scale.setScalar(scale);
};

// Two "uninterested" mosquitoes elsewhere in the room
const wanderer = (seed: number, c: V3) => (t: number) =>
  new THREE.Vector3(c[0] + fbm1(t * 0.35, seed) * 0.5, c[1] + fbm1(t * 0.3, seed + 1) * 0.25, c[2] + fbm1(t * 0.32, seed + 2) * 0.35);

// One mosquito crossing right in front of the lens
const flyBy = (t: number): THREE.Vector3 => {
  const s = mysteryShot(t);
  const pos = new THREE.Vector3(...s.pos);
  const fwd = new THREE.Vector3(...s.target).sub(pos).normalize();
  const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const u = clamp((t - 2.35) / 0.85);
  return pos
    .add(fwd.multiplyScalar(0.3))
    .add(right.multiplyScalar(lerp(-0.22, 0.26, u)))
    .add(new THREE.Vector3(0, 0.03 * Math.sin(u * 5) - 0.02, 0));
};

/** Swarm + wanderers + lens fly-by (shared with the continuous opening shot). */
export const swarmMosquitoes = (
  <>
    {swarm.map((_, k) => (
      <MosquitoLo key={k} place={placeAlong((t) => swarmPos(k, t), MS * 1.25)} />
    ))}
    <MosquitoLo place={placeAlong(wanderer(71, [-1.3, 1.5, 0.6]))} />
    <MosquitoLo place={placeAlong(wanderer(83, [-0.2, 1.9, 0.9]))} />
    <Mosquito
      seed={2}
      wingBlur={() => 1}
      place={(t, g) => {
        const vis = t > 2.3 && t < 3.25;
        g.visible = vis;
        if (!vis) return;
        placeAlong(flyBy)(t, g);
      }}
    />
  </>
);

export const MYSTERY_END = T_END;
export const WHY_YOU_AT = CUE.whyYou;
