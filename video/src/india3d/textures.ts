import * as THREE from "three";

// Canvas-drawn textures (number plates, signs, truck art), cached by key.
const cache = new Map<string, THREE.Texture>();

export const UI = "Montserrat, sans-serif";
export const FUN = "'Baloo 2', Montserrat, sans-serif";
export const DEVA = "'Noto Sans Devanagari', 'Baloo 2', sans-serif";

export const canvasTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
};

const fit = (c: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxW: number, px: number) => {
  let s = px;
  c.font = font(s);
  while (c.measureText(text).width > maxW && s > 8) {
    s -= 2;
    c.font = font(s);
  }
  return s;
};

export type PlateKind = "private" | "commercial" | "ev" | "eu";

// Indian plates are masked: only "MH 12" is shown, the rest is XXXX.
export const MASKED_PLATE = "MH 12 XXXX";

export const plateTex = (text: string, kind: PlateKind = "private") =>
  canvasTex(`plate:${text}:${kind}`, 520, 124, (c) => {
    if (kind === "eu") {
      // German plate: EU strip with "D", black on white
      c.fillStyle = "#111";
      c.fillRect(0, 0, 520, 124);
      c.fillStyle = "#FFF";
      c.fillRect(5, 5, 510, 114);
      c.fillStyle = "#003399";
      c.fillRect(8, 8, 60, 108);
      c.fillStyle = "#FFCC00";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        c.beginPath();
        c.arc(38 + Math.cos(a) * 16, 42 + Math.sin(a) * 16, 3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#FFF";
      c.font = `800 34px ${UI}`;
      c.textAlign = "center";
      c.fillText("D", 38, 104);
      c.fillStyle = "#111";
      fit(c, text, (p) => `800 ${p}px ${UI}`, 420, 80);
      c.textBaseline = "middle";
      c.fillText(text, 292, 66);
      return;
    }
    const bg = kind === "commercial" ? "#FFD400" : kind === "ev" ? "#1E8E3E" : "#FFFFFF";
    const fg = kind === "ev" ? "#FFFFFF" : "#111111";
    c.fillStyle = "#111";
    c.fillRect(0, 0, 520, 124);
    c.fillStyle = bg;
    c.fillRect(5, 5, 510, 114);
    c.fillStyle = "#1A3E9A";
    c.fillRect(10, 10, 54, 104);
    c.strokeStyle = "#fff";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(37, 46, 15, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#fff";
    c.font = `800 20px ${UI}`;
    c.textAlign = "center";
    c.fillText("IND", 37, 102);
    c.fillStyle = fg;
    fit(c, MASKED_PLATE, (p) => `900 ${p}px ${UI}`, 430, 78);
    c.textBaseline = "middle";
    c.fillText(MASKED_PLATE, 290, 66);
  });

export const signTex = (lines: [string, string][], title?: string) =>
  canvasTex(`sign:${title}:${lines.map((l) => l.join("=")).join("|")}`, 1024, 512, (c) => {
    c.fillStyle = "#0A6B3A";
    c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = "#F2F2F2";
    c.lineWidth = 14;
    c.strokeRect(14, 14, 996, 484);
    let y = 60;
    if (title) {
      c.fillStyle = "#fff";
      c.fillRect(50, 44, 190, 92);
      c.fillStyle = "#0A6B3A";
      c.font = `900 62px ${UI}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(title, 145, 92);
      c.fillStyle = "#fff";
      c.textAlign = "left";
      c.font = `800 44px ${UI}`;
      c.fillText("MUMBAI–PUNE EXPWY", 270, 92);
      y = 170;
    }
    const rowH = (512 - y - 30) / lines.length;
    lines.forEach(([place, km], i) => {
      const yy = y + rowH * i + rowH / 2;
      c.fillStyle = "#fff";
      c.textBaseline = "middle";
      c.textAlign = "left";
      c.font = `800 ${Math.min(84, rowH * 0.62)}px ${UI}`;
      c.fillText(place, 60, yy);
      c.textAlign = "right";
      c.fillText(km, 964, yy);
    });
  });

export const truckRearTex = () =>
  canvasTex("truckrear", 512, 640, (c) => {
    c.fillStyle = "#E0592A";
    c.fillRect(0, 0, 512, 640);
    c.fillStyle = "#1F4E9A";
    c.fillRect(0, 0, 512, 120);
    c.fillStyle = "#FFD400";
    c.font = `800 62px ${FUN}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("HORN OK PLEASE", 256, 64);
    ["#FF9933", "#FFFFFF", "#138808"].forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(0, 130 + i * 22, 512, 22);
    });
    c.fillStyle = "#FFF";
    c.font = `800 40px ${FUN}`;
    c.fillText("USE DIPPER AT NIGHT", 256, 250);
    c.fillStyle = "#FFE08A";
    c.font = `800 42px ${DEVA}`;
    c.fillText("बुरी नज़र वाले तेरा मुँह काला", 256, 330);
    for (const x of [110, 402]) {
      c.fillStyle = "#FFD400";
      c.beginPath();
      c.arc(x, 450, 52, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#1F4E9A";
      c.beginPath();
      c.arc(x, 450, 24, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#FFF";
    c.font = `800 56px ${FUN}`;
    c.fillText("TATA", 256, 455);
    c.fillStyle = "#2A2A2A";
    c.fillRect(0, 560, 512, 80);
  });

export const dhabaSignTex = (name: string, deva: string, sub: string, bg = "#B3001B") =>
  canvasTex(`dhaba:${name}:${bg}`, 1024, 320, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 1024, 320);
    c.strokeStyle = "#FFD400";
    c.lineWidth = 16;
    c.strokeRect(10, 10, 1004, 300);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#FFD400";
    fit(c, name, (p) => `800 ${p}px ${FUN}`, 940, 120);
    c.fillText(name, 512, 105);
    c.fillStyle = "#FFF";
    c.font = `800 66px ${DEVA}`;
    c.fillText(deva, 512, 200);
    c.fillStyle = "#FFE08A";
    fit(c, sub, (p) => `800 ${p}px ${UI}`, 940, 34);
    c.fillText(sub, 512, 272);
  });

export const menuTex = () =>
  canvasTex("menu", 256, 320, (c) => {
    c.fillStyle = "#1F3B2D";
    c.fillRect(0, 0, 256, 320);
    c.strokeStyle = "#C8A26B";
    c.lineWidth = 12;
    c.strokeRect(6, 6, 244, 308);
    c.fillStyle = "#FFD400";
    c.font = `800 40px ${FUN}`;
    c.textAlign = "center";
    c.fillText("MENU", 128, 56);
    const items = [
      ["Chai", "₹15"],
      ["Paratha", "₹60"],
      ["Dal Makhani", "₹140"],
      ["Lassi", "₹40"],
    ];
    items.forEach(([n, p], i) => {
      c.textAlign = "left";
      c.fillStyle = "#FFF";
      c.font = `700 26px ${FUN}`;
      c.fillText(n, 22, 110 + i * 52);
      c.textAlign = "right";
      c.fillStyle = "#FFE08A";
      c.fillText(p, 236, 110 + i * 52);
    });
  });

export const shopTex = (name: string, bg: string) =>
  canvasTex(`shop:${name}:${bg}`, 512, 128, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = "#FFF4E0";
    c.fillRect(16, 16, 480, 96);
    c.fillStyle = "#111";
    c.textAlign = "center";
    c.textBaseline = "middle";
    fit(c, name, (p) => `800 ${p}px ${FUN}`, 450, 60);
    c.fillText(name, 256, 66);
  });

export const windowsTex = (seed: number) =>
  canvasTex(`win:${seed}`, 128, 256, (c) => {
    c.fillStyle = "#2B2440";
    c.fillRect(0, 0, 128, 256);
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let y = 10; y < 250; y += 26) {
      for (let x = 10; x < 120; x += 28) {
        const on = rnd() > 0.45;
        c.fillStyle = on ? (rnd() > 0.5 ? "#FFD27A" : "#FFE9B0") : "#3B3355";
        c.fillRect(x, y, 16, 14);
      }
    }
  });

export const glowTex = () =>
  canvasTex("glow", 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
