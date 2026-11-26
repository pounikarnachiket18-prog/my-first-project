/**
 * Procedural female Aedes aegypti (the species used in the 2022 Cell study).
 *
 * Anatomy (body frame: +Z forward, +Y dorsal, +X right; total length ≈ 1.0):
 *  head with two compound eyes, proboscis + labella, short white-tipped
 *  maxillary palps (where CO₂-sensing capitate-peg sensilla sit), two
 *  antennae (pedicel/Johnston's organ + flagellum with 13 whorls of setae),
 *  thorax with the lyre-shaped scutum pattern, scutellum, two wings with
 *  scaled venation, two halteres, six legs (coxa, femur, tibia, five
 *  tarsomeres with white basal bands), eight-segment abdomen with cerci.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useTick } from "../core/Stage";
import { taperedTube, latheSegment, v3, alignY } from "../core/geo";
import { eyeNormalMap, wingMap, thoraxMap, scaleNormalMap, abdomenMap } from "../core/textures";
import { rng, fbm1 } from "../core/anim";

export type MosquitoAnim = {
  /** Wing-beat phase in cycles. Real female Aedes ≈ 600–700 beats/s. */
  wingPhase?: (t: number) => number;
  /** 0 = crisp single wing (slow motion), 1 = motion-blurred stroke fan. */
  wingBlur?: (t: number) => number;
  /** Emissive glow on sensory organs (scientific visualisation). */
  palpGlow?: (t: number) => number;
  antennaGlow?: (t: number) => number;
  seed?: number;
};

const GHOSTS = 9;
const STROKE_AMP = THREE.MathUtils.degToRad(21); // ~42° total: mosquitoes have unusually small stroke amplitude
const STROKE_MEAN = THREE.MathUtils.degToRad(-28); // swept back
const WING_LEN = 0.74;

export function wingGeometry() {
  // Elongated mosquito wing: narrow base (alula), rounded tip.
  const shape = new THREE.Shape();
  const N = 40;
  const lead: [number, number][] = [];
  const trail: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = s * WING_LEN;
    const lw = 0.012 + 0.028 * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.7; // leading edge (straighter)
    const tw = 0.02 + 0.1 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.72)), 0.85); // trailing edge (rounded)
    lead.push([x, lw]);
    trail.push([x, -tw]);
  }
  shape.moveTo(0, 0);
  lead.forEach(([x, y]) => shape.lineTo(x, y));
  for (let i = trail.length - 1; i >= 0; i--) shape.lineTo(trail[i][0], trail[i][1]);
  shape.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(shape, 48);
  // UV: x along span, y from leading (0) to trailing (1)
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv[i * 2] = x / WING_LEN;
    uv[i * 2 + 1] = 1 - (0.05 - y) / 0.18; // flipY-compatible
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  // Lie in the XZ plane with the leading edge forward (+Z). A pure rotation
  // keeps triangle winding consistent with the normals (a mirror would not).
  g.rotateX(Math.PI / 2);
  return g;
}

