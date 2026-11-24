import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { L } from "./theme";
import type { Tex } from "./textures";

export const COACH_LEN = 22;
export const PITCH = 22.6;
export const LOCO_LEN = 19;
const BODY_BOTTOM = 1.0;
const BODY_H = 3.4;
const BODY_TOP = BODY_BOTTOM + BODY_H;
export const LAMP_Y = 2.02;
export const X_Y = 2.97;
export const LV_POS = { x: 1.1, y: 1.45 };

type V3 = [number, number, number];

/* ---------------- camera ---------------- */

export const CameraRig: React.FC<{ pos: V3; look: V3; fov?: number; zoom?: number }> = ({ pos, look, fov, zoom }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    if (fov !== undefined && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
    }
    if (zoom !== undefined && (camera as THREE.OrthographicCamera).isOrthographicCamera) {
      (camera as THREE.OrthographicCamera).zoom = zoom;
    }
    camera.updateProjectionMatrix();
  });
  return null;
};

/* ---------------- environment ---------------- */

export const Sky: React.FC<{ night?: boolean; fogNear?: number; fogFar?: number }> = ({ night, fogNear = 60, fogFar = 260 }) => {
  const bg = night ? "#14161B" : "#ECEEF2";
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, fogNear, fogFar]} />
      {night ? (
        <>
          <ambientLight intensity={0.35} color="#9aa6c8" />
          <hemisphereLight args={["#40506e", "#101014", 0.5]} />
        </>
      ) : (
        <>
          <hemisphereLight args={["#ffffff", "#b9bcc4", 1.6]} />
          <directionalLight position={[18, 30, 22]} intensity={1.7} />
          <directionalLight position={[-20, 12, -10]} intensity={0.4} />
        </>
      )}
    </>
  );
};

const Instanced: React.FC<{ positions: V3[]; size: V3; color: string }> = ({ positions, size, color }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => {
      m.makeTranslation(...p);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  );
};

