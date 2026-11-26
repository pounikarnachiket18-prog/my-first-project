/**
 * Night-time bedroom set (metres). Couch along X at z≈0, back wall z=-0.95,
 * window in the left wall (moonlight), warm practical lamp at the right.
 * Includes a volumetric moonlight shaft (view-dependent soft volume shader)
 * and dust only inside that shaft, where it is physically motivated.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fbm2 } from "../core/textures";
import { FlowParticles } from "../fx/FlowParticles";

function plankTexture() {
  const w = 512, h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const plank = Math.floor(x / 64);
      const grain = fbm2(x * 0.02 + plank * 13, y * 0.15, 3) * 0.5 + 0.5;
      const seam = x % 64 < 2 ? 0.45 : 1;
      const v = (60 + grain * 40 + (plank % 3) * 8) * seam;
      const i = (y * w + x) * 4;
      img.data[i] = v * 1.0;
      img.data[i + 1] = v * 0.72;
      img.data[i + 2] = v * 0.5;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wallTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const n = fbm2(x * 0.05, y * 0.05, 4) * 0.5 + 0.5;
      const v = 150 + n * 30;
      const i = (y * s + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v * 0.97;
      img.data[i + 2] = v * 0.93;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft volumetric light shaft: brighter toward the axis, fading with length. */
