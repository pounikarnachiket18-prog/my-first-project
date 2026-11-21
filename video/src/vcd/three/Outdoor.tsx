import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { COLOR } from "../theme";

const Z_FROM = -700;
const Z_TO = 120;
const LEN = Z_TO - Z_FROM;
const Z_MID = (Z_FROM + Z_TO) / 2;
export const RAIL_X = 0.84;
export const RAIL_TOP = 0.52;

/** Night lighting for every outdoor shot. */
export const NightLights: React.FC = () => (
  <>
    <ambientLight color="#8394c8" intensity={1.1} />
    <hemisphereLight args={["#40508a", "#1b2316", 0.8]} />
    <directionalLight color="#c2cdff" intensity={1.3} position={[30, 40, 25]} />
  </>
);

const Sleepers: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spacing = 0.65;
  const count = Math.floor(LEN / spacing);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(0, 0.34, Z_FROM + i * spacing);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[2.6, 0.12, 0.24]} />
      <meshStandardMaterial color={COLOR.sleeper} roughness={0.9} />
    </instancedMesh>
  );
};

export const Track: React.FC = () => (
  <group>
    {/* ground */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, Z_MID]} receiveShadow>
      <planeGeometry args={[1600, LEN + 400]} />
      <meshStandardMaterial color={COLOR.grass} roughness={1} />
    </mesh>
    {/* ballast bed */}
    <mesh position={[0, 0.14, Z_MID]} receiveShadow>
      <boxGeometry args={[4.6, 0.28, LEN]} />
      <meshStandardMaterial color={COLOR.ballast} roughness={1} />
    </mesh>
    <Sleepers />
    {[-RAIL_X, RAIL_X].map((x) => (
      <mesh key={x} position={[x, 0.45, Z_MID]}>
        <boxGeometry args={[0.08, 0.15, LEN]} />
        <meshStandardMaterial color={COLOR.rail} metalness={0.6} roughness={0.3} />
      </mesh>
    ))}
  </group>
);

/** Flat-topped low-poly trees scattered on both sides of the line. */
export const Trees: React.FC<{ count?: number }> = ({ count = 90 }) => {
  const trees = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const side = random(`side${i}`) > 0.5 ? 1 : -1;
        return {
          x: side * (16 + random(`x${i}`) * 70),
          z: Z_FROM + random(`z${i}`) * (LEN - 40),
          s: 0.8 + random(`s${i}`) * 0.9,
          r: random(`r${i}`) * Math.PI,
        };
      }),
    [count],
  );
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s} rotation-y={t.r}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.18, 0.28, 2.8, 6]} />
            <meshStandardMaterial color={COLOR.trunk} />
          </mesh>
          <mesh position={[0, 3.4, 0]} scale={[1.9, 0.75, 1.9]}>
            <icosahedronGeometry args={[1.6, 0]} />
            <meshStandardMaterial color={COLOR.tree} flatShading roughness={1} />
          </mesh>
          <mesh position={[0.9, 3.0, 0.4]} scale={[1.2, 0.6, 1.2]}>
            <icosahedronGeometry args={[1.2, 0]} />
            <meshStandardMaterial color={COLOR.tree} flatShading roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const WIRE_Y = 6.0;

/** Overhead electric line: masts, cantilever arms and the contact wire. */
export const Catenary: React.FC<{ side?: 1 | -1; spacing?: number }> = ({ side = 1, spacing = 50 }) => {
  const masts = useMemo(() => {
    const out: number[] = [];
    for (let z = Z_FROM; z < Z_TO; z += spacing) out.push(z);
    return out;
  }, [spacing]);
  const x = side * 3.4;
  return (
    <group>
      {masts.map((z) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position={[0, 3.8, 0]}>
            <boxGeometry args={[0.22, 7.6, 0.22]} />
            <meshStandardMaterial color={COLOR.pole} metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[-side * 1.8, 7.1, 0]}>
            <boxGeometry args={[3.8, 0.08, 0.08]} />
            <meshStandardMaterial color={COLOR.pole} />
          </mesh>
          <mesh position={[-side * 1.7, 6.55, 0]} rotation-z={side * 0.32}>
            <boxGeometry args={[3.6, 0.05, 0.05]} />
            <meshStandardMaterial color={COLOR.pole} />
          </mesh>
        </group>
      ))}
      {[WIRE_Y, 7.15].map((y) => (
        <mesh key={y} position={[0, y, Z_MID]}>
          <boxGeometry args={[0.03, 0.03, LEN]} />
          <meshBasicMaterial color="#c9cfdc" />
        </mesh>
      ))}
    </group>
  );
};

export const Moon: React.FC<{ position?: [number, number, number] }> = ({ position = [-60, 70, -520] }) => (
  <mesh position={position}>
    <sphereGeometry args={[3.2, 24, 24]} />
    <meshBasicMaterial color="#fffaf0" fog={false} />
  </mesh>
);

export const NightWorld: React.FC = () => (
  <>
    <NightLights />
    <Track />
    <Trees />
    <Catenary />
    <Moon />
  </>
);
