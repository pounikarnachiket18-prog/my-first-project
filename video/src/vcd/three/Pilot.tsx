import React from "react";
import { COLOR } from "../theme";

const Skin = () => <meshStandardMaterial color={COLOR.skin} roughness={0.75} />;
const Pants = () => <meshStandardMaterial color={COLOR.pants} roughness={0.85} />;

/**
 * Blocky seated figure, facing -Z. Origin = seat base.
 *  nod      0..1  head drops forward
 *  slump    0..1  torso leans onto the desk
 *  eyeOpen  0..1  eyelid opening (only visible in close-ups)
 *  reach    0..1  right hand pushes forward (touching a control)
 */
export const Pilot: React.FC<{
  position?: [number, number, number];
  rotationY?: number;
  nod?: number;
  slump?: number;
  eyeOpen?: number;
  reach?: number;
  shirt?: string;
  hair?: string;
}> = ({ position = [0, 0, 0], rotationY = 0, nod = 0, slump = 0, eyeOpen = 1, reach = 0, shirt = COLOR.shirt, hair = COLOR.hair }) => {
  const Shirt = () => <meshStandardMaterial color={shirt} roughness={0.8} />;
  return (
    <group position={position} rotation-y={rotationY}>
      {/* legs */}
      <group position={[0, 0.6, 0]}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.11, 0, -0.2]} rotation-x={Math.PI / 2} castShadow>
              <capsuleGeometry args={[0.085, 0.3, 6, 12]} />
              <Pants />
            </mesh>
            <mesh position={[s * 0.11, -0.27, -0.43]} castShadow>
              <capsuleGeometry args={[0.075, 0.34, 6, 12]} />
              <Pants />
            </mesh>
            <mesh position={[s * 0.11, -0.54, -0.5]}>
              <boxGeometry args={[0.11, 0.08, 0.22]} />
              <meshStandardMaterial color="#26272b" />
            </mesh>
          </group>
        ))}
      </group>

      {/* upper body pivots at the hips */}
      <group position={[0, 0.62, 0.03]} rotation-x={-slump * 0.55}>
        <mesh position={[0, 0.27, 0]} scale={[1.3, 1, 0.85]} castShadow>
          <capsuleGeometry args={[0.17, 0.25, 8, 16]} />
          <Shirt />
        </mesh>
        {/* arms */}
        {[-1, 1].map((s) => {
          const r = s === 1 ? reach : 0;
          return (
            <group key={s} position={[s * 0.25, 0.45, 0]} rotation-x={0.35 + r * 0.6 + slump * 0.5} rotation-z={s * 0.08}>
              <mesh position={[0, -0.13, 0]} castShadow>
                <capsuleGeometry args={[0.078, 0.16, 6, 12]} />
                <Shirt />
              </mesh>
              <group position={[0, -0.26, 0]} rotation-x={1.05 - r * 0.45 - slump * 0.3}>
                <mesh position={[0, -0.14, 0]} castShadow>
                  <capsuleGeometry args={[0.058, 0.22, 6, 12]} />
                  <Skin />
                </mesh>
                <mesh position={[0, -0.31, 0]}>
                  <sphereGeometry args={[0.062, 12, 12]} />
                  <Skin />
                </mesh>
              </group>
            </group>
          );
        })}

        {/* head pivots at the neck */}
        <group position={[0, 0.58, 0]} rotation-x={-nod * 0.85} rotation-z={nod * 0.12}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.12, 12]} />
            <Skin />
          </mesh>
          <group position={[0, 0.2, 0]}>
            <mesh scale={[1, 1.12, 1]} castShadow>
              <sphereGeometry args={[0.135, 28, 20]} />
              <Skin />
            </mesh>
            {/* hair: top cap + back cap */}
            <mesh scale={[1.04, 1.14, 1.04]} position={[0, 0.012, 0.008]}>
              <sphereGeometry args={[0.135, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.36]} />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
            <mesh scale={[1.04, 1.1, 1.04]} rotation-x={1.25} position={[0, -0.01, 0.01]}>
              <sphereGeometry args={[0.135, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
            {/* face */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.05, 0.02, -0.112]} scale={[1, Math.max(0.08, eyeOpen), 1]}>
                <mesh>
                  <sphereGeometry args={[0.026, 16, 12]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, -0.022]}>
                  <sphereGeometry args={[0.012, 12, 10]} />
                  <meshStandardMaterial color="#15161a" roughness={0.3} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.02, -0.14]}>
              <sphereGeometry args={[0.013, 10, 8]} />
              <Skin />
            </mesh>
            <mesh position={[0, -0.075, -0.128]}>
              <boxGeometry args={[0.045, 0.012, 0.01]} />
              <meshStandardMaterial color="#d47f7a" />
            </mesh>
            {/* ears */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.135, 0, 0]} scale={[0.5, 1, 0.8]}>
                <sphereGeometry args={[0.03, 10, 8]} />
                <Skin />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

export const Seat: React.FC<{ position?: [number, number, number] }> = ({ position = [0, 0, 0] }) => (
  <group position={position}>
    <mesh position={[0, 0.49, 0.02]} castShadow receiveShadow>
      <boxGeometry args={[0.56, 0.12, 0.54]} />
      <meshStandardMaterial color={COLOR.seat} roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.92, 0.3]} rotation-x={0.12} castShadow>
      <boxGeometry args={[0.56, 0.72, 0.12]} />
      <meshStandardMaterial color={COLOR.seat} roughness={0.8} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.31, 0.7, 0.05]}>
        <boxGeometry args={[0.07, 0.06, 0.42]} />
        <meshStandardMaterial color="#35383d" />
      </mesh>
    ))}
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 0.42, 10]} />
      <meshStandardMaterial color="#2c2e33" metalness={0.5} />
    </mesh>
    <mesh position={[0, 0.025, 0]}>
      <cylinderGeometry args={[0.26, 0.28, 0.05, 20]} />
      <meshStandardMaterial color="#2c2e33" />
    </mesh>
  </group>
);
