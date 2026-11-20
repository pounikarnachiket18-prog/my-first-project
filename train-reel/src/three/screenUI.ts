import { TH } from "../theme";
import { random } from "remotion";
import { HINDI, POP } from "./textures";

export const SCREEN_W = 1600;
export const SCREEN_H = 954;

export const LIBRARY = [
  "यात्रीगण कृपया ध्यान दें",
  "गाड़ी संख्या",
  "शून्य",
  "एक",
  "दो",
  "तीन",
  "चार",
  "पाँच",
  "छह",
  "सात",
  "आठ",
  "नौ",
  "प्लेटफ़ॉर्म क्रमांक",
  "पर आ रही है",
  "पर खड़ी है",
  "से चलकर",
  "जाने वाली",
  "मिनट",
  "देरी से",
  "रद्द",
  "सूरज नगर एक्सप्रेस",
  "कुछ ही समय में",
  "बजे",
  "धन्यवाद",
];

/** The announcement for train 12846 on PF 3, as library clips. */
export const SEQUENCE = ["गाड़ी संख्या", "एक", "दो", "आठ", "चार", "छह", "सूरज नगर एक्सप्रेस", "प्लेटफ़ॉर्म क्रमांक", "तीन", "पर आ रही है"];

const TRAINS: [string, string, string, string, string, string, string][] = [
  ["12846", "SURAJ NAGAR EXP", "A", "Arriving", "18:40", "18:40", "3"],
  ["14211", "KAMAL GANJ MAIL", "D", "Right Time", "18:55", "18:55", "1"],
  ["22963", "HARI GARH SF EXP", "A", "Running Late", "19:05", "19:32", "4"],
  ["15502", "MOTI PUR MEMU", "D", "Right Time", "19:10", "19:10", "2"],
  ["13377", "DHAN PUR EXP", "A", "Right Time", "19:22", "19:22", "5"],
  ["11648", "RANI GANJ PASS", "A", "Running Late", "19:40", "20:05", "6"],
  ["16290", "NEEL KANTH EXP", "D", "Right Time", "19:55", "19:55", "3"],
  ["12719", "SONA PUR SF EXP", "A", "Right Time", "20:10", "20:10", "1"],
  ["18433", "CHANDAN VAN EXP", "D", "Running Late", "20:20", "20:41", "7"],
  ["17025", "GULAB BAGH MAIL", "A", "Right Time", "20:35", "20:35", "2"],
  ["19560", "PAWAN DOOT EXP", "D", "Right Time", "20:50", "20:50", "4"],
];