/** Thin-film wing membrane: vein/scale texture, Fresnel rim, interference colours. */
function makeWingMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uOpacity;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 tex = texture2D(map, vUv);
        tex.rgb = pow(tex.rgb, vec3(2.2));
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float fres = pow(1.0 - ndv, 3.0);
        float thick = 0.5 + 0.5 * sin(vUv.x * 11.0 + vUv.y * 6.0 + sin(vUv.x * 27.0) * 0.6);
        vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + thick * 1.2 + ndv * 1.6));
        film = mix(vec3(0.55), film, 0.5);
        float vein = smoothstep(0.3, 0.8, tex.a);
        vec3 col = tex.rgb * 1.6 + vec3(0.09, 0.1, 0.11) * vein + film * (0.02 + 0.16 * fres);
        float a = clamp(tex.a * 0.85 + fres * 0.07 + 0.015, 0.0, 1.0) * uOpacity;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function buildMosquito(seed = 1) {
  const r = rng(seed);
  const root = new THREE.Group();
  const scaleN = scaleNormalMap();
  scaleN.repeat.set(6, 6);

  const chitin = new THREE.MeshPhysicalMaterial({
    color: "#2b241f",
    roughness: 0.62,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    sheen: 0.9,
    sheenColor: new THREE.Color("#6c7c94"),
    sheenRoughness: 0.45,
    normalMap: scaleN,
    normalScale: new THREE.Vector2(0.6, 0.6),
  });
  const white = new THREE.MeshPhysicalMaterial({ color: "#ebe7de", roughness: 0.42, sheen: 1, sheenColor: new THREE.Color("#ffffff"), normalMap: scaleN });
  const thoraxTex = thoraxMap();
  const thoraxMat = chitin.clone();
  thoraxMat.map = thoraxTex;
  thoraxMat.color.set("#ffffff");
  const abdTex = abdomenMap();
  const abdMat = chitin.clone();
  abdMat.map = abdTex;
  abdMat.color.set("#ffffff");
  const eyeN = eyeNormalMap();
  eyeN.repeat.set(5, 3);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: "#22100c",
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    normalMap: eyeN,
    normalScale: new THREE.Vector2(1.1, 1.1),
    iridescence: 0.55,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [180, 420],
  });
  const palpMat = chitin.clone();
  palpMat.emissive = new THREE.Color("#33e6ff");
  palpMat.emissiveIntensity = 0;
  const palpTipMat = white.clone();
  palpTipMat.emissive = new THREE.Color("#33e6ff");
  palpTipMat.emissiveIntensity = 0;
  const antMat = new THREE.MeshPhysicalMaterial({ color: "#3a3028", roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color("#9aa"), emissive: new THREE.Color("#ffb347"), emissiveIntensity: 0 });
  const pedicelMat = new THREE.MeshPhysicalMaterial({ color: "#2e241c", roughness: 0.45, clearcoat: 0.3, sheen: 0.7, sheenColor: new THREE.Color("#b9c4d0"), normalMap: scaleN });
  const hairMat = new THREE.MeshStandardMaterial({ color: "#5a4c40", roughness: 0.6, emissive: new THREE.Color("#ffb347"), emissiveIntensity: 0 });
  const wingTex = wingMap();
  const wingMat = makeWingMaterial(wingTex);

  // ---- Thorax
  const thoraxGeo = new THREE.SphereGeometry(1, 64, 40);
  thoraxGeo.rotateX(Math.PI / 2); // poles → ±Z, dorsal centre at u = 0.75
  const tp = thoraxGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    let x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
    // dorsal hump towards front (scutum), flatter belly
    const hump = Math.max(0, y) * (0.12 + 0.1 * Math.max(0, z));
    y = y + hump - Math.max(0, -y) * 0.08;
    tp.setXYZ(i, x * 0.118, y * 0.13, z * 0.175);
  }
  thoraxGeo.computeVertexNormals();
  const thorax = new THREE.Mesh(thoraxGeo, thoraxMat);
  thorax.rotation.x = -0.12;
  root.add(thorax);
  const scutellum = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), chitin);
  scutellum.scale.set(0.062, 0.028, 0.035);
  scutellum.position.set(0, 0.1, -0.15);
  root.add(scutellum);

  // Thoracic setae (bristles)
  {
    const n = 90;
    const g = new THREE.ConeGeometry(0.0012, 1, 4, 1);
    g.translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(g, hairMat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(0.15 + r() * 0.85) * 0.95;
      const nrm = v3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th) * 1.0);
      const p = v3(nrm.x * 0.118, nrm.y * 0.15, nrm.z * 0.17);
      const dir = nrm.clone().add(v3(0, 0.4, -0.7)).normalize();
      q.setFromUnitVectors(v3(0, 1, 0), dir);
      const len = 0.014 + r() * 0.02;
      m.compose(p, q, v3(1, len, 1));
      inst.setMatrixAt(i, m);
    }
    root.add(inst);
  }

  // ---- Head
  const head = new THREE.Group();
  root.add(head);
  const neck = new THREE.Mesh(taperedTube([v3(0, -0.01, 0.13), v3(0, -0.008, 0.17)], 0.04, 0.03, 4, 12), chitin);
  head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.068, 40, 28), chitin);
  skull.position.set(0, -0.006, 0.205);
  head.add(skull);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 48, 32), eyeMat);
    eye.position.set(s * 0.032, 0.0, 0.214);
    eye.scale.set(0.92, 1.05, 1);
    head.add(eye);
  }
  const clypeus = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), chitin);
  clypeus.scale.set(0.02, 0.022, 0.024);
  clypeus.position.set(0, -0.038, 0.248);
  head.add(clypeus);

  // Proboscis + labella
  const probPts = [v3(0, -0.052, 0.268), v3(0, -0.085, 0.36), v3(0, -0.125, 0.48), v3(0, -0.17, 0.66)];
  head.add(new THREE.Mesh(taperedTube(probPts, 0.0115, 0.0075, 40, 12), chitin));
  const lab = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), chitin);
  lab.scale.set(0.011, 0.011, 0.024);
  lab.position.set(0, -0.172, 0.665);
  lab.lookAt(v3(0, -0.2, 0.75));
  head.add(lab);

  // Maxillary palps — short in females, white-tipped in Ae. aegypti
  const palps: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const a = v3(s * 0.013, -0.046, 0.27);
    const mid = v3(s * 0.02, -0.068, 0.32);
    const b = v3(s * 0.024, -0.083, 0.36);
    const shaft = new THREE.Mesh(taperedTube([a, mid, b], 0.0062, 0.0058, 14, 10), palpMat);
    const tip = new THREE.Mesh(taperedTube([b, v3(s * 0.0255, -0.089, 0.376)], 0.0058, 0.0042, 6, 10), palpTipMat);
    head.add(shaft, tip);
    palps.push(shaft, tip);
  }

  // Antennae: pedicel (Johnston's organ) + flagellum with whorls of setae
  const antennaParts: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const base = v3(s * 0.016, 0.022, 0.268);
    const ped = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 24, 16), pedicelMat);
    ped.position.copy(base).add(v3(0, -0.002, -0.006));
    head.add(ped);
    const pts = [base.clone(), v3(s * 0.05, 0.06, 0.34), v3(s * 0.11, 0.105, 0.47), v3(s * 0.165, 0.13, 0.62)];
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const flag = new THREE.Mesh(taperedTube(pts, 0.0072, 0.0038, 48, 8), antMat);
    head.add(flag);
    antennaParts.push(flag);
    const whorls = 13, per = 10;
    const g = new THREE.ConeGeometry(0.0007, 1, 3, 1);
    g.translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(g, hairMat, whorls * per);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let k = 0;
    for (let w = 0; w < whorls; w++) {
      const u = 0.08 + (w / (whorls - 1)) * 0.88;
      const P = curve.getPointAt(u);
      const T = curve.getTangentAt(u);
      const side = new THREE.Vector3(0, 1, 0).cross(T).normalize();
      const up = T.clone().cross(side).normalize();
      for (let j = 0; j < per; j++) {
        const a = (j / per) * Math.PI * 2 + w * 0.4;
        const radial = side.clone().multiplyScalar(Math.cos(a)).add(up.clone().multiplyScalar(Math.sin(a)));
        const dir = radial.multiplyScalar(0.75).add(T.clone().multiplyScalar(0.66)).normalize();
        q.setFromUnitVectors(v3(0, 1, 0), dir);
        const len = (0.026 - u * 0.012) * (0.8 + r() * 0.4);
        m.compose(P, q, v3(1, len, 1));
        inst.setMatrixAt(k++, m);
      }
    }
    head.add(inst);
  }

  // ---- Abdomen: 8 tergites along a gentle downward curve
  {
    const P = (s: number) => v3(0, -0.02 - 0.11 * Math.pow(s, 1.4), -0.15 - 0.62 * s);
    const R = (s: number) => (s < 0.25 ? 0.052 + 0.04 * s : 0.062 * (1 - 0.7 * Math.pow((s - 0.25) / 0.75, 1.5)));
    for (let i = 0; i < 8; i++) {
      const s0 = i / 8, s1 = (i + 1) / 8 + 0.02;
      const a = P(s0), b = P(Math.min(1, s1));
      const L = a.distanceTo(b);
      const geo = latheSegment(L, (v) => R(s0 + (s1 - s0) * v) * (0.95 + 0.05 * Math.sin(Math.PI * Math.min(1, v * 1.1))), 36, 10);
      const seg = new THREE.Mesh(geo, abdMat);
      alignY(seg, a, b);
      seg.scale.set(1.05, 1, 0.92);
      root.add(seg);
    }
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(taperedTube([v3(s * 0.008, -0.13, -0.765), v3(s * 0.018, -0.13, -0.81)], 0.008, 0.003, 4, 8), chitin);
      root.add(c);
    }
  }

  // ---- Legs
  type LegDef = { at: THREE.Vector3; dirs: [number, number, number][]; lens: number[] };
  const legDefs: LegDef[] = [
    // fore: reaching forward and down
    { at: v3(0.055, -0.1, 0.085), dirs: [[0.3, -1, 0.45], [0.45, -0.35, 0.85], [0.25, -0.9, 0.4], [0.12, -0.95, 0.25]], lens: [0.075, 0.42, 0.44, 0.56] },
    // mid: lateral, down and back
    { at: v3(0.075, -0.112, 0.0), dirs: [[0.55, -1, 0.05], [1, -0.3, -0.12], [0.6, -0.95, -0.3], [0.3, -0.9, -0.45]], lens: [0.075, 0.46, 0.5, 0.62] },
    // hind: back and raised (the characteristic Aedes posture)
    { at: v3(0.065, -0.1, -0.07), dirs: [[0.4, -1, -0.3], [0.8, -0.25, -0.6], [0.35, 0.3, -0.9], [0.06, 0.65, -0.78]], lens: [0.08, 0.5, 0.52, 0.62] },
  ];
  const legGroups: THREE.Group[] = [];
  const radii = [0.0095, 0.007, 0.0052, 0.0037, 0.0019];
  for (const def of legDefs)
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(def.at.x * s, def.at.y, def.at.z);
      let p = v3(0, 0, 0);
      const joints = [p.clone()];
      def.dirs.forEach(([x, y, z], i) => {
        p = p.clone().add(v3(x * s, y, z).normalize().multiplyScalar(def.lens[i]));
        joints.push(p);
      });
      for (let i = 0; i < 3; i++) {
        const a = joints[i], b = joints[i + 1];
        const mid = a.clone().lerp(b, 0.5).add(v3(0, 0.012 * (i === 1 ? 1 : 0), 0));
        g.add(new THREE.Mesh(taperedTube([a, mid, b], radii[i], radii[i + 1], 10, 10), chitin));
        const knee = new THREE.Mesh(new THREE.SphereGeometry(radii[i + 1] * 1.04, 12, 8), chitin);
        knee.position.copy(b);
        g.add(knee);
      }
      // Tarsus: five tarsomeres, each with a white basal band
      const ta = joints[3], tb = joints[4];
      const fr = [0, 0.32, 0.52, 0.7, 0.86, 1];
      const sag = v3(0, -0.04, 0);
      const at = (u: number) => ta.clone().lerp(tb, u).add(sag.clone().multiplyScalar(Math.sin(Math.PI * u)));
      for (let k = 0; k < 5; k++) {
        const u0 = fr[k], u1 = fr[k + 1];
        const ub = u0 + (u1 - u0) * (k === 4 && def === legDefs[2] ? 1 : 0.16);
        const rr0 = THREE.MathUtils.lerp(radii[3], radii[4], u0);
        const rr1 = THREE.MathUtils.lerp(radii[3], radii[4], u1);
        const rb = THREE.MathUtils.lerp(rr0, rr1, 0.2);
        g.add(new THREE.Mesh(taperedTube([at(u0), at(ub)], rr0 * 1.05, rb * 1.05, 2, 8), white));
        g.add(new THREE.Mesh(taperedTube([at(ub), at((ub + u1) / 2), at(u1)], rb, rr1, 6, 8), chitin));
      }
      // claws
      const tip = at(1);
      g.add(new THREE.Mesh(taperedTube([tip, tip.clone().add(v3(0.006 * s, -0.012, 0.004))], 0.0025, 0.0006, 2, 6), chitin));
      root.add(g);
      legGroups.push(g);
    }

  // ---- Halteres (balance organs behind the wings)
  for (const s of [-1, 1]) {
    const a = v3(s * 0.085, 0.03, -0.12), b = v3(s * 0.135, 0.01, -0.175);
    root.add(new THREE.Mesh(taperedTube([a, b], 0.006, 0.004, 6, 8), chitin));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), white);
    knob.position.copy(b);
    root.add(knob);
  }

  // ---- Wings: hinge → stroke → feather; crisp wing + blurred ghost fan
  const wGeo = wingGeometry();
  const wings: { s: number; crisp: THREE.Group; ghosts: THREE.Group[]; crispMat: THREE.ShaderMaterial; ghostMat: THREE.ShaderMaterial }[] = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 0.1, 0.075, 0.025);
    root.add(hinge);
    const crispMat = wingMat.clone();
    const ghostMat = wingMat.clone();
    const mk = (mat: THREE.Material) => {
      const stroke = new THREE.Group();
      const feather = new THREE.Group();
      const mesh = new THREE.Mesh(wGeo, mat);
      if (s < 0) mesh.scale.x = -1;
      feather.add(mesh);
      stroke.add(feather);
      hinge.add(stroke);
      return stroke;
    };
    const crisp = mk(crispMat);
    const ghosts: THREE.Group[] = [];
    for (let i = 0; i < GHOSTS; i++) ghosts.push(mk(ghostMat));
    wings.push({ s, crisp, ghosts, crispMat, ghostMat });
  }

  const legPhase = legGroups.map(() => r() * 10);

  const pose = (t: number, anim: MosquitoAnim) => {
    const phase = anim.wingPhase ? anim.wingPhase(t) : t * 620;
    const blur = THREE.MathUtils.clamp(anim.wingBlur ? anim.wingBlur(t) : 1, 0, 1);
    const setStroke = (g: THREE.Group, s: number, ph: number) => {
      const c = Math.sin(ph * Math.PI * 2);
      const feather = Math.cos(ph * Math.PI * 2);
      g.rotation.set(0, 0, 0);
      // stroke about body-vertical axis (tilted stroke plane), dihedral elevation
      g.rotation.order = "YZX";
      g.rotation.y = -s * (STROKE_MEAN + STROKE_AMP * c);
      g.rotation.z = s * (0.16 + 0.06 * c);
      const f = g.children[0] as THREE.Group;
      f.rotation.x = 0.55 * feather; // pronation / supination at stroke reversal
    };
    for (const w of wings) {
      setStroke(w.crisp, w.s, phase);
      w.crisp.visible = blur < 0.98;
      w.crispMat.uniforms.uOpacity.value = 1 - blur;
      w.ghosts.forEach((g, i) => {
        setStroke(g, w.s, (i + 0.5) / GHOSTS + phase * 0.001);
        g.visible = blur > 0.02;
      });
      w.ghostMat.uniforms.uOpacity.value = (blur * 1.9) / GHOSTS;
    }
    legGroups.forEach((g, i) => {
      g.rotation.x = fbm1(t * 0.8 + legPhase[i], i) * 0.05;
      g.rotation.z = fbm1(t * 0.6 + legPhase[i] * 2, i + 3) * 0.04;
    });
    const pg = anim.palpGlow ? anim.palpGlow(t) : 0;
    palpMat.emissiveIntensity = pg * 2.2;
    palpTipMat.emissiveIntensity = pg * 3;
    const ag = anim.antennaGlow ? anim.antennaGlow(t) : 0;
    antMat.emissiveIntensity = ag * 1.6;
    hairMat.emissiveIntensity = ag * 0.8;
  };

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  wings.forEach((w) => [w.crisp, ...w.ghosts].forEach((g) => g.traverse((o) => (o.castShadow = false))));

  /** Anchor points (model space) for labels and effects. */
  const anchors = {
    head: v3(0, 0, 0.21),
    eye: v3(0.055, 0.02, 0.23),
    palpTip: v3(0.026, -0.093, 0.385),
    antennaMid: v3(0.11, 0.105, 0.47),
    antennaTip: v3(0.165, 0.13, 0.62),
    proboscisTip: v3(0, -0.172, 0.67),
  };
  return { root, pose, anchors };
}

