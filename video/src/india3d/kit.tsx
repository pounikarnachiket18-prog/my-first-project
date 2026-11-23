import React, { useMemo } from "react";
import * as THREE from "three";
import {
  dhabaSignTex,
  glowTex,
  menuTex,
  PlateKind,
  plateTex,
  shopTex,
  signTex,
  truckRearTex,
  windowsTex,
} from "./textures";

// Units: metres. Vehicles face -Z (they drive "into" the screen); their rear is at +Z.
type V3 = [number, number, number];

export const Glow: React.FC<{ position: V3; color: string; size: number; opacity?: number }> = ({
  position,
  color,
  size,
  opacity = 1,
}) => (
  <sprite position={position} scale={[size, size, 1]}>
    <spriteMaterial
      map={glowTex()}
      color={color}
      transparent
      opacity={opacity}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
      fog={false}
    />
  </sprite>
);

const Box: React.FC<{
  size: V3;
  position?: V3;
  color: string;
  emissive?: string;
  ei?: number;
  rotation?: V3;
  map?: THREE.Texture;
  shadow?: boolean;
  rough?: number;
  metal?: number;
}> = ({ size, position = [0, 0, 0], color, emissive, ei = 0, rotation, map, shadow = true, rough = 0.75, metal = 0 }) => (
  <mesh position={position} rotation={rotation} castShadow={shadow} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={ei}
      map={map}
      flatShading
      roughness={rough}
      metalness={metal}
    />
  </mesh>
);

const Wheel: React.FC<{ position: V3; r?: number; w?: number }> = ({ position, r = 0.34, w = 0.26 }) => (
  <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
    <cylinderGeometry args={[r, r, w, 10]} />
    <meshStandardMaterial color="#141414" flatShading roughness={0.9} />
  </mesh>
);

const Plate: React.FC<{ text: string; kind?: PlateKind; position: V3; w?: number; rotY?: number }> = ({
  text,
  kind,
  position,
  w = 0.62,
  rotY = 0,
}) => (
  <mesh position={position} rotation={[0, rotY, 0]}>
    <planeGeometry args={[w, w * 0.24]} />
    <meshBasicMaterial map={plateTex(text, kind)} toneMapped={false} />
  </mesh>
);

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
};