export type ScreenState = {
  mode: "trains" | "media" | "assemble";
  sel?: number; // selected row (float for animated highlight)
  typed?: { no?: string; pf?: string; time?: string; caret?: boolean };
  badges?: { text: string; x: number; y: number; s: number }[];
  playing?: boolean;
  pressed?: number; // 0..1 ANNOUNCE button press
  picked?: number; // number of sequence clips copied
  pickFlash?: number; // index of grid tile currently flashing
  play?: number; // index of sequence clip currently playing (-1 none)
  gapAfter?: number; // index after which a gap is currently "playing"
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

const wave = (c: CanvasRenderingContext2D, seed: string, x: number, y: number, w: number, amp: number, col: string) => {
  const bars = Math.floor(w / 7);
  c.fillStyle = col;
  for (let i = 0; i < bars; i++) {
    const f = i / bars;
    const a = (0.25 + 0.75 * random(`${seed}${i}`)) * Math.sin(Math.PI * f) ** 0.7 * amp + 1.5;
    c.fillRect(x + i * 7, y - a, 3.5, a * 2);
  }
};

const clipTile = (c: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, state: "normal" | "active" | "gold" | "dim", big = false) => {
  const t = TH();
  const st = { normal: t.cardNormal, active: t.cardActive, gold: t.cardGold, dim: t.cardDim }[state];
  c.save();
  c.shadowColor = "rgba(20,30,60,0.18)";
  c.shadowBlur = big ? 22 : 10;
  c.shadowOffsetY = big ? 8 : 4;
  rr(c, x, y, w, h, big ? 20 : 12);
  c.fillStyle = st[0];
  c.fill();
  c.restore();
  c.strokeStyle = "rgba(0,0,0,0.08)";
  c.lineWidth = 2;
  rr(c, x, y, w, h, big ? 20 : 12);
  c.stroke();
  c.fillStyle = st[1];
  c.textAlign = "center";
  c.font = `700 ${big ? 40 : 30}px ${HINDI}`;
  c.fillText(label, x + w / 2, y + (big ? 52 : 40), w - 16);
  wave(c, label, x + 16, y + h * (big ? 0.7 : 0.7), w - 32, h * 0.17, st[2]);
};

const header = (c: CanvasRenderingContext2D, tab: number, playing: boolean) => {
  const W = SCREEN_W;
  const t = TH();
  c.fillStyle = t.uiHeader;
  c.fillRect(0, 0, W, 60);
  c.fillStyle = t.uiHeaderText;
  c.font = `600 26px ${POP}`;
  c.textAlign = "left";
  c.fillText("PASSENGER ANNOUNCEMENT SYSTEM", 24, 40);
  c.font = `600 22px ${POP}`;
  c.fillStyle = t.uiOk;
  c.textAlign = "right";
  c.fillText("● SERVER ONLINE", W - 260, 39);
  c.fillStyle = playing ? t.uiWarn : t.uiMuted;
  c.fillText(playing ? "▶ PA PLAYING" : "PA READY", W - 24, 39);
  // tabs
  c.fillStyle = t.uiTabs;
  c.fillRect(0, 60, W, 54);
  ["Trains", "Media", "Messages", "Settings", "Reports"].forEach((tab_, i) => {
    const x = 16 + i * 190;
    if (i === tab) {
      c.fillStyle = t.uiAccent;
      rr(c, x, 68, 176, 40, 8);
      c.fill();
    }
    c.fillStyle = i === tab ? t.uiOnAccent : t.uiTabText;
    c.font = `600 24px ${POP}`;
    c.textAlign = "center";
    c.fillText(tab_, x + 88, 96);
  });
};

const statusBar = (c: CanvasRenderingContext2D, playing: boolean) => {
  const t = TH();
  c.fillStyle = t.uiHeader;
  c.fillRect(0, SCREEN_H - 48, SCREEN_W, 48);
  c.font = `600 22px ${POP}`;
  c.textAlign = "left";
  c.fillStyle = t.uiHeaderText;
  c.fillText("Data link: OK", 24, SCREEN_H - 17);
  c.fillStyle = playing ? t.uiWarn : t.uiMuted;
  c.fillText(`Announcement status: ${playing ? "Playing ▶" : "Idle"}`, 360, SCREEN_H - 17);
  c.fillStyle = t.uiHeaderText;
  c.textAlign = "right";
  c.fillText("Volume 80%", SCREEN_W - 24, SCREEN_H - 17);
};

export const ROW_Y0 = 186;
export const ROW_H = 54;

export const drawScreen = (c: CanvasRenderingContext2D, s: ScreenState) => {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const t = TH();
  c.clearRect(0, 0, W, H);
  c.fillStyle = t.uiBg;
  c.fillRect(0, 0, W, H);
  const playing = !!s.playing;
  header(c, s.mode === "trains" ? 0 : 1, playing);

  if (s.mode === "trains") {
    const cols = [24, 150, 520, 590, 800, 900, 1000];
    const names = ["Train No", "Train Name", "A/D", "Status", "STA", "ETA", "PF"];
    c.fillStyle = t.uiTableHead;
    c.fillRect(16, 124, 1040, 50);
    c.fillStyle = t.uiHeaderText;
    c.font = `600 22px ${POP}`;
    c.textAlign = "left";
    names.forEach((n, i) => c.fillText(n, cols[i], 157));
    TRAINS.forEach((r, i) => {
      const y = ROW_Y0 + i * ROW_H;
      const late = r[3] === "Running Late";
      c.fillStyle = late ? t.uiRowLate : i % 2 ? t.uiRowB : t.uiRowA;
      c.fillRect(16, y, 1040, ROW_H - 4);
      c.fillStyle = t.uiText;
      c.font = `600 22px ${POP}`;
      r.forEach((v, k) => c.fillText(v, cols[k], y + 33));
    });
    if (s.sel !== undefined) {
      const y = ROW_Y0 + s.sel * ROW_H;
      c.strokeStyle = t.uiAccent;
      c.lineWidth = 5;
      rr(c, 12, y - 3, 1048, ROW_H + 2, 6);
      c.stroke();
      c.globalAlpha = 0.12;
      c.fillStyle = t.uiAccent;
      c.fill();
      c.globalAlpha = 1;
    }
    // right form panel
    const px = 1080;
    c.fillStyle = t.uiPanel;
    rr(c, px, 124, 500, H - 190, 14);
    c.fill();
    c.fillStyle = t.uiText;
    c.font = `600 26px ${POP}`;
    c.textAlign = "left";
    c.fillText("ANNOUNCE", px + 24, 168);
    const ty = s.typed ?? {};
    const fields: [string, string | undefined][] = [
      ["Train No", ty.no],
      ["Platform", ty.pf],
      ["Time", ty.time],
    ];
    fields.forEach(([lab, val], i) => {
      const y = 200 + i * 110;
      c.fillStyle = t.uiMuted;
      c.font = `600 22px ${POP}`;
      c.fillText(lab, px + 24, y + 18);
      c.fillStyle = t.uiField;
      rr(c, px + 24, y + 30, 452, 60, 10);
      c.fill();
      c.strokeStyle = val ? t.uiAccent : t.uiTabs;
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = t.uiText;
      c.font = `400 44px 'Anton', ${POP}`;
      const shown = val ?? "";
      c.fillText(shown, px + 40, y + 78);
      if (ty.caret && i === (ty.time !== undefined ? 2 : ty.pf !== undefined ? 1 : 0)) {
        const w = c.measureText(shown).width;
        c.fillStyle = t.uiAccent;
        c.fillRect(px + 44 + w, y + 42, 4, 38);
      }
    });
    c.fillStyle = t.uiMuted;
    c.font = `600 22px ${POP}`;
    c.fillText("Language", px + 24, 548);
    ["हिंदी", "English"].forEach((l, i) => {
      c.fillStyle = t.uiAccent;
      rr(c, px + 24 + i * 160, 562, 148, 48, 24);
      c.fill();
      c.fillStyle = t.uiOnAccent;
      c.textAlign = "center";
      c.font = `700 26px ${HINDI}`;
      c.fillText(l, px + 98 + i * 160, 595);
      c.textAlign = "left";
    });
    const pr = s.pressed ?? 0;
    c.fillStyle = pr > 0 ? t.uiAccentDark : t.uiAccent;
    rr(c, px + 24, 650 + pr * 4, 452, 76, 14);
    c.fill();
    c.fillStyle = t.uiOnAccent;
    c.font = `600 30px ${POP}`;
    c.textAlign = "center";
    c.fillText(playing ? "▶  PLAYING…" : "ANNOUNCE", px + 250, 700 + pr * 4);
    c.textAlign = "left";
  }

  if (s.mode === "media" || s.mode === "assemble") {
    c.fillStyle = t.uiText;
    c.font = `600 24px ${POP}`;
    c.textAlign = "left";
    c.fillText("CLIP LIBRARY  ·  Hindi  ·  Female voice  ·  24 clips", 24, 152);
    const cols = 4;
    const tw = 370;
    const th = 96;
    const gx = 22;
    const gy = 14;
    const x0 = (W - (cols * tw + (cols - 1) * gx)) / 2;
    const y0 = 172;
    const assemble = s.mode === "assemble";
    LIBRARY.forEach((lab, i) => {
      const cx = x0 + (i % cols) * (tw + gx);
      const cy = y0 + Math.floor(i / cols) * (th + gy);
      const flashing = s.pickFlash !== undefined && LIBRARY[i] === SEQUENCE[s.pickFlash];
      clipTile(c, lab, cx, cy, tw, th, flashing ? "active" : assemble ? "dim" : "normal");
    });
    if (assemble) {
      // sequence tray
      const n = s.picked ?? 0;
      c.globalAlpha = 0.95;
      c.fillStyle = t.uiBg;
      rr(c, 30, 470, W - 60, 420, 22);
      c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = t.uiTabs;
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = t.uiText;
      c.font = `600 24px ${POP}`;
      c.fillText("ANNOUNCEMENT SEQUENCE", 60, 512);
      const rows = [SEQUENCE.slice(0, 6), SEQUENCE.slice(6)];
      let k = 0;
      rows.forEach((row, r) => {
        const widths = row.map((l) => (l.length <= 4 ? 150 : l.length > 14 ? 420 : 330));
        const total = widths.reduce((a, b) => a + b, 0) + (row.length - 1) * 26;
        let x = (W - total) / 2;
        const y = 540 + r * 170;
        row.forEach((l, j) => {
          const idx = k++;
          if (idx < n) {
            const state = s.play === idx ? "active" : l === "सूरज नगर एक्सप्रेस" ? "gold" : "normal";
            clipTile(c, l, x, y, widths[j], 140, state, true);
            if (s.gapAfter === idx && j < row.length - 1) {
              c.fillStyle = t.uiAccent;
              c.fillRect(x + widths[j] + 10, y - 6, 6, 152);
            }
          }
          x += widths[j] + 26;
        });
      });
    }
  }
  (s.badges ?? []).forEach((b) => {
    if (b.s <= 0.01) return;
    c.save();
    c.translate(b.x, b.y);
    c.scale(b.s, b.s);
    c.font = `400 76px 'Anton', ${POP}`;
    const w = c.measureText(b.text).width + 60;
    c.shadowColor = "rgba(20,40,140,0.35)";
    c.shadowBlur = 24;
    rr(c, -w / 2, -56, w, 112, 14);
    c.fillStyle = b.text.includes(":") ? t.uiAccent : t.uiField;
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = t.uiAccent;
    c.lineWidth = 7;
    c.stroke();
    c.fillStyle = b.text.includes(":") ? t.uiOnAccent : t.uiText;
    c.textAlign = "center";
    c.fillText(b.text, 0, 30);
    c.restore();
  });
  statusBar(c, playing);
};