export const Mosquito: React.FC<
  MosquitoAnim & {
    /** Called each tick to place the mosquito (world transform). */
    place?: (t: number, g: THREE.Group) => void;
  }
> = ({ place, seed = 1, ...anim }) => {
  const m = useMemo(() => buildMosquito(seed), [seed]);
  const outer = useMemo(() => {
    const g = new THREE.Group();
    g.add(m.root);
    return g;
  }, [m]);
  useTick((t) => {
    m.pose(t, anim);
    place?.(t, outer);
  });
  return <primitive object={outer} />;
};

// ---------------------------------------------------------------------------
// Low-detail mosquito for wide shots (a few pixels to ~60 px on screen).
// Same proportions and silhouette; legs as single tapered tubes, wings
// always rendered as a motion-blurred stroke fan.
// ---------------------------------------------------------------------------
const loCache: { geo?: THREE.BufferGeometry[]; mats?: THREE.Material[] } = {};
export function buildMosquitoLo() {
  if (!loCache.geo) {
    const body: THREE.BufferGeometry[] = [];
    const th = new THREE.SphereGeometry(1, 16, 12);
    th.scale(0.118, 0.13, 0.175);
    body.push(th);
    const hd = new THREE.SphereGeometry(0.07, 12, 10);
    hd.translate(0, -0.005, 0.21);
    body.push(hd);
    body.push(taperedTube([v3(0, -0.02, -0.15), v3(0, -0.08, -0.45), v3(0, -0.13, -0.77)], 0.06, 0.02, 10, 8));
    body.push(taperedTube([v3(0, -0.05, 0.27), v3(0, -0.12, 0.48), v3(0, -0.17, 0.66)], 0.011, 0.007, 8, 6));
    for (const s of [-1, 1]) body.push(taperedTube([v3(s * 0.016, 0.022, 0.27), v3(s * 0.11, 0.105, 0.47), v3(s * 0.165, 0.13, 0.62)], 0.006, 0.003, 8, 5));
    const legs: [number, number, number][][] = [
      [[0.055, -0.1, 0.085], [0.22, -0.25, 0.42], [0.33, -0.65, 0.6], [0.4, -1.1, 0.72]],
      [[0.075, -0.11, 0], [0.5, -0.27, -0.05], [0.75, -0.65, -0.2], [0.9, -1.1, -0.42]],
      [[0.065, -0.1, -0.07], [0.45, -0.26, -0.36], [0.6, -0.1, -0.8], [0.63, 0.3, -1.25]],
    ];
    for (const L of legs) for (const s of [-1, 1]) body.push(taperedTube(L.map(([x, y, z]) => v3(x * s, y, z)), 0.009, 0.003, 14, 5));
    loCache.geo = body;
    loCache.mats = [new THREE.MeshPhysicalMaterial({ color: "#2b241f", roughness: 0.55, sheen: 0.9, sheenColor: new THREE.Color("#7a8aa4") })];
  }
  const root = new THREE.Group();
  for (const g of loCache.geo!) {
    const m = new THREE.Mesh(g, loCache.mats![0]);
    m.castShadow = true;
    root.add(m);
  }
  const fan = makeWingMaterial(wingMap());
  fan.uniforms.uOpacity.value = 0.42;
  const wGeo = wingGeometry();
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 0.1, 0.075, 0.025);
    root.add(hinge);
    for (let i = 0; i < 5; i++) {
      const ph = (i + 0.5) / 5;
      const g = new THREE.Group();
      g.rotation.order = "YZX";
      g.rotation.y = -s * (STROKE_MEAN + STROKE_AMP * Math.sin(ph * Math.PI * 2));
      g.rotation.z = s * 0.16;
      const mesh = new THREE.Mesh(wGeo, fan);
      if (s < 0) mesh.scale.x = -1;
      g.add(mesh);
      hinge.add(g);
    }
  }
  return root;
}

export const MosquitoLo: React.FC<{ place: (t: number, g: THREE.Group) => void }> = ({ place }) => {
  const g = useMemo(() => {
    const o = new THREE.Group();
    o.add(buildMosquitoLo());
    return o;
  }, []);
  useTick((t) => place(t, g));
  return <primitive object={g} />;
};
