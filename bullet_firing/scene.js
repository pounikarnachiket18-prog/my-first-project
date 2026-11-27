// "How a gun fires a bullet" — 5 s vertical cutaway, drawn entirely in Canvas 2D.
// renderFrame(t) is deterministic, so render.js can capture it frame by frame.

const W = 1080, H = 1920, DUR = 5;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const fade = (t, a, b, f = 0.15) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
const HF = (w, px) => `${w} ${px}px Deva, Inter, sans-serif`;
const EF = (w, px) => `${w} ${px}px Inter, sans-serif`;

// ---------- timeline ----------
const T = { release: 0.70, hit: 0.84, ignite: 0.93, move: 2.2, muzzle: 3.85 };
const MUZZLE = 2700, BASE0 = 530, NOSE0 = 700, TRAVEL = MUZZLE - NOSE0, SLOW = 340;
T.exitBase = T.muzzle + (MUZZLE - BASE0 - TRAVEL) / SLOW;   // bullet base clears the muzzle

function bulletD(t) {
  if (t < T.move) return 0;
  if (t < T.muzzle) { const u = (t - T.move) / (T.muzzle - T.move); return TRAVEL * u * u; }
  return TRAVEL + SLOW * (t - T.muzzle);                     // slow motion after the muzzle
}
function pressure(t) {
  if (t < T.ignite) return 0;
  const d = bulletD(t);
  let p = ss(T.ignite, 2.25, t) * Math.pow(330 / (330 + d), 1.15);
  if (t > T.exitBase) p *= Math.exp(-(t - T.exitBase) * 9);
  return p;
}
function speed(t) {
  if (t < T.move) return 0;
  if (t < T.muzzle) return 900 * Math.pow((t - T.move) / (T.muzzle - T.move), 0.75);
  return 900;
}
function pinTip(t) {
  if (t < T.release) return 128;
  if (t < T.hit) { const u = (t - T.release) / (T.hit - T.release); return lerp(128, 166, u * u); }
  return 166 - 5 * ss(1.3, 1.6, t);
}

// ---------- geometry (world units, axis on y = 0) ----------
function caseOuterR(x) {
  if (x < 178) return 72;                       // rim
  if (x < 192) return 60;                       // extractor groove
  if (x < 470) return lerp(70, 67, (x - 192) / 278);
  if (x < 510) return lerp(67, 41, (x - 470) / 40);
  return 41;                                    // neck, to the mouth at 580
}
function gasR(x) {                              // free radius inside case + bore
  if (x < 470) return lerp(63, 60, (x - 200) / 270);
  if (x < 510) return lerp(60, 35, (x - 470) / 40);
  if (x < 580) return 35;
  return 37;
}
function chamberR(x) {
  if (x < 192) return 74;
  if (x < 470) return lerp(72, 69, (x - 192) / 278);
  if (x < 510) return lerp(69, 43, (x - 470) / 40);
  if (x < 586) return 43;
  if (x < 632) return lerp(43, 37, (x - 586) / 46);
  return 37;
}
function barrelOuterR(x) {
  if (x < 560) return 152;
  if (x < 780) return lerp(152, 94, ss(560, 780, x));
  return lerp(94, 84, (x - 780) / (MUZZLE - 780));
}

function slab(x0, x1, outer, inner, sign, step = 6) {
  const p = new Path2D();
  p.moveTo(x0, sign * outer(x0));
  for (let x = x0; x <= x1; x += step) p.lineTo(x, sign * outer(x));
  p.lineTo(x1, sign * outer(x1));
  for (let x = x1; x >= x0; x -= step) p.lineTo(x, sign * inner(x));
  p.lineTo(x0, sign * inner(x0));
  p.closePath();
  return p;
}
const barrelTop = slab(158, MUZZLE, x => -barrelOuterR(x), x => -chamberR(x), 1);
const barrelBot = slab(158, MUZZLE, barrelOuterR, chamberR, 1);
const channelR = x => (x < 138 ? 28 : 11);
const boltTop = slab(-460, 158, () => -152, x => -channelR(x), 1, 2);
const boltBot = slab(-460, 158, () => 152, channelR, 1, 2);
const bore = slab(158, MUZZLE, x => -chamberR(x), chamberR, 1);

