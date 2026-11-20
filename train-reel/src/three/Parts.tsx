import { TH } from "../theme";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  boardTex,
  cardTex,
  CardState,
  clockTex,
  keyboardTex,
  roofTex,
  signTex,
  tilesTex,
  trainTex,
} from "./textures";

export type V3 = [number, number, number];

/* ------------------------------------------------------------------ camera */
export const Cam: React.FC<{ pos: V3; target: V3; fov?: number; roll?: number }> = ({ pos, target, fov = 50, roll = 0 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...pos);
    cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    cam.lookAt(...target);
    cam.fov = fov;
    cam.near = 0.02;
    cam.far = 400;
    cam.updateProjectionMatrix();
  });
  return null;
};

export const Lights: React.FC = () => (
  <>
    <color attach="background" args={[TH().bg]} />
    <fog attach="fog" args={[TH().bg, 30, 110]} />
    <hemisphereLight args={[TH().hemiSky, TH().hemiGround, TH().hemiI]} />
    <directionalLight position={[12, 22, 18]} intensity={TH().dirI} color={TH().dirColor} />
    <directionalLight position={[-15, 8, 10]} intensity={0.5} />
  </>
);

/* ---------------------------------------------------------------- station */
const PLAT_Y = 1.1;


export const Station: React.FC = () => {
  const tiles = tilesTex(160 / 2.4, 9 / 2.4);
  const roof = roofTex(160 / 1.5);
  const beams = useMemo(() => new Array(33).fill(0).map((_, i) => -80 + i * 5), []);
  return (
    <group>
      {/* platform */}
      <mesh position={[0, PLAT_Y / 2, 4.5]}>
        <boxGeometry args={[160, PLAT_Y, 9]} />
        <meshStandardMaterial attach="material-0" color={TH().platSide} />
        <meshStandardMaterial attach="material-1" color={TH().platSide} />
        <meshStandardMaterial attach="material-2" map={tiles} roughness={0.85} />
        <meshStandardMaterial attach="material-3" color={TH().platSide} />
        <meshStandardMaterial attach="material-4" color={TH().platFront} />
        <meshStandardMaterial attach="material-5" color={TH().platFront} />
      </mesh>
      {/* edge coping + yellow line */}
      <mesh position={[0, PLAT_Y + 0.005, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 0.5]} />
        <meshStandardMaterial color={TH().coping} />
      </mesh>
      <mesh position={[0, PLAT_Y + 0.008, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 0.14]} />
        <meshStandardMaterial color={TH().safety} />
      </mesh>
      {/* track bed + rails */}
      <mesh position={[0, 0, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 7]} />
        <meshStandardMaterial color={TH().track} />
      </mesh>
      {[-1.15, -2.65].map((z) => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[160, 0.16, 0.12]} />
          <meshStandardMaterial color={TH().rail} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* far wall */}
      <mesh position={[0, 4, -7]}>
        <planeGeometry args={[160, 8]} />
        <meshStandardMaterial color={TH().wall} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 7.2, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 16]} />
        <meshStandardMaterial map={roof} side={THREE.DoubleSide} />
      </mesh>
      {beams.map((x) => (
        <mesh key={x} position={[x, 6.95, 1]}>
          <boxGeometry args={[0.32, 0.5, 16]} />
          <meshStandardMaterial color={TH().beam} />
        </mesh>
      ))}
      {[-0.6, 3.8, 7.6].map((z) => (
        <mesh key={z} position={[0, 6.7, z]}>
          <boxGeometry args={[160, 0.36, 0.3]} />
          <meshStandardMaterial color={TH().beam} />
        </mesh>
      ))}
      {/* overhead thin wires */}
      {[5.9, 6.2].map((y, i) => (
        <mesh key={y} position={[0, y, -1.9 + i * 0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 160, 6]} />
          <meshStandardMaterial color={TH().beam} />
        </mesh>
      ))}
      {/* columns */}
      {[-60, -40, -20, 0, 20, 40, 60].map((x) => (
        <mesh key={x} position={[x + 10, (PLAT_Y + 7) / 2, 7.6]}>
          <cylinderGeometry args={[0.2, 0.2, 7 - PLAT_Y + 0.2, 16]} />
          <meshStandardMaterial color={TH().column} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ train */
const COACH = 22;
const GAP = 0.6;
export const PERIOD = COACH + GAP;

/* Aerodynamic nose (side profile extruded across the body width, rounded by bevel). */
const NOSE_LEN = 6.6;
const noseGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.9);
  s.lineTo(4.9, 0.9);
  s.quadraticCurveTo(6.25, 0.95, 6.3, 1.35);
  s.bezierCurveTo(6.2, 2.2, 3.7, 3.4, 0.9, 3.45);
  s.lineTo(0, 3.45);
  s.lineTo(0, 0.9);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 8, curveSegments: 32 });
  g.translate(0, 0, -1.2);
  return g;
})();
const bandGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.9);
  s.lineTo(4.9, 0.9);
  s.quadraticCurveTo(6.25, 0.95, 6.3, 1.35);
  s.lineTo(6.27, 1.62);
  s.lineTo(0, 1.62);
  s.lineTo(0, 0.9);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.42, bevelEnabled: true, bevelThickness: 0.302, bevelSize: 0.302, bevelSegments: 8, curveSegments: 24 });
  g.translate(0, 0, -1.21);
  return g;
})();
const stripeGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 1.78);
  s.lineTo(6.12, 1.78);
  s.lineTo(6.05, 1.88);
  s.lineTo(0, 1.88);
  s.lineTo(0, 1.78);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.42, bevelEnabled: true, bevelThickness: 0.302, bevelSize: 0.302, bevelSegments: 8 });
  g.translate(0, 0, -1.21);
  return g;
})();

