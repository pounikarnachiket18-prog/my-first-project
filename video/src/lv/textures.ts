import { useEffect, useMemo, useState } from "react";
import { staticFile, useDelayRender } from "remotion";
import * as THREE from "three";
import { F, FONTS_READY, L, LOGO, STATION } from "./theme";

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
let logo: HTMLImageElement[] = [];
const LOGO_READY = Promise.all([loadImg(staticFile(LOGO.brain)), loadImg(staticFile(LOGO.text))]).then((x) => {
  logo = x;
});

export const useFontsReady = () => {
  const { delayRender, continueRender } = useDelayRender();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading fonts for textures"));
  useEffect(() => {
    Promise.all([FONTS_READY, LOGO_READY]).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [continueRender, handle]);
  return ready;
};

const make = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

/** Rear face of the last coach: X, LV board, stencils. 3.2m x 3.4m -> 640 x 680 px */
const rearFace = () =>
  make(640, 680, (c) => {
    c.fillStyle = L.maroon;
    c.fillRect(0, 0, 640, 680);
    // roof shading band
    c.fillStyle = L.maroonDark;
    c.fillRect(0, 0, 640, 26);
    // cream stripe continues round the end
    c.fillStyle = L.cream;
    c.fillRect(0, 420, 640, 22);
    // rear door
    c.fillStyle = "#3A0C15";
    rr(c, 205, 110, 230, 560, 14);
    c.fill();
    c.strokeStyle = "#240509";
    c.lineWidth = 6;
    c.stroke();
    // yellow marker plates at top corners
    c.fillStyle = L.xYellow;
    c.fillRect(70, 70, 54, 40);
    c.fillRect(516, 70, 54, 40);
    // Big X
    c.strokeStyle = L.xYellow;
    c.lineWidth = 52;
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(225, 150);
    c.lineTo(415, 420);
    c.moveTo(415, 150);
    c.lineTo(225, 420);
    c.stroke();
    // stencils
    c.fillStyle = "#F4EDE0";
    c.font = `600 17px ${F.ui}`;
    ["ICF", "RETURN 07", "DP"].forEach((s, i) => c.fillText(s, 40, 200 + i * 24));
    ["GSLRD", "RDSO 2020", "BASE DPR", "11706", "POH 12/24"].forEach((s, i) => c.fillText(s, 460, 180 + i * 24));
    // LV board
    c.fillStyle = L.lvRed;
    c.beginPath();
    c.arc(540, 590, 52, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = "#fff";
    c.font = `800 46px ${F.ui}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("LV", 540, 593);
  });

/** Same rear face but with no X / LV (used for the "nishaan nahi" case) */
const plainFace = () =>
  make(64, 64, (c) => {
    c.fillStyle = L.maroon;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = "#3A0C15";
    c.fillRect(20, 10, 24, 54);
  });

/** Side branding strip */
/** Side livery: Just KnowIt logo as a horizontal lockup (brain + wordmark), painted cream */
const brand = () =>
  make(2400, 240, (c) => {
    const [brain, text] = logo;
    const bh = 210;
    const bw = (brain.width / brain.height) * bh;
    const th = 118;
    const tw = (text.width / text.height) * th;
    const gap = 56;
    const x0 = (2400 - (bw + gap + tw)) / 2;
    c.drawImage(brain, x0, (240 - bh) / 2, bw, bh);
    c.drawImage(text, x0 + bw + gap, (240 - th) / 2 + 6, tw, th);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = L.cream;
    c.fillRect(0, 0, 2400, 240);
  });

/** Coach number + class, near the door */
const coachNo = () =>
  make(512, 220, (c) => {
    c.clearRect(0, 0, 512, 220);
    c.fillStyle = L.cream;
    c.font = `700 84px ${F.ui}`;
    c.fillText("DP 11706", 10, 90);
    c.font = `700 70px ${F.deva}`;
    c.fillText("सामान्य", 14, 190);
  });

/** Yellow station board: Hindi on top, English below */
const board = (hi: string, en: string) =>
  make(1024, 360, (c) => {
    c.fillStyle = "#F2C230";
    c.fillRect(0, 0, 1024, 360);
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 18;
    c.strokeRect(9, 9, 1006, 342);
    c.fillStyle = "#151515";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `800 150px ${F.deva}`;
    c.fillText(hi, 512, 130);
    c.font = `800 120px ${F.ui}`;
    c.fillText(en, 512, 275);
  });

/** Soft radial glow for lamps */
const glow = (rgb: string) =>
  make(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.25, `rgba(${rgb},0.55)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

/** Round status badge (check / cross) */
const badge = (ok: boolean) =>
  make(256, 256, (c) => {
    c.fillStyle = ok ? "#1E8A4C" : "#C8283B";
    c.beginPath();
    c.arc(128, 128, 116, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 26;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    if (ok) {
      c.moveTo(72, 132);
      c.lineTo(112, 172);
      c.lineTo(186, 92);
    } else {
      c.moveTo(84, 84);
      c.lineTo(172, 172);
      c.moveTo(172, 84);
      c.lineTo(84, 172);
    }
    c.stroke();
  });

export type Tex = ReturnType<typeof buildTextures>;

const buildTextures = () => ({
  rear: rearFace(),
  plain: plainFace(),
  brand: brand(),
  coachNo: coachNo(),
  board: board(STATION.hi, STATION.en),
  prevBoard: board("पिछला स्टेशन", "PREVIOUS STN"),
  redGlow: glow("255,40,50"),
  warmGlow: glow("255,230,170"),
  greenGlow: glow("60,255,120"),
  ok: badge(true),
  no: badge(false),
});

export const useTextures = (ready: boolean) => useMemo(() => (ready ? buildTextures() : null), [ready]);