// Brass case, cut in half: outer silhouette minus cavity, primer pocket, flash hole.
const brass = (() => {
  const p = new Path2D();
  p.moveTo(160, -72);
  for (let x = 160; x <= 580; x += 2) p.lineTo(x, -caseOuterR(x));
  for (let x = 580; x >= 160; x -= 2) p.lineTo(x, caseOuterR(x));
  p.closePath();
  p.moveTo(160, -21); p.lineTo(178, -21); p.lineTo(178, -4); p.lineTo(200, -4);
  for (let x = 200; x <= 580; x += 2) p.lineTo(x, -gasR(x));
  for (let x = 580; x >= 200; x -= 2) p.lineTo(x, gasR(x));
  p.lineTo(200, 4); p.lineTo(178, 4); p.lineTo(178, 21); p.lineTo(160, 21);
  p.closePath();
  return p;
})();
const cavity = (() => {
  const p = new Path2D();
  p.moveTo(178, -4); p.lineTo(200, -4);
  for (let x = 200; x <= 580; x += 2) p.lineTo(x, -gasR(x));
  for (let x = 580; x >= 200; x -= 2) p.lineTo(x, gasR(x));
  p.lineTo(200, 4); p.lineTo(178, 4); p.closePath();
  return p;
})();
function gasRegion(base) {
  const p = new Path2D();
  p.moveTo(178, -4); p.lineTo(200, -4);
  for (let x = 200; x < base; x += 4) p.lineTo(x, -gasR(x));
  p.lineTo(base, -gasR(base)); p.lineTo(base, gasR(base));
  for (let x = base; x > 200; x -= 4) p.lineTo(x, gasR(x));
  p.lineTo(200, 4); p.lineTo(178, 4); p.closePath();
  return p;
}
function bulletPath(b) {
  const p = new Path2D();
  p.moveTo(b, -30); p.lineTo(b + 5, -35); p.lineTo(b + 90, -35);
  p.quadraticCurveTo(b + 152, -32, b + 170, -3);
  p.lineTo(b + 170, 3);
  p.quadraticCurveTo(b + 152, 32, b + 90, 35);
  p.lineTo(b + 5, 35); p.lineTo(b, 30); p.closePath();
  return p;
}

// Powder granules, packed once with a fixed seed.
const grains = (() => {
  const r = rng(7), out = [];
  for (let i = 0; i < 9000 && out.length < 340; i++) {
    const gr = 6 + r() * 2.6, x = 205 + gr + r() * 300, y = (r() * 2 - 1) * 64;
    const lim = Math.min(gasR(x - gr), gasR(x + gr)) - 1.5;
    if (Math.abs(y) + gr > lim) continue;
    if (out.some(g => (g.x - x) ** 2 + (g.y - y) ** 2 < ((g.r + gr) * 0.93) ** 2)) continue;
    out.push({ x, y, r: gr, ti: T.ignite + 0.05 + (x - 200) / 310 * 0.72 + r() * 0.12 + Math.abs(y) / 64 * 0.06, s: r() });
  }
  return out;
})();
const sparks = (() => { const r = rng(11); return Array.from({ length: 56 }, () => ({ t0: T.hit + 0.05 + r() * 0.12, a: (r() * 2 - 1) * 0.95, v: 260 + r() * 520, life: 0.25 + r() * 0.25 })); })();
const blobs = (() => { const r = rng(23); return Array.from({ length: 70 }, () => ({ h: r(), y: r() * 2 - 1, rad: 26 + r() * 46, sp: 0.6 + r() * 0.9 })); })();
const spikes = (() => { const r = rng(31); return Array.from({ length: 18 }, (_, i) => ({ a: i < 13 ? (r() * 2 - 1) * 0.42 : (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.5), L: 0.5 + r() * 0.7, w: 0.06 + r() * 0.08 })); })();
const smoke = (() => { const r = rng(43); return Array.from({ length: 26 }, () => ({ a: (r() * 2 - 1) * 1.3, d: 0.3 + r(), rad: 40 + r() * 70, g: 90 + r() * 50, delay: r() * 0.12 })); })();
const grainTile = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), im = g.createImageData(256, 256), r = rng(99);
  for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
})();

