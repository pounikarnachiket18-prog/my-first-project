import React, { useMemo } from "react";
import * as THREE from "three";
import { COLOR, V3 } from "../theme";
import { Pilot, Seat } from "./Pilot";

/** World position of the front face of the VCD box — used by cameras and overlays. */
export const VCD_POS: V3 = [-0.1, 1.08, -1.53];
export const LP_SEAT: V3 = [-0.45, 0, -0.42];
export const ALP_SEAT: V3 = [0.95, 0, -0.42];
/** Approximate head centre of a pilot sitting upright in the LP seat. */
export const LP_HEAD: V3 = [LP_SEAT[0], 1.42, LP_SEAT[2] + 0.03];

const useLabel = (text: string, color: string) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "bold 84px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);

const Label: React.FC<{ text: string; position: V3; width?: number; color?: string }> = ({ text, position, width = 0.12, color = "#f2efe8" }) => {
  const map = useLabel(text, color);
  return (
    <mesh position={position}>
      <planeGeometry args={[width, width / 2]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} />
    </mesh>
  );
};

/**
 * The Vigilance Control Device box: ACK push button, VCD lamp, warning stripes.
 *  lamp   0..1   lamp brightness
 *  lampColor     colour of the lit lamp
 *  press  0..1   ACK button pushed in
 */
export const VcdPanel: React.FC<{ lamp?: number; lampColor?: string; press?: number }> = ({ lamp = 0, lampColor = "#fff3c4", press = 0 }) => {
  const lampCol = useMemo(() => new THREE.Color("#b8902e").lerp(new THREE.Color(lampColor), lamp), [lamp, lampColor]);
  return (
    <group position={[VCD_POS[0], VCD_POS[1], VCD_POS[2] - 0.05]}>
      <mesh castShadow>
        <boxGeometry args={[0.44, 0.34, 0.1]} />
        <meshStandardMaterial color="#3b3d42" roughness={0.6} />
      </mesh>
      {/* ACK button */}
      <mesh position={[-0.1, 0.01, 0.07 - press * 0.03]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.078, 0.078, 0.06, 32]} />
        <meshStandardMaterial color="#d6a93c" roughness={0.45} />
      </mesh>
      <mesh position={[-0.1, 0.01, 0.052]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.095, 0.095, 0.01, 32]} />
        <meshStandardMaterial color="#26272b" />
      </mesh>
      <Label text="ACK" position={[-0.1, 0.125, 0.052]} width={0.12} />
      {/* VCD lamp */}
      <mesh position={[0.11, 0.045, 0.065]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.062, 0.062, 0.03, 32]} />
        <meshStandardMaterial color={lampCol} emissive={lampCol} emissiveIntensity={0.2 + lamp * 1.4} toneMapped={lamp < 0.05} />
      </mesh>
      <Label text="VCD" position={[0.11, 0.135, 0.052]} width={0.12} />
      {/* warning stripes */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0.11, -0.055 - i * 0.022, 0.052]}>
          <boxGeometry args={[0.12, 0.012, 0.004]} />
          <meshBasicMaterial color="#f6b2b5" toneMapped={false} />
        </mesh>
      ))}
      {lamp > 0.05 ? (
        <pointLight position={[0.11, 0.05, 0.25]} color={lampColor} intensity={lamp * 1.6} distance={1.4} decay={0} />
      ) : null}
    </group>
  );
};

const Bars: React.FC<{ x0: number; x1: number; y0: number; y1: number; z: number; step?: number }> = ({ x0, x1, y0, y1, z, step = 0.11 }) => {
  const xs: number[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) xs.push(x);
  return (
    <group>
      {xs.map((x) => (
        <mesh key={x} position={[x, (y0 + y1) / 2, z]}>
          <boxGeometry args={[0.025, y1 - y0, 0.025]} />
          <meshStandardMaterial color="#1e1f23" />
        </mesh>
      ))}
    </group>
  );
};

