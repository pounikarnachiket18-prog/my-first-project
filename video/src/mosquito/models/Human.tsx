/**
 * Seated human figure (metres). Built for low-key night lighting where the
 * form reads through rim light and silhouette, documentary-reconstruction
 * style. Skin uses the same subsurface wrap shader as the macro skin.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useTick } from "../core/Stage";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { taperedTube, latheSegment, v3 } from "../core/geo";
import { addSubsurface } from "./Skin";
import { fbm1 } from "../core/anim";

export type PersonLook = {
  tone: string;
  shirt: string;
  pants: string;
  hair: string;
  longHair?: boolean;
  sleeve?: "short" | "long";
  /** Holding a phone in the lap: screen glow lights the face from below. */
  phone?: boolean;
  lean?: number;
  headTurn?: number;
  headTilt?: number;
  seed?: number;
};

export function buildPerson(look: PersonLook) {
  const root = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: look.tone, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color("#ffd8c0"), clearcoat: 0.05 });
  addSubsurface(skin, new THREE.Color(0.9, 0.3, 0.2), 0.35);
  const shirt = new THREE.MeshPhysicalMaterial({ color: look.shirt, roughness: 0.9, sheen: 0.25, sheenColor: new THREE.Color("#556070"), sheenRoughness: 0.8 });
  const pants = new THREE.MeshPhysicalMaterial({ color: look.pants, roughness: 0.9, sheen: 0.5, sheenColor: new THREE.Color("#556") });
  const hair = new THREE.MeshPhysicalMaterial({ color: look.hair, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color("#6a5a50"), sheenRoughness: 0.35 });

  const slipper = new THREE.MeshPhysicalMaterial({ color: "#1d1b1a", roughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color("#665") });
  const body = new THREE.Group();
  root.add(body);
  // Pelvis
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), pants);
  pelvis.scale.set(0.17, 0.11, 0.15);
  pelvis.position.set(0, 0.56, -0.02);
  body.add(pelvis);
  // Torso (lathe) — waist to shoulders
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.6, -0.03);
  torsoPivot.rotation.x = look.lean ?? -0.08;
  body.add(torsoPivot);
  const torsoGeo = latheSegment(0.46, (v) => {
    const waist = 0.135, chest = 0.165, shoulder = 0.175;
    if (v < 0.5) return THREE.MathUtils.lerp(waist, chest, Math.sin((v / 0.5) * Math.PI * 0.5));
    if (v < 0.86) return THREE.MathUtils.lerp(chest, shoulder, (v - 0.5) / 0.36);
    return shoulder * Math.sqrt(Math.max(0, 1 - ((v - 0.86) / 0.14) ** 2)) * 0.9 + 0.03;
  }, 40, 18);
  const torso = new THREE.Mesh(torsoGeo, shirt);
  torso.scale.set(1.08, 1, 0.68);
  torsoPivot.add(torso);
  // Neck + head
  const neck = new THREE.Mesh(taperedTube([v3(0, 0.43, 0), v3(0, 0.53, 0.01)], 0.052, 0.048, 4, 14), skin);
  torsoPivot.add(neck);
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.53, 0.01);
  torsoPivot.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skin);
  head.scale.set(0.088, 0.112, 0.1);
  head.position.set(0, 0.1, 0.01);
  headPivot.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
  jaw.scale.set(0.07, 0.06, 0.075);
  jaw.position.set(0, 0.04, 0.03);
  headPivot.add(jaw);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
  nose.scale.set(0.015, 0.022, 0.02);
  nose.position.set(0, 0.09, 0.105);
  headPivot.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
    ear.scale.set(0.012, 0.03, 0.02);
    ear.position.set(s * 0.088, 0.1, 0.0);
    headPivot.add(ear);
  }
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
  hairCap.scale.set(0.095, 0.12, 0.108);
  hairCap.position.set(0, 0.112, -0.006);
  hairCap.rotation.x = -0.25;
  headPivot.add(hairCap);
  if (look.longHair) {
    const back = new THREE.Mesh(taperedTube([v3(0, 0.16, -0.06), v3(0, 0.0, -0.1), v3(0, -0.14, -0.09)], 0.085, 0.07, 10, 18), hair);
    back.scale.set(1.1, 1, 0.7);
    headPivot.add(back);
  }
  headPivot.rotation.y = look.headTurn ?? 0;
  headPivot.rotation.x = look.headTilt ?? 0.1;

  // Arms: shoulder → elbow → wrist; forearms rest on thighs
  const arms: { pivot: THREE.Group; s: number }[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.19, 0.4, 0);
    torsoPivot.add(pivot);
    const sh = v3(0, 0, 0), el = v3(s * 0.035, -0.27, 0.06), wr = v3(-s * 0.04, -0.3, 0.32);
    const upperMat = look.sleeve === "long" ? shirt : shirt;
    pivot.add(new THREE.Mesh(taperedTube([sh, sh.clone().lerp(el, 0.5), el], 0.055, 0.043, 10, 14), upperMat));
    if (look.sleeve === "short") {
      // bare forearm from elbow
      pivot.add(new THREE.Mesh(taperedTube([el, el.clone().lerp(wr, 0.5).add(v3(0, 0.01, 0)), wr], 0.038, 0.029, 12, 14), skin));
      const sleeve = new THREE.Mesh(taperedTube([sh, sh.clone().lerp(el, 0.55)], 0.062, 0.052, 6, 14), shirt);
      pivot.add(sleeve);
    } else {
      pivot.add(new THREE.Mesh(taperedTube([el, el.clone().lerp(wr, 0.5), wr], 0.041, 0.033, 12, 14), shirt));
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    hand.scale.set(0.035, 0.022, 0.06);
    hand.position.copy(wr).add(v3(0, -0.01, 0.06));
    pivot.add(hand);
    arms.push({ pivot, s });
  }
  // Legs: seated — thighs forward, shins down
  for (const s of [-1, 1]) {
    const hip = v3(s * 0.09, 0.53, 0.0), knee = v3(s * 0.11, 0.55, 0.46), ankle = v3(s * 0.12, 0.08, 0.52);
    body.add(new THREE.Mesh(taperedTube([hip, hip.clone().lerp(knee, 0.5).add(v3(0, 0.02, 0)), knee], 0.085, 0.06, 12, 16), pants));
    body.add(new THREE.Mesh(taperedTube([knee, knee.clone().lerp(ankle, 0.5), ankle], 0.058, 0.042, 12, 16), pants));
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.06, 0.24, 3, 0.028), slipper);
    foot.position.set(ankle.x, 0.032, ankle.z + 0.05);
    foot.rotation.y = s * 0.12;
    body.add(foot);
  }
  let phoneLight: THREE.PointLight | null = null;
  if (look.phone) {
    const phone = new THREE.Group();
    phone.position.set(0, 0.66, 0.36);
    phone.rotation.x = -1.0;
    const caseM = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.155, 0.009, 2, 0.008), new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.4 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: new THREE.Color("#cfe2ff").multiplyScalar(1.6) }));
    screen.position.z = 0.0052;
    phone.add(caseM, screen);
    phoneLight = new THREE.PointLight("#bcd4ff", 0.35, 0.9, 2);
    phoneLight.position.set(0, 0.02, 0.06);
    phone.add(phoneLight);
    body.add(phone);
  }
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const seed = look.seed ?? 1;
  const baseTurn = look.headTurn ?? 0;
  const baseTilt = look.headTilt ?? 0.1;
  const pose = (t: number) => {
    const br = Math.sin(t * 1.6 + seed) * 0.5 + 0.5; // breathing ~0.25 Hz
    torso.scale.set(1.08 + br * 0.008, 1, 0.68 + br * 0.012);
    headPivot.rotation.y = baseTurn + fbm1(t * 0.25, seed) * 0.12;
    headPivot.rotation.x = baseTilt + fbm1(t * 0.3, seed + 4) * 0.05;
    if (phoneLight) phoneLight.intensity = 0.32 + 0.04 * Math.sin(t * 0.7 + seed);
  };
  /** forearm anchor (world-space later via localToWorld) */
  const forearmAnchor = (s: 1 | -1) => {
    const a = arms.find((x) => x.s === s)!;
    return { obj: a.pivot, local: v3(-s * 0.0, -0.29, 0.2) };
  };
  return { root, pose, arms, forearmAnchor, headPivot };
}

export const Person: React.FC<{ look: PersonLook; position: [number, number, number]; rotationY?: number; anim?: (t: number, g: THREE.Group) => void }> = ({
  look,
  position,
  rotationY = 0,
  anim,
}) => {
  const p = useMemo(() => buildPerson(look), [look]);
  useTick((t) => {
    p.pose(t);
    anim?.(t, p.root);
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={p.root} />
    </group>
  );
};
