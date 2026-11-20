import * as THREE from "three";
import { random } from "remotion";

/** Canvas-drawn textures, created once fonts are ready and cached. */
const cache = new Map<string, THREE.CanvasTexture>();

const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, tex);
  return tex;
};

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

export const HINDI = "'Hind', 'Noto Sans Devanagari', sans-serif";
export const POP = "'Poppins', 'Inter', sans-serif";

export const tilesTex = (rx: number, ry: number) =>
  make(`tiles${rx}x${ry}`, 512, 512, (c, w, h) => {
    c.fillStyle = "#E3E6EB";
    c.fillRect(0, 0, w, h);
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 222 + Math.floor(random(`t${i}${j}`) * 14);
        c.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
        c.fillRect((i * w) / n + 3, (j * h) / n + 3, w / n - 6, h / n - 6);
      }
    c.strokeStyle = "#C3C8D1";
    c.lineWidth = 5;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo((i * w) / n, 0);
      c.lineTo((i * w) / n, h);
      c.stroke();
      c.beginPath();
      c.moveTo(0, (i * h) / n);
      c.lineTo(w, (i * h) / n);
      c.stroke();
    }
  }, [rx, ry]);

export const roofTex = (rx: number) =>
  make(`roof${rx}`, 256, 64, (c, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const g = c.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, "#C7CBD3");
      g.addColorStop(0.5, "#E9ECF1");
      g.addColorStop(1, "#BFC4CD");
      c.fillStyle = g;
      c.fillRect(x, 0, 16, h);
    }
  }, [rx, 1]);

const drawTrainSide = (c: CanvasRenderingContext2D, w: number, h: number) => {
  // upper grey
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#AEB3BC");
  g.addColorStop(0.08, "#D4D8DF");
  g.addColorStop(0.5, "#C9CDD4");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h * 0.5);
  // window band
  c.fillStyle = "#30343D";
  c.fillRect(0, h * 0.2, w, h * 0.24);
  for (let i = 0; i < 12; i++) {
    const x = w * 0.1 + i * w * 0.068;
    c.fillStyle = "#4A5363";
    rr(c, x, h * 0.22, w * 0.055, h * 0.2, 10);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.18)";
    c.fillRect(x + 6, h * 0.23, w * 0.018, h * 0.18);
  }
  // red lower body
  const r = c.createLinearGradient(0, h * 0.5, 0, h);
  r.addColorStop(0, "#C42430");
  r.addColorStop(1, "#8E1720");
  c.fillStyle = r;
  c.fillRect(0, h * 0.5, w, h * 0.42);
  // gold stripes
  c.fillStyle = "#E7B53E";
  c.fillRect(0, h * 0.545, w, h * 0.035);
  c.fillRect(0, h * 0.6, w, h * 0.015);
  // doors
  for (const dx of [0.025, 0.925]) {
    c.strokeStyle = "#6E1018";
    c.lineWidth = 6;
    c.strokeRect(w * dx, h * 0.18, w * 0.05, h * 0.72);
    c.fillStyle = "#30343D";
    rr(c, w * dx + 14, h * 0.24, w * 0.05 - 28, h * 0.16, 6);
    c.fill();
  }
  // skirt
  c.fillStyle = "#2A2C31";
  c.fillRect(0, h * 0.92, w, h * 0.08);
  // end gaps
  c.fillStyle = "#1E2025";
  c.fillRect(0, 0, 8, h);
  c.fillRect(w - 8, 0, 8, h);
};

export const trainTex = (blur: boolean) =>
  make(`train${blur}`, 2048, 360, (c, w, h) => {
    if (!blur) return drawTrainSide(c, w, h);
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    drawTrainSide(off.getContext("2d")!, w, h);
    const n = 28;
    c.globalAlpha = 1;
    c.drawImage(off, 0, 0);
    c.globalAlpha = 1 / 6;
    for (let i = 0; i < n; i++) {
      const dx = (i - n / 2) * 18;
      c.drawImage(off, dx, 0);
      c.drawImage(off, dx + w, 0);
      c.drawImage(off, dx - w, 0);
    }
    c.globalAlpha = 1;
  });

export const BOARD = {
  no: "12846",
  en: "SURAJ NAGAR EXP",
  hi: "सूरज नगर एक्सप्रेस",
  time: "18:40",
  pf: "3",
};

export const boardTex = () =>
  make("board", 1400, 360, (c, w, h) => {
    c.fillStyle = "#0E0F12";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#D7DAE0";
    c.font = `600 34px ${POP}`;
    c.fillText("TRAIN NO.   TRAIN NAME", 30, 50);
    c.textAlign = "right";
    c.fillText("EXP.TIME  A/D", w - 30, 50);
    c.textAlign = "left";
    c.fillStyle = "#FFFFFF";
    c.font = `400 112px 'Anton', ${POP}`;
    c.fillText(BOARD.no, 30, 170);
    c.fillText(BOARD.en, 340, 170);
    c.textAlign = "right";
    c.fillText(`${BOARD.time} A`, w - 30, 170);
    c.textAlign = "left";
    c.fillText(BOARD.no, 30, 300);
    c.font = `700 104px ${HINDI}`;
    c.fillText(BOARD.hi, 340, 302);
    c.textAlign = "right";
    c.fillText(`${BOARD.time} आ`, w - 30, 302);
    c.textAlign = "left";
    c.fillStyle = "#9097A3";
    c.font = `600 24px ${POP}`;
    c.fillText("PLATFORM DISPLAY BOARD", 30, 340);
  });

