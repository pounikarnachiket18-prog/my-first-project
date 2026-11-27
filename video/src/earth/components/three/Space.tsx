import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { random } from "remotion";
import { useTextures } from "./useTex";
import { basicVert, starFrag, sunFrag } from "./shaders";

/** Milky-way background sphere + crisp point stars. */
export const Starfield: React.FC<{ brightness?: number; count?: number }> = ({ brightness = 0.55, count = 5000 }) => {
  const tex = useTextures(STAR_TEX);
  const uni = useMemo(() => ({ skyTex: { value: null as THREE.Texture | null }, brightness: { value: 1 } }), []);
  const pts = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = random(`su${i}`) * 2 - 1;
      const t = random(`st${i}`) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(t) * 900, u * 900, s * Math.sin(t) * 900], i * 3);
      const temp = random(`sc${i}`);
      const b = Math.pow(random(`sb${i}`), 5) * 1.6 + 0.08;
      const c = temp < 0.2 ? [1, 0.82, 0.62] : temp > 0.8 ? [0.7, 0.82, 1] : [1, 1, 1];
      col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  uni.skyTex.value = tex[0];
  uni.brightness.value = brightness;
  return (
    <group>
      <mesh scale={950}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial vertexShader={basicVert} fragmentShader={starFrag} uniforms={uni} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <points geometry={pts}>
        <pointsMaterial size={2.2} sizeAttenuation={false} vertexColors transparent opacity={Math.min(1, brightness * 1.6)} depthWrite={false} />
      </points>
    </group>
  );
};
const STAR_TEX = [{ file: "earth/textures/night-sky.png" }];

/** Camera-facing sun billboard with corona and soft rays. */
export const SunSprite: React.FC<{ position: THREE.Vector3; size: number; intensity?: number; time?: number; color?: [number, number, number] }> = ({
  position, size, intensity = 1, time = 0, color = [1, 0.8, 0.55],
}) => {
  const { camera } = useThree();
  const uni = useMemo(() => ({ intensity: { value: 1 }, time: { value: 0 }, color: { value: new THREE.Vector3() } }), []);
  uni.intensity.value = intensity;
  uni.time.value = time;
  uni.color.value.set(...color);
  const q = camera.quaternion.clone();
  return (
    <mesh position={position} quaternion={q} scale={size}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={basicVert} fragmentShader={sunFrag} uniforms={uni} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
};

/** Sets the R3F camera every frame from plain values (deterministic, scrub-safe). */
export const CameraRig: React.FC<{ position: THREE.Vector3; target: THREE.Vector3; fov: number; roll?: number }> = ({
  position, target, fov, roll = 0,
}) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(position);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(target);
  if (cam.fov !== fov) {
    cam.fov = fov;
  }
  cam.near = 0.01;
  cam.far = 3000;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return null;
};

/** Glowing great-circle ring (equator / orbit), optionally drawn progressively. */
export const GlowRing: React.FC<{
  radius: number; progress?: number; color?: string; width?: number; opacity?: number; dashed?: boolean; segments?: number;
}> = ({ radius, progress = 1, color = "#ffcf5a", width = 0.012, opacity = 1, segments = 512 }) => {
  const geo = useMemo(() => new THREE.TorusGeometry(radius, width, 12, segments, Math.PI * 2 * Math.max(0.0001, progress)), [radius, width, segments, progress]);
  return (
    <group>
      <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, width * 4, 8, segments, Math.PI * 2 * Math.max(0.0001, progress)]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.18} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};