// ------------------------------------------------------------ Car
export const Car: React.FC<{
  position: V3;
  rotY?: number;
  color: string;
  plate: string;
  plateKind?: PlateKind;
  suv?: boolean;
  brake?: boolean;
  head?: boolean;
  glow?: boolean;
  dent?: boolean;
}> = ({ position, rotY = 0, color, plate, plateKind, suv, brake, head, glow = true, dent }) => {
  const L = suv ? 4.5 : 4.1;
  const Wd = suv ? 1.9 : 1.78;
  const bodyH = suv ? 0.85 : 0.68;
  const cabH = suv ? 0.72 : 0.58;
  const y0 = 0.32;
  const tailI = brake ? 3.2 : 1.2;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Box size={[Wd, bodyH, L]} position={[0, y0 + bodyH / 2, 0]} color={color} rough={0.45} metal={0.15} />
      <Box size={[Wd * 0.88, cabH, L * 0.5]} position={[0, y0 + bodyH + cabH / 2, 0.15]} color="#2E3B4A" rough={0.2} metal={0.3} />
      <Box size={[Wd * 0.9, 0.07, L * 0.5]} position={[0, y0 + bodyH + cabH + 0.035, 0.15]} color={shade(color, 1.1)} />
      {dent && <Box size={[0.7, 0.3, 0.12]} position={[0.45, y0 + 0.4, L / 2 + 0.02]} rotation={[0.25, 0.3, 0.2]} color={shade(color, 0.6)} />}
      {[
        [-Wd / 2 + 0.05, 0.34, L * 0.32],
        [Wd / 2 - 0.05, 0.34, L * 0.32],
        [-Wd / 2 + 0.05, 0.34, -L * 0.32],
        [Wd / 2 - 0.05, 0.34, -L * 0.32],
      ].map((p, i) => (
        <Wheel key={i} position={p as V3} />
      ))}
      {/* tail lights (rear = +z) */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          size={[0.42, 0.13, 0.05]}
          position={[s * (Wd / 2 - 0.25), y0 + bodyH - 0.16, L / 2 + 0.01]}
          color="#7A0A0A"
          emissive="#FF2A1A"
          ei={tailI}
          shadow={false}
        />
      ))}
      {glow &&
        [-1, 1].map((s) => (
          <Glow key={`g${s}`} position={[s * (Wd / 2 - 0.25), y0 + bodyH - 0.16, L / 2 + 0.12]} color="#FF3B1F" size={brake ? 1.6 : 0.9} opacity={brake ? 0.9 : 0.55} />
        ))}
      {/* head lights (front = -z) */}
      {[-1, 1].map((s) => (
        <Box key={`h${s}`} size={[0.36, 0.12, 0.05]} position={[s * (Wd / 2 - 0.25), y0 + bodyH - 0.18, -L / 2 - 0.01]} color="#DDD" emissive="#FFF4D6" ei={head ? 2.5 : 0.4} shadow={false} />
      ))}
      {head && [-1, 1].map((s) => <Glow key={`hg${s}`} position={[s * (Wd / 2 - 0.25), y0 + bodyH - 0.18, -L / 2 - 0.2]} color="#FFF2C4" size={2.2} opacity={0.8} />)}
      <Plate text={plate} kind={plateKind} position={[0, y0 + 0.28, L / 2 + 0.03]} />
      <Plate text={plate} kind={plateKind} position={[0, y0 + 0.28, -L / 2 - 0.03]} rotY={Math.PI} />
    </group>
  );
};

// ------------------------------------------------------------ Auto-rickshaw
export const Auto: React.FC<{ position: V3; rotY?: number; plate: string; brake?: boolean }> = ({ position, rotY = 0, plate, brake }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[1.3, 0.55, 2.5]} position={[0, 0.55, 0]} color="#1C1C1C" />
    <Box size={[1.36, 0.85, 1.9]} position={[0, 1.25, 0.2]} color="#F2C400" rough={0.5} />
    <Box size={[1.38, 0.12, 1.92]} position={[0, 0.88, 0.2]} color="#1E7F3A" />
    <Box size={[1.1, 0.5, 0.05]} position={[0, 1.25, 1.16]} color="#2A2A2A" />
    <Box size={[0.9, 0.5, 0.05]} position={[0, 1.2, -1.1]} color="#2E3B4A" rough={0.2} />
    <Wheel position={[-0.55, 0.28, 0.75]} r={0.28} />
    <Wheel position={[0.55, 0.28, 0.75]} r={0.28} />
    <Wheel position={[0, 0.28, -1.0]} r={0.28} />
    {[-1, 1].map((s) => (
      <Box key={s} size={[0.14, 0.14, 0.04]} position={[s * 0.5, 0.6, 1.27]} color="#7A0A0A" emissive="#FF2A1A" ei={brake ? 3 : 1.2} shadow={false} />
    ))}
    <Plate text={plate} kind="commercial" position={[0, 0.48, 1.27]} w={0.5} />
  </group>
);