// ---------- camera ----------
const CY = 880;
const KEYS = [[0, 250, 0.95], [0.5, 245, 0.98], [0.86, 172, 1.55], [1.25, 190, 1.5], [1.75, 330, 1.12], [2.2, 340, 1.1]];
function cam(t) {
  let cx = KEYS[KEYS.length - 1][1], s = KEYS[KEYS.length - 1][2];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [ta, xa, sa] = KEYS[i], [tb, xb, sb] = KEYS[i + 1];
    if (t <= tb) { const u = ss(ta, tb, t); cx = lerp(xa, xb, u); s = lerp(sa, sb, u); break; }
  }
  if (t > T.move) {
    const nose = NOSE0 + bulletD(t);
    cx = lerp(cx, Math.max(nose - 280, cx), ss(T.move, 2.65, t));
    s = lerp(1.1, 1.02, ss(T.move, 2.9, t));
    const e = ss(3.5, 4.05, t);
    cx = lerp(cx, 2900, e); s = lerp(s, 0.95, e);
  }
  let A = 0;
  if (t > T.hit) A += 7 * Math.exp(-(t - T.hit) * 18);
  if (t > T.move) A += 9 * Math.exp(-(t - T.move) * 6);
  if (t > T.exitBase) A += 24 * Math.exp(-(t - T.exitBase) * 6);
  return { cx, s, sx: A * noise1(t * 45), sy: A * noise1(t * 45 + 77) };
}
let C;  // current camera
const toScreen = (x, y) => [540 + (x - C.cx) * C.s + C.sx, CY + y * C.s + C.sy];
function applyCam() { ctx.setTransform(C.s, 0, 0, C.s, 540 - C.cx * C.s + C.sx, CY + C.sy); }

