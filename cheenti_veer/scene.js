// Cheenti Veer: a 20 s Hindi micro-drama, every model, light and move built in code with Three.js.
// window.seek(t) renders the frame at time t (seconds); render.js records it.
import * as THREE from 'three';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';

const W = 1080, H = 1920, DUR = 20;
const RENDER = /render=1/.test(location.search);

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const inOut = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const outBack = u => { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mat(color, rough = 0.6, metal = 0, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }); }
function mesh(geo, m, parent, pos, shadow = true) {
  const o = new THREE.Mesh(geo, m);
  if (pos) o.position.copy(pos);
  o.castShadow = shadow; o.receiveShadow = true;
  if (parent) parent.add(o);
  return o;
}
const sph = (r, ws = 28, hs = 18) => new THREE.SphereGeometry(r, ws, hs);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 16);

// ------------------------------------------------------------------ renderer + post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.getElementById('stage').prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 2000);
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(null, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.5, 0.93);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

// ------------------------------------------------------------------ textures
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat, repeat); }
  return tx;
}
function tileTex(repeat, grout) {
  return canvasTex(1024, 1024, (g, w) => {
    const cols = ['#e9dcc4', '#b9583a'];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = cols[(i + j) % 2]; g.fillRect(i * 512, j * 512, 512, 512);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${(i + j) % 2 ? '90,30,15' : '150,130,100'},${Math.random() * 0.08})`; g.fillRect(i * 512 + Math.random() * 512, j * 512 + Math.random() * 512, 3 + Math.random() * 8, 3 + Math.random() * 8); }
    }
    g.strokeStyle = '#6b5a48'; g.lineWidth = grout;
    for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * 512, 0); g.lineTo(k * 512, w); g.stroke(); g.beginPath(); g.moveTo(0, k * 512); g.lineTo(w, k * 512); g.stroke(); }
  }, repeat);
}
const glowTex = canvasTex(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,230,180,.8)'); r.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});
const shaftTex = canvasTex(64, 256, (g) => {
  const r = g.createLinearGradient(0, 0, 0, 256); r.addColorStop(0, 'rgba(255,235,200,.55)'); r.addColorStop(1, 'rgba(255,235,200,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 256);
  const s = g.createLinearGradient(0, 0, 64, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, 64, 256);
});

// ------------------------------------------------------------------ people
const SKIN_A = 0xb5764e, SKIN_D = 0xc68a63;
function makePerson(o) {
  const P = { root: new THREE.Group() };
  const M = {
    skin: mat(o.skin, 0.55), top: mat(o.top, o.topRough ?? 0.7, o.topMetal ?? 0), sleeve: mat(o.sleeve ?? o.top, o.topRough ?? 0.7, o.topMetal ?? 0),
    up: mat(o.legUp, 0.75, o.topMetal ?? 0), low: mat(o.legLow, 0.75, o.topMetal ?? 0), shoe: mat(o.shoe, 0.5), hand: mat(o.hand ?? o.skin, 0.55),
    dark: mat(0x1a1210, 0.4), white: mat(0xffffff, 0.3), hair: mat(o.hairColor ?? 0x15100d, 0.85),
  };
  const hips = P.hips = new THREE.Group(); hips.position.y = 0.9; P.root.add(hips);
  const pel = mesh(sph(0.15), M.up, hips); pel.scale.set(1.1, 0.7, 0.8);
  const spine = P.spine = new THREE.Group(); hips.add(spine);
  const torso = mesh(cap(0.16, 0.26), M.top, spine, V(0, 0.27, 0)); torso.scale.set(1.05 * (o.wide ?? 1), 1, 0.78);
  mesh(cap(0.048, 0.06), M.skin, spine, V(0, 0.54, 0));
  const headG = P.headG = new THREE.Group(); headG.position.y = 0.58; spine.add(headG);
  const head = mesh(sph(0.135), M.skin, headG, V(0, 0.13, 0)); head.scale.set(0.95, 1.05, 0.96);
  for (const s of [-1, 1]) {
    mesh(sph(0.03, 12, 8), M.skin, headG, V(s * 0.128, 0.125, 0));
    const eye = mesh(sph(0.026, 16, 10), M.white, headG, V(s * 0.048, 0.15, 0.112), false); eye.scale.z = 0.6;
    mesh(sph(0.016, 12, 8), M.dark, headG, V(s * 0.048, 0.15, 0.127), false);
    mesh(sph(0.005, 6, 4), M.white, headG, V(s * 0.048 + 0.006, 0.157, 0.141), false);
    const brow = mesh(new THREE.BoxGeometry(0.05, 0.011, 0.012), M.hair, headG, V(s * 0.05, 0.193, 0.122), false); brow.rotation.z = -s * 0.12;
  }
  mesh(sph(0.02, 12, 8), M.skin, headG, V(0, 0.117, 0.135), false);
  const smile = P.smile = mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 20, Math.PI), M.dark, headG, V(0, 0.083, 0.124), false);
  smile.rotation.z = Math.PI;
  const mouthO = P.mouthO = mesh(sph(0.02, 12, 8), M.dark, headG, V(0, 0.072, 0.126), false); mouthO.scale.set(1, 1.25, 0.5); mouthO.visible = false;
  // hair styles
  if (o.style === 'dadi') {
    const hairCap = mesh(new THREE.SphereGeometry(0.146, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), M.hair, headG, V(0, 0.135, -0.012)); hairCap.scale.set(1, 1.05, 1.02); hairCap.rotation.x = -0.5;
    mesh(sph(0.075), M.hair, headG, V(0, 0.2, -0.13));
    const part = mesh(new THREE.BoxGeometry(0.008, 0.004, 0.12), mat(0xc7231c, 0.5), headG, V(0, 0.283, 0.04), false); part.rotation.x = -0.4;
    mesh(sph(0.012, 10, 6), mat(0xd01818, 0.3), headG, V(0, 0.2, 0.131), false); // bindi
    const gm = mat(0xd9b25a, 0.3, 0.8);
    for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.029, 0.005, 8, 24), gm, headG, V(s * 0.048, 0.15, 0.138), false);
    mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), gm, headG, V(0, 0.152, 0.139), false);
  } else if (o.style === 'man') {
    const hairCap = mesh(new THREE.SphereGeometry(0.148, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), M.hair, headG, V(0, 0.14, -0.012)); hairCap.scale.set(1.02, 1.05, 1.04); hairCap.rotation.x = -0.55;
    const quiff = mesh(sph(0.07), M.hair, headG, V(0.02, 0.255, 0.05)); quiff.scale.set(1.6, 0.55, 1.0);
  }
  // arms
  P.arms = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.215, 0.45, 0); spine.add(sh);
    mesh(cap(0.054, 0.19), M.sleeve, sh, V(0, -0.14, 0));
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    mesh(cap(0.047, 0.17), o.forearmSleeve ? M.sleeve : M.skin, el, V(0, -0.12, 0));
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    const hm = mesh(sph(0.054), M.hand, hand); hm.scale.set(0.85, 1.1, 0.7);
    P.arms[side] = { sh, el, hand };
  }
  // legs
  P.legs = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.09, -0.02, 0); hips.add(hip);
    mesh(cap(0.072, 0.3), M.up, hip, V(0, -0.21, 0));
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    mesh(cap(0.06, 0.3), M.low, knee, V(0, -0.2, 0));
    const foot = mesh(new THREE.BoxGeometry(0.1, 0.06, 0.23), M.shoe, knee, V(0, -0.43, 0.045)); foot.geometry.translate(0, 0, 0);
    P.legs[side] = { hip, knee };
  }
  P.M = M; P.spineParts = { torso, head };
  return P;
}

function dressKurta(P) {
  const kurta = mesh(new THREE.CylinderGeometry(0.175, 0.23, 0.42, 28, 1, true), P.M.top, P.hips, V(0, -0.16, 0));
  kurta.material = P.M.top.clone(); kurta.material.side = THREE.DoubleSide;
  // kada (copper bracelet) on the left wrist
  P.kadaMat = mat(0xc8742e, 0.25, 1, { emissive: new THREE.Color(0xff7a1a), emissiveIntensity: 0 });
  P.kada = mesh(new THREE.TorusGeometry(0.05, 0.013, 10, 28), P.kadaMat, P.arms.L.el, V(0, -0.22, 0)); P.kada.rotation.x = Math.PI / 2;
  const btn = mat(0xe6c36a, 0.3, 0.7);
  for (let i = 0; i < 3; i++) mesh(sph(0.01, 8, 6), btn, P.spine, V(0, 0.42 - i * 0.06, 0.125), false);
}
function dressSaree(P) {
  const saree = mat(0xd6461c, 0.65), gold = mat(0xe3b23c, 0.3, 0.7);
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(lerp(0.19, 0.31, Math.pow(u, 0.8)), -u * 0.9)); }
  const skirt = mesh(new THREE.LatheGeometry(prof, 36), saree, P.hips, V(0, 0.04, 0)); skirt.material.side = THREE.DoubleSide;
  const waist = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.16, 32), saree, P.hips, V(0, 0.08, 0));
  mesh(new THREE.TorusGeometry(0.305, 0.016, 8, 40), gold, P.hips, V(0, -0.85, 0)).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.29, 0.01, 8, 40), gold, P.hips, V(0, -0.78, 0)).rotation.x = Math.PI / 2;
  const pallu = mesh(new THREE.BoxGeometry(0.15, 0.62, 0.02), saree, P.spine, V(0.02, 0.28, 0.118)); pallu.rotation.z = 0.62;
  const edge = mesh(new THREE.BoxGeometry(0.02, 0.66, 0.04), gold, pallu, V(0.085, 0, 0.002));
  const back = mesh(new THREE.BoxGeometry(0.2, 0.7, 0.03), saree, P.spine, V(0.08, 0.2, -0.13)); back.rotation.z = -0.35;
  for (const leg of Object.values(P.legs)) leg.hip.visible = false;
  // bangles
  const bangle = mat(0xe8c055, 0.25, 0.9);
  for (const side of ['L', 'R']) for (let i = 0; i < 2; i++) mesh(new THREE.TorusGeometry(0.048, 0.007, 8, 24), bangle, P.arms[side].el, V(0, -0.2 - i * 0.022, 0), false).rotation.x = Math.PI / 2;
}
function dressSuit(P) {
  const saff = mat(0xff8a1f, 0.35, 0.2), navyGloss = mat(0x1b2b63, 0.25, 0.55);
  for (const s of [-1, 1]) {                         // shoulder and side stripes
    const st = mesh(new THREE.BoxGeometry(0.035, 0.36, 0.02), saff, P.spine, V(s * 0.1, 0.3, 0.125)); st.rotation.z = s * 0.12;
  }
  const emb = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 32), saff, P.spine, V(0, 0.36, 0.128)); emb.rotation.x = Math.PI / 2;
  const blk = mat(0x1a0d06, 0.4);
  [[0, 0.02], [0, -0.012], [0, -0.04]].forEach(([x, y], i) => mesh(sph(i === 0 ? 0.014 : 0.018, 10, 8), blk, P.spine, V(x, 0.36 + y + 0.015, 0.142), false));
  for (const s of [-1, 1]) { const a = mesh(new THREE.BoxGeometry(0.03, 0.004, 0.004), blk, P.spine, V(s * 0.02, 0.405, 0.143), false); a.rotation.z = s * 0.7; }
  mesh(new THREE.TorusGeometry(0.168, 0.02, 8, 36), saff, P.hips, V(0, 0.07, 0)).rotation.x = Math.PI / 2;
  // helmet: rounded, saffron tilak stripe, cyan visor
  const helmet = P.helmet = new THREE.Group(); helmet.position.y = 0.13; P.headG.add(helmet);
  mesh(sph(0.158, 32, 20), navyGloss, helmet);
  const visor = mesh(new THREE.SphereGeometry(0.162, 32, 16, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.32, Math.PI * 0.3),
    new THREE.MeshPhysicalMaterial({ color: 0x3fd8ff, emissive: 0x0a6f8f, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.2, clearcoat: 1 }), helmet, null, false);
  visor.rotation.y = Math.PI / 2 - Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.024, 0.1, 0.03), saff, helmet, V(0, 0.115, 0.115), false).rotation.x = -0.75;
  for (const s of [-1, 1]) { const d = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24), saff, helmet, V(s * 0.155, 0, 0), false); d.rotation.z = Math.PI / 2; }
  P.kadaMat = mat(0xc8742e, 0.25, 1, { emissive: new THREE.Color(0xff7a1a), emissiveIntensity: 0.6 });
  P.kada = mesh(new THREE.TorusGeometry(0.055, 0.014, 10, 28), P.kadaMat, P.arms.L.el, V(0, -0.2, 0)); P.kada.rotation.x = Math.PI / 2;
}

const DEF = { hipsY: 0, yaw: 0, lean: 0, tilt: 0, headX: 0, headY: 0, headZ: 0, lShX: 0, lShZ: 0.1, lEl: 0, rShX: 0, rShZ: 0.1, rEl: 0,
  lHip: 0, lHipZ: 0, lKnee: 0, rHip: 0, rHipZ: 0, rKnee: 0, lArmY: 0, rArmY: 0 };
function poseAt(keys, t) {
  let a = keys[0], b = keys[0];
  for (let i = 0; i < keys.length; i++) { if (keys[i][0] <= t) { a = keys[i]; b = keys[i + 1] || keys[i]; } }
  if (t < keys[0][0]) { a = b = keys[0]; }
  const u = a === b ? 0 : inOut(seg(t, a[0], b[0]));
  const out = {};
  for (const k in DEF) out[k] = lerp(a[1][k] ?? DEF[k], b[1][k] ?? DEF[k], u);
  out.face = u < 0.5 ? a[1].face : b[1].face;
  return out;
}
function applyPose(P, p) {
  P.hips.position.y = 0.9 + p.hipsY; P.hips.rotation.y = p.yaw;
  P.spine.rotation.set(p.lean, 0, p.tilt);
  P.headG.rotation.set(p.headX, p.headY, p.headZ);
  P.arms.L.sh.rotation.set(p.lShX, p.lArmY, p.lShZ); P.arms.L.el.rotation.x = p.lEl;
  P.arms.R.sh.rotation.set(p.rShX, p.rArmY, -p.rShZ); P.arms.R.el.rotation.x = p.rEl;
  P.legs.L.hip.rotation.set(p.lHip, 0, p.lHipZ); P.legs.L.knee.rotation.x = p.lKnee;
  P.legs.R.hip.rotation.set(p.rHip, 0, -p.rHipZ); P.legs.R.knee.rotation.x = p.rKnee;
  const f = p.face || 'smile';
  P.smile.visible = f !== 'O'; P.mouthO.visible = f === 'O';
  P.smile.rotation.z = f === 'frown' ? 0 : Math.PI; P.smile.scale.y = f === 'flat' ? 0.25 : 1;
}

// ------------------------------------------------------------------ ant
function makeAnt() {
  const A = { g: new THREE.Group(), legs: [] };
  const body = A.body = new THREE.Group(); A.g.add(body);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x8c2410, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.2 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x220806, roughness: 0.2, clearcoat: 1 });
  const g = mesh(sph(0.55, 32, 22), shell, body, V(0, 0.62, -1.05)); g.scale.set(1, 0.82, 1.25);
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.TorusGeometry(0.42 + i * 0.03, 0.02, 6, 32), dark, body, V(0, 0.64, -0.78 - i * 0.28)); b.scale.set(1, 0.85, 1); }
  mesh(sph(0.14, 16, 12), shell, body, V(0, 0.55, -0.4));
  const th = mesh(sph(0.3, 28, 18), shell, body, V(0, 0.6, 0)); th.scale.set(0.85, 0.78, 1.45);
  A.head = new THREE.Group(); A.head.position.set(0, 0.75, 0.62); body.add(A.head);
  const hd = mesh(sph(0.33, 28, 18), shell, A.head); hd.scale.set(1.05, 0.9, 0.95);
  for (const s of [-1, 1]) {
    const e = mesh(sph(0.1, 16, 12), dark, A.head, V(s * 0.26, 0.06, 0.12)); e.scale.set(0.7, 1, 1);
    const ew = mesh(sph(0.025, 8, 6), mat(0xffffff, 0.2), A.head, V(s * 0.3, 0.1, 0.19), false);
    const md = mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 0.8), dark, A.head, V(s * 0.08, -0.15, 0.3)); md.rotation.set(Math.PI / 2, 0, s > 0 ? -0.4 : Math.PI + 0.4);
    const an = new THREE.Group(); an.position.set(s * 0.12, 0.2, 0.22); A.head.add(an);
    const a1 = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 8), dark, an, V(0, 0.3, 0));
    const el = new THREE.Group(); el.position.y = 0.6; an.add(el);
    mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8), dark, el, V(0, 0.27, 0));
    mesh(sph(0.04, 8, 6), dark, el, V(0, 0.55, 0));
    an.rotation.set(0.5, 0, s * -0.45); el.rotation.x = 1.4;
    A[s > 0 ? 'antL' : 'antR'] = an;
  }
  const legMat = dark;
  [0.28, 0, -0.26].forEach((z, i) => {
    for (const s of [-1, 1]) {
      const root = new THREE.Group(); root.position.set(s * 0.2, 0.48, z); body.add(root);
      const side = new THREE.Group(); side.scale.x = s; root.add(side);
      const fem = new THREE.Group(); side.add(fem);
      const f = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.78, 8), legMat, fem, V(0.39, 0, 0)); f.rotation.z = Math.PI / 2;
      const knee = new THREE.Group(); knee.position.x = 0.78; fem.add(knee);
      const tb = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), legMat, knee, V(0.5, 0, 0)); tb.rotation.z = Math.PI / 2;
      fem.rotation.z = 0.55; knee.rotation.z = -1.65;
      fem.rotation.y = (i - 1) * -0.55;
      A.legs.push({ fem, knee, tripod: (i + (s > 0 ? 0 : 1)) % 2, base: (i - 1) * -0.55 });
    }
  });
  A.g.scale.setScalar(1.5);
  return A;
}
function animateAnt(A, phase, amp, t) {
  for (const L of A.legs) {
    const p = phase + (L.tripod ? Math.PI : 0);
    L.fem.rotation.y = L.base + Math.sin(p) * 0.35 * amp;
    L.fem.rotation.z = 0.55 + Math.max(0, Math.cos(p)) * 0.3 * amp;
  }
  A.body.position.y = Math.abs(Math.sin(phase)) * 0.04 * amp;
  A.antL.rotation.x = 0.5 + Math.sin(t * 5) * 0.15; A.antR.rotation.x = 0.5 + Math.sin(t * 5 + 1.3) * 0.15;
}

// ------------------------------------------------------------------ set A: the room
const sceneA = new THREE.Scene();
sceneA.background = new THREE.Color(0x1d140d);
sceneA.environment = envTex; sceneA.environmentIntensity = 0.35;
const A = {};
{
  const floor = mesh(new THREE.PlaneGeometry(12, 12), mat(0xffffff, 0.55, 0, { map: tileTex(15, 10) }), sceneA, null, false);
  floor.rotation.x = -Math.PI / 2;
  const wallM = mat(0xe8bf86, 0.9);
  mesh(new THREE.PlaneGeometry(12, 5), wallM, sceneA, V(0, 2.5, -2.2), false);
  const side = mesh(new THREE.PlaneGeometry(8, 5), wallM, sceneA, V(-3, 2.5, 1), false); side.rotation.y = Math.PI / 2;
  mesh(new THREE.BoxGeometry(12, 0.12, 0.03), mat(0x7a3d22, 0.6), sceneA, V(0, 0.06, -2.18));
  // window with bars and light
  const win = new THREE.Group(); win.position.set(-1.4, 1.75, -2.18); sceneA.add(win);
  mesh(new THREE.PlaneGeometry(1.0, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff1d0 }), win, V(0, 0, 0.005), false);
  const wood = mat(0x6b3a1e, 0.6);
  for (const [w, h, x, y] of [[1.12, 0.08, 0, 0.62], [1.12, 0.08, 0, -0.62], [0.08, 1.3, -0.54, 0], [0.08, 1.3, 0.54, 0], [0.05, 1.2, 0, 0]]) mesh(new THREE.BoxGeometry(w, h, 0.06), wood, win, V(x, y, 0.03));
  for (let i = -3; i <= 3; i++) if (i) mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6), mat(0x3a3a3a, 0.4, 0.8), win, V(i * 0.14, 0, 0.04));
  // marigold toran over the window
  const mari = [mat(0xff8c00, 0.7), mat(0xffc400, 0.7)], leaf = mat(0x2f7a2a, 0.7);
  for (let i = 0; i < 26; i++) { const u = i / 25, x = lerp(-0.75, 0.75, u), y = 0.82 - Math.sin(u * Math.PI) * 0.12; mesh(sph(0.04, 10, 8), mari[i % 2], win, V(x, y, 0.06)); if (i % 5 === 2) { const l = mesh(new THREE.ConeGeometry(0.03, 0.12, 6), leaf, win, V(x, y - 0.1, 0.06)); l.rotation.z = Math.PI; } }
  // wall clock and a framed photo
  const clock = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 32), mat(0xf4efe4, 0.4), sceneA, V(0.15, 2.45, -2.17)); clock.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.17, 0.015, 8, 32), mat(0x7a3d22, 0.5), sceneA, V(0.15, 2.45, -2.15));
  for (const [len, ang] of [[0.1, 0.6], [0.14, -1.9]]) { const h = mesh(new THREE.BoxGeometry(0.012, len, 0.01), mat(0x222222), sceneA, V(0.15, 2.45, -2.14), false); h.geometry.translate(0, len / 2, 0); h.rotation.z = ang; }
  mesh(new THREE.BoxGeometry(0.42, 0.32, 0.03), mat(0x5a2c14, 0.6), sceneA, V(-0.2, 1.8, -2.18));
  mesh(new THREE.PlaneGeometry(0.34, 0.24), mat(0x9fb4c8, 0.8), sceneA, V(-0.2, 1.8, -2.16), false);
  // clay matka and brass lota on a low stool
  const potProf = []; for (let i = 0; i <= 16; i++) { const u = i / 16; potProf.push(new THREE.Vector2(0.03 + Math.sin(u * Math.PI) * 0.2 + (u > 0.85 ? (u - 0.85) * 0.5 : 0), u * 0.42)); }
  mesh(new THREE.LatheGeometry(potProf, 32), mat(0xa4492a, 0.8), sceneA, V(-1.95, 0, -1.7));
  mesh(new THREE.BoxGeometry(0.45, 0.25, 0.35), wood, sceneA, V(-1.3, 0.125, -1.75));
  const lota = []; for (let i = 0; i <= 12; i++) { const u = i / 12; lota.push(new THREE.Vector2(0.02 + Math.sin(u * Math.PI * 0.9) * 0.07 + (u > 0.8 ? 0.03 : 0), u * 0.17)); }
  mesh(new THREE.LatheGeometry(lota, 24), mat(0xd9a441, 0.25, 1), sceneA, V(-1.3, 0.25, -1.75));
  // the steel almirah, on short legs with a dark gap underneath
  const alm = A.alm = new THREE.Group(); alm.position.set(1.0, 0, -1.9); sceneA.add(alm);
  const steel = mat(0x6d8a7c, 0.42, 0.45);
  mesh(new THREE.BoxGeometry(1.0, 1.8, 0.55), steel, alm, V(0, 0.08 + 0.9, 0));
  mesh(new THREE.BoxGeometry(0.008, 1.7, 0.01), mat(0x223028, 0.5), alm, V(0, 0.98, 0.278), false);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.03, 0.18, 0.04), mat(0xd8dde0, 0.2, 1), alm, V(s * 0.06, 1.0, 0.29));
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), mat(0xb9a36a, 0.3, 1), alm, V(0.12, 1.12, 0.281), false);
  for (const x of [-0.46, 0.46]) for (const z of [-0.24, 0.24]) mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), steel, alm, V(x, 0.04, z));
  // ring (small)
  A.ring = mesh(new THREE.TorusGeometry(0.03, 0.006, 12, 40), mat(0xffcf5a, 0.15, 1, { emissive: 0xff9d1c, emissiveIntensity: 0.9 }), sceneA);
  // lights
  A.hemi = new THREE.HemisphereLight(0xfff0d8, 0x7a4a2c, 0.75); sceneA.add(A.hemi);
  const key = A.key = new THREE.DirectionalLight(0xffe2b8, 2.6); key.position.set(-2.4, 3.4, 2.6); key.target.position.set(0.3, 0.7, -1.2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -2, near: 0.5, far: 10 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  sceneA.add(key, key.target);
  A.win = new THREE.PointLight(0xdfeeff, 2.0, 5, 1.6); A.win.position.set(-1.4, 1.8, -1.8); sceneA.add(A.win);
  A.kadaLight = new THREE.PointLight(0xff8a2a, 0, 1.5, 2); sceneA.add(A.kadaLight);
  A.rimS = new THREE.SpotLight(0xff8a1f, 0, 8, 0.5, 0.6); A.rimS.position.set(-2, 2.5, -1.6); sceneA.add(A.rimS, A.rimS.target);
  A.rimB = new THREE.SpotLight(0x3f7bff, 0, 8, 0.5, 0.6); A.rimB.position.set(2.2, 2.4, -1.4); sceneA.add(A.rimB, A.rimB.target);
}
const dadi = makePerson({ style: 'dadi', skin: SKIN_D, top: 0x7a1f2b, legUp: 0xd6461c, legLow: 0xd6461c, shoe: 0x5b3a22, hairColor: 0xe7e2d8, wide: 1.18 });
dressSaree(dadi); dadi.root.scale.setScalar(0.91); sceneA.add(dadi.root);
const arjunK = makePerson({ style: 'man', skin: SKIN_A, top: 0x2a7f88, legUp: 0x2a7f88, legLow: 0xefe6d2, shoe: 0x6b3d1f, forearmSleeve: true });
dressKurta(arjunK); sceneA.add(arjunK.root);
const SUIT = { style: 'man', skin: SKIN_A, top: 0x1b2b63, topRough: 0.35, topMetal: 0.35, legUp: 0x1b2b63, legLow: 0x1b2b63, shoe: 0xff8a1f, hand: 0xff8a1f, forearmSleeve: true };
const arjunS = makePerson(SUIT); dressSuit(arjunS); sceneA.add(arjunS.root);
const tinyAnt = makeAnt(); tinyAnt.g.scale.setScalar(0.045); sceneA.add(tinyAnt.g);

// ------------------------------------------------------------------ set B: under the almirah (1 cm person scale)
const sceneB = new THREE.Scene();
sceneB.background = new THREE.Color(0xcdb48a);
sceneB.fog = new THREE.Fog(0xcdb48a, 70, 380);
sceneB.environment = envTex; sceneB.environmentIntensity = 0.45;
const B = {};
{
  const floor = mesh(new THREE.PlaneGeometry(700, 700), mat(0xffffff, 0.5, 0, { map: tileTex(5, 6) }), sceneB, null, false);
  floor.rotation.x = -Math.PI / 2; floor.material.map.offset.set(0.37, 0.12);
  const steel = mat(0x6d8a7c, 0.5, 0.25);
  const alm = new THREE.Group(); sceneB.add(alm);
  mesh(new THREE.BoxGeometry(175, 4, 96), mat(0x55665d, 0.8, 0.1), alm, V(10, 16, -48));             // underside
  mesh(new THREE.PlaneGeometry(700, 120), mat(0xd9b680, 0.95), sceneB, V(0, 60, -110), false);           // room wall behind
  mesh(new THREE.BoxGeometry(175, 330, 2), steel, alm, V(10, 14 + 165, 0));                           // front panel
  for (const x of [-77.5, 97.5]) for (const z of [-4, -92]) mesh(new THREE.BoxGeometry(7, 14, 7), steel, alm, V(x, 7, z));
  mesh(new THREE.BoxGeometry(175, 2, 1), mat(0x9fb3a8, 0.3, 0.8), alm, V(10, 14.5, 0.8));
  // dust bunnies, crumbs, a lost coin
  const dustM = mat(0xbdb7ae, 1);
  B.dust = [];
  [[-6, -18, 3.2], [22, -30, 4.5], [-2, -40, 2.4], [26, -58, 5.5], [-10, -62, 3.8], [5, -78, 6], [16, -12, 2], [-14, -30, 2.8]].forEach(([x, z, r], i) => {
    const geo = new THREE.SphereGeometry(r, 64, 40), p = geo.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = 1 + 0.2 * noise(v.x / r * 2.2 + i * 5) + 0.1 * noise((v.y + v.z) / r * 4.1 + i) + (hash(k + i * 1000) - 0.5) * 0.035; v.multiplyScalar(n); p.setXYZ(k, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const d = mesh(geo, dustM, sceneB, V(x, r * 0.6, z)); d.scale.y = 0.7; B.dust.push(d);
  });
  const crumbM = mat(0xc9963f, 0.9);
  [[12, -24, 1.2], [14, -27, 0.7], [-4, -50, 1.5], [2, -8, 0.6], [24, -44, 1]].forEach(([x, z, r], i) => { const c = mesh(new THREE.DodecahedronGeometry(r, 0), crumbM, sceneB, V(x, r * 0.6, z)); c.rotation.set(i, i * 2, i * 3); });
  const coin = mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.35, 48), mat(0xc0c4c8, 0.3, 1), sceneB, V(-12, 0.18, -46));
  mesh(new THREE.TorusGeometry(3.1, 0.08, 6, 48), mat(0xd8dbde, 0.3, 1), coin, V(0, 0.18, 0)).rotation.x = Math.PI / 2;
  // the ring, giant at this scale
  B.ring = mesh(new THREE.TorusGeometry(3.0, 0.45, 24, 96), mat(0xffcf5a, 0.12, 1, { emissive: 0xff9d1c, emissiveIntensity: 0.12 }), sceneB);
  B.ringLight = new THREE.PointLight(0xffb84a, 60, 40, 1.4); sceneB.add(B.ringLight);
  // light shafts slipping in under the edge
  B.shafts = [];
  for (let i = 0; i < 0; i++) {
    const m = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35, side: THREE.DoubleSide, fog: false });
    const s = mesh(new THREE.PlaneGeometry(9, 60), m, sceneB, V(-30 + i * 22, 7, -18), false); s.rotation.set(-1.35, 0, 0.05 * i); s.castShadow = false; B.shafts.push(s);
  }
  B.hemi = new THREE.HemisphereLight(0xfff0d8, 0x6a4a30, 0.65); sceneB.add(B.hemi);
  const sun = B.sun = new THREE.DirectionalLight(0xffe6c2, 2.2); sun.position.set(-40, 60, 90); sun.target.position.set(5, 0, -10);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 300 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.3;
  sceneB.add(sun, sun.target);
  B.under = new THREE.PointLight(0xffd7a0, 90, 120, 1.2); B.under.position.set(6, 10, -34); sceneB.add(B.under);
}
const arjunB = makePerson(SUIT); dressSuit(arjunB); sceneB.add(arjunB.root);
const bigAnt = makeAnt(); sceneB.add(bigAnt.g);

// sparkle particles (one cloud per set)
function makeSparks(n, size) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ map: glowTex, size, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffb35a, fog: false });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; return pts;
}
const sparksA = makeSparks(260, 0.05); sceneA.add(sparksA);
const sparksB = makeSparks(160, 0.35); sceneB.add(sparksB);
function swirl(pts, center, radius, height, t, t0, t1, mode) {
  const p = pts.geometry.attributes.position, n = p.count, u = seg(t, t0, t1);
  const vis = t > t0 && t < t1 + 0.4;
  pts.material.opacity = vis ? (1 - seg(t, t1, t1 + 0.4)) : 0;
  for (let i = 0; i < n; i++) {
    const h = hash(i), a = h * 40 + t * (6 + hash(i + 3) * 6);
    const k = mode === 'in' ? 1 - u : mode === 'out' ? u : 1;
    const r = radius * (0.25 + 0.85 * k) * (0.6 + hash(i + 7) * 0.6);
    const y = height * (hash(i + 11) + (mode === 'twinkle' ? 0.2 * Math.sin(t * 3 + i) : 0));
    p.setXYZ(i, center.x + Math.cos(a) * r, center.y + y, center.z + Math.sin(a) * r);
  }
  p.needsUpdate = true;
}

// ------------------------------------------------------------------ choreography
const T = { drop: 0.95, land: 1.18, under: 2.75, raise: 3.65, twist: 4.15, flash: 5.2, small: 6.05,
  land2: 6.15, antIn: 6.9, antStop: 8.0, pat: 8.1, jump: 8.75, seated: 9.3, ride: 9.9, arrive: 13.0, lift: 13.45, held: 14.2, grow: 14.45, big: 15.2, bless: 16.3, hero: 17.2 };
const DADI_POS = V(0.3, 0, -1.0), ARJUN_POS = V(-0.55, 0, -0.75), RETURN_POS = V(0.95, 0, -1.3), HERO_POS = V(0.15, 0, -0.85);

const dadiKeys = [
  [0, { yaw: 0.25, lShX: -1.0, lShZ: 0.25, lEl: -1.2, rShX: -0.9, rShZ: 0.05, rEl: -1.25, headX: 0.35, face: 'smile' }],
  [0.85, { yaw: 0.25, lShX: -1.0, lShZ: 0.25, lEl: -1.2, rShX: -0.9, rShZ: 0.05, rEl: -1.25, headX: 0.35, face: 'smile' }],
  [1.05, { yaw: 0.35, lShX: -0.6, rShX: -0.5, rEl: -0.4, lEl: -0.4, headX: 0.45, lean: 0.12, face: 'O' }],
  [1.45, { yaw: 0.45, lShX: -1.9, lShZ: 0.5, lEl: -2.1, rShX: -1.9, rShZ: 0.5, rEl: -2.1, headX: 0.3, lean: 0.15, face: 'O' }],
  [3.3, { yaw: 0.45, lShX: -1.9, lShZ: 0.5, lEl: -2.1, rShX: -1.9, rShZ: 0.5, rEl: -2.1, headX: 0.35, lean: 0.2, face: 'O' }],
  [5.0, { yaw: -0.1, lShX: -1.5, lShZ: 0.4, lEl: -2.0, rShX: -1.5, rShZ: 0.4, rEl: -2.0, headY: -0.5, headX: 0.15, face: 'O' }],
  [14.5, { yaw: 0.2, lShX: -0.3, rShX: -0.3, headY: 0.3, headX: 0.2, face: 'O' }],
  [15.4, { yaw: 0.55, lShX: -0.7, rShX: -0.6, rEl: -0.9, lEl: -0.9, headY: 0.2, face: 'O' }],
  [15.95, { yaw: 0.6, lShX: -1.15, lShZ: 0.1, lEl: -0.45, rShX: -0.7, rEl: -1.1, face: 'smile' }],
  [16.15, { yaw: 0.6, lShX: -0.9, lEl: -1.3, rShX: -0.9, rEl: -1.35, face: 'smile' }],
  [16.45, { yaw: 0.6, lShX: -2.45, lShZ: 0.2, lEl: -0.7, rShX: -0.9, rEl: -1.35, headX: -0.15, face: 'smile' }],
  [17.0, { yaw: 0.6, lShX: -2.35, lShZ: 0.2, lEl: -0.8, rShX: -0.9, rEl: -1.35, headX: -0.05, face: 'smile' }],
];
const arjunAKeys = [
  [0, { yaw: 0.55, headY: 0.2, face: 'smile' }],
  [1.0, { yaw: 0.55, headY: 0.2, face: 'smile' }],
  [1.5, { yaw: 0.75, headY: 0.1, headX: 0.35, lean: 0.1, face: 'O' }],
  [3.4, { yaw: 0.3, headX: 0.1, face: 'flat' }],
  [3.65, { yaw: 0.3, headX: 0.25, lShX: -1.35, lShZ: -0.35, lEl: -1.4, face: 'flat' }],
  [4.05, { yaw: 0.3, headX: 0.35, lShX: -1.35, lShZ: -0.35, lEl: -1.4, rShX: -1.2, rShZ: 0.3, rEl: -1.3, face: 'smile' }],
  [4.45, { yaw: 0.3, headX: 0.35, lShX: -1.35, lShZ: -0.35, lEl: -1.4, lArmY: 0.6, rShX: -1.25, rShZ: 0.35, rEl: -1.25, face: 'smile' }],
  [5.2, { yaw: 0.3, headX: -0.2, lShX: -2.8, lShZ: 0.2, lEl: -0.2, rShX: -0.2, rShZ: 0.5, face: 'smile' }],
];
const returnKeys = [   // grows back at the almirah, hands the ring over, receives the blessing
  [14.45, { yaw: 0.9, hipsY: -0.35, lean: 0.5, lHip: -1.3, lKnee: 1.9, rHip: -0.5, rKnee: 1.0, rShX: -0.6, face: 'smile' }],
  [15.2, { yaw: 0.6, rShX: -0.5, rEl: -0.6, face: 'smile' }],
  [15.6, { yaw: -0.7, rShX: -1.2, rEl: -0.4, headY: 0.1, face: 'smile' }],
  [15.95, { yaw: -0.7, rShX: -1.25, rEl: -0.35, face: 'smile' }],
  [16.2, { yaw: -0.7, rShX: -0.2, lean: 0.15, face: 'smile' }],
  [16.5, { yaw: -0.75, lean: 0.22, headX: 0.3, lShX: -0.3, rShX: -0.3, face: 'smile' }],
  [17.0, { yaw: -0.75, lean: 0.22, headX: 0.3, lShX: -0.3, rShX: -0.3, face: 'smile' }],
  [17.2, { yaw: 0.1, rShX: -0.4, rShZ: 0.3, face: 'smile' }],
  [17.55, { yaw: 0.1, rShX: -2.9, rShZ: 0.35, rEl: -0.25, lShZ: 0.2, lShX: -0.15, headX: -0.12, lHipZ: 0.12, rHipZ: 0.12, face: 'smile' }],
  [20, { yaw: -0.05, rShX: -2.95, rShZ: 0.35, rEl: -0.2, lShZ: 0.2, lShX: -0.15, headX: -0.14, headY: 0.12, lHipZ: 0.12, rHipZ: 0.12, face: 'smile' }],
];
const arjunBKeys = [
  [6.05, { hipsY: -0.4, lean: 0.55, lHip: -1.4, lKnee: 2.0, rHip: -0.3, rKnee: 1.6, lShX: -0.3, lShZ: 0.5, rShX: 0.4, rShZ: 0.3, face: 'smile' }],
  [6.2, { hipsY: -0.4, lean: 0.55, lHip: -1.4, lKnee: 2.0, rHip: -0.3, rKnee: 1.6, lShX: -0.3, lShZ: 0.5, rShX: 0.4, rShZ: 0.3, face: 'smile' }],
  [6.8, { headX: -0.35, lShZ: 0.25, rShZ: 0.25, face: 'O' }],
  [7.6, { headX: -0.1, headY: 0.6, face: 'smile' }],
  [8.1, { headY: 0.7, lShX: -1.3, lShZ: 0.7, lEl: -0.4, face: 'smile' }],
  [8.5, { headY: 0.7, lShX: -1.1, lShZ: 0.75, lEl: -0.6, face: 'smile' }],
  [8.75, { hipsY: -0.25, lean: 0.4, lHip: -0.9, lKnee: 1.4, rHip: -0.9, rKnee: 1.4, lShX: 0.6, rShX: 0.6, face: 'smile' }],
  [9.05, { lShX: -2.6, rShX: -2.6, lHip: -0.4, lKnee: 0.8, rHip: -0.2, rKnee: 0.5, face: 'smile' }],
  [9.3, { lHip: -1.3, lHipZ: 0.55, lKnee: 1.3, rHip: -1.3, rHipZ: 0.55, rKnee: 1.3, lean: 0.25, lShX: -0.7, rShX: -0.7, lEl: -0.6, rEl: -0.6, face: 'smile' }],
  [12.9, { lHip: -1.3, lHipZ: 0.55, lKnee: 1.3, rHip: -1.3, rHipZ: 0.55, rKnee: 1.3, lean: 0.45, lShX: -1.1, rShX: 0.2, rShZ: 0.9, rEl: -0.3, lEl: -0.6, face: 'smile' }],
  [13.2, { hipsY: -0.3, lean: 0.5, lHip: -1.2, lKnee: 1.8, rHip: -1.2, rKnee: 1.8, lShX: -1.0, rShX: -1.0, face: 'smile' }],
  [13.5, { hipsY: -0.2, lean: 0.4, lHipZ: 0.25, rHipZ: 0.25, lHip: -0.8, lKnee: 1.2, rHip: -0.8, rKnee: 1.2, lShX: -1.6, rShX: -1.6, face: 'flat' }],
  [14.2, { lHipZ: 0.25, rHipZ: 0.25, lShX: -3.0, lShZ: 0.25, rShX: -3.0, rShZ: 0.25, lEl: -0.15, rEl: -0.15, headX: -0.3, face: 'smile' }],
  [14.5, { lHipZ: 0.25, rHipZ: 0.25, lShX: -3.0, lShZ: 0.25, rShX: -3.0, rShZ: 0.25, lEl: -0.15, rEl: -0.15, headX: -0.3, face: 'smile' }],
];

const ridePath = new THREE.CatmullRomCurve3([V(3.4, 0, 20), V(5, 0, 12), V(8.5, 0, -6), V(9.5, 0, -25), V(9.2, 0, -44.5)]);
function antState(t) {   // position, yaw and gait phase of the big ant
  if (t < T.antStop) {
    const u = inOut(seg(t, T.antIn, T.antStop));
    return { pos: V(lerp(34, 3.4, u), 0, 20), yaw: -Math.PI / 2, phase: lerp(0, 22, u), amp: 1 - seg(t, 7.8, 8.0) * 0.8 };
  }
  if (t < T.ride) return { pos: V(3.4, 0, 20), yaw: -Math.PI / 2 + 0.25 * Math.sin(seg(t, 8.0, 8.6) * Math.PI), phase: 22, amp: 0.15 };
  const u = seg(t, T.ride, T.arrive), e = u < 0.15 ? u * u / 0.3 : u > 0.85 ? 1 - (1 - u) * (1 - u) / 0.3 : u - 0.075;   // ease in/out, constant middle
  const s = clamp(e / 0.85);
  const pos = ridePath.getPointAt(s), tan = ridePath.getTangentAt(Math.min(s, 0.999));
  let yaw = Math.atan2(tan.x, tan.z);
  yaw = lerp(-Math.PI / 2, yaw, ss(T.ride, T.ride + 0.5, t));
  return { pos, yaw, phase: 22 + (t - T.ride) * 30 * (1 - seg(t, 12.7, 13.0) * 0.9), amp: 1 - seg(t, 12.8, 13.1) * 0.85 };
}

// cameras: [t0, t1, set, [pos, target] from, [pos, target] to, fov]
const SHOTS = [
  [0, 1.55, 'A', [V(0.95, 1.3, 2.1), V(0.55, 0.88, -1.2)], [V(0.9, 1.22, 1.8), V(0.55, 0.82, -1.2)], 38],
  [1.55, 3.4, 'A', [V(0.35, 0.16, -0.35), V(0.92, 0.05, -1.65)], [V(0.55, 0.12, -0.78), V(0.98, 0.04, -1.7)], 40],
  [3.4, 5.25, 'A', [V(0.05, 1.5, 1.45), V(-0.55, 1.32, -0.75)], [V(-0.05, 1.45, 1.15), V(-0.55, 1.32, -0.75)], 38],
  [5.25, 6.1, 'A', [V(-0.05, 1.45, 1.15), V(-0.55, 1.2, -0.75)], [V(-0.4, 0.25, -0.15), V(-0.55, 0.03, -0.75)], 38],
  [6.1, 9.9, 'B', [V(2.2, 1.1, 27.0), V(0.4, 1.1, 20)], [V(-4.5, 2.3, 27.5), V(2.0, 1.3, 19.8)], 40],
  [9.9, 13.0, 'B', null, null, 44],
  [13.0, 14.45, 'B', [V(-4.5, 1.8, -45.5), V(9.4, 2.6, -50.0)], [V(-3.2, 1.2, -46.5), V(9.4, 3.4, -50.0)], 42],
  [14.45, 17.2, 'A', [V(0.8, 1.32, 2.0), V(0.62, 0.98, -1.15)], [V(0.75, 1.3, 1.75), V(0.62, 1.0, -1.15)], 38],
  [17.2, 20, 'A', [V(0.35, 1.05, 2.6), V(0.15, 1.6, -0.85)], [V(0.28, 1.1, 2.15), V(0.15, 1.62, -0.85)], 40],
];
function shotAt(t) { for (const s of SHOTS) if (t < s[1]) return s; return SHOTS[SHOTS.length - 1]; }

// ------------------------------------------------------------------ overlay
const elSubsHi = document.querySelector('#subs .hi'), elSubsEn = document.querySelector('#subs .en');
const elTitle = document.getElementById('title'), elTitleHi = elTitle.querySelector('.hi'), elTitleEn = elTitle.querySelector('.en'), elTag = elTitle.querySelector('.tag');
const elFlash = document.getElementById('flash'), elBadge = document.getElementById('badge');
function overlay(t) {
  let s = null;
  for (const x of (window.SUBS || [])) if (t >= x.start && t < x.end) s = x;
  const a = s ? Math.min(seg(t, s.start, s.start + 0.12), 1 - seg(t, s.end - 0.1, s.end)) : 0;
  elSubsHi.textContent = s ? s.hi : ''; elSubsEn.textContent = s ? s.en : '';
  document.getElementById('subs').style.opacity = a;
  document.getElementById('subs').style.transform = `translateY(${(1 - outBack(seg(t, s ? s.start : 0, (s ? s.start : 0) + 0.25))) * 30}px)`;
  // title slam at the transformation, and the end card
  let ta = 0, sc = 1, tag = 0;
  if (t > 8.25 && t < 9.9) { const u = seg(t, 8.25, 8.5); ta = u * (1 - seg(t, 9.6, 9.9)); sc = lerp(2.2, 1, outBack(u)); }
  if (t > 17.35) { const u = seg(t, 17.35, 17.65); ta = u; sc = lerp(1.8, 1, outBack(u)); tag = seg(t, 18.2, 18.5); }
  elTitle.style.opacity = ta; elTitle.style.top = t > 17 ? '190px' : '330px';
  elTitleHi.style.transform = `scale(${sc})`; elTitleEn.style.transform = `scale(${lerp(1, sc, 0.5)})`;
  elTag.style.opacity = tag; elTag.style.transform = `translateY(${(1 - outBack(tag)) * 20}px)`;
  elBadge.style.opacity = 1 - seg(t, 1.6, 2.0);
  const fl = Math.max(t > T.flash ? 0.95 * Math.exp(-(t - T.flash) * 7) * (t < 6.3 ? 1 : 0) : 0, Math.max(0, 1 - Math.abs(t - 6.1) / 0.1) * 0.6,
    t > T.grow ? 0.9 * Math.exp(-(t - T.grow) * 6) : 0, t > T.hero ? 0.25 * Math.exp(-(t - T.hero) * 8) : 0);
  elFlash.style.opacity = fl;
}

// ------------------------------------------------------------------ frame
const tmp = new THREE.Vector3();
function faceToward(obj, target) { obj.rotation.y = Math.atan2(target.x - obj.position.x, target.z - obj.position.z); }
function seek(t) {
  const shot = shotAt(t), set = shot[2];
  // ---- set A ----
  if (set === 'A') {
    // Dadi
    dadi.root.position.copy(DADI_POS); dadi.root.rotation.y = 0;
    applyPose(dadi, poseAt(dadiKeys, t));
    // Arjun: kurta until the flash, then the suit
    const suitOn = t >= T.flash + 0.03;
    arjunK.root.visible = !suitOn; arjunS.root.visible = suitOn;
    let P, pos, keys, scale = 1;
    if (t < T.grow) { pos = ARJUN_POS; keys = arjunAKeys; scale = 1 - inOut(seg(t, T.flash + 0.05, T.small)) * 0.985; }
    else if (t < T.hero) { pos = RETURN_POS; keys = returnKeys; scale = lerp(0.015, 1, outBack(seg(t, T.grow, T.big))); }
    else { pos = HERO_POS; keys = returnKeys; }
    for (const Q of [arjunK, arjunS]) { Q.root.position.copy(pos); Q.root.scale.setScalar(Math.max(scale, 0.001)); applyPose(Q, poseAt(keys, t)); }
    P = suitOn ? arjunS : arjunK;
    // helmet retracts for the blessing, returns for the hero pose
    const hs = 1 - ss(15.25, 15.55, t) + ss(17.25, 17.55, t);
    arjunS.helmet.scale.setScalar(Math.max(0.001, t < 15.2 ? 1 : clamp(hs)));
    // kada glow and light
    const glow = ss(T.twist, T.flash, t) * (t < T.grow ? 1 : 0) + (t > 4.0 && t < T.flash ? 0.3 * Math.sin(t * 30) ** 2 : 0);
    P.kadaMat.emissiveIntensity = suitOn ? 0.6 + 0.4 * Math.sin(t * 4) : glow * 4;
    P.kada.getWorldPosition(tmp); A.kadaLight.position.copy(tmp); A.kadaLight.intensity = suitOn ? 0.3 : glow * 3;
    // the ring
    const ring = A.ring; ring.visible = true;
    if (t < T.drop) { dadi.arms.R.hand.getWorldPosition(tmp); ring.position.copy(tmp).add(V(0.0, 0.04, 0.03)); ring.rotation.set(0.6, 0, 0); }
    else if (t < T.land) { const u = seg(t, T.drop, T.land); dadi.arms.R.hand.getWorldPosition(tmp); ring.position.set(lerp(tmp.x, 0.48, u), lerp(tmp.y, 0.036, u * u), lerp(tmp.z + 0.03, -0.92, u)); ring.rotation.set(0.6 + u * 4, 0, u * 2); }
    else if (t < T.under) {
      const u = seg(t, T.land, T.under), b = Math.abs(Math.sin(seg(t, T.land, 1.62) * Math.PI * 2)) * 0.05 * (1 - seg(t, T.land, 1.62));
      ring.position.set(lerp(0.48, 0.98, inOut(u)), 0.036 + b, lerp(-0.92, -1.72, inOut(u)));
      ring.rotation.set(0, Math.atan2(0.5, -0.8) + Math.PI / 2, -(u * 22));
    } else if (t < T.grow) ring.visible = false;
    else if (t < 15.95) { P.arms.R.hand.getWorldPosition(tmp); ring.position.copy(tmp).add(V(0, 0.02, 0.02)); ring.rotation.set(0, t * 2, 0); }
    else if (t < 16.15) { dadi.arms.L.hand.getWorldPosition(tmp); ring.position.copy(tmp).add(V(0, 0.04, 0.02)); ring.rotation.set(0.3, t, 0); }
    else if (t < T.hero) { dadi.arms.R.hand.getWorldPosition(tmp); ring.position.copy(tmp).add(V(0, 0.04, 0.02)); ring.rotation.set(0.3, t, 0); }
    else ring.visible = false;
    dadi.root.visible = t < T.hero;
    // tiny ant on the hero's shoulder at the end
    tinyAnt.g.visible = t >= T.hero;
    if (tinyAnt.g.visible) { arjunS.arms.L.sh.getWorldPosition(tmp); tinyAnt.g.position.copy(tmp).add(V(0.02, 0.06, 0)); tinyAnt.g.rotation.y = 0.6; animateAnt(tinyAnt, 0, 0, t); }
    // lighting moods
    const hero = ss(T.hero, T.hero + 0.6, t);
    A.hemi.intensity = lerp(0.75, 0.25, hero); A.key.intensity = lerp(2.6, 1.6, hero);
    A.rimS.intensity = hero * 40; A.rimB.intensity = hero * 40;
    A.rimS.target.position.copy(HERO_POS).add(V(0, 1.2, 0)); A.rimB.target.position.copy(HERO_POS).add(V(0, 1.2, 0));
    // sparkles: shrink swirl, then grow swirl
    if (t < 10) { P.root.getWorldPosition(tmp); swirl(sparksA, tmp, 0.45, 1.6, t, 4.5, T.small, 'in'); }
    else { swirl(sparksA, RETURN_POS, 0.5, 1.8, t, T.grow, T.big, 'out'); }
    renderPass.scene = sceneA;
  } else {
    // ---- set B ----
    const st = antState(t);
    bigAnt.g.position.copy(st.pos); bigAnt.g.rotation.y = st.yaw; animateAnt(bigAnt, st.phase, st.amp, t);
    bigAnt.head.rotation.y = t > 7.9 && t < 9.0 ? 0.35 * Math.sin(seg(t, 7.9, 9.0) * Math.PI) : 0;
    const P = arjunB; applyPose(P, poseAt(arjunBKeys, t));
    const saddle = bigAnt.g.localToWorld(V(0, 0.98, -0.05));
    if (t < T.jump) { P.root.position.set(0, 0, 20); P.root.rotation.y = lerp(0.25, 0.55, ss(7.4, 8.0, t)); }
    else if (t < T.seated) {
      const u = seg(t, T.jump, T.seated), from = V(0, 0, 20), to = saddle.clone().add(V(0, -0.9, 0));
      P.root.position.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u) + Math.sin(u * Math.PI) * 1.6, lerp(from.z, to.z, u));
      P.root.rotation.y = lerp(0.55, st.yaw, u);
    } else if (t < T.arrive) { P.root.position.copy(saddle).add(V(0, -0.9, 0)); P.root.rotation.y = st.yaw; }
    else {
      const u = seg(t, T.arrive, 13.35), from = saddle.clone().add(V(0, -0.9, 0)), to = V(9.6, 0, -49.3);
      P.root.position.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u) + Math.sin(u * Math.PI) * 1.2, lerp(from.z, to.z, u));
      P.root.rotation.y = lerp(st.yaw, Math.PI, u);
    }
    // ring: lying flat, then hoisted overhead
    const R = B.ring, rest = V(9.7, 0.45, -52.6);
    const u = inOut(seg(t, T.lift, T.held)), held = V(9.6, 5.25, -49.4);
    R.position.set(lerp(rest.x, held.x, u), lerp(rest.y, held.y, u), lerp(rest.z, held.z, u));
    R.rotation.set(lerp(Math.PI / 2, 0, u), lerp(0, -1.0, u), 0);
    B.ringLight.position.copy(R.position).add(V(0, 2, 2)); B.ringLight.intensity = 25 + 15 * Math.sin(t * 6) ** 2 + u * 25;
    // sparkles: landing burst, then twinkles around the ring
    if (t < 9.9) swirl(sparksB, V(0, 0, 20), 2.2, 2.5, t, 6.0, 6.9, 'out');
    else swirl(sparksB, R.position.clone().add(V(0, -2, 0)), 6, 4, t, 12.4, 14.45, 'twinkle');
    renderPass.scene = sceneB;
  }
  // ---- camera ----
  const u = inOut(seg(t, shot[0], shot[1]));
  if (shot[3]) {
    camera.position.lerpVectors(shot[3][0], shot[4][0], u);
    tmp.lerpVectors(shot[3][1], shot[4][1], u);
  } else {   // tracking the ride
    const st = antState(t), fwd = V(Math.sin(st.yaw), 0, Math.cos(st.yaw)), side = V(fwd.z, 0, -fwd.x);
    const cp = st.pos.clone().add(side.multiplyScalar(-2.6 + 1.2 * seg(t, 9.9, 12.5))).add(fwd.clone().multiplyScalar(-7.5 + 1.5 * seg(t, 9.9, 12.5))).add(V(0, 3.4 - 0.8 * seg(t, 9.9, 12.5), 0));
    camera.position.copy(cp); tmp.copy(st.pos).add(fwd.multiplyScalar(2.5)).add(V(0, 1.6, 0));
  }
  // a little handheld life
  camera.position.x += noise(t * 1.3) * (set === 'A' ? 0.006 : 0.06); camera.position.y += noise(t * 1.1 + 9) * (set === 'A' ? 0.005 : 0.05);
  const shake = t > T.flash && t < 5.6 ? 0.01 * (1 - seg(t, T.flash, 5.6)) : 0;
  camera.position.x += shake * noise(t * 60);
  camera.fov = shot[5]; camera.updateProjectionMatrix(); camera.lookAt(tmp);
  bloom.strength = set === 'B' ? 0.45 : 0.5;
  composer.render();
  overlay(t);
}
window.seek = seek;
window.DUR = DUR;
window.sceneReady = true;

if (!RENDER) {
  const stage = document.getElementById('stage');
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; };
  addEventListener('resize', fit); fit();
  let t0 = null;
  const loop = ts => { if (t0 === null) t0 = ts; seek(((ts - t0) / 1000) % DUR); requestAnimationFrame(loop); };
  document.fonts.ready.then(() => requestAnimationFrame(loop));
}
