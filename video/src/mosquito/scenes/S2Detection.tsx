/**
 * SCENE 2 — MOSQUITO DETECTION (5–11 s)
 * Same physical world and true scale as Scene 1 (no cut): macro orbit
 * around the head → exhaled CO₂ plume drifts in from the person's mouth →
 * the maxillary palps light up (CO₂-sensing neurons live in the capitate-peg
 * sensilla on the palps; antennae sense odours and heat) → the mosquito
 * turns into the plume and flies upstream; the camera chases the plume.
 */
import React from "react";
import * as THREE from "three";
import { Stage, Shot, V3 } from "../core/Stage";
import { cine, smoothstep, logLerp, lerp, clamp, track, SC, FPS, fbm1 } from "../core/anim";
import { Bedroom } from "../models/Bedroom";
import { Person } from "../models/Human";
import { Mosquito, MosquitoLo } from "../models/Mosquito";
import { FlowParticles } from "../fx/FlowParticles";
import { PEOPLE } from "./cast";
import { MS, HERO, HERO_QUAT, mysteryShot, heroBob, wingPhase, wingBlur, swarmMosquitoes } from "./S1Mystery";

const T0 = SC.detection.from / FPS; // 5.0
const T1 = (SC.detection.from + SC.detection.duration) / FPS; // 11.0

/** Mouth of the target person (exhaled-breath source), world metres. */
export const MOUTH: V3 = [0.5, 1.17, 0.02];
const H = new THREE.Vector3(...HERO);
const M = new THREE.Vector3(...MOUTH);
const TO_MOUTH = M.clone().sub(H).normalize();
const PATH_LEN = M.distanceTo(H);
const TURN_AT = 8.9;
const FLY_AT = 9.25;

