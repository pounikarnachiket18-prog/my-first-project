import { POP } from "../three/textures";

export const PHONE_W = 340;
export const PHONE_H = 750;

export type PhoneState = { bars: number; noService: boolean; flash?: number };

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

export const drawPhone = (c: CanvasRenderingContext2D, s: PhoneState) => {
  const W = PHONE_W;
  const H = PHONE_H;
  // wallpaper
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2C4C9C");
  g.addColorStop(1, "#0F1C45");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(255,255,255,0.06)";
  c.beginPath();
  c.arc(W * 0.8, H * 0.75, 220, 0, Math.PI * 2);
  c.fill();
  // status bar
  c.fillStyle = "#FFFFFF";
  c.font = `600 22px ${POP}`;
  c.textAlign = "left";
  c.fillText("10:00", 22, 36);
  // signal bars
  for (let i = 0; i < 4; i++) {
    const on = i < s.bars;
    c.fillStyle = on ? "#FFFFFF" : "rgba(255,255,255,0.28)";
    c.fillRect(W - 112 + i * 12, 34 - (i + 1) * 6, 8, (i + 1) * 6);
  }
  c.textAlign = "right";
  c.fillStyle = s.noService ? "#FF6B6B" : "#FFFFFF";
  c.fillText(s.noService ? "✕" : "4G", W - 18, 36);
  // battery
  c.strokeStyle = "#FFFFFF";
  c.lineWidth = 2;
  c.strokeRect(W - 170, 20, 32, 16);
  c.fillStyle = "#FFFFFF";
  c.fillRect(W - 168, 22, 22, 12);
  // clock
  c.textAlign = "center";
  c.font = `800 110px ${POP}`;
  c.fillText("10:00", W / 2, 230);
  c.font = `600 26px ${POP}`;
  c.fillStyle = "rgba(255,255,255,0.8)";
  c.fillText("Saturday, Exam day", W / 2, 275);
  // centre card
  const y = 380;
  rr(c, 30, y, W - 60, 190, 30);
  c.fillStyle = s.noService ? "rgba(255,80,80,0.92)" : "rgba(255,255,255,0.16)";
  c.fill();
  c.fillStyle = "#FFFFFF";
  if (s.noService) {
    c.font = `800 72px ${POP}`;
    c.fillText("✕", W / 2, y + 80);
    c.font = `800 40px ${POP}`;
    c.fillText("No Service", W / 2, y + 140);
    c.font = `600 22px ${POP}`;
    c.fillText("Emergency calls only", W / 2, y + 174);
  } else {
    // full bars icon
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i < s.bars ? "#FFFFFF" : "rgba(255,255,255,0.3)";
      rr(c, W / 2 - 54 + i * 30, y + 100 - (i + 1) * 18, 20, (i + 1) * 18, 5);
      c.fill();
    }
    c.fillStyle = "#FFFFFF";
    c.font = `800 34px ${POP}`;
    c.fillText(s.bars >= 3 ? "Network: Full" : "Network: Weak", W / 2, y + 150);
  }
  if (s.flash && s.flash > 0) {
    c.fillStyle = `rgba(255,255,255,${s.flash})`;
    c.fillRect(0, 0, W, H);
  }
};