// ------------------------------------------------------------ Truck (Indian goods carrier)
export const Truck: React.FC<{ position: V3; rotY?: number; plate: string; cab?: string; brake?: boolean }> = ({
  position,
  rotY = 0,
  plate,
  cab = "#1F4E9A",
  brake,
}) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[2.5, 0.35, 8.6]} position={[0, 0.75, 0]} color="#2A2A2A" />
    {/* cargo body, painted */}
    <Box size={[2.5, 2.6, 6.0]} position={[0, 2.2, 1.2]} color="#E0592A" rough={0.6} />
    <mesh position={[0, 2.2, 4.21]}>
      <planeGeometry args={[2.5, 2.6]} />
      <meshStandardMaterial map={truckRearTex()} roughness={0.7} />
    </mesh>
    <Box size={[2.52, 0.18, 6.02]} position={[0, 3.5, 1.2]} color="#FFD400" />
    {/* cab */}
    <Box size={[2.4, 2.2, 2.2]} position={[0, 1.95, -3.0]} color={cab} rough={0.5} />
    <Box size={[2.2, 0.8, 0.05]} position={[0, 2.4, -4.11]} color="#2E3B4A" rough={0.2} />
    {[
      [-1.15, 0.5, 3.2],
      [1.15, 0.5, 3.2],
      [-1.15, 0.5, 1.6],
      [1.15, 0.5, 1.6],
      [-1.15, 0.5, -3.0],
      [1.15, 0.5, -3.0],
    ].map((p, i) => (
      <Wheel key={i} position={p as V3} r={0.5} w={0.36} />
    ))}
    {[-1, 1].map((s) => (
      <Box key={s} size={[0.3, 0.16, 0.05]} position={[s * 1.0, 1.05, 4.32]} color="#7A0A0A" emissive="#FF2A1A" ei={brake ? 3 : 1.2} shadow={false} />
    ))}
    {[-1, 1].map((s) => (
      <Glow key={`g${s}`} position={[s * 1.0, 1.05, 4.45]} color="#FF3B1F" size={brake ? 1.6 : 1.0} opacity={0.7} />
    ))}
    <Plate text={plate} kind="commercial" position={[0, 0.95, 4.33]} w={0.75} />
  </group>
);

// ------------------------------------------------------------ Bus
export const Bus: React.FC<{ position: V3; rotY?: number; plate: string }> = ({ position, rotY = 0, plate }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[2.55, 2.8, 11]} position={[0, 1.85, 0]} color="#C8102E" rough={0.5} />
    <Box size={[2.57, 0.9, 10.6]} position={[0, 2.35, 0]} color="#2E3B4A" rough={0.2} />
    <Box size={[2.57, 0.25, 11.02]} position={[0, 1.2, 0]} color="#F2F2F2" />
    {[-4, 4].map((z) => [-1.2, 1.2].map((x) => <Wheel key={`${x}${z}`} position={[x, 0.5, z]} r={0.5} w={0.34} />))}
    {[-1, 1].map((s) => (
      <Box key={s} size={[0.3, 0.2, 0.05]} position={[s * 1.0, 0.95, 5.52]} color="#7A0A0A" emissive="#FF2A1A" ei={1.3} shadow={false} />
    ))}
    <Plate text={plate} kind="commercial" position={[0, 0.75, 5.53]} w={0.75} />
  </group>
);

// ------------------------------------------------------------ People
export type Pose = {
  armL?: [number, number]; // shoulder pitch (forward +), shoulder roll (out +)
  armR?: [number, number];
  lean?: number;
  sit?: boolean;
  bob?: number;
  walk?: number; // walk-cycle phase in radians; omit to stand still
};

