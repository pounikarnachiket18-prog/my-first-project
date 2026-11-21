import React, { useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { COLOR } from "../theme";
import { RAIL_X, WIRE_Y } from "./Outdoor";

const WHEEL_R = 0.55;
const WHEEL_Y = 1.02;
const LOCO_LEN = 20;

const Wheelset: React.FC<{ z: number; turn: number }> = ({ z, turn }) => (
  <group position={[0, WHEEL_Y, z]} rotation-x={-turn}>
    {[-RAIL_X, RAIL_X].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.14, 20]} />
          <meshStandardMaterial color="#2c2e33" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* spoke marker so rotation reads on screen */}
        <mesh position={[Math.sign(x) * 0.08, 0.25, 0]}>
          <boxGeometry args={[0.03, 0.42, 0.1]} />
          <meshStandardMaterial color="#6d7078" />
        </mesh>
      </group>
    ))}
    <mesh rotation-z={Math.PI / 2}>
      <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
      <meshStandardMaterial color="#25272b" />
    </mesh>
  </group>
);

const Bogie: React.FC<{ z: number; turn: number }> = ({ z, turn }) => (
  <group position={[0, 0, z]}>
    <mesh position={[0, 1.15, 0]}>
      <boxGeometry args={[2.3, 0.45, 4.8]} />
      <meshStandardMaterial color="#303238" roughness={0.7} />
    </mesh>
    {[-1.7, 0, 1.7].map((dz) => (
      <Wheelset key={dz} z={dz} turn={turn} />
    ))}
  </group>
);