const Nose: React.FC<{ x: number }> = ({ x }) => {
  const t = TH();
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={noseGeo}>
        <meshStandardMaterial color={t.trainUpper} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh geometry={bandGeo}>
        <meshStandardMaterial color={t.lowerA} roughness={0.4} />
      </mesh>
      <mesh geometry={stripeGeo}>
        <meshStandardMaterial color={t.stripe} roughness={0.4} />
      </mesh>
      {/* raked windshield */}
      <mesh position={[4.95, 2.95, 0]} rotation={[0, 0, -0.62]}>
        <boxGeometry args={[1.9, 0.05, 2.35]} />
        <meshStandardMaterial color={t.windowBand} roughness={0.15} metalness={0.6} />
      </mesh>
      {/* headlights */}
      {[-0.85, 0.85].map((z) => (
        <mesh key={z} position={[6.52, 1.45, z]}>
          <boxGeometry args={[0.08, 0.14, 0.5]} />
          <meshBasicMaterial color="#FFF7D6" toneMapped={false} />
        </mesh>
      ))}
      {/* side skirt under nose */}
      <mesh position={[2.6, 0.48, 0]}>
        <boxGeometry args={[5.2, 0.3, 2.7]} />
        <meshStandardMaterial color={t.trainEnd} />
      </mesh>
    </group>
  );
};

/** Vande Bharat-style EMU. `nose` adds the aerodynamic driving car at the front (+x end). */
export const Train: React.FC<{ x: number; blur: boolean; coaches?: number; nose?: boolean }> = ({ x, blur, coaches = 8, nose = false }) => {
  const side = trainTex(blur);
  const t = TH();
  return (
    <group position={[x, 0, -1.9]}>
      {new Array(coaches).fill(0).map((_, i) => (
        <group key={i} position={[i * PERIOD, 0, 0]}>
          {/* body */}
          <mesh position={[0, 2.1, 0]}>
            <boxGeometry args={[COACH, 3.0, 3.0]} />
            <meshStandardMaterial attach="material-0" color={t.trainEnd} />
            <meshStandardMaterial attach="material-1" color={t.trainEnd} />
            <meshStandardMaterial attach="material-2" color={t.trainRoof} />
            <meshStandardMaterial attach="material-3" color={t.trainEnd} />
            <meshStandardMaterial attach="material-4" map={side} roughness={0.4} />
            <meshStandardMaterial attach="material-5" map={side} roughness={0.4} />
          </mesh>
          {/* rounded roof */}
          <mesh position={[0, 3.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.3, 1, 1]}>
            <cylinderGeometry args={[1.5, 1.5, COACH, 40, 1, false]} />
            <meshStandardMaterial color={t.trainRoof} roughness={0.4} />
          </mesh>
          {/* skirt over the bogies */}
          <mesh position={[0, 0.47, 0]}>
            <boxGeometry args={[COACH - 0.6, 0.28, 2.85]} />
            <meshStandardMaterial color={t.trainEnd} />
          </mesh>
          {/* gangway bellows */}
          <mesh position={[COACH / 2 + GAP / 2, 2.2, 0]}>
            <boxGeometry args={[GAP + 0.05, 2.6, 2.5]} />
            <meshStandardMaterial color="#59606C" />
          </mesh>
        </group>
      ))}
      {nose && <Nose x={(coaches - 1) * PERIOD + COACH / 2} />}
    </group>
  );
};
export const NOSE_TIP = NOSE_LEN;
export const trainLength = (coaches = 8) => (coaches - 1) * PERIOD + COACH / 2 + NOSE_LEN;

