/**
 * Image-based lighting built offline from emissive panels (no HDR downloads).
 * Each preset is a tiny light-stage prefiltered with PMREM so PBR materials
 * (chitin, sweat, wing membranes, glassy atoms) get believable reflections.
 */
import * as THREE from "three";

export type EnvKind = "night" | "lab" | "skin" | "studio" | "void";

type Panel = { pos: [number, number, number]; size: [number, number]; color: string; intensity: number };

const PRESETS: Record<EnvKind, { base: string; panels: Panel[] }> = {
  // Bedroom at night: cool window, warm practical lamp, very dark walls.
  night: {
    base: "#05070c",
    panels: [
      { pos: [-6, 2, -3], size: [3, 4], color: "#6f9bff", intensity: 2.2 },
      { pos: [5, 0.5, -4], size: [1.2, 1.2], color: "#ffb064", intensity: 5 },
      { pos: [0, 8, 0], size: [6, 6], color: "#1c2540", intensity: 0.6 },
    ],
  },
  // Scientific macro void: soft top box, teal rim strips.
  lab: {
    base: "#020509",
    panels: [
      { pos: [0, 7, 1], size: [6, 4], color: "#cfe7ff", intensity: 1.6 },
      { pos: [-6, 1, -2], size: [1.2, 6], color: "#2fd3c8", intensity: 2.5 },
      { pos: [6, 0, -3], size: [1.2, 6], color: "#3a7bff", intensity: 2.0 },
      { pos: [0, -6, 0], size: [8, 8], color: "#05101a", intensity: 0.5 },
    ],
  },
  // Warm macro skin: large warm softbox, cool back rim for sweat glints.
  skin: {
    base: "#0b0604",
    panels: [
      { pos: [-3, 6, 3], size: [5, 4], color: "#ffd9b8", intensity: 2.4 },
      { pos: [5, 2, -5], size: [2, 5], color: "#8fb6ff", intensity: 2.2 },
      { pos: [0, 4, -6], size: [6, 1.5], color: "#ffe9d0", intensity: 1.2 },
    ],
  },
  studio: {
    base: "#0a0a0c",
    panels: [
      { pos: [0, 6, 4], size: [6, 3], color: "#ffffff", intensity: 1.8 },
      { pos: [-6, 2, 0], size: [2, 5], color: "#ffffff", intensity: 1.0 },
      { pos: [6, 2, -2], size: [2, 5], color: "#ffffff", intensity: 0.8 },
    ],
  },
  void: {
    base: "#000000",
    panels: [
      { pos: [0, 6, 4], size: [5, 2], color: "#ffffff", intensity: 1.4 },
      { pos: [5, 0, -4], size: [1, 6], color: "#f4c27a", intensity: 1.2 },
    ],
  },
};

const cache = new WeakMap<THREE.WebGLRenderer, Map<EnvKind, THREE.Texture>>();

export function makeEnvironment(gl: THREE.WebGLRenderer, kind: EnvKind): THREE.Texture {
  let m = cache.get(gl);
  if (!m) {
    m = new Map();
    cache.set(gl, m);
  }
  const hit = m.get(kind);
  if (hit) return hit;
  const p = PRESETS[kind];
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(16, 16, 16),
    new THREE.MeshBasicMaterial({ color: p.base, side: THREE.BackSide }),
  );
  envScene.add(room);
  for (const panel of p.panels) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.color).multiplyScalar(panel.intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...panel.size), mat);
    mesh.position.set(...panel.pos);
    mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(gl);
  const tex = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();
  m.set(kind, tex);
  return tex;
}