const BEAM_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vLen; varying vec3 vW;
void main(){
  vLen = uv.y;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mv = viewMatrix * w;
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vLen; varying vec3 vW;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
  float along = smoothstep(0.0, 0.15, vLen) * (1.0 - smoothstep(0.55, 1.0, vLen));
  float n = 0.75 + 0.25 * sin(vW.x * 3.0 + vW.y * 5.0 + uTime * 0.2) * sin(vW.z * 4.0 - uTime * 0.13);
  gl_FragColor = vec4(uColor * uIntensity * edge * along * n, 1.0);
}`;

export const LightShaft: React.FC<{ from: [number, number, number]; to: [number, number, number]; r0: number; r1: number; color?: string; intensity?: number }> = ({
  from,
  to,
  r0,
  r1,
  color = "#8fb2ff",
  intensity = 0.12,
}) => {
  const mesh = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const len = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(r1, r0, len, 48, 12, true);
    // uv.y: 0 at window → 1 at floor
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uTime: { value: 0 } },
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a.clone().lerp(b, 0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
    return m;
  }, [from, to, r0, r1, color, intensity]);
  return <primitive object={mesh} />;
};

export const Bedroom: React.FC<{ lampIntensity?: number; moonIntensity?: number }> = ({ lampIntensity = 1, moonIntensity = 1 }) => {
  const mats = useMemo(() => {
    return {
      floor: new THREE.MeshPhysicalMaterial({ map: plankTexture(), roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.3 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTexture(), color: "#7d8796", roughness: 0.95 }),
      couch: new THREE.MeshPhysicalMaterial({ color: "#2e3540", roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#5a6a80"), sheenRoughness: 0.8 }),
      cushion: new THREE.MeshPhysicalMaterial({ color: "#3a4352", roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#6a7a90"), sheenRoughness: 0.8 }),
      rug: new THREE.MeshPhysicalMaterial({ color: "#4a3b33", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#8a7060") }),
      wood: new THREE.MeshPhysicalMaterial({ color: "#3b2a1e", roughness: 0.5, clearcoat: 0.4 }),
      frame: new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.6 }),
      sky: new THREE.MeshBasicMaterial({ color: new THREE.Color("#3d5fa8").multiplyScalar(0.9) }),
      shade: new THREE.MeshStandardMaterial({ color: "#f1d2a6", emissive: new THREE.Color("#ffb060"), emissiveIntensity: 2.6, roughness: 0.9, side: THREE.DoubleSide }),
      curtain: new THREE.MeshPhysicalMaterial({ color: "#5a6378", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#8090b0"), side: THREE.DoubleSide }),
      book: ["#6a2f2a", "#2f4a6a", "#5a5a3a", "#3a2f4a", "#7a6040"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    };
  }, []);
  const curtainGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.55, 2.1, 40, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 38) * 0.035);
    g.computeVertexNormals();
    return g;
  }, []);
  const rb = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 4, r);
  const sh = { castShadow: true, receiveShadow: true };
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} material={mats.floor} receiveShadow>
        <planeGeometry args={[8, 7]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.85]} material={mats.rug} receiveShadow>
        <planeGeometry args={[3.0, 1.6]} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 1.6, -0.95]} material={mats.wall} receiveShadow>
        <planeGeometry args={[8, 3.2]} />
      </mesh>
      {/* Left wall with window opening (x = -2.3) */}
      <group position={[-2.3, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[-0.6, 0.45, 0]} material={mats.wall} receiveShadow><planeGeometry args={[3.2, 0.9]} /></mesh>
        <mesh position={[-0.6, 2.75, 0]} material={mats.wall} receiveShadow><planeGeometry args={[3.2, 0.9]} /></mesh>
        <mesh position={[-1.75, 1.6, 0]} material={mats.wall} receiveShadow><planeGeometry args={[0.9, 1.4]} /></mesh>
        <mesh position={[1.15, 1.6, 0]} material={mats.wall} receiveShadow><planeGeometry args={[2.7, 1.4]} /></mesh>
        {/* Sky behind glass */}
        <mesh position={[-0.55, 1.6, -0.25]} material={mats.sky}><planeGeometry args={[1.6, 1.6]} /></mesh>
        {/* Frame */}
        {[[-0.55, 0.92, 1.42, 0.05], [-0.55, 2.28, 1.42, 0.05], [-1.27, 1.6, 0.05, 1.42], [0.17, 1.6, 0.05, 1.42], [-0.55, 1.6, 0.04, 1.36], [-0.55, 1.6, 1.36, 0.035]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.02]} material={mats.frame} {...sh}><boxGeometry args={[w, h, 0.06]} /></mesh>
        ))}
        {/* Curtains */}
        <mesh geometry={curtainGeo} material={mats.curtain} position={[-1.45, 1.75, 0.12]} {...sh} />
        <mesh geometry={curtainGeo} material={mats.curtain} position={[0.35, 1.75, 0.12]} {...sh} />
      </group>
      {/* Couch */}
      <group position={[0, 0, -0.05]}>
        <mesh geometry={rb(2.95, 0.42, 0.95, 0.08)} position={[0, 0.21, 0]} material={mats.couch} {...sh} />
        <mesh geometry={rb(2.95, 0.55, 0.22, 0.08)} position={[0, 0.66, -0.38]} material={mats.couch} {...sh} />
        {[-1.55, 1.55].map((x) => (
          <mesh key={x} geometry={rb(0.2, 0.62, 0.95, 0.07)} position={[x, 0.31, 0]} material={mats.couch} {...sh} />
        ))}
        {[-0.97, 0, 0.97].map((x) => (
          <mesh key={x} geometry={rb(0.95, 0.12, 0.8, 0.05)} position={[x, 0.47, 0.05]} material={mats.cushion} {...sh} />
        ))}
      </group>
      {/* Side table + lamp (practical) */}
      <group position={[1.95, 0, -0.45]}>
        <mesh position={[0, 0.3, 0]} material={mats.wood} {...sh}><boxGeometry args={[0.45, 0.6, 0.45]} /></mesh>
        <mesh position={[0, 0.72, 0]} material={mats.wood} {...sh}><cylinderGeometry args={[0.02, 0.06, 0.24, 16]} /></mesh>
        <mesh position={[0, 0.94, 0]} material={mats.shade}><cylinderGeometry args={[0.11, 0.17, 0.24, 32, 1, true]} /></mesh>
        <pointLight position={[0, 0.92, 0.02]} intensity={2.2 * lampIntensity} distance={7} decay={1.6} color="#ffad5c" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} shadow-radius={6} />
      </group>
      {/* Shelf with books on back wall */}
      <group position={[-0.9, 1.55, -0.85]}>
        <mesh material={mats.wood} {...sh}><boxGeometry args={[1.1, 0.04, 0.22]} /></mesh>
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh key={i} position={[-0.48 + i * 0.075, 0.13 + (i % 3) * 0.012, 0]} rotation={[0, 0, i === 9 ? 0.3 : 0]} material={mats.book[i % 5]} {...sh}>
            <boxGeometry args={[0.06, 0.22 + (i % 3) * 0.025, 0.17]} />
          </mesh>
        ))}
      </group>
      {/* Picture frame */}
      <mesh position={[0.6, 1.7, -0.93]} material={mats.wood} {...sh}><boxGeometry args={[0.7, 0.5, 0.03]} /></mesh>
      <mesh position={[0.6, 1.7, -0.913]}><planeGeometry args={[0.6, 0.4]} /><meshStandardMaterial color="#1c2430" roughness={0.3} /></mesh>
      {/* Moonlight */}
      <directionalLight
        position={[-6, 4.2, 0.6]}
        intensity={1.5 * moonIntensity}
        color="#8fb0ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0008}
        shadow-radius={4}
      />
      <LightShaft from={[-2.3, 1.75, 0.15]} to={[0.3, 0.05, 0.55]} r0={0.55} r1={1.05} intensity={0.07 * moonIntensity} />
      <FlowParticles mode="drift" count={260} src={[-1.0, 0.95, 0.35]} box={[1.0, 0.75, 0.55]} size={0.006} turb={0.05} color="#b9cfff" seed={11} opacity={() => 0.55} />
      <hemisphereLight args={["#1c2846", "#120c08", 0.08]} />
      {/* Warm wall-wash behind the couch: silhouettes the group (motivated by the lamp) */}
      <spotLight position={[0.9, 2.5, -0.62]} target-position={[0.0, 0.9, -0.95]} angle={1.0} penumbra={1} intensity={9 * lampIntensity} distance={6} decay={1.5} color="#ff9e55" />
      {/* Cool back rim from the window side, separating heads & shoulders */}
      <spotLight position={[-1.6, 2.3, -0.7]} target-position={[0.4, 0.9, 0.2]} angle={0.9} penumbra={1} intensity={3.2 * moonIntensity} distance={6} decay={1.5} color="#86a6ff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
    </group>
  );
};
