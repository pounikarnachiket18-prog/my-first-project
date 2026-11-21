import * as THREE from "three";

/** Shared, deterministic geometry for the 3D world (units: metres, Y up). */

const PTS: [number, number][] = [
  [-1500, 1000],
  [-1100, 780],
  [-700, 820],
  [-350, 640],
  [-50, 420],
  [230, 160],
  [400, -150],
  [455, -450],
  [460, -750],
  [460, -1050],
  [460, -1350],
  [460, -1600],
];

export const CURVE = new THREE.CatmullRomCurve3(
  PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  "centripetal",
);
export const TRACK_LEN = CURVE.getLength();
export const TRACK_SAMPLES = CURVE.getSpacedPoints(900);

export type Pose = { p: THREE.Vector3; fwd: THREE.Vector3; side: THREE.Vector3; yaw: number };

export const poseAt = (s: number): Pose => {
  const u = THREE.MathUtils.clamp(s / TRACK_LEN, 0, 1);
  const p = CURVE.getPointAt(u);
  const t = CURVE.getTangentAt(u).normalize();
  const fwd = new THREE.Vector3(t.x, 0, t.z).normalize();
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  return { p, fwd, side, yaw: Math.atan2(-fwd.z, fwd.x) };
};

/** Arc length where the track first reaches a given z (heading south). */
const sAtZ = (z: number) => {
  for (let i = 0; i < TRACK_SAMPLES.length; i++) {
    if (TRACK_SAMPLES[i].z <= z) return (i / (TRACK_SAMPLES.length - 1)) * TRACK_LEN;
  }
  return TRACK_LEN;
};

export const STATION = {
  sStart: sAtZ(-1050),
  sEnd: sAtZ(-1330),
  x: 460,
  zStart: -1050,
  zEnd: -1330,
};

export const distToTrack = (x: number, z: number) => {
  let d = Infinity;
  for (const p of TRACK_SAMPLES) {
    const dd = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (dd < d) d = dd;
  }
  return Math.sqrt(d);
};

/* ---- Train layout ---- */
export const ENGINE_LEN = 20;
export const COACH_LEN = 22;
export const COACH_GAP = 1.2;

/** Arc-length of the centre of vehicle i (0 = engine) for a given engine-nose position. */
export const vehicleCenterS = (head: number, i: number) =>
  i === 0 ? head - ENGINE_LEN / 2 : head - ENGINE_LEN - COACH_GAP - (i - 1) * (COACH_LEN + COACH_GAP) - COACH_LEN / 2;

/** Converts a point in a vehicle's local frame (x along travel, y up, z right) to world space. */
export const localToWorld = (head: number, i: number, local: [number, number, number]) => {
  const { p, fwd, side } = poseAt(vehicleCenterS(head, i));
  return new THREE.Vector3()
    .copy(p)
    .addScaledVector(fwd, local[0])
    .add(new THREE.Vector3(0, local[1], 0))
    .addScaledVector(side, local[2]);
};

/* ---- S4 interior layout (coach index 4) ---- */
export const S4_INDEX = 4;
export const BAY_X = [-9.4, -7.0, -4.6, -2.2, 0.2, 2.6, 5.0, 7.4];
// Riya: bay 4, window seat, bench facing forward
export const RIYA_LOCAL: [number, number, number] = [BAY_X[4] + 0.35, 2.3, -1.15];

/* ---- Camera helpers ---- */
export type Cam = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };

export const lerpV = (a: THREE.Vector3, b: THREE.Vector3, t: number) => new THREE.Vector3().lerpVectors(a, b, t);

export const offsetFrom = (pose: Pose, along: number, up: number, side: number) =>
  new THREE.Vector3().copy(pose.p).addScaledVector(pose.fwd, along).add(new THREE.Vector3(0, up, 0)).addScaledVector(pose.side, side);

/** Projects a world point to screen pixels for a camera, for pinning HTML labels to 3D things. */
export const project = (cam: Cam, world: THREE.Vector3, width: number, height: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.5, 20000);
  c.position.copy(cam.pos);
  c.lookAt(cam.look);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = world.clone().project(c);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 };
};
