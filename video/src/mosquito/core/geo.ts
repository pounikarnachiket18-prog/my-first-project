/** Geometry helpers: tapered tubes along curves, lathe segments, instancing. */
import * as THREE from "three";

/** Tube whose radius tapers from r0 to r1 along a curve (closed end caps). */
export function taperedTube(
  pts: THREE.Vector3[],
  r0: number,
  r1: number,
  tubular = 24,
  radial = 10,
  profile?: (u: number) => number,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, P);
    const r = (r0 + (r1 - r0) * u) * (profile ? profile(u) : 1);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const s = Math.sin(v), c = -Math.cos(v);
      const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
      nor.push(nx, ny, nz);
      uv.push(j / radial, u);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // end caps
  const capAt = (u: number, flip: boolean) => {
    curve.getPointAt(u, P);
    const T = curve.getTangentAt(u).multiplyScalar(flip ? -1 : 1);
    const center = pos.length / 3;
    pos.push(P.x, P.y, P.z);
    nor.push(T.x, T.y, T.z);
    uv.push(0.5, u);
    const ring = (u === 0 ? 0 : tubular) * (radial + 1);
    for (let j = 0; j < radial; j++) flip ? idx.push(center, ring + j, ring + j + 1) : idx.push(center, ring + j + 1, ring + j);
  };
  capAt(0, true);
  capAt(1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Barrel-shaped segment (lathe) along +Y, length L, radius profile fn. */
export function latheSegment(L: number, radius: (v: number) => number, seg = 32, rings = 14) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    pts.push(new THREE.Vector2(Math.max(0.0001, radius(v)), v * L));
  }
  return new THREE.LatheGeometry(pts, seg);
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Orient an object so its +Y axis points from a to b, placed at a. */
export function alignY(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  obj.position.copy(a);
  const d = b.clone().sub(a).normalize();
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
}