/** Endless train: identical coaches let us wrap the offset for any speed. */
export const trainOffset = (dist: number, base = -90) => base + (((dist % PERIOD) + PERIOD) % PERIOD);

/* --------------------------------------------------------------- speaker */
const hornGeo = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector2(0.08 + 0.42 * Math.pow(t, 2.2), t * 0.95));
  }
  return new THREE.LatheGeometry(pts, 40);
})();

const Horn: React.FC<{ dir: 1 | -1 }> = ({ dir }) => (
  <group rotation={[0, 0, dir === 1 ? -Math.PI / 2 - 0.22 : Math.PI / 2 + 0.22]}>
    <mesh geometry={hornGeo}>
      <meshStandardMaterial color={TH().horn} roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.12, 0]}>
      <cylinderGeometry args={[0.2, 0.22, 0.32, 24]} />
      <meshStandardMaterial color={TH().horn} roughness={0.4} metalness={0.4} />
    </mesh>
    <mesh position={[0, 0.94, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.5, 0.025, 8, 40]} />
      <meshStandardMaterial color={TH().hornRim} />
    </mesh>
  </group>
);

export const Speaker: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => {
  const rodLen = 6.95 - position[1];
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, rodLen / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, rodLen, 10]} />
        <meshStandardMaterial color={TH().beam} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.16]} />
        <meshStandardMaterial color={TH().beam} />
      </mesh>
      <group position={[0.2, -0.12, 0]}>
        <Horn dir={1} />
      </group>
      <group position={[-0.2, -0.12, 0]}>
        <Horn dir={-1} />
      </group>
    </group>
  );
};

