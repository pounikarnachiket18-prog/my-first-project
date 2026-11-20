/** 2D motion-graphics layer drawn over the 3D shots. */
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, random, spring, useVideoConfig } from "remotion";
import { TH } from "./theme";

type V3 = [number, number, number];
export type CamState = { pos: V3; target: V3; fov: number };

const W = 1080;
const H = 1920;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 400);
/** Project a 3D world point to screen pixels for the given camera. */
export const project = (c: CamState, p: V3): [number, number] => {
  cam.fov = c.fov;
  cam.aspect = W / H;
  cam.position.set(...c.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...c.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
};

export const MG = {
  red: () => TH().cardActive[0],
  blue: () => TH().cardGold[0],
  cream: () => TH().cardNormal[0],
  ink: () => TH().title1,
  gold: () => TH().safety,
};

const usePop = (f: number, at: number, damping = 13, stiffness = 170) => {
  const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, config: { damping, stiffness } });
};

/* ---------------------------------------------------------------- title */
export const KineticTitle: React.FC<{ f: number }> = ({ f }) => {
  const words1 = ["Announcement"];
  const words2 = ["ruk", "-", "ruk", "ke", "kyun?"];
  const glow = TH().titleGlow;
  const under = interpolate(f, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 250 }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          width: 1100,
          height: 600,
          opacity: clamp(f / 6),
          background: `radial-gradient(ellipse 55% 48% at 50% 50%, rgba(${glow},1) 35%, rgba(${glow},0.85) 55%, rgba(${glow},0) 75%)`,
        }}
      />
      <div style={{ position: "relative", textAlign: "center", textShadow: `0 0 14px rgb(${glow}), 0 0 30px rgb(${glow})` }}>
        <div style={{ overflow: "hidden", height: 128 }}>
          {words1.map((w, i) => {
            const p = usePop(f, 1 + i * 4, 14, 150);
            return (
              <span key={i} style={{ display: "inline-block", fontFamily: "Poppins", fontWeight: 800, fontSize: 112, color: MG.ink(), letterSpacing: -2, transform: `translateY(${(1 - p) * 130}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, alignItems: "baseline" }}>
          {words2.map((w, i) => {
            const p = usePop(f, 6 + i * 3, 11, 190);
            const isDash = w === "-";
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: "Poppins",
                  fontWeight: 800,
                  fontSize: 104,
                  color: MG.red(),
                  letterSpacing: -2,
                  opacity: clamp(p * 1.5),
                  transform: `scale(${0.4 + 0.6 * p}) rotate(${(1 - p) * (i % 2 ? 12 : -12)}deg)`,
                  width: isDash ? 30 : undefined,
                }}
              >
                {isDash ? (
                  // animated "pause" bars instead of a hyphen
                  <svg width={30} height={70} style={{ transform: "translateY(6px)" }}>
                    <rect x={2} y={8 + Math.sin(f / 3) * 4} width={9} height={52} rx={4} fill={MG.blue()} />
                    <rect x={19} y={8 - Math.sin(f / 3) * 4} width={9} height={52} rx={4} fill={MG.blue()} />
                  </svg>
                ) : (
                  w
                )}
              </span>
            );
          })}
        </div>
        {/* brush underline */}
        <svg width={760} height={50} style={{ marginTop: -6 }}>
          <path d="M 20 30 Q 200 8 380 24 T 740 18" fill="none" stroke={MG.blue()} strokeWidth={12} strokeLinecap="round" strokeDasharray={800} strokeDashoffset={800 * (1 - under)} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------- sound rings */
export const Rings: React.FC<{ x: number; y: number; f: number; color?: string; size?: number; speed?: number }> = ({ x, y, f, color, size = 260, speed = 24 }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
    {[0, 1, 2].map((i) => {
      const t = ((f / speed + i / 3) % 1 + 1) % 1;
      return <circle key={i} cx={x} cy={y} r={30 + t * size} fill="none" stroke={color ?? MG.red()} strokeWidth={10 * (1 - t) + 2} opacity={(1 - t) * 0.85} />;
    })}
  </svg>
);

/* ------------------------------------------------------------ speed lines */
export const SpeedLines: React.FC<{ f: number; amount: number; dir?: 1 | -1; color?: string; top?: number; bottom?: number }> = ({ f, amount, dir = 1, color, top = 0, bottom = H }) => {
  if (amount <= 0.01) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {new Array(26).fill(0).map((_, i) => {
        const y = top + random(`sl${i}`) * (bottom - top);
        const len = 120 + random(`sll${i}`) * 260;
        const sp = 40 + random(`sls${i}`) * 50;
        const x = (((f * sp * dir + random(`slx${i}`) * 2000) % 1600) + 1600) % 1600 - 260;
        return <line key={i} x1={x} y1={y} x2={x - len * dir} y2={y} stroke={color ?? "#FFFFFF"} strokeOpacity={0.55 * amount} strokeWidth={2 + random(`slw${i}`) * 4} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/* ----------------------------------------------------------- transitions */
export const Wipe: React.FC<{ f: number; len?: number }> = ({ f, len = 12 }) => {
  // diagonal bars sweep across and reveal the new shot
  if (f > len) return null;
  const t = f / len;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {[MG.red(), MG.blue(), MG.cream()].map((c, i) => {
        const x = interpolate(t, [0, 1], [0, 1700 + i * 200]) - i * 220;
        return <div key={i} style={{ position: "absolute", top: -400, left: x - 1200, width: 900, height: 2800, background: c, transform: "rotate(18deg)" }} />;
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- callouts */
export const Callout: React.FC<{ x: number; y: number; f: number; at: number; label: string; dx?: number; dy?: number; color?: string; hindi?: boolean }> = ({ x, y, f, at, label, dx = 160, dy = -160, color, hindi }) => {
  const line = interpolate(f, [at, at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p = usePop(f, at + 8);
  const col = color ?? MG.red();
  if (f < at) return null;
  const ex = x + dx * line;
  const ey = y + dy * line;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={x} cy={y} r={10 + 4 * Math.sin(f / 4)} fill={col} />
        <circle cx={x} cy={y} r={22 + ((f - at) % 20)} fill="none" stroke={col} strokeWidth={3} opacity={1 - ((f - at) % 20) / 20} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={col} strokeWidth={5} strokeLinecap="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x + dx,
          top: y + dy,
          transform: `translate(${dx > 0 ? "0" : "-100%"}, -50%) scale(${p})`,
          transformOrigin: dx > 0 ? "left center" : "right center",
          background: col,
          color: "#FFFFFF",
          fontFamily: hindi ? "Hind" : "Poppins",
          fontWeight: 800,
          fontSize: 40,
          padding: "12px 26px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {label}
      </div>
    </>
  );
};

export const FocusRing: React.FC<{ x: number; y: number; w: number; h: number; f: number; at: number; color?: string }> = ({ x, y, w, h, f, at, color }) => {
  const p = usePop(f, at, 12, 140);
  if (f < at) return null;
  const col = color ?? MG.red();
  const k = 1 + (1 - p) * 0.6;
  const dash = ((f - at) * 6) % 60;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <rect x={x - (w * k) / 2} y={y - (h * k) / 2} width={w * k} height={h * k} rx={28} fill="none" stroke={col} strokeWidth={7} strokeDasharray="30 30" strokeDashoffset={-dash} opacity={p} />
      {/* corner ticks */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => {
          const cx = x + (sx * w * k) / 2;
          const cy = y + (sy * h * k) / 2;
          return <path key={`${sx}${sy}`} d={`M ${cx - sx * 50} ${cy} L ${cx} ${cy} L ${cx} ${cy - sy * 50}`} stroke={col} strokeWidth={12} fill="none" strokeLinecap="round" opacity={p} />;
        })
      )}
    </svg>
  );
};

/* --------------------------------------------------------- cursor click */
export const Cursor: React.FC<{ x: number; y: number; f: number; clicks: number[]; from?: [number, number]; arrive?: [number, number] }> = ({ x, y, f, clicks, from, arrive = [0, 12] }) => {
  const t = interpolate(f, arrive, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - t, 3);
  const cx = from ? from[0] + (x - from[0]) * e : x;
  const cy = from ? from[1] + (y - from[1]) * e : y;
  const press = clicks.some((c) => f >= c && f < c + 4);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {clicks.map((c) => {
        const k = (f - c) / 16;
        if (k < 0 || k > 1) return null;
        return <circle key={c} cx={x} cy={y} r={20 + k * 90} fill="none" stroke={MG.blue()} strokeWidth={8 * (1 - k)} opacity={1 - k} />;
      })}
      <g transform={`translate(${cx} ${cy}) scale(${press ? 0.85 : 1})`}>
        <path d="M0 0 L0 62 L16 48 L28 76 L40 70 L28 44 L48 44 Z" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth={5} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------- key pops */
export const KeyPops: React.FC<{ x: number; y: number; f: number; keys: { ch: string; at: number }[]; tx: number; ty: number }> = ({ x, y, f, keys, tx, ty }) => (
  <>
    {keys.map((k, i) => {
      const t = clamp((f - k.at) / 14);
      if (f < k.at || t >= 1) return null;
      const e = 1 - Math.pow(1 - t, 2);
      const px = x + (tx - x) * e + Math.sin(i * 2.1) * 40 * (1 - e);
      const py = y + (ty - y) * e - Math.sin(Math.PI * e) * 160;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: px,
            top: py,
            transform: `translate(-50%,-50%) scale(${1 - 0.5 * e}) rotate(${(1 - e) * (i % 2 ? 20 : -20)}deg)`,
            width: 92,
            height: 92,
            borderRadius: 18,
            background: MG.cream(),
            border: `5px solid ${MG.blue()}`,
            boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Anton",
            fontSize: 58,
            color: MG.ink(),
            opacity: 1 - t * 0.3,
          }}
        >
          {k.ch}
        </div>
      );
    })}
  </>
);

/* ------------------------------------------------- playback timeline strip */
export type Seg = { from: number; to: number; gold?: boolean };
export const PlayTrack: React.FC<{ f: number; segs: Seg[]; y?: number; show?: number; label?: string }> = ({ f, segs, y = 1560, show = 1, label = "▶ ANNOUNCEMENT" }) => {
  const start = segs[0].from;
  const end = segs[segs.length - 1].to;
  const total = end - start;
  const x0 = 70;
  const w = 940;
  const head = x0 + clamp((f - start) / total) * w;
  const p = clamp(show);
  if (p <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: p }}>
      <rect x={x0 - 24} y={y - 86} width={w + 48} height={180} rx={30} fill={MG.cream()} opacity={0.94} stroke={MG.blue()} strokeWidth={4} />
      <text x={x0} y={y - 44} fontFamily="Poppins" fontWeight={800} fontSize={30} fill={MG.blue()}>
        {label}
      </text>
      {segs.map((s, i) => {
        const a = x0 + ((s.from - start) / total) * w;
        const b = x0 + ((s.to - start) / total) * w;
        const bars = Math.max(2, Math.floor((b - a) / 9));
        const col = s.gold ? MG.blue() : MG.ink();
        const next = segs[i + 1];
        const gapA = b;
        const gapB = next ? x0 + ((next.from - start) / total) * w : b;
        const inGap = next && head > gapA && head < gapB;
        return (
          <g key={i}>
            {new Array(bars).fill(0).map((_, k) => {
              const bx = a + ((k + 0.5) * (b - a)) / bars;
              const env = Math.sin(Math.PI * ((k + 0.5) / bars)) ** 0.5;
              const hh = 8 + env * 56 * (0.4 + 0.6 * random(`pt${i}${k}`));
              const lit = bx < head;
              return <rect key={k} x={bx - 2.5} y={y + 20 - hh / 2} width={5} height={hh} rx={2.5} fill={lit ? (head - bx < 12 ? MG.red() : col) : col} opacity={lit ? 1 : 0.25} />;
            })}
            {next && <rect x={gapA + 1} y={y - 18} width={Math.max(3, gapB - gapA - 2)} height={76} rx={3} fill={MG.red()} opacity={inGap ? 0.9 : 0.25} />}
          </g>
        );
      })}
      <line x1={head} y1={y - 26} x2={head} y2={y + 66} stroke={MG.red()} strokeWidth={5} />
      <circle cx={head} cy={y - 28} r={11} fill={MG.red()} />
    </svg>
  );
};

/* -------------------------------------------------------------- eq bars */
export const EqBars: React.FC<{ x: number; y: number; f: number; on: boolean; color?: string }> = ({ x, y, f, on, color }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
    {new Array(5).fill(0).map((_, i) => {
      const h = on ? 20 + Math.abs(Math.sin(f / 2.2 + i * 1.3)) * 60 : 8;
      return <rect key={i} x={x - 50 + i * 22} y={y - h} width={14} height={h} rx={6} fill={color ?? MG.red()} />;
    })}
  </svg>
);

/* ---------------------------------------------- bracket for a gap / pause */
export const GapBracket: React.FC<{ x: number; y: number; f: number; at: number; label?: string }> = ({ x, y, f, at, label = "PAUSE" }) => {
  const p = usePop(f, at, 10, 180);
  if (f < at) return null;
  const pulse = 1 + 0.08 * Math.sin((f - at) / 3);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${p * pulse})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: MG.red(), color: "#fff", padding: "10px 22px", borderRadius: 999, fontFamily: "Poppins", fontWeight: 800, fontSize: 34, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
        <svg width={26} height={30}>
          <rect x={2} y={2} width={8} height={26} rx={3} fill="#fff" />
          <rect x={16} y={2} width={8} height={26} rx={3} fill="#fff" />
        </svg>
        {label}
      </div>
    </div>
  );
};

/* ------------------------------------------- top progress: a tiny train */
export const TrainProgress: React.FC<{ g: number; total: number }> = ({ g, total }) => {
  const p = g / total;
  const x0 = 90;
  const w = 900;
  const x = x0 + p * w;
  const y = 120;
  return (
    <svg width={W} height={200} style={{ position: "absolute", top: 0, left: 0 }}>
      <line x1={x0} y1={y} x2={x0 + w} y2={y} stroke={MG.ink()} strokeOpacity={0.25} strokeWidth={5} strokeLinecap="round" />
      <line x1={x0} y1={y} x2={x} y2={y} stroke={MG.red()} strokeWidth={5} strokeLinecap="round" />
      {new Array(31).fill(0).map((_, i) => (
        <rect key={i} x={x0 + i * 30} y={y + 5} width={12} height={4} fill={MG.ink()} opacity={0.25} />
      ))}
      <g transform={`translate(${x - 82} ${y - 30})`}>
        <rect x={0} y={4} width={36} height={22} rx={4} fill={MG.blue()} />
        <rect x={40} y={4} width={42} height={22} rx={6} fill={MG.blue()} />
        <rect x={0} y={14} width={82} height={4} fill={MG.cream()} />
        <path d="M70 4 L82 12 L82 26 L70 26 Z" fill={MG.red()} />
        <circle cx={82} cy={16} r={3} fill={MG.gold()} />
        {[8, 26, 50, 70].map((cx) => (
          <circle key={cx} cx={cx} cy={29} r={4} fill={MG.ink()} />
        ))}
      </g>
    </svg>
  );
};

/* ------------------------------------------------- floating sparkles/dots */
export const Sparkles: React.FC<{ f: number; color?: string; n?: number }> = ({ f, color, n = 18 }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
    {new Array(n).fill(0).map((_, i) => {
      const x = random(`spx${i}`) * W;
      const y = (random(`spy${i}`) * H - f * (1 + random(`sps${i}`) * 2) + H * 2) % H;
      const s = 4 + random(`spr${i}`) * 8;
      return <rect key={i} x={x} y={y} width={s} height={s} rx={2} transform={`rotate(45 ${x} ${y})`} fill={color ?? MG.gold()} opacity={0.5 + 0.4 * Math.sin(f / 5 + i)} />;
    })}
  </svg>
);