export const Person: React.FC<{
  position: V3;
  rotY?: number;
  shirt: string;
  pants?: string;
  skin?: string;
  hat?: "turban" | "cap" | "cop" | null;
  hatColor?: string;
  pose?: Pose;
  scale?: number;
}> = ({ position, rotY = 0, shirt, pants = "#2D3142", skin = "#A8714A", hat = null, hatColor = "#FF9933", pose = {}, scale = 1 }) => {
  const { armL = [0, 0.1], armR = [0, 0.1], lean = 0, sit = false, bob = 0, walk } = pose;
  const swing = walk === undefined ? 0 : Math.sin(walk) * 0.45;
  const hip = sit ? 0.48 : 0.9;
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {/* legs */}
      {sit ? (
        <>
          <Box size={[0.17, 0.17, 0.5]} position={[-0.11, hip, -0.22]} color={pants} />
          <Box size={[0.17, 0.17, 0.5]} position={[0.11, hip, -0.22]} color={pants} />
          <Box size={[0.16, 0.48, 0.16]} position={[-0.11, 0.24, -0.46]} color={pants} />
          <Box size={[0.16, 0.48, 0.16]} position={[0.11, 0.24, -0.46]} color={pants} />
        </>
      ) : (
        <>
          <group position={[-0.11, 0.9, 0]} rotation={[swing, 0, 0]}>
            <Box size={[0.18, 0.9, 0.18]} position={[0, -0.45, 0]} color={pants} />
          </group>
          <group position={[0.11, 0.9, 0]} rotation={[-swing, 0, 0]}>
            <Box size={[0.18, 0.9, 0.18]} position={[0, -0.45, 0]} color={pants} />
          </group>
        </>
      )}
      <group position={[0, hip + bob, 0]} rotation={[lean, 0, 0]}>
        <Box size={[0.5, 0.62, 0.28]} position={[0, 0.31, 0]} color={shirt} />
        <mesh position={[0, 0.82, 0]} castShadow>
          <icosahedronGeometry args={[0.18, 1]} />
          <meshStandardMaterial color={skin} flatShading />
        </mesh>
        {/* face: eyes, brows, moustache (front = -z) */}
        <Box size={[0.05, 0.05, 0.03]} position={[-0.07, 0.86, -0.165]} color="#111" shadow={false} />
        <Box size={[0.05, 0.05, 0.03]} position={[0.07, 0.86, -0.165]} color="#111" shadow={false} />
        <Box size={[0.08, 0.02, 0.03]} position={[-0.07, 0.92, -0.165]} rotation={[0, 0, -0.25]} color="#111" shadow={false} />
        <Box size={[0.08, 0.02, 0.03]} position={[0.07, 0.92, -0.165]} rotation={[0, 0, 0.25]} color="#111" shadow={false} />
        <Box size={[0.16, 0.035, 0.03]} position={[0, 0.77, -0.17]} color="#1A1A1A" shadow={false} />
        {hat === "turban" && (
          <mesh position={[0, 0.94, 0]} castShadow>
            <icosahedronGeometry args={[0.19, 1]} />
            <meshStandardMaterial color={hatColor} flatShading />
          </mesh>
        )}
        {hat === "cap" && <Box size={[0.36, 0.1, 0.42]} position={[0, 0.97, -0.04]} color={hatColor} />}
        {hat === "cop" && (
          <>
            <Box size={[0.38, 0.16, 0.38]} position={[0, 1.0, 0]} color="#F4F4F4" />
            <Box size={[0.4, 0.04, 0.2]} position={[0, 0.93, -0.22]} color="#1B2A4A" />
          </>
        )}
        {/* arms pivot at shoulders */}
        {[
          [-0.32, armL],
          [0.32, armR],
        ].map(([x, a], i) => {
          const [pitch, roll] = a as [number, number];
          const side = (x as number) < 0 ? -1 : 1;
          return (
            <group key={i} position={[x as number, 0.56, 0]} rotation={[-pitch, 0, side * roll]}>
              <Box size={[0.14, 0.62, 0.14]} position={[0, -0.28, 0]} color={shirt} />
              <Box size={[0.12, 0.12, 0.12]} position={[0, -0.62, 0]} color={skin} />
            </group>
          );
        })}
      </group>
    </group>
  );
};

