import * as THREE from "three";

export const deg = (d: number) => (d * Math.PI) / 180;

/** Camera position on a sphere around `target` (azimuth around +Y, elevation above the XZ plane). */
export const orbit = (dist: number, azDeg: number, elDeg: number, target = new THREE.Vector3()) =>
  new THREE.Vector3(
    target.x + dist * Math.cos(deg(elDeg)) * Math.sin(deg(azDeg)),
    target.y + dist * Math.sin(deg(elDeg)),
    target.z + dist * Math.cos(deg(elDeg)) * Math.cos(deg(azDeg)),
  );

/** Project a world point to pixel coordinates for HTML labels that track 3D objects. */
export const project = (
  p: THREE.Vector3, camPos: THREE.Vector3, target: THREE.Vector3, fov: number, W: number, H: number, roll = 0,
) => {
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.01, 3000);
  cam.position.copy(camPos);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = p.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, behind: v.z > 1 };
};

export const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const easeOut = (t: number, p = 3) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, p));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
