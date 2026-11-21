/** 3D models for the jammer reel: exam hall diorama, phone, jammer, cell tower, waves. */
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { random } from "remotion";
import { TH } from "../theme";
import { Person, PersonDef } from "../three/Crowd";
import { HINDI, POP, tilesTex } from "../three/textures";

export type V3 = [number, number, number];

/* ----------------------------------------------------------------- layout */
export const DESK_Y = 0.78;
export const PHONE_POS: V3 = [1.78, DESK_Y + 0.031, 3.32];
export const JAMMER_POS: V3 = [0.75, DESK_Y + 0.12, -3.9];
export const TOWER_POS: V3 = [26, 0, -30];
export const TOWER_TOP: V3 = [26, 27, -30];
export const DOME_R = 11;

/* ------------------------------------------------------------ canvas tex */
const cache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const k = `${TH().id}|${key}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(k, t);
  return t;
};

const hallSign = () =>
  canvasTex("hallsign", 1024, 260, (c) => {
    c.fillStyle = "#1F3A7E";
    c.fillRect(0, 0, 1024, 260);
    c.strokeStyle = "#F1E2B8";
    c.lineWidth = 10;
    c.strokeRect(12, 12, 1000, 236);
    c.fillStyle = "#FFFFFF";
    c.textAlign = "center";
    c.font = `700 110px ${HINDI}`;
    c.fillText("परीक्षा केंद्र", 512, 130);
    c.font = `800 56px ${POP}`;
    c.fillText("EXAM CENTRE", 512, 215);
  });

const jammerFace = () =>
  canvasTex("jamface", 512, 256, (c) => {
    c.fillStyle = "#1E2126";
    c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = "#2B2F36";
      c.fillRect(20 + i * 26, 20, 14, 140);
    }
    c.fillStyle = "#0B0D10";
    c.fillRect(30, 178, 200, 58);
    c.fillStyle = "#FF4D4D";
    c.font = `400 44px 'Anton', ${POP}`;
    c.fillText("RF JAM", 48, 224);
    c.fillStyle = "#9AA3B0";
    c.font = `600 22px ${POP}`;
    c.fillText("GSM · 3G · 4G · 5G", 260, 218);
  });

/* ------------------------------------------------------------------ ground */
export const Ground: React.FC = () => {
  const tex = tilesTex(200 / 3, 200 / 3);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={tex} color="#E9E1CC" roughness={0.9} />
    </mesh>
  );
};

/* -------------------------------------------------------- exam hall diorama */
const Desk: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, DESK_Y, 0]}>
      <boxGeometry args={[1.3, 0.05, 0.62]} />
      <meshStandardMaterial color="#B98A5A" roughness={0.6} />
    </mesh>
    {[-0.6, 0.6].flatMap((dx) =>
      [-0.26, 0.26].map((dz) => (
        <mesh key={`${dx}${dz}`} position={[dx, DESK_Y / 2, dz]}>
          <boxGeometry args={[0.04, DESK_Y, 0.04]} />
          <meshStandardMaterial color="#5B5F66" />
        </mesh>
      ))
    )}
    {/* chair (behind the desk, students face -z) */}
    <mesh position={[0, 0.45, 0.62]}>
      <boxGeometry args={[0.5, 0.05, 0.45]} />
      <meshStandardMaterial color="#2C4C9C" />
    </mesh>
    <mesh position={[0, 0.72, 0.84]}>
      <boxGeometry args={[0.5, 0.5, 0.04]} />
      <meshStandardMaterial color="#2C4C9C" />
    </mesh>
    {/* answer sheet */}
    <mesh position={[0.15, DESK_Y + 0.03, 0.02]} rotation={[-Math.PI / 2, 0, 0.1]}>
      <planeGeometry args={[0.3, 0.4]} />
      <meshStandardMaterial color="#FAFAF5" />
    </mesh>
  </group>
);

const STUDENT_TOPS = ["#F2F2F2", "#2E86AB", "#B03A2E", "#F4D03F", "#27AE60", "#8E44AD", "#D35400", "#5D6D7E", "#16A085", "#C0392B", "#7B4B2A", "#1F618D"];

export const ExamHall: React.FC<{ f: number }> = ({ f }) => {
  const floor = tilesTex(14 / 1.4, 10 / 1.4);
  const sign = hallSign();
  const t = TH();
  const desks = useMemo(() => {
    const d: [number, number][] = [];
    for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-1.4, 1.0, 3.4]) d.push([x, z]);
    return d;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* walls: back, left, right (front open like a diorama) */}
      <mesh position={[0, 2, -5]}>
        <boxGeometry args={[14.4, 4, 0.2]} />
        <meshStandardMaterial color={t.roomWall} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 7.1, 2, 0]}>
            <boxGeometry args={[0.2, 4, 10]} />
            <meshStandardMaterial color={t.roomWall2} />
          </mesh>
          {[-2.6, 0.4, 3.2].map((z) => (
            <mesh key={z} position={[s * 7.21, 2.3, z]} rotation={[0, s * (Math.PI / 2), 0]}>
              <planeGeometry args={[1.6, 1.4]} />
              <meshStandardMaterial color="#BFD6E6" roughness={0.2} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* wall top trim */}
      <mesh position={[0, 4.05, -5]}>
        <boxGeometry args={[14.6, 0.12, 0.3]} />
        <meshStandardMaterial color={t.signBorder} />
      </mesh>
      {/* sign + blackboard on back wall */}
      <mesh position={[-3.6, 3.15, -4.88]}>
        <planeGeometry args={[3.2, 0.81]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh position={[1.8, 2.0, -4.88]}>
        <planeGeometry args={[4.4, 1.8]} />
        <meshStandardMaterial color="#2F4A3A" roughness={0.9} />
      </mesh>
      {/* invigilator desk */}
      <mesh position={[0.4, DESK_Y, -3.9]}>
        <boxGeometry args={[2.4, 0.06, 0.9]} />
        <meshStandardMaterial color="#8C6239" />
      </mesh>
      <mesh position={[0.4, DESK_Y / 2, -4.25]}>
        <boxGeometry args={[2.4, DESK_Y, 0.06]} />
        <meshStandardMaterial color="#7A5430" />
      </mesh>
      {desks.map(([x, z], i) => (
        <Desk key={i} x={x} z={z} />
      ))}
      {/* students sitting, facing the front (-z) */}
      {desks.map(([x, z], i) => {
        if (i === 7) return null; // the desk with the phone stays empty
        const d: PersonDef = { p: [x, 0, z + 0.62], r: Math.PI, pose: "sit", top: STUDENT_TOPS[i % STUDENT_TOPS.length], bottom: i % 3 ? "#2C3E50" : "#3B3B3B", h: 1.6 + random(`st${i}`) * 0.15 };
        return <Person key={i} d={d} i={i} f={f} y={0} />;
      })}
      {/* invigilator standing */}
      <Person d={{ p: [-1.4, 0, -3.6], r: 0.3, pose: "stand", top: "#ECE6D8", bottom: "#4A4A4A", h: 1.72 }} i={30} f={f} y={0} />
    </group>
  );
};

/* ------------------------------------------------------------------ phone */
const phoneGeo = new RoundedBoxGeometry(0.075, 0.009, 0.16, 4, 0.008);
export const Phone: React.FC<{ screen: THREE.Texture; position?: V3; rotY?: number }> = ({ screen, position = PHONE_POS, rotY = 0.25 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh geometry={phoneGeo}>
      <meshStandardMaterial color="#1A1C22" roughness={0.3} metalness={0.5} />
    </mesh>
    <mesh position={[0, 0.0047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.068, 0.15]} />
      <meshBasicMaterial map={screen} toneMapped={false} />
    </mesh>
  </group>
);

/* ----------------------------------------------------------------- jammer */
export const Jammer: React.FC<{ f: number; on: boolean; position?: V3; scale?: number }> = ({ f, on, position = JAMMER_POS, scale = 1 }) => {
  const face = jammerFace();
  const blink = on ? (Math.floor(f / 4) % 2 === 0 ? 1 : 0.35) : 0.15;
  const ants = [-0.24, -0.15, -0.06, 0.03, 0.12, 0.21];
  return (
    <group position={position} scale={scale} rotation={[0, -0.35, 0]}>
      <mesh>
        <boxGeometry args={[0.6, 0.18, 0.32]} />
        <meshStandardMaterial attach="material-0" color="#24272D" />
        <meshStandardMaterial attach="material-1" color="#24272D" />
        <meshStandardMaterial attach="material-2" color="#2B2F36" metalness={0.4} roughness={0.5} />
        <meshStandardMaterial attach="material-3" color="#24272D" />
        <meshStandardMaterial attach="material-4" map={face} />
        <meshStandardMaterial attach="material-5" color="#24272D" />
      </mesh>
      {ants.map((x, i) => {
        const tilt = (i - 2.5) * 0.08;
        return (
          <group key={i} position={[x, 0.09, -0.08]} rotation={[0, 0, tilt]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.05, 12]} />
              <meshStandardMaterial color="#8E949E" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.011, 0.016, 0.32, 10]} />
              <meshStandardMaterial color="#15171B" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* status LEDs */}
      {[0.16, 0.21, 0.26].map((x, i) => (
        <mesh key={x} position={[x, 0.03, 0.161]}>
          <circleGeometry args={[0.011, 16]} />
          <meshBasicMaterial color={on ? (i === 0 ? "#FF3B3B" : "#3BFF7A") : "#3A3A3A"} transparent opacity={i === 0 ? blink : on ? 1 : 0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ tower */
const Strut: React.FC<{ a: V3; b: V3; r?: number; color?: string }> = ({ a, b, r = 0.08, color = "#9AA3AE" }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
    </mesh>
  );
};

export const Tower: React.FC<{ f: number }> = ({ f }) => {
  const H = 26;
  const leg = (y: number) => 2.2 - (y / H) * 1.5; // half-width tapering upward
  const levels = [0, 4, 8, 12, 16, 20, 24, 26];
  const corners = (y: number): V3[] => {
    const w = leg(y);
    return [
      [-w, y, -w],
      [w, y, -w],
      [w, y, w],
      [-w, y, w],
    ];
  };
  return (
    <group position={TOWER_POS}>
      {[0, 1, 2, 3].map((k) => (
        <Strut key={k} a={corners(0)[k]} b={corners(H)[k]} r={0.14} color={k % 2 ? "#C8CDD4" : "#C8CDD4"} />
      ))}
      {levels.slice(0, -1).map((y, i) => {
        const c0 = corners(y);
        const c1 = corners(levels[i + 1]);
        return (
          <group key={y}>
            {[0, 1, 2, 3].map((k) => (
              <group key={k}>
                <Strut a={c0[k]} b={c0[(k + 1) % 4]} r={0.06} />
                <Strut a={c0[k]} b={c1[(k + 1) % 4]} r={0.045} />
              </group>
            ))}
          </group>
        );
      })}
      {/* platform + panel antennas */}
      <mesh position={[0, 24.6, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.15, 24]} />
        <meshStandardMaterial color="#7E8792" />
      </mesh>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => (
        <group key={i} rotation={[0, a + 0.6, 0]}>
          <mesh position={[0, 26, 1.35]}>
            <boxGeometry args={[0.45, 2.4, 0.16]} />
            <meshStandardMaterial color="#F4F5F7" roughness={0.5} />
          </mesh>
          <mesh position={[0, 25.6, 1.0]}>
            <boxGeometry args={[0.08, 0.08, 0.7]} />
            <meshStandardMaterial color="#8E949E" />
          </mesh>
        </group>
      ))}
      {/* microwave dish */}
      <mesh position={[1.0, 21, 1.0]} rotation={[0, -0.8, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.35, 0.25, 24]} />
        <meshStandardMaterial color="#E9EBEE" />
      </mesh>
      {/* aviation light */}
      <mesh position={[0, 27.6, 0]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshBasicMaterial color={Math.floor(f / 15) % 2 ? "#FF3B3B" : "#7A1E1E"} toneMapped={false} />
      </mesh>
      <Strut a={[0, 24.6, 0]} b={[0, 27.5, 0]} r={0.07} />
    </group>
  );
};

/* ------------------------------------------------------------------ waves */
/** Clean signal: expanding blue shells from a point. */
export const SignalWaves: React.FC<{ origin: V3; f: number; max: number; color?: string; period?: number; count?: number; opacity?: number }> = ({ origin, f, max, color = "#3FA9F5", period = 40, count = 4, opacity = 0.35 }) => (
  <group position={origin}>
    {new Array(count).fill(0).map((_, i) => {
      const t = (((f / period + i / count) % 1) + 1) % 1;
      return (
        <mesh key={i} scale={0.2 + t * max}>
          <sphereGeometry args={[1, 32, 20]} />
          <meshBasicMaterial color={color} transparent opacity={(1 - t) * opacity} wireframe depthWrite={false} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

/** Noise: jittery red shells bursting out fast. */
export const NoiseWaves: React.FC<{ origin: V3; f: number; max: number; intensity: number }> = ({ origin, f, max, intensity }) => {
  if (intensity <= 0.01) return null;
  return (
    <group position={origin}>
      {new Array(6).fill(0).map((_, i) => {
        const t = (((f / 14 + i / 6) % 1) + 1) % 1;
        return (
          <mesh key={i} scale={0.1 + t * max} rotation={[random(`nr${i}${Math.floor(f / 2)}`) * 3, random(`nq${i}${Math.floor(f / 2)}`) * 3, 0]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial color="#FF3B3B" transparent opacity={(1 - t) * 0.45 * intensity} wireframe depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Jammer coverage dome. */
export const Dome: React.FC<{ grow: number; f: number }> = ({ grow, f }) => {
  if (grow <= 0.001) return null;
  const pulse = 1 + 0.015 * Math.sin(f / 5);
  return (
    <group position={[JAMMER_POS[0], 0, JAMMER_POS[2] + 2]} scale={grow * pulse}>
      <mesh>
        <sphereGeometry args={[DOME_R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#FF3B3B" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[DOME_R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#FF3B3B" transparent opacity={0.3} wireframe depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[DOME_R - 0.25, DOME_R, 64]} />
        <meshBasicMaterial color="#FF3B3B" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
};

/* ---------------------------------------------------- people outside hall */
export const Outsiders: React.FC<{ f: number }> = ({ f }) => (
  <>
    {(
      [
        [16, 9, -0.6, "#2E86AB"],
        [-17, 7, 0.8, "#C0392B"],
        [14, -14, 2.4, "#27AE60"],
      ] as [number, number, number, string][]
    ).map(([x, z, r, top], i) => (
      <Person key={i} d={{ p: [x, 0, z], r, pose: "phone", top, bottom: "#2C3E50" }} i={60 + i} f={f} y={0} />
    ))}
  </>
);
export const OUTSIDERS: V3[] = [
  [16, 2.0, 9],
  [-17, 2.0, 7],
  [14, 2.0, -14],
];