export type CardState = "normal" | "active" | "gold" | "dim";
const CARD_STYLE: Record<CardState, { bg: string; fg: string; wave: string }> = {
  normal: { bg: "#F2F3F6", fg: "#24272E", wave: "#3F4450" },
  active: { bg: "#2F55E4", fg: "#FFFFFF", wave: "#DCE4FF" },
  gold: { bg: "#C9A15A", fg: "#2E220D", wave: "#4B3814" },
  dim: { bg: "#C9CDD5", fg: "#6B717D", wave: "#8E94A0" },
};

/** aspect: width/height of card */
export const cardTex = (label: string, state: CardState, aspect: number) =>
  make(`card:${label}:${state}:${aspect}`, Math.round(256 * aspect), 256, (c, w, h) => {
    const s = CARD_STYLE[state];
    rr(c, 4, 4, w - 8, h - 8, 34);
    c.fillStyle = s.bg;
    c.fill();
    c.strokeStyle = "rgba(0,0,0,0.12)";
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = s.fg;
    c.textAlign = "center";
    const fs = label.length > 12 ? 52 : 64;
    c.font = `700 ${fs}px ${HINDI}`;
    c.fillText(label, w / 2, 92, w - 40);
    // waveform
    const bars = Math.floor((w - 60) / 9);
    for (let i = 0; i < bars; i++) {
      const f = i / bars;
      const env = Math.sin(Math.PI * f) ** 0.7;
      const amp = (0.25 + 0.75 * random(`${label}${i}`)) * env * 70 + 3;
      c.fillStyle = s.wave;
      c.fillRect(30 + i * 9, 180 - amp, 4, amp * 2);
    }
  });

export const signTex = () =>
  make("sign", 1024, 300, (c, w, h) => {
    c.fillStyle = "#F7F7F9";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#B3202A";
    c.lineWidth = 16;
    c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = "#1D1F24";
    c.textAlign = "center";
    c.font = `800 110px ${POP}`;
    c.fillText("ANNOUNCEMENT", w / 2, 140);
    c.font = `700 92px ${HINDI}`;
    c.fillText("उद्घोषणा कक्ष", w / 2, 255);
  });

export const keyboardTex = () =>
  make("kbd", 1024, 360, (c, w, h) => {
    c.fillStyle = "#1A1C20";
    c.fillRect(0, 0, w, h);
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const n = 14 - (r === 4 ? 6 : 0);
      for (let k = 0; k < n; k++) {
        const kw = r === 4 && k === 3 ? 300 : (w - 40) / 14 - 8;
        const x = 20 + k * ((w - 40) / 14) + (r === 4 && k > 3 ? 300 - (w - 40) / 14 + 8 : 0);
        c.fillStyle = "#2E3138";
        rr(c, x, 20 + r * 66, kw, 56, 8);
        c.fill();
      }
    }
  });

export const clockTex = () =>
  make("clock", 256, 256, (c, w) => {
    c.fillStyle = "#FFFFFF";
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#2A2D33";
    c.lineWidth = 10;
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96);
      c.lineTo(w / 2 + Math.cos(a) * 110, w / 2 + Math.sin(a) * 110);
      c.lineWidth = 6;
      c.stroke();
    }
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(w / 2, w / 2);
    c.lineTo(w / 2 + 50, w / 2 - 30);
    c.moveTo(w / 2, w / 2);
    c.lineTo(w / 2 - 10, w / 2 - 85);
    c.stroke();
  });

/** Small rendered thumbnail of the operator UI for the 3D monitor. */
export const screenTex = () =>
  make("screen", 1024, 640, (c, w, h) => {
    c.fillStyle = "#F4F6FA";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1E2F8F";
    c.fillRect(0, 0, w, 46);
    c.fillStyle = "#fff";
    c.font = `700 24px ${POP}`;
    c.fillText("PA SYSTEM · OPERATOR", 20, 31);
    c.fillStyle = "#DCE3F5";
    c.fillRect(0, 46, w, 40);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = i % 3 === 1 ? "#FBE3E5" : i % 2 ? "#FFFFFF" : "#EEF2F9";
      c.fillRect(16, 100 + i * 38, w * 0.68, 34);
      c.fillStyle = "#8C93A3";
      c.fillRect(30, 112 + i * 38, 90, 10);
      c.fillRect(140, 112 + i * 38, 200, 10);
      c.fillRect(380, 112 + i * 38, 120, 10);
    }
    c.fillStyle = "#E7EBF4";
    c.fillRect(w * 0.72, 100, w * 0.26, h - 140);
    c.fillStyle = "#2F55E4";
    c.fillRect(w * 0.74, h - 110, w * 0.22, 44);
  });

export const pillTex = (text: string) =>
  make(`pill:${text}`, 512, 180, (c, w, h) => {
    rr(c, 6, 6, w - 12, h - 12, (h - 12) / 2);
    c.fillStyle = "#2F55E4";
    c.fill();
    c.fillStyle = "#FFFFFF";
    c.textAlign = "center";
    c.font = `800 92px ${POP}`;
    c.fillText(text, w / 2, h / 2 + 32);
  });