/* ----------------------------------------------------------------- board */
export const Board: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => {
  const tex = boardTex();
  const W = 5.4;
  const H = (W * 360) / 1400;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[W + 0.12, H + 0.12, 0.2]} />
        <meshStandardMaterial attach="material-0" color="#111" />
        <meshStandardMaterial attach="material-1" color="#111" />
        <meshStandardMaterial attach="material-2" color="#111" />
        <meshStandardMaterial attach="material-3" color="#111" />
        <meshBasicMaterial attach="material-4" color="#111" />
        <meshBasicMaterial attach="material-5" color="#111" />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0, 0.101 * s]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
      {[-W / 2 + 0.4, W / 2 - 0.4].map((x) => (
        <mesh key={x} position={[x, H / 2 + (6.95 - position[1] - H / 2) / 2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 6.95 - position[1] - H / 2, 8]} />
          <meshStandardMaterial color={TH().beam} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------- announcement cabin */
export const Cabin: React.FC = () => {
  const sign = signTex();
  const x0 = -18; // front (glass) face, facing +x
  const glass = <meshStandardMaterial color={TH().glass} transparent opacity={0.22} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} />;
  const frame = TH().frame;
  return (
    <group>
      {/* glass front with mullions */}
      <mesh position={[x0, PLAT_Y + 1.6, 5.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3.2]} />
        {glass}
      </mesh>
      {[3.2, 4.45, 5.7, 6.95, 8.2].map((z) => (
        <mesh key={z} position={[x0, PLAT_Y + 1.6, z]}>
          <boxGeometry args={[0.12, 3.2, 0.1]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
      <mesh position={[x0, PLAT_Y + 1.0, 5.7]}>
        <boxGeometry args={[0.1, 0.08, 5]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {/* side glass toward track */}
      <mesh position={[x0 - 3, PLAT_Y + 1.6, 3.2]}>
        <planeGeometry args={[6, 3.2]} />
        {glass}
      </mesh>
      {/* roof slab */}
      <mesh position={[x0 - 3, PLAT_Y + 3.3, 5.7]}>
        <boxGeometry args={[6.3, 0.25, 5.3]} />
        <meshStandardMaterial color={TH().frame} />
      </mesh>
      {/* back walls */}
      <mesh position={[x0 - 6, PLAT_Y + 1.6, 5.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3.2]} />
        <meshStandardMaterial color={TH().roomWall2} side={THREE.DoubleSide} />
      </mesh>
      {/* sign over the glass front */}
      <mesh position={[x0 + 0.08, PLAT_Y + 3.95, 5.7]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4.2, 1.2, 0.1]} />
        <meshStandardMaterial color={TH().signBg} />
      </mesh>
      <mesh position={[x0 + 0.14, PLAT_Y + 3.95, 5.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4.1, 1.2]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* desk + mic + monitor seen inside */}
      <mesh position={[x0 - 2.5, PLAT_Y + 0.8, 7.4]}>
        <boxGeometry args={[4, 0.08, 1]} />
        <meshStandardMaterial color={TH().desk} />
      </mesh>
      <mesh position={[x0 - 2.5, PLAT_Y + 0.4, 7.85]}>
        <boxGeometry args={[4, 0.8, 0.08]} />
        <meshStandardMaterial color={TH().deskPanel} />
      </mesh>
      <mesh position={[x0 - 2.0, PLAT_Y + 1.15, 7.7]}>
        <boxGeometry args={[0.9, 0.55, 0.05]} />
        <meshStandardMaterial color="#1B1D22" />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------ control room */
export const ROOM: V3 = [200, 0, 0];

const micCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.02, 0),
  new THREE.Vector3(0, 0.18, 0),
  new THREE.Vector3(0.03, 0.32, 0.05),
  new THREE.Vector3(0.1, 0.4, 0.14),
]);

export const Room: React.FC<{ screen: THREE.Texture; typing?: number }> = ({ screen, typing = 0 }) => {
  const floor = tilesTex(8 / 1.2, 8 / 1.2);
  const kbd = keyboardTex();
  const clock = clockTex();
  return (
    <group position={ROOM}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      <mesh position={[0, 2, -2.2]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color={TH().roomWall} />
      </mesh>
      <mesh position={[-2.6, 2, 1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color={TH().roomWall2} />
      </mesh>
      {/* window on left wall */}
      <mesh position={[-2.58, 2.2, 0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 1.3]} />
        <meshBasicMaterial color={TH().bg} />
      </mesh>
      {[-0.9, 0, 0.9].map((z) => (
        <mesh key={z} position={[-2.56, 2.2, 0.2 + z]}>
          <boxGeometry args={[0.05, 1.34, 0.06]} />
          <meshStandardMaterial color={TH().deskPanel} />
        </mesh>
      ))}
      <mesh position={[1.3, 2.55, -2.18]}>
        <circleGeometry args={[0.22, 40]} />
        <meshBasicMaterial map={clock} />
      </mesh>
      {/* desk */}
      <mesh position={[0, 0.8, -1.4]}>
        <boxGeometry args={[3.4, 0.07, 1.1]} />
        <meshStandardMaterial color={TH().desk} />
      </mesh>
      <mesh position={[0, 0.4, -1.92]}>
        <boxGeometry args={[3.4, 0.8, 0.06]} />
        <meshStandardMaterial color={TH().deskPanel} />
      </mesh>
      {[-1.65, 1.65].map((x) => (
        <mesh key={x} position={[x, 0.4, -1.4]}>
          <boxGeometry args={[0.06, 0.8, 1.1]} />
          <meshStandardMaterial color={TH().deskPanel} />
        </mesh>
      ))}
      {/* monitor */}
      <mesh position={[0, 0.845, -1.62]}>
        <boxGeometry args={[0.36, 0.02, 0.24]} />
        <meshStandardMaterial color="#1C1E23" />
      </mesh>
      <mesh position={[0, 1.0, -1.66]}>
        <boxGeometry args={[0.06, 0.32, 0.04]} />
        <meshStandardMaterial color="#1C1E23" />
      </mesh>
      <mesh position={[0, 1.33, -1.64]}>
        <boxGeometry args={[1.08, 0.66, 0.04]} />
        <meshStandardMaterial color="#17191D" />
      </mesh>
      <mesh position={[0, 1.335, -1.619]}>
        <planeGeometry args={[1.04, 0.62]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* keyboard */}
      <mesh position={[0, 0.85, -1.08]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.62, 0.025, 0.22]} />
        <meshStandardMaterial attach="material-0" color="#1A1C20" />
        <meshStandardMaterial attach="material-1" color="#1A1C20" />
        <meshStandardMaterial attach="material-2" map={kbd} />
        <meshStandardMaterial attach="material-3" color="#1A1C20" />
        <meshStandardMaterial attach="material-4" color="#1A1C20" />
        <meshStandardMaterial attach="material-5" color="#1A1C20" />
      </mesh>
      <mesh position={[0.5, 0.85, -1.06]}>
        <boxGeometry args={[0.07, 0.025, 0.11]} />
        <meshStandardMaterial color="#1A1C20" />
      </mesh>
      {/* gooseneck mic */}
      <group position={[-0.75, 0.835, -1.45]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.09, 0.03, 24]} />
          <meshStandardMaterial color="#1C1E23" />
        </mesh>
        <mesh>
          <tubeGeometry args={[micCurve, 30, 0.009, 8, false]} />
          <meshStandardMaterial color="#2A2C31" />
        </mesh>
        <mesh position={[0.12, 0.415, 0.165]} rotation={[0.9, 0, -0.3]}>
          <capsuleGeometry args={[0.022, 0.07, 6, 12]} />
          <meshStandardMaterial color="#2A2C31" />
        </mesh>
      </group>
      <Hands typing={typing} />
    </group>
  );
};

/* ------------------------------------------------------------------ hands */
const SKIN = "#EDAA7A";

const Hand: React.FC<{ x: number; mirror: 1 | -1; typing: number; phase: number }> = ({ x, mirror, typing, phase }) => (
  <group position={[x, 0.9, -0.98]} rotation={[0.12, -0.12 * mirror, 0]}>
    {/* sleeve */}
    <mesh position={[0.05 * mirror, 0.0, 0.28]} rotation={[Math.PI / 2 - 0.1, 0, -0.18 * mirror]}>
      <cylinderGeometry args={[0.05, 0.06, 0.4, 16]} />
      <meshStandardMaterial color={TH().sleeve} />
    </mesh>
    {/* palm */}
    <mesh position={[0, 0, 0.03]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[0.055, 20, 14]} />
      <meshStandardMaterial color={SKIN} roughness={0.6} />
    </mesh>
    {/* fingers */}
    {[-0.033, -0.011, 0.011, 0.033].map((fx, i) => {
      const tap = Math.max(0, Math.sin(typing * 1.3 + phase + i * 1.9)) * 0.45;
      return (
        <group key={i} position={[fx, 0.004, -0.02]} rotation={[-0.25 + tap, 0, 0]}>
          <mesh position={[0, 0, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.0105, 0.05, 4, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.6} />
          </mesh>
        </group>
      );
    })}
    {/* thumb */}
    <mesh position={[-0.05 * mirror, -0.005, 0.0]} rotation={[Math.PI / 2, 0, 0.9 * mirror]}>
      <capsuleGeometry args={[0.012, 0.04, 4, 10]} />
      <meshStandardMaterial color={SKIN} roughness={0.6} />
    </mesh>
  </group>
);

export const Hands: React.FC<{ typing: number }> = ({ typing }) => (
  <group>
    <Hand x={-0.13} mirror={1} typing={typing} phase={0} />
    <Hand x={0.13} mirror={-1} typing={typing} phase={1.3} />
  </group>
);

/* ---------------------------------------------------------- floating cards */
export const Card3D: React.FC<{
  label: string;
  state: CardState;
  aspect: number;
  position: V3;
  height?: number;
  appear?: number; // 0..1
  rotY?: number;
}> = ({ label, state, aspect, position, height = 1, appear = 1, rotY = 0 }) => {
  const tex = cardTex(label, state, aspect);
  if (appear <= 0.001) return null;
  const s = appear;
  return (
    <mesh position={position} rotation={[0, rotY, 0]} scale={[s, s, s]}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} opacity={Math.min(1, appear * 1.5)} />
    </mesh>
  );
};

export const ClockBadge: React.FC<{ position: V3; appear: number; spin: number }> = ({ position, appear, spin }) => {
  const tex = clockTex();
  if (appear <= 0.001) return null;
  return (
    <mesh position={position} scale={appear} rotation={[0, 0, spin]}>
      <circleGeometry args={[0.2, 32]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
};
