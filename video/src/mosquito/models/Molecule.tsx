/**
 * Ball-and-stick molecules with real bond orders and approximate real
 * geometry (Å). CPK-inspired colours: C graphite, O red, H white, N blue.
 *  - CO₂: linear O=C=O (C–O 1.16 Å)
 *  - NH₃ (ammonia): trigonal pyramid, H–N–H ≈ 107°
 *  - Lactic acid CH₃–CH(OH)–COOH (a known skin-odour mosquito attractant)
 *  - Long-chain carboxylic acid CH₃(CH₂)ₙCOOH: zig-zag chain, 112° C–C–C,
 *    carboxyl group (–COOH) flagged so it can be highlighted.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useTick } from "../core/Stage";

export type El = "C" | "O" | "H" | "N";
export type Atom = { el: El; p: [number, number, number]; tag?: string };
export type Bond = [number, number, number]; // i, j, order
export type MolData = { atoms: Atom[]; bonds: Bond[] };

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const CO2: MolData = {
  atoms: [
    { el: "C", p: [0, 0, 0] },
    { el: "O", p: [1.16, 0, 0] },
    { el: "O", p: [-1.16, 0, 0] },
  ],
  bonds: [
    [0, 1, 2],
    [0, 2, 2],
  ],
};

export const NH3: MolData = (() => {
  const atoms: Atom[] = [{ el: "N", p: [0, 0.12, 0] }];
  const th = THREE.MathUtils.degToRad(68);
  for (let i = 0; i < 3; i++) {
    const ph = (i / 3) * Math.PI * 2;
    atoms.push({ el: "H", p: [1.01 * Math.sin(th) * Math.cos(ph), 0.12 - 1.01 * Math.cos(th), 1.01 * Math.sin(th) * Math.sin(ph)] });
  }
  return { atoms, bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] };
})();

export const LACTIC: MolData = {
  atoms: [
    { el: "C", p: [0, 0, 0] }, // 0 carboxyl C
    { el: "O", p: [0.62, 1.04, 0] }, // 1 =O
    { el: "O", p: [0.7, -1.12, 0] }, // 2 –OH
    { el: "H", p: [1.64, -0.98, 0] }, // 3
    { el: "C", p: [-1.52, 0, 0] }, // 4 alpha C
    { el: "O", p: [-2.0, 1.3, 0.32] }, // 5 hydroxyl O
    { el: "H", p: [-2.95, 1.32, 0.36] }, // 6
    { el: "H", p: [-1.86, -0.5, 0.9] }, // 7
    { el: "C", p: [-2.05, -0.84, -1.15] }, // 8 methyl C
    { el: "H", p: [-3.14, -0.84, -1.12] },
    { el: "H", p: [-1.72, -1.88, -1.06] },
    { el: "H", p: [-1.72, -0.44, -2.1] },
  ],
  bonds: [
    [0, 1, 2], [0, 2, 1], [2, 3, 1], [0, 4, 1], [4, 5, 1], [5, 6, 1], [4, 7, 1], [4, 8, 1], [8, 9, 1], [8, 10, 1], [8, 11, 1],
  ],
};

/** Saturated carboxylic acid with nC carbons (incl. the carboxyl carbon). */
export function carboxylicAcid(nC = 10): MolData {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const dx = 1.53 * Math.sin(THREE.MathUtils.degToRad(56));
  const dy = 1.53 * Math.cos(THREE.MathUtils.degToRad(56));
  const cIdx: number[] = [];
  const x0 = -((nC - 1) * dx) / 2;
  for (let k = 0; k < nC; k++) {
    const up = k % 2 === 0 ? 1 : -1;
    const isCarboxyl = k === nC - 1;
    atoms.push({ el: "C", p: [x0 + k * dx, (up * dy) / 2, 0], tag: isCarboxyl ? "cooh" : undefined });
    cIdx.push(atoms.length - 1);
    if (k > 0) bonds.push([cIdx[k - 1], cIdx[k], 1]);
  }
  // Hydrogens on CH3 / CH2
  for (let k = 0; k < nC - 1; k++) {
    const c = V(...atoms[cIdx[k]].p);
    const up = k % 2 === 0 ? 1 : -1;
    const dirs = [V(0, up * 0.55, 0.83), V(0, up * 0.55, -0.83)];
    if (k === 0) dirs.push(V(-0.94, -up * 0.33, 0));
    for (const d of dirs) {
      const h = c.clone().add(d.normalize().multiplyScalar(1.09));
      atoms.push({ el: "H", p: [h.x, h.y, h.z] });
      bonds.push([cIdx[k], atoms.length - 1, 1]);
    }
  }
  // Carboxyl group: C(=O)–O–H in the chain plane
  const cl = V(...atoms[cIdx[nC - 1]].p);
  const cp = V(...atoms[cIdx[nC - 2]].p);
  const vin = cl.clone().sub(cp).normalize();
  const rot = (v: THREE.Vector3, deg: number) => v.clone().applyAxisAngle(V(0, 0, 1), THREE.MathUtils.degToRad(deg));
  const sgn = (nC - 1) % 2 === 0 ? 1 : -1;
  const o1 = cl.clone().add(rot(vin, 62 * sgn).multiplyScalar(1.21));
  const o2 = cl.clone().add(rot(vin, -58 * sgn).multiplyScalar(1.34));
  const hO = o2.clone().add(rot(vin, -6 * sgn).multiplyScalar(0.97));
  atoms.push({ el: "O", p: [o1.x, o1.y, o1.z], tag: "cooh" });
  bonds.push([cIdx[nC - 1], atoms.length - 1, 2]);
  atoms.push({ el: "O", p: [o2.x, o2.y, o2.z], tag: "cooh" });
  const io2 = atoms.length - 1;
  bonds.push([cIdx[nC - 1], io2, 1]);
  atoms.push({ el: "H", p: [hO.x, hO.y, hO.z], tag: "cooh" });
  bonds.push([io2, atoms.length - 1, 1]);
  return { atoms, bonds };
}

