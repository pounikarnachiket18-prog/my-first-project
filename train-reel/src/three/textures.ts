import { TH } from "../theme";
import * as THREE from "three";
import { random } from "remotion";

/** Canvas-drawn textures, created once fonts are ready and cached. */
const cache = new Map<string, THREE.CanvasTexture>();

const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) => {
  key = `${TH().id}|${key}`;
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

export const CHANNEL = "Mindset mode | Explainers";

export const HINDI = "'Hind', 'Noto Sans Devanagari', sans-serif";
export const POP = "'Poppins', 'Inter', sans-serif";

export const tilesTex = (rx: number, ry: number) =>
  make(`tiles${rx}x${ry}`, 512, 512, (c, w, h) => {
    c.fillStyle = TH().tileBase;
    c.fillRect(0, 0, w, h);
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = random(`t${i}${j}`);
        c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.18})` : `rgba(0,0,0,${(0.5 - v) * 0.08})`;
        c.fillRect((i * w) / n + 3, (j * h) / n + 3, w / n - 6, h / n - 6);
      }
    c.strokeStyle = TH().tileGrout;
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
      g.addColorStop(0, TH().roofB);
      g.addColorStop(0.5, TH().roofA);
      g.addColorStop(1, TH().roofB);
      c.fillStyle = g;
      c.fillRect(x, 0, 16, h);
    }
  }, [rx, 1]);

/** Vande Bharat-style EMU side: white body, continuous tinted windows, sky-blue pinstripe, navy lower band. */
const drawTrainSide = (c: CanvasRenderingContext2D, w: number, h: number) => {
  const t = TH();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, t.trainTop);
  g.addColorStop(0.1, t.trainUpper);
  g.addColorStop(1, t.trainUpper);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // continuous tinted window band
  rr(c, w * 0.075, h * 0.16, w * 0.85, h * 0.31, 26);
  c.fillStyle = t.windowBand;
  c.fill();
  c.save();
  rr(c, w * 0.075, h * 0.16, w * 0.85, h * 0.31, 26);
  c.clip();
  const gl = c.createLinearGradient(0, h * 0.16, 0, h * 0.47);
  gl.addColorStop(0, t.windowGlass);
  gl.addColorStop(1, t.windowBand);
  c.fillStyle = gl;
  c.fillRect(0, h * 0.16, w, h * 0.31);
  for (let i = 0; i < 9; i++) {
    const x = w * 0.1 + i * w * 0.1;
    c.fillStyle = "rgba(255,255,255,0.10)";
    c.beginPath();
    c.moveTo(x, h * 0.47);
    c.lineTo(x + 60, h * 0.16);
    c.lineTo(x + 110, h * 0.16);
    c.lineTo(x + 50, h * 0.47);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.07)";
    c.fillRect(w * 0.075 + i * w * 0.0944, h * 0.16, 5, h * 0.31);
  }
  c.restore();
  // sky-blue pinstripe + navy lower band
  c.fillStyle = t.stripe;
  c.fillRect(0, h * 0.535, w, h * 0.03);
  const r = c.createLinearGradient(0, h * 0.6, 0, h * 0.93);
  r.addColorStop(0, t.lowerA);
  r.addColorStop(1, t.lowerB);
  c.fillStyle = r;
  c.fillRect(0, h * 0.6, w, h * 0.33);
  // channel name along the navy band
  c.fillStyle = "#FFFFFF";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `800 36px ${POP}`;
  for (const fx of [0.19, 0.5, 0.81]) c.fillText(CHANNEL, w * fx, h * 0.765, w * 0.29);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  // plug doors
  for (const dx of [0.018, 0.937]) {
    c.strokeStyle = t.doorLine;
    c.lineWidth = 5;
    rr(c, w * dx, h * 0.1, w * 0.045, h * 0.83, 10);
    c.stroke();
    c.fillStyle = t.windowBand;
    rr(c, w * dx + 14, h * 0.18, w * 0.045 - 28, h * 0.22, 8);
    c.fill();
  }
  // skirt line
  c.fillStyle = t.trainEnd;
  c.fillRect(0, h * 0.93, w, h * 0.07);
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
    c.fillStyle = TH().boardLabel;
    c.font = `600 34px ${POP}`;
    c.fillText("TRAIN NO.   TRAIN NAME", 30, 50);
    c.textAlign = "right";
    c.fillText("EXP.TIME  A/D", w - 30, 50);
    c.textAlign = "left";
    c.fillStyle = TH().boardText;
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
    c.fillStyle = TH().boardLabel;
    c.font = `600 24px ${POP}`;
    c.fillText("PLATFORM DISPLAY BOARD", 30, 340);
  });

export type CardState = "normal" | "active" | "gold" | "dim";
const cardStyle = (st: CardState) => {
  const t = TH();
  const [bg, fg, wave] = { normal: t.cardNormal, active: t.cardActive, gold: t.cardGold, dim: t.cardDim }[st];
  return { bg, fg, wave };
};

/** aspect: width/height of card */
export const cardTex = (label: string, state: CardState, aspect: number) =>
  make(`card:${label}:${state}:${aspect}`, Math.round(256 * aspect), 256, (c, w, h) => {
    const s = cardStyle(state);
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
    c.fillStyle = TH().signBg;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = TH().signBorder;
    c.lineWidth = 16;
    c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = TH().signText;
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
    c.fillStyle = TH().uiBg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = TH().uiHeader;
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
    c.fillStyle = TH().pill;
    c.fill();
    c.fillStyle = TH().cardActive[1];
    c.textAlign = "center";
    c.font = `800 92px ${POP}`;
    c.fillText(text, w / 2, h / 2 + 32);
  });