export const Cow: React.FC<{ position: V3; rotY?: number; t: number }> = ({ position, rotY = 0, t }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[1.0, 0.7, 1.9]} position={[0, 0.45, 0]} color="#EFEAE0" />
    <Box size={[0.5, 0.35, 0.5]} position={[0, 0.95, -0.55]} color="#E6DFD2" />
    <group position={[0, 0.75, -1.15]} rotation={[0.2 + Math.sin(t * 3) * 0.06, Math.sin(t) * 0.25, 0]}>
      <Box size={[0.45, 0.5, 0.6]} position={[0, 0, -0.1]} color="#EFEAE0" />
      <Box size={[0.36, 0.22, 0.2]} position={[0, -0.14, -0.45]} color="#E8B8A8" />
      <Box size={[0.08, 0.3, 0.08]} position={[-0.17, 0.35, 0]} rotation={[0, 0, 0.4]} color="#C9B48A" />
      <Box size={[0.08, 0.3, 0.08]} position={[0.17, 0.35, 0]} rotation={[0, 0, -0.4]} color="#C9B48A" />
    </group>
    <Box size={[0.08, 0.08, 0.9]} position={[0.2, 0.9, 0.2]} rotation={[0, 0, 0]} color="#FF9933" />
  </group>
);

// ------------------------------------------------------------ Roadside
export const Tree: React.FC<{ position: V3; s?: number; hue?: string }> = ({ position, s = 1, hue = "#2F5A3A" }) => (
  <group position={position} scale={s}>
    <Box size={[0.35, 2.2, 0.35]} position={[0, 1.1, 0]} color="#5A3E2B" />
    <mesh position={[0, 3.3, 0]} castShadow>
      <icosahedronGeometry args={[1.6, 0]} />
      <meshStandardMaterial color={hue} flatShading roughness={0.9} />
    </mesh>
    <mesh position={[0.6, 4.2, 0.2]} castShadow>
      <icosahedronGeometry args={[1.0, 0]} />
      <meshStandardMaterial color={shade(hue, 1.25)} flatShading roughness={0.9} />
    </mesh>
  </group>
);

export const Palm: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <Box size={[0.3, 7, 0.3]} position={[0, 3.5, 0]} rotation={[0, 0, 0.06]} color="#6B4F35" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <group key={i} position={[0.2, 7, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
        <Box size={[0.25, 0.08, 2.6]} position={[0, -0.4, 1.2]} rotation={[-0.5, 0, 0]} color="#2F6B3A" />
      </group>
    ))}
  </group>
);

export const LampPost: React.FC<{ position: V3; on: number }> = ({ position, on }) => (
  <group position={position}>
    <Box size={[0.18, 10, 0.18]} position={[0, 5, 0]} color="#8F969C" />
    <Box size={[6.4, 0.12, 0.12]} position={[0, 9.9, 0]} color="#8F969C" />
    {[-3.1, 3.1].map((x) => (
      <group key={x}>
        <Box size={[0.8, 0.18, 0.4]} position={[x, 9.8, 0]} color="#DDD" emissive="#FFC46B" ei={on * 4} shadow={false} />
        {on > 0.05 && <Glow position={[x, 9.6, 0]} color="#FFB347" size={5} opacity={on * 0.8} />}
      </group>
    ))}
  </group>
);

export const Gantry: React.FC<{ position: V3; lines: [string, string][]; title?: string; width?: number }> = ({
  position,
  lines,
  title,
  width = 11,
}) => (
  <group position={position}>
    <Box size={[0.35, 7.5, 0.35]} position={[-width / 2, 3.75, 0]} color="#9AA0A6" />
    <Box size={[0.35, 7.5, 0.35]} position={[width / 2, 3.75, 0]} color="#9AA0A6" />
    <Box size={[width, 0.35, 0.35]} position={[0, 7.3, 0]} color="#9AA0A6" />
    <mesh position={[0, 7.4, 0.22]}>
      <planeGeometry args={[7.2, 3.6]} />
      <meshStandardMaterial map={signTex(lines, title)} emissive="#ffffff" emissiveMap={signTex(lines, title)} emissiveIntensity={0.25} roughness={0.6} />
    </mesh>
    <Box size={[7.3, 3.7, 0.1]} position={[0, 7.4, 0.12]} color="#666" shadow={false} />
  </group>
);

