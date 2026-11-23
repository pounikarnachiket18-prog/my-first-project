import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Block, LampPost, Palm } from "./kit";

export type V3 = [number, number, number];

// Indian roads keep LEFT: carriageway A (x<0) flows away from camera (-z),
// carriageway B (x>0) flows towards it (+z).
export const LANE_A = [-2.5, -5.7, -8.9];
export const LANE_B = [2.5, 5.7, 8.9];

export const PAL = {
  skyTop: "#0F4C5C",
  skyMid: "#E9824A",
  skyLow: "#FFD08A",
  fog: "#E79A63",
  ground: "#4E5A35",
  dirt: "#7A5E3E",
  asphalt: "#2C2A33",
};

// ---------------------------------------------------------------- deterministic rng
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

// ---------------------------------------------------------------- camera
export const CameraRig: React.FC<{ position: V3; target: V3; fov?: number; roll?: number }> = ({ position, target, fov = 40, roll = 0 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...position);
    cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    cam.lookAt(...target);
    if (cam.fov !== fov) {
      cam.fov = fov;
    }
    cam.near = 0.3;
    cam.far = 2000;
    cam.updateProjectionMatrix();
  });
  return null;
};

// ---------------------------------------------------------------- sky + light
const skyVert = `varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0);} `;
const skyFrag = `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir; varying vec3 vP;
void main(){ vec3 d = normalize(vP - cameraPosition); float h = d.y;
 vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, h)) : mix(low, mid, smoothstep(-0.02, 0.12, h));
 float s = max(dot(d, normalize(sunDir)), 0.0);
 c += vec3(1.0,0.85,0.55) * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35);
 gl_FragColor = vec4(c, 1.0);
 #include <colorspace_fragment>
}`;

export const Sky: React.FC<{ center: V3; sunDir?: V3 }> = ({ center, sunDir = [0.15, 0.06, -1] }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(PAL.skyTop) },
          mid: { value: new THREE.Color(PAL.skyMid) },
          low: { value: new THREE.Color(PAL.skyLow) },
          sunDir: { value: new THREE.Vector3(...sunDir) },
        },
      }),
    [sunDir],
  );
  return (
    <mesh position={center} material={mat} renderOrder={-1}>
      <sphereGeometry args={[1500, 32, 16]} />
    </mesh>
  );
};

export const Lights: React.FC<{ focus: V3; shadowSize?: number }> = ({ focus, shadowSize = 70 }) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  const light = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    target.position.set(...focus);
    target.updateMatrixWorld();
    if (light.current) {
      light.current.position.set(focus[0] - 40, focus[1] + 45, focus[2] - 90);
      light.current.target = target;
      const c = light.current.shadow.camera;
      c.left = -shadowSize;
      c.right = shadowSize;
      c.top = shadowSize;
      c.bottom = -shadowSize;
      c.near = 1;
      c.far = 400;
      c.updateProjectionMatrix();
    }
  });
  return (
    <>
      <primitive object={target} />
      <hemisphereLight args={["#9FD3DE", "#5A3A2A", 0.9]} />
      <ambientLight intensity={0.25} color="#FFD6B0" />
      <directionalLight
        ref={light}
        color="#FFB37A"
        intensity={2.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      />
    </>
  );
};

// ---------------------------------------------------------------- instanced helpers
const Instanced: React.FC<{
  mats: THREE.Matrix4[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  colors?: THREE.Color[];
  shadow?: boolean;
}> = ({ mats, geometry, material, colors, shadow = true }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    mats.forEach((mx, i) => m.setMatrixAt(i, mx));
    if (colors) colors.forEach((c, i) => m.setColorAt(i, c));
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  });
  if (mats.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, mats.length]} castShadow={shadow} receiveShadow frustumCulled={false} />;
};

const mx = (p: V3, s: V3 = [1, 1, 1], ry = 0) => {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(...s));
  return m;
};

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ico: new THREE.IcosahedronGeometry(1, 0),
  cone: new THREE.ConeGeometry(1, 1, 6),
};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

const MATS = {
  lane: std("#F1E6D3", { roughness: 0.6 }),
  yellow: std("#E8B83C", { roughness: 0.6 }),
  white: std("#FFFFFF", { vertexColors: false }),
  trunk: std("#5A3E2B"),
  crown: std("#FFFFFF"),
  barrier: std("#B8BCC2", { metalness: 0.5, roughness: 0.4 }),
  shrub: std("#3E6B37"),
  flower: std("#E05297"),
  hill: std("#FFFFFF"),
};

// ---------------------------------------------------------------- highway world
type Clear = [number, number, number, number]; // x0,x1,z0,z1 regions kept free of trees/blocks
const inClear = (cl: Clear[], x: number, z: number) => cl.some(([a, b, c, d]) => x >= Math.min(a, b) && x <= Math.max(a, b) && z >= Math.min(c, d) && z <= Math.max(c, d));