// ---------- drawing ----------
function background() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(540, CY, 50, 540, CY, 1300);
  g.addColorStop(0, '#18202b'); g.addColorStop(0.55, '#0b0f15'); g.addColorStop(1, '#040507');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,160,200,0.045)'; ctx.lineWidth = 1;
  const off = (-C.cx * C.s * 0.25) % 60;
  for (let x = off; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x, 1300); ctx.stroke(); }
  for (let y = 420; y <= 1300; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function hatch(path, color, spacing = 15) {
  ctx.save(); ctx.clip(path);
  ctx.strokeStyle = color; ctx.lineWidth = 1.6 / C.s;
  const x0 = C.cx - 700 / C.s, x1 = C.cx + 700 / C.s;
  ctx.beginPath();
  for (let x = Math.floor(x0 / spacing) * spacing - 400; x < x1 + 400; x += spacing) { ctx.moveTo(x, -400); ctx.lineTo(x + 400, 400); }
  ctx.stroke(); ctx.restore();
}

function steel(path, top, ext) {
  const g = ctx.createLinearGradient(0, top ? -ext : ext, 0, 0);
  g.addColorStop(0, '#9aa6b5'); g.addColorStop(0.08, '#56606d'); g.addColorStop(0.55, '#2c333c'); g.addColorStop(1, '#1b2027');
  ctx.fillStyle = g; ctx.fill(path);
  hatch(path, 'rgba(210,225,240,0.07)');
  ctx.strokeStyle = 'rgba(190,210,235,0.55)'; ctx.lineWidth = 2 / C.s; ctx.stroke(path);
}

function drawBore(t, camV) {
  const g = ctx.createLinearGradient(0, -37, 0, 37);
  g.addColorStop(0, '#05070a'); g.addColorStop(0.5, '#151a21'); g.addColorStop(1, '#05070a');
  ctx.fillStyle = g; ctx.fill(bore);
  ctx.save(); ctx.clip(bore);
  const a = clamp(1 - Math.abs(camV) / 900);
  if (a > 0.01) {                                // rifling grooves on the far wall
    ctx.lineWidth = 9;
    for (let x = 640; x < MUZZLE; x += 46) {
      ctx.strokeStyle = `rgba(0,0,0,${0.5 * a})`;
      ctx.beginPath(); ctx.moveTo(x, -37); ctx.lineTo(x + 26, 37); ctx.stroke();
      ctx.strokeStyle = `rgba(160,190,220,${0.07 * a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 7, -37); ctx.lineTo(x + 33, 37); ctx.stroke(); ctx.lineWidth = 9;
    }
  }
  if (a < 0.99) {                                // motion streaks when the camera races
    ctx.strokeStyle = `rgba(150,180,210,${0.12 * (1 - a)})`; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const y = -30 + i * 10; ctx.beginPath(); ctx.moveTo(C.cx - 800, y); ctx.lineTo(C.cx + 800, y); ctx.stroke(); }
  }
  ctx.restore();
}

function drawCaseInterior() {
  const g = ctx.createLinearGradient(0, -64, 0, 64);
  g.addColorStop(0, '#1d150a'); g.addColorStop(0.5, '#3a2a13'); g.addColorStop(1, '#1d150a');
  ctx.fillStyle = g; ctx.fill(cavity);
}

function drawPowder(t, d) {
  for (const gr of grains) {
    const burn = ss(gr.ti, gr.ti + 0.12, t), gone = ss(gr.ti + 0.15, gr.ti + 0.55, t);
    const r = gr.r * (1 - gone);
    if (r < 0.4) continue;
    const x = gr.x + Math.min(d, 200) * 0.3 * burn;
    ctx.fillStyle = burn > 0.01
      ? `rgb(${lerp(48, 255, burn) | 0},${lerp(52, 150, burn) | 0},${lerp(40, 40, burn) | 0})`
      : `rgb(${44 + gr.s * 14 | 0},${48 + gr.s * 12 | 0},${36 + gr.s * 8 | 0})`;
    ctx.beginPath(); ctx.arc(x, gr.y, r, 0, Math.PI * 2); ctx.fill();
    if (burn < 0.05) {
      ctx.fillStyle = 'rgba(200,210,190,0.28)';
      ctx.beginPath(); ctx.arc(x - r * 0.35, gr.y - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x, gr.y, 0, x, gr.y, r * 3.2);
      gg.addColorStop(0, `rgba(255,190,90,${0.55 * burn * (1 - gone * 0.6)})`); gg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, gr.y, r * 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

function drawGas(t, base) {
  if (t < T.ignite) return;
  const P = pressure(t);
  const front = lerp(200, base, ss(T.ignite, T.ignite + 0.85, t));
  const reg = gasRegion(base);
  ctx.save(); ctx.clip(reg); ctx.globalCompositeOperation = 'lighter';
  const heat = Math.max(P, 0.35 * ss(T.ignite, T.ignite + 0.3, t) * (1 - ss(T.exitBase, T.exitBase + 0.3, t)));
  const g = ctx.createLinearGradient(178, 0, Math.max(front, 200) + 40, 0);
  g.addColorStop(0, `rgba(255,${130 + 90 * P | 0},50,${0.65 * heat})`);
  g.addColorStop(0.8, `rgba(255,${110 + 80 * P | 0},40,${0.45 * heat})`);
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g; ctx.fillRect(170, -80, base - 160, 160);
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const x = 200 + ((b.h + t * b.sp) % 1) * (base - 200);
    if (x > front) continue;
    const y = b.y * gasR(Math.min(x, base)) * 0.75 + noise1(t * 3 + i) * 8;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, b.rad);
    rg.addColorStop(0, `rgba(255,${200 + 40 * P | 0},120,${0.22 * heat + 0.04})`); rg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, b.rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPrimerFire(t) {
  if (t < T.hit) return;
  const dt = t - T.hit;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fa = Math.exp(-dt * 9);                  // flash at the primer
  let g = ctx.createRadialGradient(172, 0, 0, 172, 0, 40 + dt * 120);
  g.addColorStop(0, `rgba(255,255,235,${fa})`); g.addColorStop(0.4, `rgba(255,200,90,${0.7 * fa})`); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(172, 0, 40 + dt * 120, 0, Math.PI * 2); ctx.fill();
  ctx.clip(cavity);                              // flame jet through the flash hole
  const L = 170 * ss(0, 0.12, dt), ja = 1 - ss(0.2, 0.5, dt);
  g = ctx.createLinearGradient(178, 0, 178 + L, 0);
  g.addColorStop(0, `rgba(255,250,220,${ja})`); g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(178 + L / 2, 0, L / 2 + 1, 6 + L * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  for (const s of sparks) {
    const st = t - s.t0; if (st < 0 || st > s.life) continue;
    const k = 5, f = (1 - Math.exp(-k * st)) / k, f2 = (1 - Math.exp(-k * Math.max(0, st - 0.03))) / k;
    const x = 200 + Math.cos(s.a) * s.v * f, y = Math.sin(s.a) * s.v * f;
    const x2 = 200 + Math.cos(s.a) * s.v * f2, y2 = Math.sin(s.a) * s.v * f2;
    ctx.strokeStyle = `rgba(255,230,150,${1 - st / s.life})`; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
  }
  ctx.restore();
}

function drawCase(t) {
  const g = ctx.createLinearGradient(0, -72, 0, 72);
  g.addColorStop(0, '#ffe2a0'); g.addColorStop(0.07, '#c99a3e'); g.addColorStop(0.3, '#8a6322');
  g.addColorStop(0.5, '#5e4316'); g.addColorStop(0.7, '#8a6322'); g.addColorStop(0.93, '#c99a3e'); g.addColorStop(1, '#ffe2a0');
  ctx.fillStyle = g; ctx.fill(brass, 'evenodd');
  ctx.save(); ctx.clip(brass, 'evenodd'); hatch(new Path2D('M0,-200H700V200H0Z'), 'rgba(255,240,200,0.09)', 12); ctx.restore();
  const P = pressure(t);
  if (P > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,90,20,${0.18 * P})`; ctx.fill(brass, 'evenodd'); ctx.restore(); }
  ctx.strokeStyle = 'rgba(255,225,160,0.6)'; ctx.lineWidth = 1.6 / C.s; ctx.stroke(brass);
  // primer cup and compound
  ctx.fillStyle = '#b9bcc0'; ctx.fillRect(160, -20, 17, 40);
  ctx.fillStyle = t < T.hit ? '#8a5560' : '#2a1d1d'; ctx.fillRect(163, -16, 11, 32);
  ctx.fillStyle = '#d9dcdf'; ctx.beginPath(); ctx.moveTo(176, -12); ctx.lineTo(168, 0); ctx.lineTo(176, 12); ctx.closePath(); ctx.fill();
  if (t >= T.hit) { ctx.fillStyle = '#4b4f55'; ctx.beginPath(); ctx.ellipse(161, 0, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); }
}

function drawBolt(t) {
  steel(boltTop, true, 152); steel(boltBot, false, 152);
  const tip = pinTip(t), collar = tip - 185;
  // spring
  ctx.strokeStyle = '#9fb0c2'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath();
  const xA = -455, n = 10;
  for (let i = 0; i <= n * 2; i++) { const x = lerp(xA, collar - 10, i / (n * 2)); ctx.lineTo(x, i === 0 || i === n * 2 ? 0 : (i % 2 ? -20 : 20)); }
  ctx.stroke();
  // firing pin
  const g = ctx.createLinearGradient(0, -22, 0, 22);
  g.addColorStop(0, '#f2f6fb'); g.addColorStop(0.35, '#a9b4c0'); g.addColorStop(1, '#3d4550');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tip - 330, -10); ctx.lineTo(tip - 32, -10); ctx.lineTo(tip, -3); ctx.lineTo(tip, 3); ctx.lineTo(tip - 32, 10); ctx.lineTo(tip - 330, 10); ctx.closePath(); ctx.fill();
  ctx.fillRect(collar - 10, -23, 22, 46);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5 / C.s; ctx.strokeRect(collar - 10, -23, 22, 46);
}

function drawBullet(t, base, d) {
  const p = bulletPath(base);
  const g = ctx.createLinearGradient(0, -35, 0, 35);
  g.addColorStop(0, '#ffd9ad'); g.addColorStop(0.12, '#e08a4a'); g.addColorStop(0.45, '#a9521f'); g.addColorStop(0.8, '#5e2a0e'); g.addColorStop(1, '#2c1206');
  ctx.fillStyle = g; ctx.fill(p);
  if (d > 70) {                                   // engraved by the rifling, and spinning
    ctx.save(); ctx.clip(p);
    const a = ss(70, 160, d), ph = (d * 0.55) % 30;
    ctx.strokeStyle = `rgba(40,14,4,${0.6 * a})`; ctx.lineWidth = 5;
    for (let x = base - 60 + ph; x < base + 110; x += 30) { ctx.beginPath(); ctx.moveTo(x, -36); ctx.lineTo(x + 18, 36); ctx.stroke(); }
    ctx.strokeStyle = `rgba(255,210,170,${0.35 * a})`; ctx.lineWidth = 1.5;
    for (let x = base - 56 + ph; x < base + 110; x += 30) { ctx.beginPath(); ctx.moveTo(x, -36); ctx.lineTo(x + 18, 36); ctx.stroke(); }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,220,180,0.75)'; ctx.lineWidth = 1.8 / C.s; ctx.stroke(p);
}

function drawMuzzle(t) {
  if (t < T.muzzle - 0.05) return;
  const u0 = t - (T.muzzle - 0.05);
  ctx.save();
  // precursor puff (air and leaking gas pushed ahead of the bullet)
  const pr = 30 + u0 * 260, pa = 0.22 * (1 - ss(0.4, 1.1, u0));
  let g = ctx.createRadialGradient(MUZZLE + pr * 0.6, 0, 0, MUZZLE + pr * 0.6, 0, pr);
  g.addColorStop(0, `rgba(170,185,200,${pa})`); g.addColorStop(1, 'rgba(170,185,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MUZZLE + pr * 0.6, 0, pr, 0, Math.PI * 2); ctx.fill();
  if (t > T.exitBase) {
    const u = t - T.exitBase;
    for (const s of smoke) {                       // smoke
      const su = Math.max(0, u - s.delay), dist = 60 + Math.sqrt(su) * 520 * s.d, rad = s.rad * (0.4 + su * 2.2);
      const x = MUZZLE + Math.cos(s.a) * dist, y = Math.sin(s.a) * dist * 0.8;
      const a = 0.35 * ss(0, 0.08, su) * (1 - su * 0.6);
      g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${s.g},${s.g + 5},${s.g + 12},${a})`); g.addColorStop(1, `rgba(${s.g},${s.g},${s.g},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    const I = ss(0, 0.05, u) * Math.exp(-u * 3.2), grow = ss(0, 0.25, u);
    for (const sp of spikes) {                     // flame petals
      const L = (160 + 520 * sp.L) * grow, wA = sp.w * L;
      const ex = MUZZLE + Math.cos(sp.a) * L, ey = Math.sin(sp.a) * L;
      g = ctx.createLinearGradient(MUZZLE, 0, ex, ey);
      g.addColorStop(0, `rgba(255,250,215,${0.9 * I})`); g.addColorStop(0.4, `rgba(255,170,60,${0.6 * I})`); g.addColorStop(1, 'rgba(255,80,10,0)');
      ctx.fillStyle = g;
      const nx = -Math.sin(sp.a) * wA, ny = Math.cos(sp.a) * wA;
      ctx.beginPath(); ctx.moveTo(MUZZLE, -18); ctx.quadraticCurveTo(MUZZLE + Math.cos(sp.a) * L * 0.45 + nx, Math.sin(sp.a) * L * 0.45 + ny, ex, ey);
      ctx.quadraticCurveTo(MUZZLE + Math.cos(sp.a) * L * 0.45 - nx, Math.sin(sp.a) * L * 0.45 - ny, MUZZLE, 18); ctx.closePath(); ctx.fill();
    }
    const cr = 90 + 260 * grow;                    // white-hot core
    g = ctx.createRadialGradient(MUZZLE + 70, 0, 0, MUZZLE + 70, 0, cr);
    g.addColorStop(0, `rgba(255,255,245,${I})`); g.addColorStop(0.3, `rgba(255,210,120,${0.75 * I})`); g.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MUZZLE + 70, 0, cr, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';  // shock ring
    const R = 60 + u * 1500;
    ctx.strokeStyle = `rgba(210,230,255,${0.45 * (1 - ss(0, 0.65, u))})`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(MUZZLE, 0, R, -1.25, 1.25); ctx.stroke();
  }
  ctx.restore();
}

// ---------- HUD ----------
function txt(s, x, y, font, color, align = 'left', alpha = 1, spacing = '0px') {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = spacing; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 14;
  ctx.fillText(s, x, y); ctx.restore();
}
function callout(ax, ay, dx, dy, dir, hi, en, a) {
  if (a <= 0.01) return;
  const [sx, sy] = toScreen(ax, ay), ex = sx + dx, ey = sy + dy, tx = ex + dir * 26;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffc266'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(tx, ey); ctx.stroke();
  ctx.fillStyle = '#ffc266'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const al = dir > 0 ? 'left' : 'right', x = tx + dir * 10;
  txt(hi, x, ey + 10, HF(700, 36), '#ffffff', al, a);
  txt(en, x, ey + 42, EF(600, 23), '#a9b4c2', al, a);
}

function hud(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  txt('BALLISTICS  ·  CUTAWAY', 540, 118, EF(700, 26), '#ffb347', 'center', 1, '6px');
  txt('गोली कैसे चलती है?', 540, 212, HF(800, 80), '#ffffff', 'center');
  txt('How a gun fires a bullet', 540, 268, EF(500, 36), '#aab3bf', 'center');

  const stages = ['STRIKE', 'IGNITE', 'PRESSURE', 'EXIT'];
  const idx = t < T.ignite ? 0 : t < 1.85 ? 1 : t < T.muzzle ? 2 : 3;
  const cw = 210, gap = 36, x0 = (W - (cw * 4 + gap * 3)) / 2, y = 318;
  stages.forEach((s, i) => {
    const x = x0 + i * (cw + gap), on = i === idx, done = i < idx;
    ctx.save();
    ctx.fillStyle = on ? 'rgba(255,170,60,0.95)' : done ? 'rgba(255,170,60,0.16)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = on ? '#ffd08a' : done ? 'rgba(255,170,60,0.5)' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, cw, 58, 29); ctx.fill(); ctx.stroke(); ctx.restore();
    txt((done ? '✓ ' : '') + s, x + cw / 2, y + 39, EF(800, 24), on ? '#1a0f02' : done ? '#ffcf8c' : '#7f8894', 'center', 1, '2px');
    if (i < 3) txt('›', x + cw + gap / 2, y + 42, EF(700, 34), '#5d6670', 'center');
  });

  if (t > T.muzzle) {
    const a = ss(T.muzzle, T.muzzle + 0.1, t);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,60,60,0.15)'; ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(800, 438, 230, 52, 26); ctx.fill(); ctx.stroke();
    ctx.fillStyle = (Math.floor(t * 4) % 2) ? '#ff4d4d' : '#ff9a9a'; ctx.beginPath(); ctx.arc(830, 464, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    txt('SLOW-MO', 852, 474, EF(800, 25), '#ffd6d6', 'left', a, '3px');
  }

  // gauges
  const P = pressure(t), v = speed(t);
  gauge(60, 1338, 'दबाव', 'CHAMBER PRESSURE', `${(Math.round(P * 3800 / 10) * 10).toLocaleString('en-US')}`, 'bar', P, '#ff7a2f');
  gauge(564, 1338, 'रफ़्तार', 'BULLET SPEED', `${Math.round(v)}`, 'm/s', v / 900, '#5cc8ff');

  // subtitles
  const subs = [
    [-1, T.ignite, 'फायरिंग पिन प्राइमर पर टकराती है', 'The firing pin strikes the primer'],
    [T.ignite, 1.85, 'प्राइमर की चिंगारी बारूद जलाती है', "The primer's spark ignites the powder"],
    [1.85, 2.8, 'जलता बारूद तेज़ दबाव वाली गैस बनता है', 'Burning powder turns into high-pressure gas'],
    [2.8, T.muzzle, 'गैस का दबाव गोली को नली में धकेलता है', 'Gas pressure drives the bullet down the barrel'],
    [T.muzzle, 5.2, 'खांचे गोली को घुमाते हैं — लगभग 900 m/s', 'Rifling spins it out at about 900 m/s'],
  ];
  for (const [a, b, hi, en] of subs) {
    const al = ss(a, a + 0.08, t) * (1 - ss(b - 0.08, b, t));
    if (al <= 0.01) continue;
    txt(hi, 540, 1660, HF(800, 54), '#ffffff', 'center', al);
    txt(en, 540, 1722, EF(500, 32), '#b8c0cc', 'center', al);
  }
}
function gauge(x, y, hi, en, val, unit, f, col) {
  const w = 456, h = 170;
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill(); ctx.stroke(); ctx.restore();
  txt(hi, x + 26, y + 46, HF(700, 30), '#ffffff');
  txt(en, x + w - 26, y + 44, EF(700, 18), '#8a94a1', 'right', 1, '2px');
  txt(val, x + 26, y + 116, EF(800, 58), col);
  ctx.save(); ctx.font = EF(800, 58); const vw = ctx.measureText(val).width; ctx.restore();
  txt(unit, x + 36 + vw, y + 116, EF(600, 28), '#aab3bf');
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(x + 26, y + 138, w - 52, 12, 6); ctx.fill();
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
  if (f > 0.005) { ctx.beginPath(); ctx.roundRect(x + 26, y + 138, (w - 52) * clamp(f), 12, 6); ctx.fill(); }
  ctx.restore();
}

function post(t, frame) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (t > T.hit) {
    const [px, py] = toScreen(172, 0), a = 0.3 * Math.exp(-(t - T.hit) * 10);
    const g = ctx.createRadialGradient(px, py, 0, px, py, 520);
    g.addColorStop(0, `rgba(255,200,120,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (t > T.exitBase) {
    const [mx, my] = toScreen(MUZZLE + 80, 0), a = 0.5 * ss(0, 0.04, t - T.exitBase) * Math.exp(-(t - T.exitBase) * 4.5);
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 950);
    g.addColorStop(0, `rgba(255,210,140,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  const v = ctx.createRadialGradient(540, 960, 500, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  const r = rng(frame + 1), ox = r() * 256 | 0, oy = r() * 256 | 0;
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(grainTile, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

// ---------- frame ----------
function renderFrame(t, frame = Math.round(t * 60)) {
  C = cam(t);
  const camV = (cam(t + 1 / 60).cx - C.cx) * 60 * C.s;
  const d = bulletD(t), base = BASE0 + d;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  background();
  applyCam();
  drawBore(t, camV);
  drawCaseInterior();
  drawPowder(t, d);
  drawGas(t, Math.min(base, MUZZLE));
  drawPrimerFire(t);
  steel(barrelTop, true, 152); steel(barrelBot, false, 152);
  drawCase(t);
  drawBolt(t);
  drawMuzzle(t);
  drawBullet(t, base, d);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tip = pinTip(t), nose = NOSE0 + d;
  callout(tip - 110, 8, -20, 230, 1, 'फायरिंग पिन', 'Firing pin', fade(t, -1, 1.45));
  callout(168, -18, -20, -230, -1, 'प्राइमर', 'Primer', fade(t, -1, 1.45));
  callout(330, -69, 40, -170, 1, 'खोखा', 'Brass case', fade(t, -1, 0.78));
  callout(640, -30, 30, -320, -1, 'गोली', 'Bullet', fade(t, -1, 0.74));
  callout(330, 25, 40, 260, 1, 'बारूद', 'Gunpowder', fade(t, -1, 2.15));
  { const a = fade(t, 2.75, 3.65);
    if (a > 0.01) { const wx = C.cx + 120 / C.s; callout(wx, -37, -40, -200, -1, 'नली के खांचे', 'Rifling grooves', a); } }
  callout(nose - 70, -34, -60, -230, -1, 'घूमती गोली', 'Spinning bullet', fade(t, 4.05, 5.3));
  callout(MUZZLE + 90, 60, 30, 240, 1, 'मज़ल फ्लैश', 'Muzzle flash', fade(t, T.exitBase + 0.12, 5.3));

  hud(t);
  post(t, frame);
}
window.renderFrame = renderFrame;
window.DUR = DUR;

if (!/render=1/.test(location.search)) {
  let start = null;
  const loop = ts => { if (start === null) start = ts; renderFrame(((ts - start) / 1000) % DUR); requestAnimationFrame(loop); };
  document.fonts.ready.then(() => requestAnimationFrame(loop));
}
