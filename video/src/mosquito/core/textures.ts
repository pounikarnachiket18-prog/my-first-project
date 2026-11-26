/**
 * Procedural, deterministic textures generated on canvas at load time.
 * No downloaded assets — every map is reproducible from a seed.
 */
import * as THREE from "three";
import { rng } from "./anim";

const memo = new Map<string, any>();
function once<T>(key: string, f: () => T): T {
  if (!memo.has(key)) memo.set(key, f());
  return memo.get(key);
}

// ---------- 2D value noise ----------
function makeNoise2(seed: number) {
  const r = rng(seed);
  const P = 256;
  const g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (x: number, y: number) => g[(((y % P) + P) % P) * P + (((x % P) + P) % P)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  };
}
export const noise2 = makeNoise2(1337);
export const fbm2 = (x: number, y: number, oct = 4) => {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += noise2(x * f + i * 17.3, y * f - i * 9.1) * a;
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
};

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function heightToNormal(hgt: Float32Array, w: number, h: number, strength: number, wrap = true) {
  const c = canvas(w, h);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const H = (x: number, y: number) => {
    if (wrap) {
      x = (x + w) % w;
      y = (y + h) % h;
    } else {
      x = Math.min(w - 1, Math.max(0, x));
      y = Math.min(h - 1, Math.max(0, y));
    }
    return hgt[y * w + x];
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- Compound eye: hexagonal ommatidia lattice ----------
export const eyeNormalMap = () =>
  once("eyeN", () => {
    const w = 512, h = 512;
    const hgt = new Float32Array(w * h);
    const cell = 512 / 22; // ~22 facets across the tile
    const rowH = (cell * Math.sqrt(3)) / 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const row = Math.round(y / rowH);
        let best = 1e9;
        for (let dr = -1; dr <= 1; dr++) {
          const rr = row + dr;
          const off = (rr & 1) * cell * 0.5;
          const col = Math.round((x - off) / cell);
          for (let dc = -1; dc <= 1; dc++) {
            const cx = (col + dc) * cell + off;
            const cy = rr * rowH;
            const d = Math.hypot(x - cx, y - cy);
            if (d < best) best = d;
          }
        }
        const r = best / (cell * 0.52);
        hgt[y * w + x] = Math.sqrt(Math.max(0, 1 - r * r)); // dome per facet
      }
    return heightToNormal(hgt, w, h, 2.2);
  });

// ---------- Wing: membrane + venation + scale fringe (alpha in A) ----------
export const wingMap = () =>
  once("wing", () => {
    const w = 1024, h = 256;
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    // UV space: x = base→tip, y = leading edge (top) → trailing edge (bottom)
    ctx.fillStyle = "rgba(62,68,76,0.13)";
    ctx.fillRect(0, 0, w, h);
    const r = rng(77);
    const vein = (pts: [number, number][], width: number, alpha: number) => {
      ctx.strokeStyle = `rgba(52,44,38,${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.stroke();
      // scales along veins (mosquito wing veins are scaled)
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        const n = Math.ceil(Math.hypot((x1 - x0) * w, (y1 - y0) * h) / 9);
        for (let k = 0; k < n; k++) {
          const u = k / n;
          const px = (x0 + (x1 - x0) * u) * w;
          const py = (y0 + (y1 - y0) * u) * h;
          ctx.fillStyle = `rgba(35,30,26,${0.55 + r() * 0.35})`;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.atan2((y1 - y0) * h, (x1 - x0) * w) + (r() - 0.5) * 0.6);
          ctx.fillRect(-4, -1.6, 8, 3.2);
          ctx.restore();
        }
      }
    };
    // Costa (leading edge) & subcosta
    vein([[0.0, 0.08], [0.5, 0.05], [0.92, 0.12], [1.0, 0.3]], 5, 0.95);
    vein([[0.02, 0.14], [0.45, 0.12]], 3, 0.85);
    // Radius R1, R2/R3 fork, R4+5
    vein([[0.02, 0.2], [0.55, 0.18], [0.98, 0.25]], 3.2, 0.9);
    vein([[0.45, 0.24], [0.7, 0.27], [0.99, 0.38]], 2.6, 0.85);
    vein([[0.7, 0.27], [0.97, 0.47]], 2.4, 0.8);
    vein([[0.35, 0.3], [0.72, 0.4], [0.96, 0.56]], 2.6, 0.85);
    // Media M1+2 fork, M3+4
    vein([[0.06, 0.36], [0.5, 0.42], [0.66, 0.48], [0.92, 0.66]], 2.6, 0.85);
    vein([[0.66, 0.48], [0.86, 0.74]], 2.2, 0.8);
    vein([[0.25, 0.48], [0.58, 0.62], [0.74, 0.84]], 2.4, 0.8);
    // Cubitus & anal vein
    vein([[0.05, 0.5], [0.33, 0.66], [0.52, 0.9]], 2.6, 0.85);
    vein([[0.04, 0.62], [0.22, 0.86]], 2.4, 0.8);
    // Cross veins
    vein([[0.5, 0.42], [0.47, 0.24]], 1.6, 0.6);
    vein([[0.58, 0.62], [0.62, 0.45]], 1.6, 0.55);
    // Fringe scales along posterior margin
    for (let i = 0; i < 260; i++) {
      const u = 0.05 + (i / 260) * 0.95;
      ctx.strokeStyle = `rgba(40,34,30,${0.45 + r() * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(u * w, h * 0.93);
      ctx.lineTo(u * w + 6 + r() * 4, h * (0.985 + r() * 0.015));
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });

// ---------- Thorax scutum: dark scales with Aedes "lyre" pattern ----------
export const thoraxMap = () =>
  once("thorax", () => {
    const w = 1024, h = 512;
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = fbm2(x / 14, y / 14, 3) * 0.5 + 0.5;
        const v = 18 + n * 22;
        const i = (y * w + x) * 4;
        img.data[i] = v * 1.05;
        img.data[i + 1] = v * 0.95;
        img.data[i + 2] = v * 0.85;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    // Dorsal centre is u = 0.75 (sphere rotated so poles face ±Z)
    const cx = 0.75 * w;
    ctx.strokeStyle = "rgba(236,232,222,0.95)";
    ctx.lineCap = "round";
    // Lyre: two curved outer lines
    ctx.lineWidth = 9;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 40, h * 0.12);
      ctx.bezierCurveTo(cx + s * 120, h * 0.3, cx + s * 120, h * 0.55, cx + s * 55, h * 0.78);
      ctx.stroke();
    }
    // Two thin median lines
    ctx.lineWidth = 3.5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 12, h * 0.2);
      ctx.lineTo(cx + s * 12, h * 0.72);
      ctx.stroke();
    }
    // Lateral silvery scale patches (pleura): soft, elongated, low contrast
    for (const u of [0.25, 0.5]) {
      for (const yy of [0.42, 0.64]) {
        const g = ctx.createRadialGradient(u * w, h * yy, 2, u * w, h * yy, 40);
        g.addColorStop(0, "rgba(210,206,196,0.55)");
        g.addColorStop(1, "rgba(210,206,196,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(u * w, h * yy);
        ctx.scale(1.6, 0.6);
        ctx.translate(-u * w, -h * yy);
        ctx.fillRect(u * w - 50, h * yy - 50, 100, 100);
        ctx.restore();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });

// ---------- Scale micro-normal (shared by thorax/abdomen/legs) ----------
export const scaleNormalMap = () =>
  once("scaleN", () => {
    const w = 256, h = 256;
    const hgt = new Float32Array(w * h);
    const r = rng(9);
    for (let i = 0; i < 1400; i++) {
      const cx = r() * w, cy = r() * h;
      const len = 7 + r() * 5, wid = 3 + r() * 1.5;
      for (let y = -12; y <= 12; y++)
        for (let x = -12; x <= 12; x++) {
          const px = Math.floor(cx + x), py = Math.floor(cy + y);
          const e = (x / len) ** 2 + (y / wid) ** 2;
          if (e < 1) {
            const idx = (((py % h) + h) % h) * w + (((px % w) + w) % w);
            hgt[idx] = Math.max(hgt[idx], (1 - e) * (0.6 + 0.4 * (x / len + 1) * 0.5));
          }
        }
    }
    return heightToNormal(hgt, w, h, 1.5);
  });

// ---------- Abdomen tergite: dark with white basal band + lateral patches ----------
export const abdomenMap = () =>
  once("abdomen", () => {
    const w = 512, h = 256;
    const c = canvas(w, h);
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = fbm2(x / 10, y / 10, 3) * 0.5 + 0.5;
        let v = 16 + n * 20;
        const vy = y / h; // 0 = segment base (front) … 1 = rear
        const u = x / w;
        // basal band, stronger laterally (u≈0.0/0.5 are sides after lathe)
        const lateral = Math.pow(Math.abs(Math.cos(u * Math.PI * 2)), 2.5);
        if (vy < 0.22) v = 16 + (200 + n * 30) * (0.35 + 0.65 * lateral) * (1 - vy / 0.22) ** 0.6;
        const i = (y * w + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v * 0.97;
        img.data[i + 2] = v * 0.92;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

// ---------- Human skin micro-relief (shared by geometry & normal map) ----------
export type SkinField = {
  size: number; // patch size in world units (mm)
  height: (x: number, y: number) => number;
  pores: { x: number; y: number; r: number }[];
};

export const skinField = (size = 8, seed = 5): SkinField =>
  once(`skinField-${size}-${seed}`, () => {
    const r = rng(seed);
    // Two-scale jittered Voronoi: primary furrows (~1.1 mm) + secondary lines (~0.38 mm)
    const mkSites = (cell: number) => {
      const n = Math.ceil(size / cell) + 3;
      const pts = new Float32Array(n * n * 2);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          pts[(j * n + i) * 2] = (i - 1 + 0.1 + r() * 0.8) * cell;
          pts[(j * n + i) * 2 + 1] = (j - 1 + 0.1 + r() * 0.8) * cell;
        }
      return { cell, n, pts };
    };
    const A = mkSites(1.1);
    const B = mkSites(0.38);
    const edgeDist = (S: { cell: number; n: number; pts: Float32Array }, x: number, y: number) => {
      const ci = Math.floor(x / S.cell) + 1, cj = Math.floor(y / S.cell) + 1;
      let f1 = 1e9, f2 = 1e9;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = ci + di, jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= S.n || jj >= S.n) continue;
          const k = (jj * S.n + ii) * 2;
          const d = Math.hypot(x - S.pts[k], y - S.pts[k + 1]);
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) f2 = d;
        }
      return f2 - f1;
    };
    const pores: { x: number; y: number; r: number }[] = [];
    const pn = Math.round(size * size * 0.55);
    for (let i = 0; i < pn; i++) pores.push({ x: r() * size, y: r() * size, r: 0.03 + r() * 0.03 });
    const height = (x: number, y: number) => {
      // domain warp breaks the regular polygon look
      const wx = x + fbm2(x * 0.9, y * 0.9, 3) * 0.22;
      const wy = y + fbm2(x * 0.9 + 31, y * 0.9 - 17, 3) * 0.22;
      const ea = edgeDist(A, wx, wy);
      const eb = edgeDist(B, wx * 1.0 + 3.1, wy * 1.0 - 1.7);
      let hgt = -0.03 * Math.exp(-((ea / 0.085) ** 2)); // primary furrows: soft V-profile
      hgt += -0.008 * Math.exp(-((eb / 0.04) ** 2)) * (0.5 + 0.5 * (fbm2(x * 0.7, y * 0.7, 2) * 0.5 + 0.5)); // secondary
      hgt += fbm2(x * 0.45, y * 0.45, 3) * 0.07; // macro undulation
      hgt += fbm2(x * 7, y * 7, 3) * 0.009; // corneocyte flakes
      hgt += Math.abs(fbm2(x * 3.2 + 9, y * 3.2, 2)) * 0.006;
      for (let p = 0; p < pores.length; p++) {
        const pr = pores[p];
        const dx = x - pr.x, dy = y - pr.y;
        if (Math.abs(dx) > pr.r * 3 || Math.abs(dy) > pr.r * 3) continue;
        const d = Math.hypot(dx, dy) / pr.r;
        hgt -= 0.05 * Math.exp(-d * d * 1.6);
        hgt += 0.006 * Math.exp(-((d - 1.4) ** 2) * 4);
      }
      return hgt;
    };
    return { size, height, pores };
  });

/** Normal / albedo / roughness maps for the skin patch. tone: base skin colour. */
export const skinMaps = (size = 8, seed = 5, tone = "#9a6446") =>
  once(`skinMaps-${size}-${seed}-${tone}`, () => {
    const f = skinField(size, seed);
    const N = 1024;
    const hgt = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) hgt[y * N + x] = f.height((x / N) * size, (1 - y / N) * size);
    const normal = heightToNormal(hgt, N, N, (N / size) * 1.0, false);
    // Albedo: melanin/haemoglobin variation, darker furrows & pores
    const base = new THREE.Color(tone);
    const ca = canvas(N, N);
    const ctx = ca.getContext("2d")!;
    const img = ctx.createImageData(N, N);
    const cr = canvas(N, N);
    const ctxr = cr.getContext("2d")!;
    const imgr = ctxr.createImageData(N, N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const wx = (x / N) * size, wy = (1 - y / N) * size;
        const hv = hgt[y * N + x];
        const mel = fbm2(wx * 0.6, wy * 0.6, 4) * 0.5 + 0.5;
        const red = fbm2(wx * 0.25 + 40, wy * 0.25, 3) * 0.5 + 0.5;
        const cav = Math.min(1, Math.max(0, -(hv - fbm2(wx * 0.45, wy * 0.45, 3) * 0.07) / 0.05));
        const k = (0.86 + mel * 0.22) * (1 - cav * 0.22);
        const i = (y * N + x) * 4;
        img.data[i] = Math.min(255, base.r * 255 * k * (1 + red * 0.05));
        img.data[i + 1] = Math.min(255, base.g * 255 * k * (1 - red * 0.03));
        img.data[i + 2] = Math.min(255, base.b * 255 * k * (1 - red * 0.02));
        img.data[i + 3] = 255;
        // roughness: oily plateaus a bit shinier, furrows rougher
        const rough = 0.55 + cav * 0.3 + (fbm2(wx * 2, wy * 2, 2) * 0.5 + 0.5) * 0.12;
        imgr.data[i] = imgr.data[i + 1] = imgr.data[i + 2] = rough * 255;
        imgr.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    ctxr.putImageData(imgr, 0, 0);
    const albedo = new THREE.CanvasTexture(ca);
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.anisotropy = 8;
    const roughness = new THREE.CanvasTexture(cr);
    roughness.colorSpace = THREE.NoColorSpace;
    return { normal, albedo, roughness, field: f };
  });

/** Soft round sprite for particles (premultiplied-friendly). */
export const softDot = () =>
  once("softDot", () => {
    const s = 64;
    const c = canvas(s, s);
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    return t;
  });
