import React, { useMemo } from "react";
import * as THREE from "three";
import { useTextures } from "./useTex";
import { atmoFrag, atmoVert, cloudFrag, surfaceFrag, surfaceVert } from "./shaders";

export type EarthLook = {
  sunI?: number;
  exposure?: number;
  nightStrength?: number;
  heat?: number;
  frost?: number;
  cloudAmt?: number;
  storm?: number;
  atmo?: number;
  mie?: number;
  saturation?: number;
  tint?: [number, number, number];
};

export type EarthProps = {
  /** spin of the solid surface about the axis, radians (positive = eastward, like the real Earth) */
  spin: number;
  /** spin of the cloud layer (atmosphere). Equal to `spin` when the air co-rotates. */
  cloudSpin?: number;
  /** direction TO the sun, world space */
  sunDir: THREE.Vector3;
  tiltDeg?: number;
  /** extra yaw of the whole tilted globe (positions the axis in the scene) */
  yaw?: number;
  radius?: number;
  position?: [number, number, number];
  time?: number;
  look?: EarthLook;
  children?: React.ReactNode; // anything that should spin with the surface (markers, equator line)
};

const TEX = [
  { file: "earth/textures/earth-blue-marble.jpg" },
  { file: "earth/textures/earth-night.jpg" },
  { file: "earth/textures/earth-water.png", srgb: false },
  { file: "earth/textures/earth-topology.png", srgb: false },
  { file: "earth/textures/clouds-alpha.jpg", srgb: false },
];

export const EarthGlobe: React.FC<EarthProps> = ({
  spin, cloudSpin, sunDir, tiltDeg = 23.44, yaw = 0, radius = 1, position = [0, 0, 0], time = 0, look = {}, children,
}) => {
  const tex = useTextures(TEX);
  const cs = cloudSpin ?? spin;
  const L = look;
  const uni = useMemo(
    () => ({
      surface: {
        dayTex: { value: null as THREE.Texture | null }, nightTex: { value: null as THREE.Texture | null }, waterTex: { value: null as THREE.Texture | null },
        topoTex: { value: null as THREE.Texture | null }, cloudTex: { value: null as THREE.Texture | null }, sunDir: { value: new THREE.Vector3() },
        sunI: { value: 1 }, exposure: { value: 1 }, nightStrength: { value: 1 }, heat: { value: 0 }, frost: { value: 0 },
        cloudU: { value: 0 }, cloudAmt: { value: 1 }, bumpK: { value: 1.2 }, saturation: { value: 1.1 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
      },
      cloud: {
        cloudTex: { value: null as THREE.Texture | null }, sunDir: { value: new THREE.Vector3() }, sunI: { value: 1 },
        exposure: { value: 1 }, cloudAmt: { value: 1 }, storm: { value: 0 }, time: { value: 0 }, dark: { value: 0 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
      },
      atmo: {
        center: { value: new THREE.Vector3() }, sunDir: { value: new THREE.Vector3() }, Re: { value: 1 }, Ra: { value: 1.06 },
        sunI: { value: 1 }, exposure: { value: 1 }, strength: { value: 1 }, mie: { value: 0.6 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
      },
    }),
    [],
  );
  const [day, night, water, topo, clouds] = tex;
  const tint = new THREE.Vector3(...(L.tint ?? [1, 1, 1]));
  Object.assign(uni.surface, {});
  uni.surface.dayTex.value = day; uni.surface.nightTex.value = night; uni.surface.waterTex.value = water;
  uni.surface.topoTex.value = topo; uni.surface.cloudTex.value = clouds;
  uni.surface.sunDir.value.copy(sunDir).normalize();
  uni.surface.sunI.value = L.sunI ?? 2.6;
  uni.surface.exposure.value = L.exposure ?? 1;
  uni.surface.nightStrength.value = L.nightStrength ?? 1.6;
  uni.surface.heat.value = L.heat ?? 0;
  uni.surface.frost.value = L.frost ?? 0;
  uni.surface.cloudAmt.value = L.cloudAmt ?? 1;
  uni.surface.saturation.value = L.saturation ?? 1.12;
  uni.surface.cloudU.value = -(cs - spin) / (Math.PI * 2);
  uni.surface.tint.value.copy(tint);
  uni.cloud.cloudTex.value = clouds;
  uni.cloud.sunDir.value.copy(sunDir).normalize();
  uni.cloud.sunI.value = L.sunI ?? 2.6;
  uni.cloud.exposure.value = L.exposure ?? 1;
  uni.cloud.cloudAmt.value = L.cloudAmt ?? 1;
  uni.cloud.storm.value = L.storm ?? 0;
  uni.cloud.time.value = time;
  uni.cloud.tint.value.copy(tint);
  uni.atmo.center.value.set(...position);
  uni.atmo.sunDir.value.copy(sunDir).normalize();
  uni.atmo.Re.value = radius * 0.998;
  uni.atmo.Ra.value = radius * 1.075;
  uni.atmo.sunI.value = L.sunI ?? 2.6;
  uni.atmo.exposure.value = L.exposure ?? 1;
  uni.atmo.strength.value = L.atmo ?? 1;
  uni.atmo.mie.value = L.mie ?? 0.6;
  uni.atmo.tint.value.copy(tint);

  const tilt = (tiltDeg * Math.PI) / 180;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, -tilt]}>
        <mesh rotation={[0, spin, 0]} scale={radius}>
          <sphereGeometry args={[1, 256, 128]} />
          <shaderMaterial vertexShader={surfaceVert} fragmentShader={surfaceFrag} uniforms={uni.surface} />
          {children}
        </mesh>
        <mesh rotation={[0, cs, 0]} scale={radius * 1.007}>
          <sphereGeometry args={[1, 192, 96]} />
          <shaderMaterial vertexShader={surfaceVert} fragmentShader={cloudFrag} uniforms={uni.cloud} transparent depthWrite={false} />
        </mesh>
        <mesh scale={radius * 1.075}>
          <sphereGeometry args={[1, 128, 64]} />
          <shaderMaterial
            vertexShader={atmoVert}
            fragmentShader={atmoFrag}
            uniforms={uni.atmo}
            side={THREE.BackSide}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

/** Local (un-spun) unit-sphere position of a latitude/longitude, matching three's SphereGeometry UVs. */
export const latLon = (lat: number, lon: number, r = 1): [number, number, number] => {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const th = ((90 - lat) * Math.PI) / 180;
  return [-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r];
};
