/**
 * Macro human skin patch (units: millimetres).
 * - Geometry displaced by the same height field that bakes the normal map:
 *   dermatoglyphic furrows, cell plateaus, pores.
 * - Material: PBR with melanin/haemoglobin albedo variation, roughness map,
 *   thin sebum clearcoat, and a wrap-lighting subsurface term (reddish light
 *   bleeding past the terminator, like real skin).
 * - Sweat droplets: transmissive water (IOR 1.33) sitting on pore openings,
 *   swelling slowly over time.
 * - Vellus hairs emerging at a shallow angle.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useTick } from "../core/Stage";
import { skinField, skinMaps } from "../core/textures";
import { rng, smoothstep } from "../core/anim";

export type SkinProps = {
  size?: number;
  seed?: number;
  tone?: string;
  segments?: number;
  droplets?: number;
  hairs?: number;
  /** 0..1 how much the sweat droplets have grown (by time) */
  sweat?: (t: number) => number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  warmth?: (t: number) => number; // extra emissive warmth for "body heat"
};

export function addSubsurface(mat: THREE.MeshPhysicalMaterial, scatter = new THREE.Color(0.85, 0.35, 0.24), amount = 0.22) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uScatter = { value: scatter };
    shader.uniforms.uScatterAmt = { value: amount };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uScatter; uniform float uScatterAmt;")
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
for (int si = 0; si < NUM_DIR_LIGHTS; si++) {
  vec3 Ls = directionalLights[si].direction;
  float ndl = dot(geometryNormal, Ls);
  float wrap = max(0.0, (ndl + 0.6) / 1.6) - max(0.0, ndl) * 0.6;
  reflectedLight.directDiffuse += diffuseColor.rgb * uScatter * wrap * directionalLights[si].color * uScatterAmt;
}
#endif`,
      );
  };
  mat.customProgramCacheKey = () => "sss";
}

export const Skin: React.FC<SkinProps> = ({
  size = 8,
  seed = 5,
  tone = "#80583f",
  segments = 300,
  droplets = 26,
  hairs = 40,
  sweat,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  warmth,
}) => {
  const built = useMemo(() => {
    const maps = skinMaps(size, seed, tone);
    const f = skinField(size, seed);
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    geo.translate(size / 2, 0, size / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, f.height(x, size - z));
    }
    geo.computeVertexNormals();
    // UVs: x → u, z → 1-v (match texture orientation used when baking)
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / size, 1 - p.getZ(i) / size);
    const mat = new THREE.MeshPhysicalMaterial({
      map: maps.albedo,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: maps.roughness,
      roughness: 1,
      clearcoat: 0.04,
      clearcoatRoughness: 0.5,
      sheen: 0.2,
      sheenColor: new THREE.Color("#ffd0b0"),
      sheenRoughness: 0.6,
      emissive: new THREE.Color("#ff5a1f"),
      emissiveIntensity: 0,
    });
    addSubsurface(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    const group = new THREE.Group();
    group.add(mesh);

    const r = rng(seed * 31 + 7);
    // Sweat droplets at pore openings
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transmission: 1,
      thickness: 0.15,
      ior: 1.33,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.4,
      attenuationColor: new THREE.Color("#fff6ea"),
      attenuationDistance: 2,
    });
    const dropGeo = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const drops: { m: THREE.Mesh; r: number; delay: number; x: number; z: number; y: number }[] = [];
    const pores = [...f.pores].sort(() => r() - 0.5).slice(0, droplets);
    for (const po of pores) {
      const rad = 0.035 + r() * 0.075;
      const m = new THREE.Mesh(dropGeo, dropMat);
      const x = po.x, z = size - po.y;
      const y = f.height(po.x, po.y);
      m.position.set(x, y - rad * 0.32, z);
      m.scale.set(rad, rad * 0.75, rad);
      m.castShadow = false;
      m.receiveShadow = true;
      group.add(m);
      drops.push({ m, r: rad, delay: r() * 0.5, x, z, y });
    }
    // Vellus hairs
    const hairMat = new THREE.MeshPhysicalMaterial({ color: "#2a1a12", roughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color("#a07050"), transparent: true, opacity: 0.85 });
    const hairGeo = new THREE.CylinderGeometry(0.004, 0.016, 1, 6, 6);
    hairGeo.translate(0, 0.5, 0);
    // gentle curve
    const hp = hairGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i);
      hp.setX(i, hp.getX(i) + 0.12 * y * y);
    }
    hairGeo.computeVertexNormals();
    const inst = new THREE.InstancedMesh(hairGeo, hairMat, hairs);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < hairs; i++) {
      const x = 0.3 + r() * (size - 0.6), zz = 0.3 + r() * (size - 0.6);
      const y = f.height(x, size - zz);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95 + r() * 0.3, r() * 0.6 - 0.3 + 0.4, 0));
      const len = 0.6 + r() * 0.9;
      m4.compose(new THREE.Vector3(x, y - 0.01, zz), q, new THREE.Vector3(1, len, 1));
      inst.setMatrixAt(i, m4);
    }
    inst.castShadow = true;
    group.add(inst);
    return { group, drops, mat, field: f };
  }, [size, seed, tone, segments, droplets, hairs]);

  useTick((t) => {
    const s = sweat ? sweat(t) : 1;
    for (const d of built.drops) {
      const g = smoothstep(d.delay, d.delay + 0.5, s);
      const rr = Math.max(0.0001, d.r * g);
      d.m.scale.set(rr, rr * 0.75, rr);
      d.m.position.y = d.y - rr * 0.32;
      d.m.visible = g > 0.01;
    }
    built.mat.emissiveIntensity = warmth ? warmth(t) * 0.25 : 0;
  });

  return (
    <group position={position} rotation={rotation}>
      <primitive object={built.group} />
    </group>
  );
};