const QUAT_TO_MOUTH = (() => {
  // nose slightly up during flight
  const aim = H.clone().add(TO_MOUTH).add(new THREE.Vector3(0, 0.15, 0));
  const m = new THREE.Matrix4().lookAt(aim, H, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
})();

/** Hero mosquito world transform for the whole opening (0–11 s). */
export function heroState(t: number) {
  const q = HERO_QUAT.clone().slerp(QUAT_TO_MOUTH, cine(clamp((t - TURN_AT) / 0.45)));
  const base = new THREE.Vector3(...heroBob(t));
  const ft = Math.max(0, t - FLY_AT);
  const dist = 0.5 * 0.2 * ft * ft;
  const pos = base.add(TO_MOUTH.clone().multiplyScalar(dist));
  return { pos, q };
}

const local = (t: number, p: V3) => {
  const s = heroState(t);
  return new THREE.Vector3(...p).multiplyScalar(MS).applyQuaternion(HERO_QUAT).add(s.pos);
};

// Camera in the hero's (original) local frame, units = mosquito lengths
const L_START = (() => {
  const s = mysteryShot(T0);
  return new THREE.Vector3(...s.pos)
    .sub(new THREE.Vector3(...heroBob(T0)))
    .divideScalar(MS)
    .applyQuaternion(HERO_QUAT.clone().invert());
})();

const macroKeys = {
  dir: [
    [T0, L_START.clone().normalize().toArray()],
    [6.4, new THREE.Vector3(0.9, 0.22, 0.5).normalize().toArray()],
    [7.6, new THREE.Vector3(0.55, 0.2, 1).normalize().toArray()],
    [8.6, new THREE.Vector3(-0.22, 0.26, 1).normalize().toArray()],
    [9.2, new THREE.Vector3(0.55, 0.55, 0.8).normalize().toArray()],
  ] as [number, number[]][],
  dist: [
    [T0, L_START.length()],
    [6.4, 1.05],
    [7.6, 0.95],
    [8.6, 1.1],
    [9.2, 2.4],
  ] as [number, number][],
  target: [
    [T0, [0, 0, 0]],
    [6.4, [0, -0.02, 0.24]],
    [7.6, [0, -0.03, 0.27]],
    [8.6, [0, 0.16, 0.28]],
    [9.2, [0, 0.1, 0.1]],
  ] as [number, number[]][],
};

const GRADE_ROOM = { exposure: 0.92, lift: [0.0, 0.012, 0.03] as [number, number, number], saturation: 0.92, contrast: 1.06, vignette: 0.6, grain: 0.04 };
const GRADE_SCI = { exposure: 1.0, lift: [0.0, 0.025, 0.04] as [number, number, number], saturation: 0.85, contrast: 1.1, vignette: 0.65, grain: 0.035 };
const mixGrade = (k: number) => ({
  exposure: lerp(GRADE_ROOM.exposure, GRADE_SCI.exposure, k),
  lift: GRADE_ROOM.lift.map((v, i) => lerp(v, GRADE_SCI.lift[i], k)) as [number, number, number],
  saturation: lerp(GRADE_ROOM.saturation, GRADE_SCI.saturation, k),
  contrast: lerp(GRADE_ROOM.contrast, GRADE_SCI.contrast, k),
  vignette: lerp(GRADE_ROOM.vignette, GRADE_SCI.vignette, k),
  grain: 0.04,
});

export const detectionShot = (t: number): Shot => {
  const sci = smoothstep(6.0, 7.4, t) * (1 - smoothstep(9.6, 10.4, t));
  const flash = smoothstep(10.72, 11.0, t);
  if (t < 9.35) {
    // logarithmic distance interpolation for the macro push
    const dirArr = track<number[]>(t, macroKeys.dir);
    const dist = Math.exp(track<number>(t, macroKeys.dist.map(([k, v]) => [k, Math.log(v)] as [number, number])));
    const tgtL = track<number[]>(t, macroKeys.target);
    const tgt = new THREE.Vector3(...(tgtL as V3)).multiplyScalar(MS).applyQuaternion(HERO_QUAT).add(new THREE.Vector3(...heroBob(t)));
    const dir = new THREE.Vector3(...(dirArr as V3)).normalize().applyQuaternion(HERO_QUAT);
    const pos = tgt.clone().add(dir.multiplyScalar(dist * MS));
    const camDist = dist * MS;
    return {
      pos: pos.toArray() as V3,
      target: tgt.toArray() as V3,
      fov: track(t, [
        [T0, 30],
        [6.4, 28],
        [9.2, 32],
      ]),
      focus: camDist,
      aperture: 0.0055 * (camDist / (1.05 * MS)),
      maxBlur: 30,
      samples: t > 8.95 ? 3 : 1,
      shutter: 0.5,
      grade: mixGrade(sci),
      bloom: { strength: 0.55, radius: 0.6, threshold: 0.7 },
    };
  }
  // Plume chase: camera flies upstream along the breath toward the person
  const u = clamp((t - 9.35) / (T1 - 9.35));
  const sc = lerp(-0.012, 0.72, Math.pow(u, 1.7));
  const side = new THREE.Vector3().crossVectors(TO_MOUTH, new THREE.Vector3(0, 1, 0)).normalize();
  const camPos = H.clone()
    .add(TO_MOUTH.clone().multiplyScalar(sc * PATH_LEN))
    .add(side.multiplyScalar(0.012 * (1 - u)))
    .add(new THREE.Vector3(0, 0.006 * (1 - u) + fbm1(t * 2, 9) * 0.002, 0));
  const look = H.clone().add(TO_MOUTH.clone().multiplyScalar((sc + 0.25) * PATH_LEN));
  const mPos = heroState(t).pos;
  const focus = Math.max(0.01, camPos.distanceTo(mPos));
  return {
    pos: camPos.toArray() as V3,
    target: look.toArray() as V3,
    fov: lerp(32, 40, u),
    focus,
    aperture: 0.05,
    maxBlur: 34,
    samples: 5,
    shutter: 0.7,
    grade: { ...mixGrade(sci), exposure: lerp(1.0, 3.2, flash) },
    bloom: { strength: 0.55 + flash * 1.2, radius: 0.7, threshold: 0.7 - flash * 0.5 },
  };
};

export const openingShot = (t: number): Shot => (t < T0 ? mysteryShot(t) : detectionShot(t));

/** Label anchors (world) for the HTML overlay. */
export const palpAnchor = (t: number): V3 => local(t, [0.026, -0.093, 0.385]).toArray() as V3;
export const antennaAnchor = (t: number): V3 => local(t, [0.12, 0.11, 0.49]).toArray() as V3;

/** Macro key / rim lights — tiny intensities because they sit centimetres away. */
const MacroLights: React.FC = () => {
  const lights = React.useMemo(() => {
    const key = new THREE.SpotLight("#ffd2a8", 0.012, 0.3, 0.18, 0.9, 2);
    key.position.copy(local(T0, [3, 6, 9]));
    key.target.position.copy(H);
    const rim = new THREE.SpotLight("#8fd8ff", 0.02, 0.3, 0.2, 0.9, 2);
    rim.position.copy(local(T0, [-6, 5, -8]));
    rim.target.position.copy(H);
    return [key, rim];
  }, []);
  return (
    <>
      {lights.map((l, i) => (
        <React.Fragment key={i}>
          <primitive object={l} />
          <primitive object={l.target} />
        </React.Fragment>
      ))}
    </>
  );
};

export const OpeningScene: React.FC = () => (
  <Stage from={0} shot={openingShot} env="night" bg="#020308" envIntensity={0.22}>
    <Bedroom />
    {PEOPLE.map((p, i) => (
      <Person key={i} look={p.look} position={p.pos} rotationY={p.rotY} />
    ))}
    {swarmMosquitoes}
    {/* Hero mosquito (full anatomy), true scale */}
    <Mosquito
      seed={1}
      wingPhase={wingPhase}
      wingBlur={wingBlur}
      palpGlow={(t) => smoothstep(7.2, 7.7, t) * (0.75 + 0.25 * Math.sin(t * 9)) * (1 - smoothstep(9.6, 10.2, t))}
      antennaGlow={(t) => smoothstep(7.7, 8.2, t) * 0.55 * (1 - smoothstep(9.6, 10.2, t))}
      place={(t, g) => {
        const s = heroState(t);
        g.position.copy(s.pos);
        g.quaternion.copy(s.q);
        g.scale.setScalar(MS);
      }}
    />
    <MacroLights />
    {/* Exhaled CO₂: translucent parcels drifting from the mouth past the mosquito */}
    <FlowParticles
      mode="plume"
      count={4200}
      seed={5}
      src={MOUTH}
      dir={TO_MOUTH.clone().negate().toArray() as V3}
      speed={PATH_LEN / 2.6}
      life={2.9}
      spread={0.03}
      turb={0.006}
      size={0.00055}
      color="#bdf6ff"
      color2="#7fd6ff"
      opacity={(t) => (0.55 + 0.35 * smoothstep(8.9, 9.6, t)) * smoothstep(6.6, 7.6, t)}
    />
  </Stage>
);

export { HERO };
export const DETECTION_END = T1;
export const logLerpExport = logLerp;