export const Track: React.FC<{ x?: number; from?: number; to?: number; night?: boolean }> = ({ x = 0, from = 60, to = -260, night }) => {
  const len = from - to;
  const mid = (from + to) / 2;
  const sleepers = useMemo(() => {
    const a: V3[] = [];
    for (let z = to; z < from; z += 0.7) a.push([x, 0.12, z]);
    return a;
  }, [x, from, to]);
  return (
    <group>
      <mesh position={[x, 0.04, mid]}>
        <boxGeometry args={[4.4, 0.08, len]} />
        <meshStandardMaterial color={night ? "#2b2c31" : "#9a9ca3"} roughness={1} />
      </mesh>
      <Instanced positions={sleepers} size={[2.7, 0.16, 0.26]} color={night ? "#3a3b40" : "#b9bbc1"} />
      {[-0.84, 0.84].map((dx) => (
        <mesh key={dx} position={[x + dx, 0.3, mid]}>
          <boxGeometry args={[0.12, 0.18, len]} />
          <meshStandardMaterial color={night ? "#55575e" : "#6f727a"} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

export const Ground: React.FC<{ night?: boolean }> = ({ night }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -100]}>
    <planeGeometry args={[600, 600]} />
    <meshStandardMaterial color={night ? "#1c1d22" : "#E3E5EA"} roughness={1} />
  </mesh>
);

/** Platform on the +x side of the main track, with canopy, columns and lights */
export const Platform: React.FC<{ night?: boolean; from?: number; to?: number; tex: Tex; boards?: number[] }> = ({
  night,
  from = 40,
  to = -200,
  tex,
  boards = [-30],
}) => {
  const len = from - to;
  const mid = (from + to) / 2;
  const cols: number[] = [];
  for (let z = from - 6; z > to; z -= 14) cols.push(z);
  return (
    <group>
      <mesh position={[8, 0.525, mid]}>
        <boxGeometry args={[11.4, 1.05, len]} />
        <meshStandardMaterial color={night ? "#3a3c42" : "#F4F5F7"} roughness={0.95} />
      </mesh>
      {/* platform edge face */}
      <mesh position={[2.31, 0.5, mid]}>
        <boxGeometry args={[0.04, 1.0, len]} />
        <meshStandardMaterial color={night ? "#25262a" : "#c9cbd0"} />
      </mesh>
      {/* yellow safety strip */}
      <mesh position={[2.75, 1.06, mid]}>
        <boxGeometry args={[0.8, 0.02, len]} />
        <meshStandardMaterial color={night ? "#8a7a2a" : "#F2C230"} />
      </mesh>
      {/* canopy roof */}
      <mesh position={[8.5, 8.2, mid]}>
        <boxGeometry args={[9, 0.2, len]} />
        <meshStandardMaterial color={night ? "#2a2b30" : "#e8e9ed"} />
      </mesh>
      {/* red fascia beam */}
      <mesh position={[3.9, 7.8, mid]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.35, 1.6, len]} />
        <meshStandardMaterial color="#A3283A" />
      </mesh>
      {cols.map((z) => (
        <group key={z}>
          <mesh position={[8, 4.6, z]}>
            <boxGeometry args={[0.3, 7.2, 0.3]} />
            <meshStandardMaterial color={night ? "#46474d" : "#9a9ca3"} />
          </mesh>
          {/* tube light under canopy */}
          <mesh position={[5.6, 7.6, z + 7]}>
            <boxGeometry args={[0.12, 0.08, 1.6]} />
            <meshStandardMaterial color="#fff6cf" emissive="#fff3c0" emissiveIntensity={night ? 3 : 0.3} />
          </mesh>
          {night ? <pointLight position={[5.6, 7.0, z + 7]} color="#ffe9b0" intensity={18} distance={16} decay={1.4} /> : null}
        </group>
      ))}
      {boards.map((z) => (
        <StationBoard key={z} tex={tex.board} position={[6.2, 5.0, z]} night={night} />
      ))}
    </group>
  );
};

export const StationBoard: React.FC<{ tex: THREE.Texture; position: V3; rotY?: number; night?: boolean; scale?: number }> = ({
  tex,
  position,
  rotY = 0,
  night,
  scale = 1,
}) => (
  <group position={position} rotation={[0, rotY, 0]} scale={scale}>
    <mesh>
      <boxGeometry args={[4.2, 1.5, 0.12]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
    {[1, -1].map((s) => (
      <mesh key={s} position={[0, 0, s * 0.065]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[4.1, 1.44]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={night ? 0.55 : 0.15} />
      </mesh>
    ))}
    {[-1.5, 1.5].map((x) => (
      <mesh key={x} position={[x, 1.6, 0]}>
        <boxGeometry args={[0.08, 1.8, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    ))}
  </group>
);

export const OHE: React.FC<{ x?: number; from?: number; to?: number; night?: boolean }> = ({ x = -3.4, from = 40, to = -220, night }) => {
  const poles: number[] = [];
  for (let z = from; z > to; z -= 36) poles.push(z);
  const c = night ? "#2a2b30" : "#2f3036";
  return (
    <group>
      {poles.map((z) => (
        <group key={z}>
          <mesh position={[x, 4.2, z]}>
            <boxGeometry args={[0.28, 8.4, 0.28]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[x + 1.9, 7.6, z]}>
            <boxGeometry args={[3.8, 0.12, 0.12]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 6.6, (from + to) / 2]}>
        <boxGeometry args={[0.03, 0.03, from - to]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

/* ---------------- rolling stock ---------------- */

const Wheelset: React.FC<{ z: number }> = ({ z }) => (
  <group position={[0, 0, z]}>
    <mesh position={[0, 0.75, 0]}>
      <boxGeometry args={[2.4, 0.45, 2.8]} />
      <meshStandardMaterial color="#26272c" />
    </mesh>
    {[-0.9, 0.9].map((dz) =>
      [-0.84, 0.84].map((dx) => (
        <mesh key={`${dz}${dx}`} position={[dx, 0.48, dz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.46, 0.46, 0.18, 20]} />
          <meshStandardMaterial color="#141417" metalness={0.5} roughness={0.5} />
        </mesh>
      )),
    )}
  </group>
);

export const Coach: React.FC<{
  z: number;
  tex: Tex;
  rear?: "mark" | "plain" | null;
  lamp?: number; // 0..1 lamp brightness, only on rear
  night?: boolean;
  lowDetail?: boolean;
}> = ({ z, tex, rear = null, lamp = 0, night, lowDetail }) => {
  const winZ = useMemo(() => {
    const a: number[] = [];
    for (let i = 0; i < 9; i++) a.push(-7.6 + i * 1.9);
    return a;
  }, []);
  return (
    <group position={[0, 0, z]}>
      {/* body */}
      <mesh position={[0, BODY_BOTTOM + BODY_H / 2, 0]}>
        <boxGeometry args={[3.2, BODY_H, COACH_LEN]} />
        <meshStandardMaterial color={L.maroon} roughness={0.55} metalness={0.15} />
      </mesh>
      {/* roof */}
      <mesh position={[0, BODY_TOP + 0.14, 0]}>
        <boxGeometry args={[2.95, 0.3, COACH_LEN - 0.2]} />
        <meshStandardMaterial color={L.roof} roughness={0.7} />
      </mesh>
      <mesh position={[0, BODY_TOP + 0.34, 0]}>
        <boxGeometry args={[2.2, 0.14, COACH_LEN - 0.6]} />
        <meshStandardMaterial color={L.roof} roughness={0.7} />
      </mesh>
      {/* underframe */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2.7, 0.35, COACH_LEN - 1]} />
        <meshStandardMaterial color={L.under} />
      </mesh>
      <Wheelset z={-7.4} />
      <Wheelset z={7.4} />
      {[1, -1].map((s) => (
        <group key={s}>
          {/* cream stripes */}
          {[2.15, 4.0].map((y) => (
            <mesh key={y} position={[s * 1.605, y, 0]}>
              <boxGeometry args={[0.02, 0.16, COACH_LEN]} />
              <meshStandardMaterial color={L.cream} />
            </mesh>
          ))}
          {/* windows */}
          {!lowDetail &&
            winZ.map((wz) => (
              <mesh key={wz} position={[s * 1.61, 3.15, wz]}>
                <boxGeometry args={[0.02, 1.0, 1.25]} />
                <meshStandardMaterial
                  color={night ? "#e9d9a0" : L.window}
                  emissive={night ? "#ffd98a" : "#000"}
                  emissiveIntensity={night ? 0.7 : 0}
                />
              </mesh>
            ))}
          {/* doors */}
          {[-10.1, 10.1].map((dz) => (
            <mesh key={dz} position={[s * 1.61, 2.6, dz]}>
              <boxGeometry args={[0.02, 2.6, 0.95]} />
              <meshStandardMaterial color={L.maroonDark} />
            </mesh>
          ))}
          {/* branding */}
          <mesh position={[s * 1.62, 1.6, 0.4]} rotation={[0, s * (Math.PI / 2), 0]}>
            <planeGeometry args={[11.5, 0.86]} />
            <meshStandardMaterial map={tex.brand} transparent />
          </mesh>
          {!lowDetail && (
            <mesh position={[s * 1.62, 3.15, s * 8.3]} rotation={[0, s * (Math.PI / 2), 0]}>
              <planeGeometry args={[1.9, 0.82]} />
              <meshStandardMaterial map={tex.coachNo} transparent />
            </mesh>
          )}
        </group>
      ))}
      {/* front gangway */}
      <mesh position={[0, 2.6, -COACH_LEN / 2 - 0.25]}>
        <boxGeometry args={[1.6, 2.6, 0.5]} />
        <meshStandardMaterial color="#1a1a1e" />
      </mesh>
      {rear && (
        <mesh position={[0, BODY_BOTTOM + BODY_H / 2, COACH_LEN / 2 + 0.012]}>
          <planeGeometry args={[3.2, BODY_H]} />
          <meshStandardMaterial map={rear === "mark" ? tex.rear : tex.plain} />
        </mesh>
      )}
      {rear === "mark" && <TailLamp tex={tex} on={lamp} night={night} />}
    </group>
  );
};

export const TailLamp: React.FC<{ tex: Tex; on: number; night?: boolean }> = ({ tex, on, night }) => (
  <group position={[0, LAMP_Y, COACH_LEN / 2 + 0.06]}>
    <mesh>
      <cylinderGeometry args={[0.16, 0.16, 0.1, 24]} />
      <meshStandardMaterial color="#300" />
    </mesh>
    <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.13, 24]} />
      <meshBasicMaterial color={new THREE.Color("#4a0b0f").lerp(new THREE.Color("#ff2a35"), on)} side={THREE.DoubleSide} />
    </mesh>
    {on > 0.01 && (
      <sprite position={[0, 0, 0.2]} scale={night ? [2.1, 2.1, 1] : [0.9, 0.9, 1]}>
        <spriteMaterial map={tex.redGlow} transparent opacity={on * (night ? 0.8 : 0.6)} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    )}
    {night && on > 0.01 && <pointLight color="#ff2a35" intensity={on * 2.2} distance={6} decay={1.5} position={[0, 0, 0.6]} />}
  </group>
);

export const Loco: React.FC<{ z: number; lowDetail?: boolean }> = ({ z }) => (
  <group position={[0, 0, z]}>
    <mesh position={[0, 2.8, 0]}>
      <boxGeometry args={[3.1, 3.6, LOCO_LEN]} />
      <meshStandardMaterial color={L.loco} roughness={0.5} />
    </mesh>
    {[1, -1].map((s) => (
      <mesh key={s} position={[s * 1.56, 2.2, 0]}>
        <boxGeometry args={[0.02, 0.3, LOCO_LEN]} />
        <meshStandardMaterial color="#C8283B" />
      </mesh>
    ))}
    <mesh position={[0, 3.6, -LOCO_LEN / 2 - 0.01]}>
      <boxGeometry args={[2.4, 0.9, 0.04]} />
      <meshStandardMaterial color="#1a2230" emissive="#223" />
    </mesh>
    <mesh position={[0, 0.85, 0]}>
      <boxGeometry args={[2.7, 0.35, LOCO_LEN - 1]} />
      <meshStandardMaterial color={L.under} />
    </mesh>
    <Wheelset z={-6} />
    <Wheelset z={6} />
    <mesh position={[0, 5.0, 2]}>
      <boxGeometry args={[1.2, 0.8, 3]} />
      <meshStandardMaterial color="#3a3d45" />
    </mesh>
  </group>
);

/**
 * A train running towards -z. `rearZ` is the world z of the rear face of the last coach.
 * `detach` splits the train: coaches from index `at` (counted from the rear, 0 = last coach)
 * backwards stay at rearZ, the part in front is pushed forward by `gap` metres.
 */
export const Train: React.FC<{
  rearZ: number;
  coaches: number;
  tex: Tex;
  rear?: "mark" | "plain" | null;
  lamp?: number;
  night?: boolean;
  lowDetail?: boolean;
  detach?: { at: number; gap: number; hideRear?: boolean };
  loco?: boolean;
}> = ({ rearZ, coaches, tex, rear = "mark", lamp = 0, night, lowDetail, detach, loco = true }) => {
  const items: React.ReactNode[] = [];
  let frontZ = 0;
  for (let i = 0; i < coaches; i++) {
    const front = detach && i >= detach.at;
    if (detach?.hideRear && !front) continue;
    const z = rearZ - COACH_LEN / 2 - i * PITCH - (front ? detach!.gap : 0);
    const isLast = i === 0;
    items.push(
      <Coach key={i} z={z} tex={tex} rear={isLast ? rear : null} lamp={isLast ? lamp : 0} night={night} lowDetail={lowDetail} />,
    );
    frontZ = z - COACH_LEN / 2;
  }
  return (
    <group>
      {items}
      {loco && <Loco z={frontZ - 0.6 - LOCO_LEN / 2} lowDetail={lowDetail} />}
    </group>
  );
};

/* ---------------- people & props ---------------- */

/** Station master in white uniform. Faces +z by default. */
export const StationMaster: React.FC<{ position: V3; rotY?: number; scale?: number; flag?: boolean }> = ({
  position,
  rotY = 0,
  scale = 1,
  flag = true,
}) => {
  const white = <meshStandardMaterial color="#F7F7F5" roughness={0.8} />;
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.2, 0.9, 0.24]} />
          {white}
        </mesh>
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`s${x}`} position={[x, 0.04, 0.04]}>
          <boxGeometry args={[0.22, 0.08, 0.34]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0]}>
        <boxGeometry args={[0.52, 0.68, 0.3]} />
        {white}
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[0.54, 0.08, 0.32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={`a${x}`} position={[x, 1.2, 0]}>
          <boxGeometry args={[0.13, 0.62, 0.16]} />
          {white}
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial color="#7A5236" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.2, 0.18, 0.12, 20]} />
        {white}
      </mesh>
      <mesh position={[0, 1.83, 0.1]}>
        <boxGeometry args={[0.32, 0.03, 0.16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {flag && (
        <group position={[0.36, 0.95, 0.05]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
            <meshStandardMaterial color="#5a4a3a" />
          </mesh>
          <mesh position={[0.02, 0.5, 0.14]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.3, 0.22]} />
            <meshStandardMaterial color="#1E8A4C" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const Signal: React.FC<{ position: V3; state: "green" | "red"; tex: Tex; scale?: number }> = ({ position, state, tex, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[0.1, 0.12, 4.4, 10]} />
      <meshStandardMaterial color="#2b2c31" />
    </mesh>
    <mesh position={[0, 4.6, 0]}>
      <boxGeometry args={[0.6, 1.3, 0.4]} />
      <meshStandardMaterial color="#1b1c20" />
    </mesh>
    <mesh position={[0, 4.9, 0.21]}>
      <circleGeometry args={[0.18, 20]} />
      <meshBasicMaterial color={state === "red" ? "#ff3340" : "#401215"} />
    </mesh>
    <mesh position={[0, 4.35, 0.21]}>
      <circleGeometry args={[0.18, 20]} />
      <meshBasicMaterial color={state === "green" ? "#38f07a" : "#0f3018"} />
    </mesh>
    <sprite position={[0, state === "red" ? 4.9 : 4.35, 0.4]} scale={[1.6, 1.6, 1]}>
      <spriteMaterial map={state === "red" ? tex.redGlow : tex.greenGlow} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  </group>
);

export const Hut: React.FC<{ position: V3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[6, 4, 8]} />
      <meshStandardMaterial color="#D9DBE0" />
    </mesh>
    <mesh position={[0, 4.4, 0]} rotation={[0, 0, 0.12]}>
      <boxGeometry args={[7.2, 0.4, 9.4]} />
      <meshStandardMaterial color="#B8BBC2" />
    </mesh>
    <mesh position={[-3.01, 1.4, 1]}>
      <boxGeometry args={[0.02, 2.4, 1.2]} />
      <meshStandardMaterial color="#8d9099" />
    </mesh>
  </group>
);

/** Flat highlight ring, faces +z unless rotated */
export const Ring: React.FC<{
  position: V3;
  r: number;
  progress: number;
  color?: string;
  rot?: V3;
  width?: number;
  billboard?: boolean;
}> = ({ position, r, progress, color = "#2B3FD6", rot = [0, 0, 0], width = 0.07, billboard }) => {
  const camera = useThree((st) => st.camera);
  const ref = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    if (billboard && ref.current) ref.current.quaternion.copy(camera.quaternion);
  });
  if (progress <= 0) return null;
  const s = 0.6 + 0.4 * Math.min(1, progress);
  return (
    <mesh ref={ref} position={position} rotation={rot} scale={[s, s, s]} renderOrder={10}>
      <ringGeometry args={[r - width, r, 64]} />
      <meshBasicMaterial color={color} transparent opacity={Math.min(1, progress)} depthTest={false} />
    </mesh>
  );
};

/** Flat translucent zone on the ground, along the track */
export const Zone: React.FC<{ x?: number; z1: number; z2: number; color: string; opacity: number; width?: number }> = ({
  x = 0,
  z1,
  z2,
  color,
  opacity,
  width = 5,
}) =>
  opacity <= 0 ? null : (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.6, (z1 + z2) / 2]}>
      <planeGeometry args={[width, Math.abs(z2 - z1)]} />
      <meshBasicMaterial color={color} transparent opacity={opacity * 0.45} depthWrite={false} />
    </mesh>
  );

export const Badge: React.FC<{ tex: THREE.Texture; position: V3; size: number; p: number }> = ({ tex, position, size, p }) =>
  p <= 0 ? null : (
    <sprite position={position} scale={[size * p, size * p, 1]}>
      <spriteMaterial map={tex} transparent depthTest={false} />
    </sprite>
  );