const RADIUS: Record<El, number> = { C: 0.36, O: 0.34, H: 0.22, N: 0.35 };
const COLOR: Record<El, string> = { C: "#3a3f47", O: "#d9443a", H: "#eef1f4", N: "#3d6be0" };

const sphereGeo = new THREE.SphereGeometry(1, 32, 22);
const bondGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1);

export type MolLook = "glass" | "ghost";

export function buildMolecule(data: MolData, look: MolLook = "glass") {
  const g = new THREE.Group();
  const mats = new Map<string, THREE.MeshPhysicalMaterial>();
  const mat = (el: El, hi: boolean) => {
    const key = el + (hi ? "*" : "");
    if (!mats.has(key)) {
      mats.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color: COLOR[el],
          roughness: look === "glass" ? 0.22 : 0.4,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          sheen: 0.4,
          sheenColor: new THREE.Color("#9fd8ff"),
          emissive: new THREE.Color(hi ? "#ffb020" : COLOR[el]),
          emissiveIntensity: 0,
          transparent: look === "ghost",
          opacity: 1,
        }),
      );
    }
    return mats.get(key)!;
  };
  const bondMat = new THREE.MeshPhysicalMaterial({ color: "#c9d2dc", roughness: 0.3, clearcoat: 0.6, emissive: new THREE.Color("#ffb020"), emissiveIntensity: 0 });
  const hiBondMat = bondMat.clone();
  data.atoms.forEach((a) => {
    const m = new THREE.Mesh(sphereGeo, mat(a.el, a.tag === "cooh"));
    m.position.set(...a.p);
    m.scale.setScalar(RADIUS[a.el]);
    g.add(m);
  });
  const up = V(0, 1, 0);
  data.bonds.forEach(([i, j, order]) => {
    const a = V(...data.atoms[i].p), b = V(...data.atoms[j].p);
    const hi = data.atoms[i].tag === "cooh" && data.atoms[j].tag === "cooh";
    const d = b.clone().sub(a);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
    const perp = d.clone().cross(Math.abs(d.z) < 0.9 * len ? V(0, 0, 1) : V(1, 0, 0)).normalize();
    const offs = order === 2 ? [-0.1, 0.1] : [0];
    for (const o of offs) {
      const m = new THREE.Mesh(bondGeo, hi ? hiBondMat : bondMat);
      m.position.copy(a.clone().lerp(b, 0.5).add(perp.clone().multiplyScalar(o)));
      m.quaternion.copy(q);
      m.scale.set(order === 2 ? 0.055 : 0.075, len, order === 2 ? 0.055 : 0.075);
      g.add(m);
    }
  });
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const setGlow = (base: number, cooh: number) => {
    mats.forEach((m, k) => (m.emissiveIntensity = k.endsWith("*") ? cooh * 2.2 : base * 0.6));
    hiBondMat.emissiveIntensity = cooh * 1.5;
  };
  const setOpacity = (o: number) => {
    mats.forEach((m) => {
      m.transparent = o < 0.999;
      m.opacity = o;
    });
    bondMat.transparent = hiBondMat.transparent = o < 0.999;
    bondMat.opacity = hiBondMat.opacity = o;
  };
  return { group: g, setGlow, setOpacity };
}

export const Molecule: React.FC<{
  data: MolData;
  look?: MolLook;
  place?: (t: number, g: THREE.Group) => void;
  glow?: (t: number) => { base: number; cooh: number };
  opacity?: (t: number) => number;
}> = ({ data, look, place, glow, opacity }) => {
  const m = useMemo(() => buildMolecule(data, look), [data, look]);
  useTick((t) => {
    place?.(t, m.group);
    if (glow) {
      const gl = glow(t);
      m.setGlow(gl.base, gl.cooh);
    }
    if (opacity) m.setOpacity(opacity(t));
  });
  return <primitive object={m.group} />;
};