export const Highway: React.FC<{ z0: number; z1: number; seed?: number; lampsOn?: number; blocks?: boolean; clear?: Clear[] }> = ({
  z0,
  z1,
  seed = 7,
  lampsOn = 0.6,
  blocks = true,
  clear = [],
}) => {
  const len = z0 - z1;
  const mid = (z0 + z1) / 2;
  const data = useMemo(() => {
    const r = rng(seed);
    const dashes: THREE.Matrix4[] = [];
    for (let z = z0; z > z1; z -= 12) {
      for (const x of [-4.1, -7.3, 4.1, 7.3]) dashes.push(mx([x, 0.03, z], [0.15, 0.04, 4.5]));
    }
    const trunks: THREE.Matrix4[] = [];
    const crowns: THREE.Matrix4[] = [];
    const crownCols: THREE.Color[] = [];
    const palms: V3[] = [];
    for (let z = z0; z > z1; z -= 9) {
      for (const side of [-1, 1]) {
        if (r() < 0.25) continue;
        const x = side * (14 + r() * 18);
        const zz = z + r() * 6;
        if (inClear(clear, x, zz)) continue;
        if (r() < 0.12) {
          palms.push([x, 0, zz]);
          continue;
        }
        const s = 0.8 + r() * 0.9;
        trunks.push(mx([x, 1.1 * s, zz], [0.35 * s, 2.2 * s, 0.35 * s]));
        crowns.push(mx([x, 3.4 * s, zz], [1.7 * s, 1.9 * s, 1.7 * s], r() * 3));
        crownCols.push(new THREE.Color(["#2F5A3A", "#3F6B3A", "#4F7D3A", "#2B4F35"][Math.floor(r() * 4)]));
      }
    }
    const shrubs: THREE.Matrix4[] = [];
    const flowers: THREE.Matrix4[] = [];
    for (let z = z0; z > z1; z -= 4) {
      shrubs.push(mx([0, 0.55, z], [0.75, 0.55, 1.6], r()));
      if (r() < 0.4) flowers.push(mx([0, 0.95, z + 0.3], [0.45, 0.3, 0.7], r()));
    }
    const hills: THREE.Matrix4[] = [];
    const hillCols: THREE.Color[] = [];
    for (let z = z0 - 100; z > z1 - 400; z -= 70) {
      for (const side of [-1, 1]) {
        const h = 22 + r() * 40;
        const w = 90 + r() * 110;
        hills.push(mx([side * (170 + r() * 160), 0, z + r() * 40], [w, h, w * (0.7 + r() * 0.6)], r() * 3));
        hillCols.push(new THREE.Color(r() > 0.5 ? "#5E4E63" : "#4B5A48"));
      }
    }
    const blockList: { p: V3; s: V3; seed: number }[] = [];
    if (blocks) {
      for (let z = z0 - 30; z > z1; z -= 26) {
        for (const side of [-1, 1]) {
          if (r() < 0.35) continue;
          const w = 10 + r() * 14;
          const h = 8 + r() * 26;
          if (inClear(clear, side * 60, z)) continue;
          blockList.push({ p: [side * (42 + r() * 40), 0, z + r() * 10], s: [w, h, 12 + r() * 10], seed: Math.floor(r() * 100) });
        }
      }
    }
    const lamps: number[] = [];
    for (let z = z0 - 10; z > z1; z -= 48) lamps.push(z);
    return { dashes, trunks, crowns, crownCols, palms, shrubs, flowers, hills, hillCols, blockList, lamps };
  }, [z0, z1, seed, blocks, clear]);

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, mid]} receiveShadow>
        <planeGeometry args={[1200, len + 1200]} />
        <meshStandardMaterial color={PAL.ground} roughness={1} />
      </mesh>
      {/* dirt shoulders */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 13.5, -0.01, mid]} receiveShadow>
          <planeGeometry args={[6, len]} />
          <meshStandardMaterial color={PAL.dirt} roughness={1} />
        </mesh>
      ))}
      {/* carriageways */}
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} rotation={[-Math.PI / 2, 0, 0]} position={[s * 5.8, 0, mid]} receiveShadow>
          <planeGeometry args={[10, len]} />
          <meshStandardMaterial color={PAL.asphalt} roughness={0.9} />
        </mesh>
      ))}
      {/* edge lines */}
      {[-10.6, 10.6].map((x) => (
        <mesh key={x} position={[x, 0.02, mid]} receiveShadow>
          <boxGeometry args={[0.18, 0.02, len]} />
          <primitive object={MATS.lane} attach="material" />
        </mesh>
      ))}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 0.02, mid]}>
          <boxGeometry args={[0.15, 0.02, len]} />
          <primitive object={MATS.yellow} attach="material" />
        </mesh>
      ))}
      {/* median kerb + crash barrier */}
      <mesh position={[0, 0.15, mid]} receiveShadow>
        <boxGeometry args={[1.8, 0.3, len]} />
        <meshStandardMaterial color="#5B6B3A" roughness={1} />
      </mesh>
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.55, mid]} castShadow>
          <boxGeometry args={[0.08, 0.3, len]} />
          <primitive object={MATS.barrier} attach="material" />
        </mesh>
      ))}
      <Instanced mats={data.dashes} geometry={G.box} material={MATS.lane} shadow={false} />
      <Instanced mats={data.shrubs} geometry={G.ico} material={MATS.shrub} />
      <Instanced mats={data.flowers} geometry={G.ico} material={MATS.flower} />
      <Instanced mats={data.trunks} geometry={G.box} material={MATS.trunk} />
      <Instanced mats={data.crowns} geometry={G.ico} material={MATS.crown} colors={data.crownCols} />
      <Instanced mats={data.hills} geometry={G.ico} material={MATS.hill} colors={data.hillCols} shadow={false} />
      {data.palms.map((p, i) => (
        <Palm key={i} position={p} />
      ))}
      {data.lamps.map((z) => (
        <LampPost key={z} position={[0, 0, z]} on={lampsOn} />
      ))}
      {data.blockList.map((b, i) => (
        <Block key={i} position={b.p} size={b.s} seed={b.seed} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- instanced jam (for aerial shots)
export type JamCar = { x: number; z: number; color: string; len: number };

export const makeJam = (seed: number, z0: number, z1: number, lanes: number[], gap = [6.2, 8.5]) => {
  const r = rng(seed);
  const cols = ["#F4F4F4", "#D7263D", "#2E86AB", "#1B1B1B", "#9AA0A6", "#E36414", "#3D5A80", "#F2C400", "#6A994E", "#C2A878", "#F4F4F4", "#9AA0A6"];
  const out: JamCar[] = [];
  for (const x of lanes) {
    let z = z0 - r() * 4;
    while (z > z1) {
      const len = r() < 0.12 ? 8 : 4.2;
      out.push({ x: x + (r() - 0.5) * 0.4, z, color: len > 5 ? "#E0592A" : cols[Math.floor(r() * cols.length)], len });
      z -= len + gap[0] + r() * (gap[1] - gap[0]);
    }
  }
  return out;
};

export const InstancedJam: React.FC<{ cars: JamCar[]; dz?: number; phones?: number; t?: number; tail?: number }> = ({
  cars,
  dz = 0,
  phones = 0,
  t = 0,
  tail = 1.5,
}) => {
  const mats = useMemo(() => {
    const body: THREE.Matrix4[] = [];
    const cab: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    const tl: THREE.Matrix4[] = [];
    const ph: THREE.Matrix4[] = [];
    cars.forEach((c, i) => {
      const z = c.z + dz;
      const big = c.len > 5;
      body.push(mx([c.x, big ? 1.6 : 0.65, z], [big ? 2.4 : 1.8, big ? 2.8 : 0.75, c.len]));
      cab.push(mx([c.x, big ? 3.1 : 1.28, z + (big ? 0 : 0.15)], [big ? 2.45 : 1.55, big ? 0.2 : 0.55, big ? c.len * 0.95 : 2.1]));
      cols.push(new THREE.Color(c.color));
      for (const s of [-1, 1]) tl.push(mx([c.x + s * 0.62, big ? 0.9 : 0.82, z + c.len / 2 + 0.02], [0.42, 0.13, 0.05]));
      const flick = Math.sin(t * 8 + i * 2.3) > -0.2 ? 1 : 0.4;
      if (phones > 0) ph.push(mx([c.x, (big ? 3.9 : 2.2) + Math.sin(t * 3 + i) * 0.08, z], [0.55 * flick, 0.55 * flick, 0.55 * flick]));
    });
    return { body, cab, cols, tl, ph };
  }, [cars, dz, phones, t]);
  const bodyMat = useMemo(() => std("#FFFFFF", { roughness: 0.45, metalness: 0.15 }), []);
  const cabMat = useMemo(() => std("#FFFFFF", { roughness: 0.3 }), []);
  const cabCols = useMemo(() => mats.cols.map((c) => c.clone().multiplyScalar(1.15)), [mats.cols]);
  const tlMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7A0A0A", emissive: "#FF2A1A", emissiveIntensity: tail }), [tail]);
  const phMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#8FE3FF", toneMapped: false, transparent: true, opacity: phones }), [phones]);
  return (
    <group>
      <Instanced mats={mats.body} geometry={G.box} material={bodyMat} colors={mats.cols} />
      <Instanced mats={mats.cab} geometry={G.box} material={cabMat} colors={cabCols} />
      <Instanced mats={mats.tl} geometry={G.box} material={tlMat} shadow={false} />
      {phones > 0 && <Instanced mats={mats.ph} geometry={new THREE.SphereGeometry(1, 8, 8)} material={phMat} shadow={false} />}
    </group>
  );
};