export const MileStone: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[0.6, 0.8, 0.3]} position={[0, 0.4, 0]} color="#F7F3EA" />
    <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.3, 12, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color="#F2B705" flatShading />
    </mesh>
  </group>
);

// City block with lit windows (like the original's skyline)
export const Block: React.FC<{ position: V3; size: V3; seed: number; color?: string; glow?: number }> = ({ position, size, seed, color = "#3A3152", glow = 0.9 }) => {
  const tex = useMemo(() => {
    const t = windowsTex(seed % 7).clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, size[0] / 6), Math.max(1, size[1] / 10));
    t.needsUpdate = true;
    return t;
  }, [seed, size]);
  return (
    <mesh position={[position[0], position[1] + size[1] / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={tex} emissiveMap={tex} emissive="#FFFFFF" emissiveIntensity={glow} flatShading />
    </mesh>
  );
};

export const Shop: React.FC<{ position: V3; rotY?: number; name: string; color: string; w?: number }> = ({ position, rotY = 0, name, color, w = 5 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[w, 3.6, 4]} position={[0, 1.8, 0]} color={color} />
    <Box size={[w * 0.8, 2.0, 0.1]} position={[0, 1.1, 2.0]} color="#2B1A10" emissive="#FFB347" ei={0.25} />
    <mesh position={[0, 3.0, 2.06]}>
      <planeGeometry args={[w * 0.9, w * 0.22]} />
      <meshStandardMaterial map={shopTex(name, color)} emissive="#ffffff" emissiveMap={shopTex(name, color)} emissiveIntensity={0.3} />
    </mesh>
    <Box size={[w + 0.4, 0.12, 1.4]} position={[0, 2.5, 2.6]} rotation={[0.25, 0, 0]} color="#8E9AA3" />
  </group>
);

// ------------------------------------------------------------ Dhaba
export const Charpai: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[1.0, 0.1, 2.0]} position={[0, 0.5, 0]} color="#E6CFA0" />
    <Box size={[1.08, 0.08, 2.08]} position={[0, 0.46, 0]} color="#8B5E34" />
    {[
      [-0.48, -0.95],
      [0.48, -0.95],
      [-0.48, 0.95],
      [0.48, 0.95],
    ].map(([x, z], i) => (
      <Box key={i} size={[0.08, 0.46, 0.08]} position={[x, 0.23, z]} color="#6B4A2B" />
    ))}
  </group>
);