/** Sparks spraying off the wheels during emergency braking. */
const Sparks: React.FC<{ amount: number; frame: number; zs: number[] }> = ({ amount, frame, zs }) => {
  const sparks = useMemo(() => {
    const out: { p: [number, number, number]; s: number }[] = [];
    zs.forEach((z, zi) => {
      [-RAIL_X, RAIL_X].forEach((x, xi) => {
        for (let i = 0; i < 14; i++) {
          const k = `${frame}-${zi}-${xi}-${i}`;
          const t = random(`t${k}`);
          out.push({
            p: [x + (random(`x${k}`) - 0.5) * 0.5, 0.5 + t * 0.5, z + 0.2 + t * 1.6],
            s: 0.03 + random(`s${k}`) * 0.05,
          });
        }
      });
    });
    return out;
  }, [frame, zs]);
  if (amount <= 0) return null;
  return (
    <group>
      {sparks.map((s, i) =>
        random(`on${frame}-${i}`) < amount ? (
          <mesh key={i} position={s.p} scale={[s.s, s.s, s.s * 5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#fff1b8" : "#ffb04a"} toneMapped={false} />
          </mesh>
        ) : null,
      )}
      <pointLight position={[2, 0.8, zs[0]]} color="#ff9a3c" intensity={amount * 6} distance={10} decay={0} />
      <pointLight position={[2, 0.8, zs[zs.length - 1]]} color="#ff9a3c" intensity={amount * 6} distance={10} decay={0} />
    </group>
  );
};

/** Headlight glow halo (cheap fake bloom). */
const Glow: React.FC<{ size: number; opacity: number }> = ({ size, opacity }) => (
  <mesh>
    <circleGeometry args={[size, 32]} />
    <meshBasicMaterial color="#fff6dc" transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>
);

/**
 * Indian-electric-style locomotive + a rake of freight wagons.
 * Faces +Z; `z` is the position of the front buffer.
 */
export const Locomotive: React.FC<{
  z: number;
  distance?: number; // metres travelled, drives wheel rotation
  headlight?: number;
  sparks?: number;
  frame?: number;
  wagons?: number;
}> = ({ z, distance = 0, headlight = 1, sparks = 0, frame = 0, wagons = 8 }) => {
  const turn = distance / WHEEL_R;
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const blue = <meshStandardMaterial color={COLOR.locoBlue} roughness={0.55} metalness={0.15} />;
  const stripe = <meshStandardMaterial color={COLOR.locoStripe} roughness={0.5} />;
  const glass = <meshStandardMaterial color="#141b2e" roughness={0.2} metalness={0.4} />;
  const bogieZ = [-4.2, -LOCO_LEN + 4.2];

  return (
    <group position={[0, 0, z]}>
      {/* underframe */}
      <mesh position={[0, 1.55, -LOCO_LEN / 2]} castShadow>
        <boxGeometry args={[3.0, 0.4, LOCO_LEN - 0.2]} />
        <meshStandardMaterial color="#2a2c31" />
      </mesh>
      {/* body */}
      <mesh position={[0, 3.05, -LOCO_LEN / 2 - 0.3]} castShadow>
        <boxGeometry args={[3.1, 2.6, LOCO_LEN - 0.6]} />
        {blue}
      </mesh>
      {/* cab nose, slightly narrower */}
      <mesh position={[0, 3.05, -0.3]}>
        <boxGeometry args={[3.0, 2.6, 0.6]} />
        {blue}
      </mesh>
      {/* cream stripes */}
      <mesh position={[0, 2.35, -LOCO_LEN / 2]}>
        <boxGeometry args={[3.14, 0.22, LOCO_LEN - 0.05]} />
        {stripe}
      </mesh>
      <mesh position={[0, 2.05, -LOCO_LEN / 2]}>
        <boxGeometry args={[3.14, 0.07, LOCO_LEN - 0.05]} />
        {stripe}
      </mesh>
      {/* roof */}
      <mesh position={[0, 4.45, -LOCO_LEN / 2]}>
        <boxGeometry args={[2.7, 0.2, LOCO_LEN - 0.4]} />
        <meshStandardMaterial color={COLOR.locoRoof} />
      </mesh>
      {/* front windows */}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 3.6, 0.01]}>
          <boxGeometry args={[1.2, 0.75, 0.02]} />
          {glass}
        </mesh>
      ))}
      {/* side windows + louvres */}
      {[-1.56, 1.56].map((x) => (
        <group key={x}>
          <mesh position={[x, 3.55, -1.4]}>
            <boxGeometry args={[0.02, 0.6, 0.9]} />
            {glass}
          </mesh>
          {[-6, -9, -12, -15].map((lz) => (
            <mesh key={lz} position={[x, 3.4, lz]}>
              <boxGeometry args={[0.02, 0.75, 2.0]} />
              <meshStandardMaterial color="#25355f" />
            </mesh>
          ))}
        </group>
      ))}
      {/* buffers / pilot plate */}
      <mesh position={[0, 1.45, 0.05]}>
        <boxGeometry args={[2.9, 0.5, 0.25]} />
        <meshStandardMaterial color="#26282d" />
      </mesh>
      {/* marker lights */}
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 2.05, 0.03]}>
          <circleGeometry args={[0.09, 16]} />
          <meshBasicMaterial color={headlight > 0 ? "#fff0d0" : "#555"} toneMapped={false} />
        </mesh>
      ))}
      {/* headlight */}
      <group position={[0, 4.15, 0.04]}>
        <mesh>
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial color={headlight > 0 ? "#ffffff" : "#666"} toneMapped={false} />
        </mesh>
        {headlight > 0 ? (
          <group position={[0, 0, 0.02]}>
            <Glow size={0.55} opacity={0.35 * headlight} />
            <Glow size={1.4} opacity={0.12 * headlight} />
          </group>
        ) : null}
      </group>
      <primitive object={spotTarget} position={[0, 0, 50]} />
      {headlight > 0 ? (
        <spotLight
          position={[0, 4.15, 0.3]}
          target={spotTarget}
          color="#fff1d6"
          intensity={4.5 * headlight}
          angle={0.32}
          penumbra={0.7}
          distance={90}
          decay={0}
        />
      ) : null}
      {/* pantograph */}
      <group position={[0, 4.55, -4.5]}>
        <mesh position={[0, 0.55, 0.45]} rotation-x={0.75}>
          <boxGeometry args={[0.06, 1.5, 0.06]} />
          <meshStandardMaterial color="#9aa0aa" />
        </mesh>
        <mesh position={[0, WIRE_Y - 4.55 - 0.65, 0.95]} rotation-x={-0.6}>
          <boxGeometry args={[0.06, 1.4, 0.06]} />
          <meshStandardMaterial color="#9aa0aa" />
        </mesh>
        <mesh position={[0, WIRE_Y - 4.55 - 0.04, 0.6]}>
          <boxGeometry args={[1.8, 0.06, 0.12]} />
          <meshStandardMaterial color="#c7ccd4" />
        </mesh>
      </group>
      {/* bogies */}
      {bogieZ.map((bz) => (
        <Bogie key={bz} z={bz} turn={turn} />
      ))}
      <Sparks amount={sparks} frame={frame} zs={bogieZ.flatMap((bz) => [bz + 1.7, bz, bz - 1.7])} />
      {/* wagons */}
      {new Array(wagons).fill(0).map((_, i) => {
        const wz = -LOCO_LEN - 1 - i * 14.2;
        return (
          <group key={i} position={[0, 0, wz]}>
            <mesh position={[0, 2.85, -6.8]} castShadow>
              <boxGeometry args={[3.0, 2.7, 13.4]} />
              <meshStandardMaterial color={COLOR.wagon} roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.4, -6.8]}>
              <boxGeometry args={[2.8, 0.35, 13.4]} />
              <meshStandardMaterial color="#2a2b2f" />
            </mesh>
            {[-2.2, -11.4].map((bz) => (
              <group key={bz} position={[0, 0, bz]}>
                <Wheelset z={-0.9} turn={turn} />
                <Wheelset z={0.9} turn={turn} />
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};
