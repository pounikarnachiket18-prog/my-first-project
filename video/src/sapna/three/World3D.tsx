import * as THREE from "three";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { random, useCurrentFrame } from "remotion";
import {
  BAY_X,
  CURVE,
  Cam,
  COACH_LEN,
  ENGINE_LEN,
  RIYA_LOCAL,
  S4_INDEX,
  STATION,
  TRACK_LEN,
  TRACK_SAMPLES,
  distToTrack,
  poseAt,
  vehicleCenterS,
} from "./track";

/* ======================= Textures (built in the browser) ======================= */

const SPAN = 3800;
const CX = -450;
const CZ = -300;
const TEX = 4096;

const toPx = (x: number, z: number) => [((x - (CX - SPAN / 2)) / SPAN) * TEX, ((z - (CZ - SPAN / 2)) / SPAN) * TEX];

const FIELD_COLS = ["#7fb24a", "#93c25a", "#6aa23f", "#a9c95c", "#d8c55a", "#c9b46a", "#87b86b", "#5f9a46", "#b7cf6e", "#9cbf7a"];

const makeGroundTexture = () => {
  const c = document.createElement("canvas");
  c.width = TEX;
  c.height = TEX;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b9ab7c";
  g.fillRect(0, 0, TEX, TEX);
  // patchwork fields, slightly rotated grid
  g.save();
  g.translate(TEX / 2, TEX / 2);
  g.rotate(0.21);
  g.translate(-TEX / 2, -TEX / 2);
  const cell = 118;
  for (let gx = -6; gx < TEX / cell + 6; gx++) {
    for (let gy = -6; gy < TEX / cell + 6; gy++) {
      const key = `${gx}:${gy}`;
      const strips = 1 + Math.floor(random(key + "n") * 3);
      const vertical = random(key + "v") > 0.5;
      for (let k = 0; k < strips; k++) {
        g.fillStyle = FIELD_COLS[Math.floor(random(key + k) * FIELD_COLS.length)];
        const x = gx * cell + 3;
        const y = gy * cell + 3;
        if (vertical) g.fillRect(x + (cell / strips) * k, y, cell / strips - 4, cell - 6);
        else g.fillRect(x, y + (cell / strips) * k, cell - 6, cell / strips - 4);
      }
    }
  }
  g.restore();
  // fine speckle for texture
  for (let i = 0; i < 90000; i++) {
    g.fillStyle = random(`sp${i}c`) > 0.5 ? "rgba(40,70,20,0.10)" : "rgba(255,250,210,0.08)";
    g.fillRect(random(`sp${i}x`) * TEX, random(`sp${i}y`) * TEX, 2 + random(`sp${i}s`) * 3, 2 + random(`sp${i}t`) * 3);
  }
  // river
  const river = [
    [-2300, 150],
    [-1500, 300],
    [-900, -100],
    [-300, 60],
    [300, -350],
    [1500, -200],
  ].map(([x, z]) => toPx(x, z));
  const drawPoly = (pts: number[][], w: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    g.stroke();
  };
  drawPoly(river, 70, "#d8cfa8");
  drawPoly(river, 52, "#4aa7c9");
  drawPoly(river, 30, "#62bcd9");
  // village roads
  drawPoly(
    [
      [-2200, -900],
      [-1200, -700],
      [-300, -900],
      [600, -1150],
      [1500, -1000],
    ].map(([x, z]) => toPx(x, z)),
    9,
    "#cdb98d",
  );
  drawPoly(
    [
      [-900, 1500],
      [-800, 600],
      [-1000, -300],
      [-700, -1800],
    ].map(([x, z]) => toPx(x, z)),
    8,
    "#cdb98d",
  );
  // track corridor (gravel + cleared earth)
  drawPoly(TRACK_SAMPLES.filter((_, i) => i % 6 === 0).map((p) => toPx(p.x, p.z)), 30, "#a89874");
  // station yard
  const [sx0, sz0] = toPx(STATION.x - 40, STATION.zStart + 30);
  const [sx1, sz1] = toPx(STATION.x + 60, STATION.zEnd - 30);
  g.fillStyle = "#b7ae98";
  g.fillRect(sx0, sz0, sx1 - sx0, sz1 - sz0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

const makeSideTexture = (kind: "engine" | "coach", label: string) => {
  const c = document.createElement("canvas");
  const W = kind === "engine" ? 1000 : 1100;
  c.width = W;
  c.height = 200;
  const g = c.getContext("2d")!;
  if (kind === "engine") {
    g.fillStyle = "#1F6FB8";
    g.fillRect(0, 0, W, 200);
    g.fillStyle = "#FFC93C";
    g.fillRect(0, 118, W, 18);
    g.fillStyle = "#F4F8FC";
    g.fillRect(0, 136, W, 8);
    // cab window near nose (right side of texture = +x)
    g.fillStyle = "#14263d";
    g.fillRect(W - 150, 34, 110, 64);
    // grilles
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 6; i++) g.fillRect(120 + i * 80, 40, 50, 60);
    g.fillStyle = "#fff";
    g.font = "800 40px SapnaPoppins, sans-serif";
    g.fillText("SAPNA EXPRESS", 330, 185);
    g.font = "800 34px SapnaPoppins, sans-serif";
    g.fillText("12345", 40, 185);
  } else {
    g.fillStyle = "#3FA9F5";
    g.fillRect(0, 0, W, 200);
    g.fillStyle = "#EAF4FD";
    g.fillRect(0, 26, W, 96);
    for (let i = 0; i < 9; i++) {
      const x = 130 + i * 96;
      const grad = g.createLinearGradient(x, 40, x + 70, 104);
      grad.addColorStop(0, "#2f4f73");
      grad.addColorStop(0.5, "#16283f");
      grad.addColorStop(1, "#2a486a");
      g.fillStyle = grad;
      g.fillRect(x, 42, 68, 62);
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(x + 6, 46, 18, 54);
    }
    for (const dx of [26, W - 92]) {
      g.fillStyle = "#2B8FD9";
      g.fillRect(dx, 24, 66, 168);
      g.fillStyle = "#16283f";
      g.fillRect(dx + 16, 44, 34, 46);
    }
    g.fillStyle = "#FFC93C";
    g.fillRect(0, 126, W, 14);
    g.fillStyle = "#fff";
    g.font = "700 30px SapnaPoppins, sans-serif";
    g.fillText("SAPNA EXPRESS", 420, 180);
    g.font = "800 34px SapnaPoppins, sans-serif";
    g.fillText(label, W - 190, 180);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const makeSignTexture = (text: string) => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 200;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFC93C";
  g.fillRect(0, 0, 1024, 200);
  g.strokeStyle = "#13233A";
  g.lineWidth = 16;
  g.strokeRect(8, 8, 1008, 184);
  g.fillStyle = "#13233A";
  g.font = "800 110px SapnaPoppins, sans-serif";
  g.textAlign = "center";
  g.fillText(text, 512, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/* ======================= Environment ======================= */

const Sky: React.FC<{ fogFar: number }> = ({ fogFar }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 top = vec3(0.20,0.52,0.88); vec3 hor = vec3(0.80,0.91,0.98); vec3 col = mix(hor, top, pow(h,0.55)); gl_FragColor = vec4(col,1.0);} `,
      }),
    [],
  );
  const { scene } = useThree();
  scene.fog = new THREE.Fog("#cfe6f5", fogFar * 0.25, fogFar);
  return (
    <mesh material={mat}>
      <sphereGeometry args={[15000, 32, 16]} />
    </mesh>
  );
};

const Sun: React.FC<{ focus: THREE.Vector3; size: number }> = ({ focus, size }) => {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.copy(focus);
  target.updateMatrixWorld();
  useLayoutEffect(() => {
    if (light.current) light.current.target = target;
  });
  const pos = focus.clone().add(new THREE.Vector3(-260, 380, 180));
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        position={pos}
        intensity={3.1}
        color="#ffe9c4"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={10}
        shadow-camera-far={1500}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <hemisphereLight args={["#cfe6ff", "#5b7a3a", 0.85]} />
    </>
  );
};

const Ground: React.FC = () => {
  const tex = useMemo(makeGroundTexture, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[CX, -0.02, CZ]} receiveShadow>
        <planeGeometry args={[SPAN, SPAN]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[CX, -0.2, CZ]}>
        <planeGeometry args={[40000, 40000]} />
        <meshStandardMaterial color="#8cad5a" roughness={1} />
      </mesh>
    </>
  );
};

const Trees: React.FC = () => {
  const canopy = useRef<THREE.InstancedMesh>(null);
  const canopy2 = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; c: THREE.Color }[] = [];
    const greens = ["#2f5d24", "#3b6e2a", "#4a7f33", "#345f28", "#5b8a3a", "#27511f"].map((h) => new THREE.Color(h));
    const clusters = new Array(110).fill(0).map((_, i) => [CX + (random(`cl${i}x`) - 0.5) * SPAN * 0.95, CZ + (random(`cl${i}z`) - 0.5) * SPAN * 0.95]);
    for (let i = 0; i < 5200 && out.length < 3600; i++) {
      let x: number;
      let z: number;
      if (i % 3 !== 0) {
        const [cx, cz] = clusters[i % clusters.length];
        const a = random(`ta${i}`) * Math.PI * 2;
        const r = Math.sqrt(random(`tr${i}`)) * 55;
        x = cx + Math.cos(a) * r;
        z = cz + Math.sin(a) * r;
      } else {
        x = CX + (random(`tx${i}`) - 0.5) * SPAN * 0.98;
        z = CZ + (random(`tz${i}`) - 0.5) * SPAN * 0.98;
      }
      if (distToTrack(x, z) < 16) continue;
      if (x > STATION.x - 50 && x < STATION.x + 70 && z < STATION.zStart + 40 && z > STATION.zEnd - 40) continue;
      out.push({ x, z, s: 3.2 + random(`ts${i}`) * 4.2, c: greens[Math.floor(random(`tc${i}`) * greens.length)] });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    trees.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, t.s * 1.35, t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)), new THREE.Vector3(t.s, t.s * 1.1, t.s));
      canopy.current!.setMatrixAt(i, m);
      canopy.current!.setColorAt(i, t.c);
      const a = random(`ca${i}`) * Math.PI * 2;
      m.compose(
        new THREE.Vector3(t.x + Math.cos(a) * t.s * 0.7, t.s * 1.1, t.z + Math.sin(a) * t.s * 0.7),
        new THREE.Quaternion(),
        new THREE.Vector3(t.s * 0.72, t.s * 0.7, t.s * 0.72),
      );
      canopy2.current!.setMatrixAt(i, m);
      canopy2.current!.setColorAt(i, t.c.clone().offsetHSL(0, 0, 0.04));
      m.compose(new THREE.Vector3(t.x, t.s * 0.4, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s * 0.18, t.s * 0.8, t.s * 0.18));
      trunk.current!.setMatrixAt(i, m);
    });
    [canopy, canopy2].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
    });
    trunk.current!.instanceMatrix.needsUpdate = true;
  }, [trees]);
  return (
    <>
      <instancedMesh ref={canopy} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={canopy2} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 9]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </instancedMesh>
    </>
  );
};

const VILLAGES: [number, number][] = [
  [-820, 560],
  [-200, 820],
  [120, -40],
  [-1250, 1200],
  [700, -700],
  [-600, -500],
  [620, -1250],
];

const Houses: React.FC = () => {
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const houses = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; r: number; roof: THREE.Color; wall: THREE.Color }[] = [];
    VILLAGES.forEach(([vx, vz], v) => {
      for (let i = 0; i < 34; i++) {
        const x = vx + (random(`h${v}${i}x`) - 0.5) * 160;
        const z = vz + (random(`h${v}${i}z`) - 0.5) * 140;
        if (distToTrack(x, z) < 22) continue;
        out.push({
          x,
          z,
          w: 6 + random(`h${v}${i}w`) * 6,
          d: 5 + random(`h${v}${i}d`) * 5,
          h: 3 + random(`h${v}${i}h`) * 4,
          r: random(`h${v}${i}r`) * Math.PI,
          roof: new THREE.Color(["#c4573a", "#d9774a", "#a94b35", "#e3dccd"][i % 4]),
          wall: new THREE.Color(["#efe6d2", "#f3d9b1", "#e9e2d8", "#d9c7a8"][i % 4]),
        });
      }
    });
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    houses.forEach((h, i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, h.r, 0));
      m.compose(new THREE.Vector3(h.x, h.h / 2, h.z), q, new THREE.Vector3(h.w, h.h, h.d));
      walls.current!.setMatrixAt(i, m);
      walls.current!.setColorAt(i, h.wall);
      m.compose(new THREE.Vector3(h.x, h.h + 0.25, h.z), q, new THREE.Vector3(h.w * 1.08, 0.5, h.d * 1.08));
      roofs.current!.setMatrixAt(i, m);
      roofs.current!.setColorAt(i, h.roof);
    });
    [walls, roofs].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
    });
  }, [houses]);
  return (
    <>
      <instancedMesh ref={walls} args={[undefined, undefined, houses.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, houses.length]} castShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
};

const offsetCurve = (off: number, y: number) =>
  new THREE.CatmullRomCurve3(
    CURVE.getSpacedPoints(1400).map((p, i, arr) => {
      const a = arr[Math.max(0, i - 1)];
      const b = arr[Math.min(arr.length - 1, i + 1)];
      const t = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
      return new THREE.Vector3(p.x - t.z * off, y, p.z + t.x * off);
    }),
  );

const ribbon = (half: number, y: number) => {
  const pts = CURVE.getSpacedPoints(1400);
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    pos.push(p.x - t.z * half, y, p.z + t.x * half, p.x + t.z * half, y, p.z - t.x * half);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const Track: React.FC = () => {
  const sleepers = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({
      ballast: ribbon(2.8, 0.12),
      ballastTop: ribbon(1.9, 0.2),
      railL: new THREE.TubeGeometry(offsetCurve(0.76, 0.42), 2800, 0.075, 5, false),
      railR: new THREE.TubeGeometry(offsetCurve(-0.76, 0.42), 2800, 0.075, 5, false),
    }),
    [],
  );
  const count = Math.floor(TRACK_LEN / 0.7);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const { p, yaw } = poseAt(i * 0.7);
      m.compose(new THREE.Vector3(p.x, 0.27, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(0.26, 0.16, 2.6));
      sleepers.current!.setMatrixAt(i, m);
    }
    sleepers.current!.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <>
      <mesh geometry={geo.ballast} receiveShadow>
        <meshStandardMaterial color="#a39886" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.ballastTop} receiveShadow>
        <meshStandardMaterial color="#8d8474" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={sleepers} args={[undefined, undefined, count]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#6e6258" roughness={0.9} />
      </instancedMesh>
      <mesh geometry={geo.railL} castShadow>
        <meshStandardMaterial color="#b8c0c8" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh geometry={geo.railR} castShadow>
        <meshStandardMaterial color="#b8c0c8" metalness={0.8} roughness={0.35} />
      </mesh>
    </>
  );
};

/* ======================= Station ======================= */

const Station: React.FC = () => {
  const sign = useMemo(() => makeSignTexture("BARDHAMAN JN"), []);
  const people = useRef<THREE.InstancedMesh>(null);
  const len = STATION.zStart - STATION.zEnd;
  const zc = (STATION.zStart + STATION.zEnd) / 2;
  const N = 70;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const cols = ["#ef4444", "#10b981", "#6366f1", "#f59e0b", "#0ea5e9", "#f472b6", "#f8fafc"];
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1;
      const x = STATION.x + side * (4.2 + random(`pp${i}x`) * 3.2);
      const z = STATION.zStart - 10 - random(`pp${i}z`) * (len - 20);
      m.compose(new THREE.Vector3(x, 1.0 + 0.85, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      people.current!.setMatrixAt(i, m);
      people.current!.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    people.current!.instanceMatrix.needsUpdate = true;
    if (people.current!.instanceColor) people.current!.instanceColor.needsUpdate = true;
  }, [len]);
  const canopies = [0, 1, 2, 3, 4, 5];
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[STATION.x + side * 5.9, 0.5, zc]} castShadow receiveShadow>
            <boxGeometry args={[8, 1, len]} />
            <meshStandardMaterial color="#cfcac0" roughness={0.9} />
          </mesh>
          <mesh position={[STATION.x + side * 2.05, 1.01, zc]}>
            <boxGeometry args={[0.3, 0.02, len]} />
            <meshStandardMaterial color="#FFC93C" />
          </mesh>
          {canopies.map((k) => (
            <group key={k} position={[STATION.x + side * 6.2, 0, STATION.zStart - 25 - k * ((len - 50) / 5)]}>
              <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[7.5, 0.35, 34]} />
                <meshStandardMaterial color={k % 2 ? "#c4573a" : "#d9774a"} roughness={0.7} />
              </mesh>
              <mesh position={[0, 3.6, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.18, 5.2, 8]} />
                <meshStandardMaterial color="#5b6573" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* station building */}
      <mesh position={[STATION.x + 20, 5, zc]} castShadow receiveShadow>
        <boxGeometry args={[14, 10, 70]} />
        <meshStandardMaterial color="#f1e2c4" roughness={0.9} />
      </mesh>
      <mesh position={[STATION.x + 20, 10.4, zc]} castShadow>
        <boxGeometry args={[15.5, 0.8, 72]} />
        <meshStandardMaterial color="#b04a33" roughness={0.8} />
      </mesh>
      {/* signboards facing the track */}
      {[-60, 60].map((dz) => (
        <group key={dz} position={[STATION.x - 6.5, 0, zc + dz]}>
          <mesh position={[0, 4.3, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[9, 1.75]} />
            <meshStandardMaterial map={sign} side={THREE.DoubleSide} roughness={0.6} />
          </mesh>
          {[-3.6, 3.6].map((o) => (
            <mesh key={o} position={[0, 2.2, o]}>
              <cylinderGeometry args={[0.08, 0.08, 4.4, 6]} />
              <meshStandardMaterial color="#13233A" />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={people} args={[undefined, undefined, N]} castShadow>
        <capsuleGeometry args={[0.24, 1.1, 4, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
};

/* ======================= Train ======================= */

const Person: React.FC<{ pos: [number, number, number]; color: string; hair?: string; facing: number }> = ({ pos, color, hair = "#2b1b12", facing }) => (
  <group position={pos}>
    <mesh position={[0, 0.3, 0]} castShadow>
      <capsuleGeometry args={[0.2, 0.32, 4, 10]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.72, 0]} castShadow>
      <sphereGeometry args={[0.135, 14, 12]} />
      <meshStandardMaterial color="#b9825c" roughness={0.7} />
    </mesh>
    <mesh position={[-0.02 * facing, 0.77, 0]} castShadow>
      <sphereGeometry args={[0.14, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
      <meshStandardMaterial color={hair} roughness={0.9} />
    </mesh>
    <mesh position={[0.22 * facing, 0.05, 0]}>
      <boxGeometry args={[0.42, 0.16, 0.34]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
  </group>
);

const SHIRTS = ["#f59e0b", "#10b981", "#6366f1", "#ef4444", "#14b8a6", "#8b5cf6", "#f97316", "#0ea5e9", "#e2e8f0"];

const Interior: React.FC<{ frame: number }> = ({ frame }) => {
  const seatY = 1.55;
  return (
    <group>
      <mesh position={[0, 1.08, 0]} receiveShadow>
        <boxGeometry args={[21.6, 0.08, 2.95]} />
        <meshStandardMaterial color="#dfe5ec" />
      </mesh>
      {BAY_X.map((bx, b) => (
        <group key={b}>
          {[0.35, 1.95].map((dx, k) => (
            <group key={k}>
              <mesh position={[bx + dx, seatY, -0.48]} castShadow receiveShadow>
                <boxGeometry args={[0.55, 0.42, 1.95]} />
                <meshStandardMaterial color="#2f6fa8" roughness={0.7} />
              </mesh>
              <mesh position={[bx + dx + (k === 0 ? -0.3 : 0.3), seatY + 0.45, -0.48]} castShadow>
                <boxGeometry args={[0.12, 0.85, 1.95]} />
                <meshStandardMaterial color="#285f90" roughness={0.7} />
              </mesh>
            </group>
          ))}
          {/* side berth */}
          <mesh position={[bx + 1.15, seatY, 1.15]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.42, 0.55]} />
            <meshStandardMaterial color="#2f6fa8" roughness={0.7} />
          </mesh>
          {/* window table */}
          <mesh position={[bx + 1.15, 1.85, -1.3]}>
            <boxGeometry args={[0.6, 0.05, 0.35]} />
            <meshStandardMaterial color="#c9b79c" />
          </mesh>
          {[-1.15, -0.5, 0.15].map((z, k) =>
            !(b === 4 && k === 0) && random(`pa${b}${k}`) > 0.28 ? (
              <Person key={`a${k}`} pos={[bx + 0.35, seatY + 0.2, z]} facing={1} color={SHIRTS[Math.floor(random(`sa${b}${k}`) * SHIRTS.length)]} />
            ) : null,
          )}
          {[-1.15, -0.5, 0.15].map((z, k) =>
            random(`pb${b}${k}`) > 0.32 ? (
              <Person key={`b${k}`} pos={[bx + 1.95, seatY + 0.2, z]} facing={-1} color={SHIRTS[Math.floor(random(`sb${b}${k}`) * SHIRTS.length)]} />
            ) : null,
          )}
          {b === 2 ? (
            // student asleep on the side berth
            <group position={[bx + 1.15, seatY + 0.35, 1.15]} rotation-z={Math.PI / 2}>
              <mesh castShadow>
                <capsuleGeometry args={[0.2, 1.1, 4, 10]} />
                <meshStandardMaterial color="#6366f1" />
              </mesh>
            </group>
          ) : null}
        </group>
      ))}
      {/* Riya with glowing phone */}
      <Person pos={[RIYA_LOCAL[0], seatY + 0.2, RIYA_LOCAL[2]]} facing={1} color="#ff5c8a" hair="#1a1a1a" />
      <mesh position={[RIYA_LOCAL[0] + 0.3, seatY + 0.42, RIYA_LOCAL[2]]} rotation-z={-0.9}>
        <boxGeometry args={[0.16, 0.012, 0.08]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={2 + Math.sin(frame / 3)} />
      </mesh>
      {/* chaiwala walking the aisle */}
      <group position={[-9 + ((frame * 0.05) % 18), 1.1, 0.95]}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.21, 0.9, 4, 10]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color="#3b2a20" />
        </mesh>
        <mesh position={[0.2, 0.9, 0.25]}>
          <cylinderGeometry args={[0.12, 0.14, 0.3, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

const Vehicle: React.FC<{ index: number; head: number; cutaway: number; frame: number }> = ({ index, head, cutaway, frame }) => {
  const engine = index === 0;
  const label = engine ? "" : index === S4_INDEX ? "S4" : index < S4_INDEX ? `S${index}` : `S${index}`;
  const side = useMemo(() => makeSideTexture(engine ? "engine" : "coach", label), [engine, label]);
  const isS4 = index === S4_INDEX;
  const glass = isS4 && cutaway > 0;
  const L = engine ? ENGINE_LEN - 3 : COACH_LEN;
  const bodyX = engine ? -1.5 : 0;
  const { p, yaw } = poseAt(vehicleCenterS(head, index));
  const roofOpacity = 1 - 0.93 * cutaway;

  const mats = useMemo(() => {
    const plain = new THREE.MeshStandardMaterial({ color: engine ? "#1F6FB8" : "#3FA9F5", roughness: 0.45, metalness: 0.2 });
    const sideMat = new THREE.MeshStandardMaterial({ map: side, roughness: 0.4, metalness: 0.15 });
    const top = new THREE.MeshStandardMaterial({ color: "#d5dde6", roughness: 0.6 });
    return [plain, plain, top, plain, sideMat, sideMat];
  }, [engine, side]);
  // S4 walls render from inside when the roof is glass
  mats.forEach((m) => {
    m.side = glass ? THREE.DoubleSide : THREE.FrontSide;
  });
  mats[2].transparent = glass;
  mats[2].opacity = glass ? roofOpacity : 1;
  mats[2].depthWrite = !glass;

  return (
    <group position={[p.x, 0, p.z]} rotation-y={yaw}>
      <mesh position={[bodyX, 2.5, 0]} material={mats} castShadow={!glass} receiveShadow>
        <boxGeometry args={[L, 3, 3.1]} />
      </mesh>
      {/* roof */}
      <group position={[bodyX, 4.0, 0]} scale={[1, 0.3, 1]}>
        <mesh rotation-z={Math.PI / 2} castShadow={!glass || cutaway < 0.4}>
          <cylinderGeometry args={[1.55, 1.55, L, 28]} />
          <meshStandardMaterial color={engine ? "#174f86" : "#c8d2dc"} roughness={0.35} metalness={0.35} transparent={glass} opacity={glass ? roofOpacity : 1} depthWrite={!glass} />
        </mesh>
      </group>
      {/* underframe + bogies */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[(engine ? ENGINE_LEN : COACH_LEN) - 2, 0.45, 2.6]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.8} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * ((engine ? ENGINE_LEN : COACH_LEN) / 2 - 3.5), 0.62, 0]} castShadow>
          <boxGeometry args={[3, 0.6, 2.5]} />
          <meshStandardMaterial color="#1f2329" roughness={0.7} />
        </mesh>
      ))}
      {engine ? (
        <group>
          <mesh position={[8.6, 2.05, 0]} castShadow>
            <boxGeometry args={[2.8, 2.1, 3.1]} />
            <meshStandardMaterial color="#1F6FB8" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[8.35, 3.5, 0]} rotation-z={-0.75} castShadow>
            <boxGeometry args={[2.0, 0.12, 2.95]} />
            <meshStandardMaterial color="#0f1e30" roughness={0.1} metalness={0.6} />
          </mesh>
          <mesh position={[10.02, 1.75, 0]}>
            <boxGeometry args={[0.05, 0.25, 3.1]} />
            <meshStandardMaterial color="#FFC93C" />
          </mesh>
          {[-0.9, 0.9].map((z) => (
            <mesh key={z} position={[10.03, 2.35, z]}>
              <sphereGeometry args={[0.17, 12, 10]} />
              <meshStandardMaterial color="#fff6c8" emissive="#fff3b0" emissiveIntensity={3} />
            </mesh>
          ))}
          <mesh position={[-2, 4.55, 0]} castShadow>
            <boxGeometry args={[9, 0.5, 2.0]} />
            <meshStandardMaterial color="#9aa6b2" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ) : null}
      {isS4 && cutaway > 0 ? <Interior frame={frame} /> : null}
    </group>
  );
};

export const Train: React.FC<{ head: number; coaches?: number; cutaway?: number }> = ({ head, coaches = 10, cutaway = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <group>
      {new Array(coaches + 1).fill(0).map((_, i) => (
        <Vehicle key={i} index={i} head={head} cutaway={cutaway} frame={frame} />
      ))}
    </group>
  );
};

/* ======================= Props: towers, satellite, routes ======================= */

const Beam: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; r: number; color: string; emissive?: number; opacity?: number }> = ({
  a,
  b,
  r,
  color,
  emissive = 0,
  opacity = 1,
}) => {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow={emissive === 0}>
      <cylinderGeometry args={[r, r, len, 6]} />
      <meshStandardMaterial color={color} emissive={emissive ? color : "#000"} emissiveIntensity={emissive} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};

export const Tower: React.FC<{ pos: THREE.Vector3; scale?: number; active?: boolean }> = ({ pos, scale = 1, active }) => {
  const H = 32;
  const legs = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const frame = useCurrentFrame();
  return (
    <group position={pos} scale={scale}>
      {legs.map(([x, z], i) => (
        <Beam key={i} a={v(x * 2.6, 0, z * 2.6)} b={v(x * 0.55, H, z * 0.55)} r={0.14} color={i % 2 ? "#e5e7eb" : "#ef4444"} />
      ))}
      {[6, 12, 18, 24, 30].map((h) => {
        const w = 2.6 - (2.05 * h) / H;
        return legs.map(([x, z], i) => {
          const [x2, z2] = legs[(i + 1) % 4];
          return <Beam key={`${h}${i}`} a={v(x * w, h, z * w)} b={v(x2 * w, h, z2 * w)} r={0.08} color="#cbd5e1" />;
        });
      })}
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * 0.9, H - 2, Math.sin(a) * 0.9]} rotation-y={-a}>
            <boxGeometry args={[0.25, 2.6, 0.8]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        );
      })}
      <mesh position={[0, H + 0.6, 0]}>
        <sphereGeometry args={[0.35, 10, 8]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={active ? 3 + Math.sin(frame / 3) * 2 : 1.2} />
      </mesh>
    </group>
  );
};

export const CoverageRing: React.FC<{ pos: THREE.Vector3; r: number; color: string; active: boolean }> = ({ pos, r, color, active }) => {
  const frame = useCurrentFrame();
  const pulse = ((frame % 45) / 45) as number;
  return (
    <group position={[pos.x, 0.6, pos.z]} rotation-x={-Math.PI / 2}>
      <mesh>
        <circleGeometry args={[r, 72]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.22 : 0.09} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[r - 2.2, r, 96]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.5} depthWrite={false} />
      </mesh>
      {active ? (
        <mesh scale={0.15 + pulse * 0.85}>
          <ringGeometry args={[r - 3, r, 96]} />
          <meshBasicMaterial color={color} transparent opacity={1 - pulse} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

export const Satellite: React.FC<{ pos: THREE.Vector3; target: THREE.Vector3; beam: number }> = ({ pos, target, beam }) => {
  const frame = useCurrentFrame();
  const dir = new THREE.Vector3().subVectors(target, pos);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  return (
    <group>
      <group position={pos} rotation={[0.3, frame / 90, 0.2]} scale={2.2}>
        <mesh>
          <boxGeometry args={[3, 4, 3]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.25} />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 6.5, 0, 0]}>
            <boxGeometry args={[9, 0.15, 3.2]} />
            <meshStandardMaterial color="#1d4ed8" metalness={0.6} roughness={0.2} emissive="#1e3a8a" emissiveIntensity={0.4} />
          </mesh>
        ))}
        <mesh position={[0, -2.6, 0]}>
          <coneGeometry args={[1.4, 1.2, 16, 1, true]} />
          <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={new THREE.Vector3().addVectors(pos, dir.clone().multiplyScalar(0.5))} quaternion={q}>
        <cylinderGeometry args={[1.5, 16, len, 32, 1, true]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={beam} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

export const Routes: React.FC<{ progress: (i: number) => number; count?: number }> = ({ progress, count = 40 }) => {
  const routes = useMemo(() => {
    const cols = ["#FFC93C", "#FF5C8A", "#3B82F6", "#22c55e", "#F97316", "#8B5CF6", "#14B8A6", "#ffffff"];
    return new Array(count).fill(0).map((_, i) => {
      const pts = new Array(5).fill(0).map((__, k) => {
        const t = k / 4;
        const ax = CX + (random(`r${i}ax`) - 0.5) * SPAN;
        const az = CZ + (random(`r${i}az`) - 0.5) * SPAN;
        const bx = CX + (random(`r${i}bx`) - 0.5) * SPAN;
        const bz = CZ + (random(`r${i}bz`) - 0.5) * SPAN;
        return new THREE.Vector3(
          ax + (bx - ax) * t + (random(`r${i}j${k}x`) - 0.5) * 500,
          3,
          az + (bz - az) * t + (random(`r${i}j${k}z`) - 0.5) * 500,
        );
      });
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 4.5, 6, false);
      return { geo, color: cols[i % cols.length] };
    });
  }, [count]);
  return (
    <>
      {routes.map((r, i) => {
        const p = THREE.MathUtils.clamp(progress(i), 0, 1);
        const idx = r.geo.index!.count;
        r.geo.setDrawRange(0, Math.floor((idx * p) / 6) * 6);
        return (
          <mesh key={i} geometry={r.geo}>
            <meshBasicMaterial color={r.color} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
};

export const TrackGlow: React.FC<{ progress: number }> = ({ progress }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(offsetCurve(0, 3), 1400, 6, 6, false), []);
  geo.setDrawRange(0, Math.floor((geo.index!.count * THREE.MathUtils.clamp(progress, 0, 1)) / 6) * 6);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
};

/* ======================= Camera + canvas ======================= */

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const pc = camera as THREE.PerspectiveCamera;
  pc.position.copy(cam.pos);
  pc.fov = cam.fov;
  pc.near = 0.3;
  pc.far = 30000;
  pc.lookAt(cam.look);
  pc.updateProjectionMatrix();
  return null;
};

const Clouds: React.FC = () => {
  const clouds = useMemo(
    () =>
      new Array(18).fill(0).map((_, i) => ({
        x: CX + (random(`cx${i}`) - 0.5) * 5000,
        z: CZ + (random(`cz${i}`) - 0.5) * 5000,
        y: 420 + random(`cy${i}`) * 160,
        s: 30 + random(`cs${i}`) * 40,
      })),
    [],
  );
  return (
    <>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[(k - 2) * 0.9, random(`ck${i}${k}`) * 0.4, random(`cz${i}${k}`) * 0.6]}>
              <sphereGeometry args={[0.8 + random(`cr${i}${k}`) * 0.5, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={1} emissive="#ffffff" emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

export const World3D: React.FC<{
  cam: Cam;
  head: number;
  width?: number;
  height?: number;
  cutaway?: number;
  coaches?: number;
  shadowFocus?: THREE.Vector3;
  shadowSize?: number;
  fogFar?: number;
  showTrain?: boolean;
  children?: React.ReactNode;
}> = ({ cam, head, width = 1080, height = 1920, cutaway = 0, coaches = 10, shadowFocus, shadowSize = 140, fogFar = 2600, showTrain = true, children }) => {
  const focus = shadowFocus ?? poseAt(vehicleCenterS(head, 4)).p;
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig cam={cam} />
      <Sky fogFar={fogFar} />
      <Sun focus={focus} size={shadowSize} />
      <Ground />
      <Track />
      <Trees />
      <Houses />
      <Station />
      <Clouds />
      {showTrain ? <Train head={head} coaches={coaches} cutaway={cutaway} /> : null}
      {children}
    </ThreeCanvas>
  );
};