export const Dhaba: React.FC<{
  position: V3;
  rotY?: number;
  name: string;
  deva: string;
  sub?: string;
  wall?: string;
  signBg?: string;
  t: number;
  people?: boolean;
}> = ({ position, rotY = 0, name, deva, sub = "24 HRS · PURE VEG & NON-VEG · TRUCKERS WELCOME", wall = "#F2C14E", signBg, t, people = true }) => {
  const bulbs = Array.from({ length: 16 }, (_, i) => i);
  const sign = dhabaSignTex(name, deva, sub, signBg);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* building, front faces +z */}
      <Box size={[12, 3.6, 6]} position={[0, 1.8, -3]} color={wall} />
      <Box size={[12.02, 0.9, 6.02]} position={[0, 0.45, -3]} color="#3A5BA0" />
      <Box size={[13.5, 0.15, 8.5]} position={[0, 3.85, -2.2]} rotation={[0.12, 0, 0]} color="#8E9AA3" rough={0.4} metal={0.4} />
      {/* open kitchen glow */}
      <Box size={[4.2, 2.2, 0.1]} position={[-3, 1.6, 0.01]} color="#3B1A08" emissive="#FF9A3C" ei={0.9} shadow={false} />
      <Box size={[4.2, 2.2, 0.1]} position={[3, 1.6, 0.01]} color="#3B1A08" emissive="#FF9A3C" ei={0.9} shadow={false} />
      <pointLight position={[0, 2.2, 2.5]} color="#FFB060" intensity={30} distance={16} decay={1.6} />
      {/* tandoor */}
      <mesh position={[-4.6, 0.55, 1.2]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, 1.1, 10]} />
        <meshStandardMaterial color="#B5651D" flatShading />
      </mesh>
      <Glow position={[-4.6, 1.3, 1.2]} color="#FF7A1A" size={1.6 + Math.sin(t * 9) * 0.2} opacity={0.9} />
      {/* sign board on roof */}
      <Box size={[0.2, 1.4, 0.2]} position={[-4, 4.4, -0.4]} color="#555" />
      <Box size={[0.2, 1.4, 0.2]} position={[4, 4.4, -0.4]} color="#555" />
      <mesh position={[0, 5.9, -0.3]}>
        <planeGeometry args={[11, 3.4]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.55} />
      </mesh>
      {/* string lights */}
      {bulbs.map((i) => {
        const x = -6.2 + (12.4 / 15) * i;
        const y = 3.5 - Math.sin((i / 15) * Math.PI) * 0.35;
        const on = Math.sin(t * 6 + i * 1.7) > -0.4;
        const c = ["#FF5E5B", "#FFD400", "#3DDC97", "#4CC9F0"][i % 4];
        return (
          <group key={i}>
            <mesh position={[x, y, 0.9]}>
              <sphereGeometry args={[0.09, 6, 6]} />
              <meshBasicMaterial color={on ? c : "#444"} toneMapped={false} />
            </mesh>
            {on && <Glow position={[x, y, 0.95]} color={c} size={0.9} opacity={0.7} />}
          </group>
        );
      })}
      {/* menu board */}
      <group position={[6.6, 0, 2.4]} rotation={[0, -0.4, 0]}>
        <Box size={[0.1, 1.0, 0.1]} position={[0, 0.5, 0]} color="#6B4A2B" />
        <mesh position={[0, 1.6, 0.06]}>
          <planeGeometry args={[1.1, 1.38]} />
          <meshStandardMaterial map={menuTex()} emissiveMap={menuTex()} emissive="#fff" emissiveIntensity={0.35} />
        </mesh>
      </group>
      {/* charpais + customers */}
      <Charpai position={[-2.4, 0, 3.2]} rotY={Math.PI / 2} />
      <Charpai position={[2.0, 0, 3.6]} rotY={Math.PI / 2} />
      <Charpai position={[0, 0, 6.0]} rotY={Math.PI / 2 + 0.2} />
      {people && (
        <>
          <Person position={[-2.6, 0.08, 2.6]} rotY={0.2} shirt="#3D5A80" hat="turban" hatColor="#FF9933" pose={{ sit: true, armR: [1.4 + Math.sin(t * 2) * 0.2, 0.1] }} />
          <Person position={[-2.2, 0.08, 3.9]} rotY={Math.PI - 0.3} shirt="#E36414" hat="cap" hatColor="#222" pose={{ sit: true, armR: [0.9 + Math.sin(t * 5) * 0.5, 0.4] }} />
          <Person position={[2.0, 0.08, 3.0]} rotY={0.1} shirt="#6A994E" pose={{ sit: true, armR: [1.5, 0.1] }} />
          <Person position={[2.3, 0.08, 4.3]} rotY={Math.PI} shirt="#F4F4F4" hat="turban" hatColor="#C9184A" pose={{ sit: true, armL: [0.6 + Math.sin(t * 4 + 1) * 0.4, 0.3] }} />
          <Person position={[-4.0, 0, 0.9]} rotY={0.6} shirt="#F4F4F4" pants="#555" hat="turban" hatColor="#E0592A" pose={{ armR: [1.2 + Math.sin(t * 7) * 0.3, 0.2], armL: [0.8, 0.2] }} />
          <Person position={[3.4, 0, 1.4]} rotY={-0.4} shirt="#2E86AB" pose={{ armR: [1.6, 0.2] }} />
        </>
      )}
    </group>
  );
};