const Wall: React.FC<{ position: V3; rotation: V3; size: [number, number]; color?: string }> = ({ position, rotation, size, color = COLOR.wall }) => (
  <mesh position={position} rotation={rotation} receiveShadow>
    <planeGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.95} />
  </mesh>
);

/**
 * Locomotive driver's cab, facing -Z. Floor at y=0, width 3.2, depth 3.6, height 2.4.
 * The back wall is optional so wide cameras can sit behind the room.
 */
export const Cab: React.FC<{
  backWall?: boolean;
  lever?: number; // 0..1 throttle lever throw
  brake?: number; // 0..1 brake handle throw
  lamp?: number;
  lampColor?: string;
  press?: number;
  lightLevel?: number;
  children?: React.ReactNode;
}> = ({ backWall = false, lever = 0, brake = 0, lamp = 0, lampColor, press = 0, lightLevel = 1, children }) => {
  const W = 3.2;
  const D = 3.6;
  const H = 2.4;
  return (
    <group>
      <ambientLight intensity={0.95 * lightLevel} color="#fbf7f0" />
      <hemisphereLight args={["#ffffff", "#9a968e", 0.45 * lightLevel]} />
      <directionalLight
        position={[1.8, 4.5, 3]}
        intensity={1.25 * lightLevel}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />

      {/* shell */}
      <Wall position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[W, D]} color="#cfccc5" />
      <Wall position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} size={[W, D]} />
      <Wall position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, H]} />
      <Wall position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} size={[D, H]} />
      {backWall ? <Wall position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} size={[W, H]} /> : null}

      {/* front wall with the big windscreen: window spans x -0.95..1.4, y 1.3..2.15 */}
      <group position={[0, 0, -D / 2]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[W, 1.3, 0.06]} />
          <meshStandardMaterial color={COLOR.wall} />
        </mesh>
        <mesh position={[0, 2.275, 0]}>
          <boxGeometry args={[W, 0.25, 0.06]} />
          <meshStandardMaterial color={COLOR.wall} />
        </mesh>
        <mesh position={[-1.275, 1.725, 0]}>
          <boxGeometry args={[0.65, 0.85, 0.06]} />
          <meshStandardMaterial color={COLOR.wall} />
        </mesh>
        <mesh position={[1.5, 1.725, 0]}>
          <boxGeometry args={[0.2, 0.85, 0.06]} />
          <meshStandardMaterial color={COLOR.wall} />
        </mesh>
        <mesh position={[0.2, 1.725, -0.25]}>
          <planeGeometry args={[3, 1.4]} />
          <meshBasicMaterial color={COLOR.windowNight} />
        </mesh>
        <Bars x0={-0.9} x1={-0.25} y0={1.3} y1={2.15} z={0} />
        <Bars x0={0.75} x1={1.38} y0={1.3} y1={2.15} z={0} />
      </group>

      {/* side window on the left wall */}
      <group position={[-W / 2 + 0.01, 1.62, -0.75]}>
        <mesh rotation-y={Math.PI / 2}>
          <planeGeometry args={[1.0, 0.8]} />
          <meshBasicMaterial color={COLOR.windowNight} />
        </mesh>
        {[-0.4, -0.27, -0.14, -0.01, 0.12, 0.25, 0.38].map((z) => (
          <mesh key={z} position={[0.02, 0, z]}>
            <boxGeometry args={[0.025, 0.8, 0.03]} />
            <meshStandardMaterial color="#1e1f23" />
          </mesh>
        ))}
      </group>

      {/* fan */}
      <group position={[-1.2, 1.78, -D / 2 + 0.06]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.27, 0.27, 0.05, 40]} />
          <meshStandardMaterial color="#f4f3f0" roughness={0.6} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <mesh key={i} position={[0, 0, 0.03]} rotation-z={(i * Math.PI) / 8}>
            <boxGeometry args={[0.5, 0.006, 0.004]} />
            <meshStandardMaterial color="#c9c7c1" />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.04]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 20]} />
          <meshStandardMaterial color="#bdbab3" />
        </mesh>
      </group>

      {/* ceiling light */}
      <mesh position={[0, H - 0.02, 0.3]}>
        <boxGeometry args={[0.9, 0.03, 0.45]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {/* desk */}
      <mesh position={[0, 0.43, -1.46]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 0.86, 0.68]} />
        <meshStandardMaterial color={COLOR.console} roughness={0.85} />
      </mesh>
      {/* vents on the desk front */}
      {new Array(9).fill(0).map((_, i) => (
        <mesh key={i} position={[0.42, 0.2 + i * 0.05, -1.115]}>
          <boxGeometry args={[0.38, 0.022, 0.01]} />
          <meshStandardMaterial color="#1f2024" />
        </mesh>
      ))}
      {/* instrument panel */}
      <mesh position={[0, 1.08, -1.7]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 0.46, 0.18]} />
        <meshStandardMaterial color="#e1ded7" roughness={0.85} />
      </mesh>
      {/* gauges */}
      {[-1.28, -1.02, -0.76].map((x) => (
        <group key={x} position={[x, 1.03, -1.6]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.105, 0.105, 0.04, 32]} />
            <meshStandardMaterial color="#2e3035" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.022]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.085, 0.085, 0.005, 32]} />
            <meshStandardMaterial color="#3d4046" roughness={0.3} />
          </mesh>
        </group>
      ))}
      <VcdPanel lamp={lamp} lampColor={lampColor} press={press} />
      {/* clock */}
      <group position={[0.4, 1.12, -1.6]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.1, 0.1, 0.03, 32]} />
          <meshStandardMaterial color="#f7f6f2" />
        </mesh>
        <mesh position={[0, 0.03, 0.02]}>
          <boxGeometry args={[0.008, 0.065, 0.004]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.02, 0, 0.02]} rotation-z={-1.2}>
          <boxGeometry args={[0.008, 0.05, 0.004]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
      {/* teal auxiliary box */}
      <group position={[1.05, 0.98, -1.52]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.34, 0.12]} />
          <meshStandardMaterial color="#a6d8cb" roughness={0.6} />
        </mesh>
        {[-0.18, -0.06, 0.06, 0.18].flatMap((x) =>
          [-0.06, 0.06].map((y) => (
            <mesh key={`${x}${y}`} position={[x, y, 0.065]}>
              <circleGeometry args={[0.022, 16]} />
              <meshBasicMaterial color="#e9c46a" />
            </mesh>
          )),
        )}
      </group>
      {/* indicator buttons on the desk top */}
      {[0.0, 0.14, 0.28, 0.42, 0.56].map((x, i) => (
        <group key={x} position={[x, 0.875, -1.42]}>
          <mesh>
            <boxGeometry args={[0.1, 0.03, 0.08]} />
            <meshStandardMaterial color="#55585e" />
          </mesh>
          <mesh position={[0, 0.017, 0.02]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.012, 12]} />
            <meshBasicMaterial color={["#f4a3a8", "#a8e6cf", "#e9c46a", "#a8e6cf", "#f4a3a8"][i]} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* throttle + brake handles */}
      {[
        { x: -0.62, t: lever },
        { x: -0.42, t: brake },
      ].map(({ x, t }) => (
        <group key={x} position={[x, 0.86, -1.26]} rotation-x={0.55 - t * 0.9}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.24, 8]} />
            <meshStandardMaterial color="#2a2b2f" />
          </mesh>
          <mesh position={[0, 0.25, 0]} rotation-z={Math.PI / 2}>
            <capsuleGeometry args={[0.026, 0.07, 4, 10]} />
            <meshStandardMaterial color="#e04a3a" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* small handle pod on the right of the desk */}
      <mesh position={[0.95, 0.9, -1.3]}>
        <cylinderGeometry args={[0.16, 0.18, 0.05, 28]} />
        <meshStandardMaterial color="#c3c0b9" />
      </mesh>

      <Seat position={LP_SEAT} />
      {children}
    </group>
  );
};

export { Pilot, Seat };