// ------------------------------------------------------------ Berlin: wagon with 99 phones
export const PhoneWagon: React.FC<{ position: V3; rotY?: number; t: number }> = ({ position, rotY = 0, t }) => {
  const phones = useMemo(() => {
    const out: { p: V3; k: number }[] = [];
    for (let i = 0; i < 99; i++) {
      const r = i % 11;
      const c = Math.floor(i / 11);
      out.push({ p: [-0.42 + r * 0.084, 0.78 + (c % 3) * 0.02, -0.62 + c * 0.14], k: (i * 7.31) % 6.28 });
    }
    return out;
  }, []);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Box size={[1.0, 0.35, 1.45]} position={[0, 0.6, 0]} color="#C8102E" />
      <Box size={[0.92, 0.05, 1.37]} position={[0, 0.77, 0]} color="#7A0A0A" />
      {[
        [-0.5, 0.22, 0.5],
        [0.5, 0.22, 0.5],
        [-0.5, 0.22, -0.5],
        [0.5, 0.22, -0.5],
      ].map((p, i) => (
        <Wheel key={i} position={p as V3} r={0.22} w={0.1} />
      ))}
      {/* handle towards the artist (+z) */}
      <Box size={[0.06, 0.06, 1.1]} position={[0, 0.75, 1.15]} rotation={[-0.35, 0, 0]} color="#333" />
      {phones.map((ph, i) => (
        <mesh key={i} position={ph.p}>
          <boxGeometry args={[0.06, 0.012, 0.11]} />
          <meshBasicMaterial color={Math.sin(t * 4 + ph.k) > 0.2 ? "#CFF3FF" : "#6FB8E0"} toneMapped={false} />
        </mesh>
      ))}
      {/* sparkle cloud of location pings */}
      {Array.from({ length: 34 }, (_, i) => {
        const a = i * 2.399;
        const rad = 0.3 + ((i * 37) % 10) * 0.09;
        const y = 1.3 + ((i * 13) % 9) * 0.16 + Math.sin(t * 2 + i) * 0.08;
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
        const pos: V3 = [Math.cos(a) * rad, y, Math.sin(a) * rad * 0.8];
        return (
          <group key={`s${i}`}>
            <mesh position={pos}>
              <sphereGeometry args={[0.035 + tw * 0.02, 6, 6]} />
              <meshBasicMaterial color="#E6FAFF" toneMapped={false} />
            </mesh>
            <Glow position={pos} color="#8FE3FF" size={0.18 + tw * 0.14} opacity={0.6 * tw + 0.2} />
          </group>
        );
      })}
      <Glow position={[0, 0.95, 0]} color="#5AB8FF" size={1.8} opacity={0.45} />
    </group>
  );
};

export const StreetLamp: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <Box size={[0.14, 4.2, 0.14]} position={[0, 2.1, 0]} color="#2B2B2B" />
    <Box size={[0.4, 0.5, 0.4]} position={[0, 4.4, 0]} color="#2B2B2B" emissive="#FFC46B" ei={2.5} shadow={false} />
    <Glow position={[0, 4.4, 0]} color="#FFB347" size={3} opacity={0.8} />
  </group>
);

// ------------------------------------------------------------ Phone ping (location beacon)
export const Ping: React.FC<{ position: V3; t: number; strength?: number }> = ({ position, t, strength = 1 }) => {
  const k = (t * 0.9) % 1;
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#9AD8FF" toneMapped={false} transparent opacity={0.9 * strength} />
      </mesh>
      <Glow position={[0, 0, 0]} color="#5AB8FF" size={4 * strength} opacity={0.9} />
      {[0, 0.33, 0.66].map((o) => {
        const p = (k + o) % 1;
        return (
          <mesh key={o} rotation={[-Math.PI / 2, 0, 0]} scale={0.4 + p * 3}>
            <ringGeometry args={[0.9, 1, 48]} />
            <meshBasicMaterial color="#7FC8FF" transparent opacity={(1 - p) * 0.8 * strength} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};
