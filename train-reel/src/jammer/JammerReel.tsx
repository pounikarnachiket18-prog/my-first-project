/** Reel 2: "Jammer kaam kaise karta hai?" — 3D exam-hall diorama + motion graphics + Hinglish captions. */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import T from "./timeline.json";
import { setTheme, TH } from "../theme";
import { useFontsReady } from "../three/fonts";
import { Cam, Lights } from "../three/Parts";
import { CamState, Callout, MG, project, Rings, Wipe } from "../mg";
import { DOME_R, Dome, ExamHall, Ground, Jammer, JAMMER_POS, NoiseWaves, Outsiders, OUTSIDERS, Phone, PHONE_POS, SignalWaves, Tower, TOWER_TOP, V3 } from "./Models";
import { drawPhone, PHONE_H, PHONE_W, PhoneState } from "./phoneScreen";

const W = 1080;
const H = 1920;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const l3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
type Move = { p0: V3; t0: V3; p1: V3; t1: V3; fov?: number };
const camAt = (m: Move, f: number, dur: number): CamState => {
  const t = inOut(clamp(f / dur));
  return { pos: l3(m.p0, m.p1, t), target: l3(m.t0, m.t1, t), fov: m.fov ?? 50 };
};

const Canvas3D: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThreeCanvas
    width={W}
    height={H}
    gl={{ antialias: true, preserveDrawingBuffer: true }}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1.05;
    }}
  >
    {children}
  </ThreeCanvas>
);

const usePhoneTex = (s: PhoneState) => {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = PHONE_W;
    c.height = PHONE_H;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  drawPhone(canvas.getContext("2d")!, s);
  tex.needsUpdate = true;
  return tex;
};

const World: React.FC<{ f: number; phone: PhoneState; jamOn: boolean; noise?: number; waves?: boolean; dome?: number; outsiders?: boolean; children?: React.ReactNode }> = ({ f, phone, jamOn, noise = 0, waves = false, dome = 0, outsiders = false, children }) => {
  const tex = usePhoneTex(phone);
  return (
    <>
      <Lights />
      <Ground />
      <ExamHall f={f} />
      <Tower f={f} />
      <Phone screen={tex} />
      <Jammer f={f} on={jamOn} />
      {waves && <SignalWaves origin={TOWER_TOP} f={f} max={70} opacity={0.22} />}
      <NoiseWaves origin={add(JAMMER_POS, [0, 0.2, 0])} f={f} max={9} intensity={noise} />
      <Dome grow={dome} f={f} />
      {outsiders && <Outsiders f={f} />}
      {children}
    </>
  );
};

/* -------------------------------------------------------------- 2D layer */
const usePop = (f: number, at: number, damping = 12, stiffness = 170) => {
  const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, config: { damping, stiffness } });
};

/** Two-line Hinglish caption with word-by-word pop, on a soft glow. */
const Caption: React.FC<{ f: number; at: number; l1: string; l2?: string; until?: number; c2?: string; top?: number }> = ({ f, at, l1, l2, until = 99999, c2, top = 250 }) => {
  if (f < at || f >= until) return null;
  const glow = TH().titleGlow;
  const out = clamp((until - f) / 5);
  const words = (s: string) => s.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, opacity: out }}>
      <div style={{ position: "absolute", top: top - 110, width: 1100, height: 480, background: `radial-gradient(ellipse 52% 46% at 50% 50%, rgba(${glow},0.97) 30%, rgba(${glow},0.8) 52%, rgba(${glow},0) 74%)` }} />
      <div style={{ position: "relative", textAlign: "center", width: 1010, textShadow: `0 0 14px rgb(${glow}), 0 0 30px rgb(${glow})` }}>
        {[l1, l2].map((line, li) =>
          line ? (
            <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 20px", marginTop: li ? 4 : 0 }}>
              {words(line).map((w, wi) => {
                const p = usePop(f, at + li * 8 + wi * 2.5, 12, 190);
                return (
                  <span
                    key={wi}
                    style={{
                      display: "inline-block",
                      fontFamily: "Poppins",
                      fontWeight: 800,
                      fontSize: li ? 80 : 68,
                      lineHeight: 1.12,
                      letterSpacing: -1.5,
                      color: li ? c2 ?? MG.red() : MG.ink(),
                      opacity: clamp(p * 1.5),
                      transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`,
                    }}
                  >
                    {w}
                  </span>
                );
              })}
            </div>
          ) : null
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Dashed radio link between two screen points, with packets running both ways. */
const SignalBeam: React.FC<{ a: [number, number]; b: [number, number]; f: number; color?: string; broken?: number }> = ({ a, b, f, color, broken = 0 }) => {
  const col = color ?? "#3FA9F5";
  const mx = (a[0] + b[0]) / 2;
  const my = Math.min(a[1], b[1]) - 160;
  const pt = (t: number) => {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]];
  };
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`} fill="none" stroke={col} strokeWidth={6} strokeDasharray="18 14" strokeDashoffset={-f * 4} strokeLinecap="round" opacity={0.85 - broken * 0.6} />
      {new Array(4).fill(0).map((_, i) => {
        const t = ((f / 45 + i / 4) % 1 + 1) % 1;
        const [x, y] = pt(t);
        const [x2, y2] = pt(1 - t);
        const jitter = broken * (random(`bj${i}${Math.floor(f / 2)}`) - 0.5) * 60;
        return (
          <g key={i}>
            <circle cx={x + jitter} cy={y + jitter} r={13} fill={col} opacity={1 - broken * 0.7} />
            <circle cx={x2 - jitter} cy={y2} r={9} fill="#FFFFFF" stroke={col} strokeWidth={4} opacity={1 - broken * 0.7} />
          </g>
        );
      })}
    </svg>
  );
};

/** Red static scribbles radiating from a point. */
const NoiseBurst: React.FC<{ x: number; y: number; f: number; amount: number; r?: number }> = ({ x, y, f, amount, r = 380 }) => {
  if (amount <= 0.01) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {new Array(16).fill(0).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + random(`na${i}`) * 0.3;
        const t = ((f / 12 + random(`nt${i}`)) % 1 + 1) % 1;
        const r0 = 60 + t * r;
        let d = "";
        for (let k = 0; k <= 6; k++) {
          const rr = r0 + k * 16;
          const off = (random(`ns${i}${k}${Math.floor(f / 2)}`) - 0.5) * 34;
          const px = x + Math.cos(a) * rr + Math.cos(a + Math.PI / 2) * off;
          const py = y + Math.sin(a) * rr + Math.sin(a + Math.PI / 2) * off;
          d += `${k ? "L" : "M"} ${px} ${py} `;
        }
        return <path key={i} d={d} fill="none" stroke="#FF3B3B" strokeWidth={5} strokeLinejoin="round" opacity={(1 - t) * amount} />;
      })}
    </svg>
  );
};

/** Pill with an icon glyph. */
const Pill: React.FC<{ x: number; y: number; f: number; at: number; text: string; bg: string; size?: number }> = ({ x, y, f, at, text, bg, size = 40 }) => {
  const p = usePop(f, at, 11, 200);
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${p})`, background: bg, color: "#fff", fontFamily: "Poppins", fontWeight: 800, fontSize: size, padding: "12px 28px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
      {text}
    </div>
  );
};

/** Signal-strength badge (bars) used over people/phones. */
const BarsBadge: React.FC<{ x: number; y: number; f: number; at: number; ok: boolean }> = ({ x, y, f, at, ok }) => {
  const p = usePop(f, at, 11, 200);
  if (f < at) return null;
  const col = ok ? "#1E9E5A" : "#E03131";
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <g transform={`translate(${x} ${y}) scale(${p})`}>
        <rect x={-62} y={-50} width={124} height={88} rx={22} fill="#FFFFFF" stroke={col} strokeWidth={6} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-44 + i * 18} y={14 - (i + 1) * 12} width={12} height={(i + 1) * 12} rx={3} fill={ok ? col : "#C9CDD4"} />
        ))}
        <circle cx={40} cy={-14} r={17} fill={col} />
        <text x={40} y={-4} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={26} fill="#fff">
          {ok ? "✓" : "✕"}
        </text>
      </g>
    </svg>
  );
};

/** Animated wave row for the signal + noise = garbage panel. */
const WaveRow: React.FC<{ f: number; at: number; label: string; kind: "signal" | "noise" | "mix"; y: number }> = ({ f, at, label, kind, y }) => {
  const reveal = clamp((f - at) / 18);
  if (f < at) return null;
  const col = kind === "signal" ? "#2F6FD6" : kind === "noise" ? "#E03131" : "#7A3FB8";
  const x0 = 110;
  const w = 860;
  let d = "";
  for (let i = 0; i <= 172; i++) {
    const x = (i / 172) * w;
    if (x > w * reveal) break;
    const s = Math.sin(x / 26 - f / 3) * 22;
    const n = (random(`wr${i}${Math.floor(f / 2)}`) - 0.5) * 120;
    const v = kind === "signal" ? s : kind === "noise" ? n : s + n;
    d += `${i ? "L" : "M"} ${x0 + x} ${y + 125 + v * 0.85} `;
  }
  return (
    <>
      <div style={{ position: "absolute", left: x0 - 10, top: y - 14, fontFamily: "Poppins", fontWeight: 800, fontSize: 38, color: "#fff", background: col, padding: "4px 18px", borderRadius: 14 }}>{label}</div>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x0} y1={y + 125} x2={x0 + w} y2={y + 125} stroke="#000" strokeOpacity={0.08} strokeWidth={3} />
        <path d={d} fill="none" stroke={col} strokeWidth={kind === "signal" ? 8 : 5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </>
  );
};

const Progress: React.FC = () => {
  const g = useCurrentFrame();
  const p = g / T.total;
  return (
    <svg width={W} height={200} style={{ position: "absolute", top: 0, left: 0 }}>
      <line x1={90} y1={120} x2={990} y2={120} stroke={MG.ink()} strokeOpacity={0.2} strokeWidth={5} strokeLinecap="round" />
      <line x1={90} y1={120} x2={90 + 900 * p} y2={120} stroke={MG.red()} strokeWidth={5} strokeLinecap="round" />
      <g transform={`translate(${90 + 900 * p} 120)`}>
        <circle r={16} fill={MG.red()} />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${-8 - i * 7} ${-8 - i * 7} A ${12 + i * 10} ${12 + i * 10} 0 0 1 ${8 + i * 7} ${-8 - i * 7}`} fill="none" stroke={MG.red()} strokeWidth={3} opacity={0.8 - i * 0.2} transform="translate(0 -6)" />
        ))}
      </g>
      <text x={540} y={168} textAnchor="middle" fontFamily="Poppins" fontWeight={700} fontSize={26} fill={MG.ink()} opacity={0.55}>
        Mindset mode | Explainers
      </text>
    </svg>
  );
};

/* ================================================================== SHOTS */
type SP = { f: number; dur: number };
const S = T as unknown as Record<string, Record<string, number | number[]>>;

const J1: React.FC<SP> = ({ f, dur }) => {
  const [d0, d1] = S.j1.drop as number[];
  const bars = f < d0 ? 4 : Math.max(0, 4 - Math.floor((f - d0) / 3.5));
  const noService = f >= d1;
  const c = camAt({ p0: add(PHONE_POS, [0.05, 0.42, 0.2]), t0: PHONE_POS, p1: add(PHONE_POS, [0.02, 0.3, 0.13]), t1: PHONE_POS, fov: 45 }, f, dur);
  const [px, py] = project(c, PHONE_POS);
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars, noService, flash: noService ? clamp(1 - (f - d1) / 8) * 0.6 : 0 }} jamOn={f >= d0 - 6} />
        <Cam {...c} />
      </Canvas3D>
      {noService && <Rings x={px} y={py} f={f - d1} size={420} />}
      <Caption f={f} at={S.j1.cap1 as number} until={S.j1.cap2 as number} l1="Network full tha…" />
      <Caption f={f} at={S.j1.cap2 as number} l1="…achanak" l2="No Service?" />
    </>
  );
};

const J2: React.FC<SP> = ({ f, dur }) => {
  const a = lerp(-1.0, -0.35, inOut(clamp(f / dur)));
  const tgt = add(JAMMER_POS, [0, 0.12, 0]);
  const c: CamState = { pos: add(JAMMER_POS, [Math.sin(a) * 1.4, 0.55, Math.cos(a) * 1.4]), target: tgt, fov: 45 };
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn={false} />
        <Cam {...c} />
      </Canvas3D>
      <Caption f={f} at={S.j2.title as number} l1="Jammer" l2="kaam kaise karta hai?" top={300} />
      <Wipe f={f} len={9} />
    </>
  );
};

const J3: React.FC<SP> = ({ f, dur }) => {
  const c = camAt({ p0: [-16, 10, 24], t0: [6, 5, -10], p1: [-12, 8.6, 19.5], t1: [6, 5.5, -10], fov: 56 }, f, dur);
  const tw = project(c, TOWER_TOP);
  const ph = project(c, PHONE_POS);
  const mid: [number, number] = [Math.max(260, Math.min(820, (tw[0] + ph[0]) / 2)), Math.max(760, Math.min(tw[1], ph[1]) - 80)];
  const twMid = project(c, [TOWER_TOP[0], 14, TOWER_TOP[2]]);
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 4, noService: false }} jamOn={false} waves />
        <Cam {...c} />
      </Canvas3D>
      <SignalBeam a={tw} b={ph} f={f} />
      <Callout x={twMid[0]} y={twMid[1]} f={f} at={20} label="Mobile tower" dx={-160} dy={90} color={MG.blue()} />
      <Callout x={ph[0]} y={ph[1]} f={f} at={34} label="Phone" dx={120} dy={150} color={MG.blue()} />
      <Pill x={mid[0]} y={mid[1] + 150} f={f} at={S.j3.chip as number} text="Fixed frequency band" bg="#2F6FD6" size={36} />
      <Caption f={f} at={S.j3.cap as number} l1="Phone aur tower" l2="radio waves se baat karte hain" c2={MG.blue()} />
    </>
  );
};

const J4: React.FC<SP> = ({ f, dur }) => {
  const on = f >= (S.j4.on as number);
  const noise = clamp((f - (S.j4.on as number)) / 20);
  const c = camAt({ p0: [3.4, 2.5, 0.8], t0: add(JAMMER_POS, [0, 0.2, 0]), p1: [2.1, 1.7, -1.2], t1: add(JAMMER_POS, [0, 0.15, 0]), fov: 50 }, f, dur);
  const [jx, jy] = project(c, add(JAMMER_POS, [0, 0.1, 0]));
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: on ? 0 : 4, noService: on }} jamOn={on} noise={noise} />
        <Cam {...c} />
      </Canvas3D>
      <NoiseBurst x={jx} y={jy} f={f} amount={noise} />
      <Pill x={jx} y={jy + 190} f={f} at={S.j4.on as number} text="⏻ ON" bg="#E03131" />
      <Caption f={f} at={S.j4.cap as number} l1="Jammer usi frequency par" l2="'shor' bhejta hai" />
    </>
  );
};

const J5: React.FC<SP> = ({ f, dur }) => {
  const c = camAt({ p0: [-10, 9, 18], t0: [4, 4, -10], p1: [-8, 8, 15], t1: [4, 4, -10], fov: 56 }, f, dur);
  const rows = S.j5.rows as number[];
  const panel = usePop(f, 2, 14, 150);
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn noise={1} waves />
        <Cam {...c} />
      </Canvas3D>
      <AbsoluteFill style={{ background: `rgba(${TH().titleGlow},0.35)` }} />
      <div style={{ position: "absolute", left: 60, top: 640, width: 960, height: 900, borderRadius: 40, background: MG.cream(), border: `5px solid ${MG.blue()}`, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", transform: `scale(${0.8 + 0.2 * panel})`, opacity: panel }} />
      <WaveRow f={f} at={rows[0]} y={700} label="Tower ka signal (door se, halka)" kind="signal" />
      <WaveRow f={f} at={rows[1]} y={980} label="+ Jammer ka noise (paas se, tez)" kind="noise" />
      <WaveRow f={f} at={rows[2]} y={1260} label="= Phone tak pahunchta hai" kind="mix" />
      <Pill x={820} y={1480} f={f} at={rows[2] + 26} text="✕ samajh nahi aata" bg="#E03131" size={34} />
      <Caption f={f} at={S.j5.cap as number} l1="Signal shor mein" l2="dab jaata hai" />
    </>
  );
};

const J6: React.FC<SP> = ({ f, dur }) => {
  const c = camAt({ p0: add(PHONE_POS, [0.16, 0.3, 0.26]), t0: add(PHONE_POS, [0, 0, -0.02]), p1: add(PHONE_POS, [0.1, 0.26, 0.2]), t1: add(PHONE_POS, [0, 0, -0.02]), fov: 45 }, f, dur);
  const m = clamp((f - (S.j6.meter as number)) / 24);
  const chips = S.j6.chips as number[];
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn noise={1} />
        <Cam {...c} />
      </Canvas3D>
      {f >= (S.j6.meter as number) && (
        <div style={{ position: "absolute", left: 90, top: 1240, width: 900, padding: "30px 36px", borderRadius: 32, background: MG.cream(), border: `4px solid ${MG.blue()}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
          {[
            ["Signal", "#2F6FD6", 0.16],
            ["Noise", "#E03131", 0.94],
          ].map(([l, col, v]) => (
            <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 24, margin: "10px 0" }}>
              <div style={{ width: 150, fontFamily: "Poppins", fontWeight: 800, fontSize: 40, color: col as string }}>{l}</div>
              <div style={{ flex: 1, height: 48, borderRadius: 24, background: "rgba(0,0,0,0.08)" }}>
                <div style={{ width: `${(v as number) * m * 100}%`, height: "100%", borderRadius: 24, background: col as string }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {["✕ Calls", "✕ Internet", "✕ SMS"].map((t, i) => (
        <Pill key={t} x={230 + i * 310} y={1600} f={f} at={chips[i]} text={t} bg="#E03131" size={38} />
      ))}
      <Caption f={f} at={S.j6.cap as number} l1="Phone tower ki baat" l2="samajh hi nahi paata" />
    </>
  );
};

const INSIDE: V3[] = [
  [-4.5, 1.6, -1.4],
  [4.5, 1.6, 1.0],
  [-1.5, 1.6, 3.4],
];
const J7: React.FC<SP> = ({ f, dur }) => {
  const { fps } = useVideoConfig();
  const grow = spring({ frame: f - (S.j7.dome as number), fps, config: { damping: 16, stiffness: 60 } });
  const c = camAt({ p0: [-6, 30, 30], t0: [0, 0, -1], p1: [6, 26, 27], t1: [0, 0, -1], fov: 50 }, f, dur);
  const marks = S.j7.marks as number;
  const [ex, ey] = project(c, [JAMMER_POS[0] + DOME_R * 0.72, 0.1, JAMMER_POS[2] + 2 + DOME_R * 0.72]);
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn noise={0.6} dome={grow} outsiders />
        <Cam {...c} />
      </Canvas3D>
      {INSIDE.map((p, i) => {
        const [x, y] = project(c, p);
        return <BarsBadge key={i} x={x} y={y - 40} f={f} at={marks + i * 5} ok={false} />;
      })}
      {OUTSIDERS.map((p, i) => {
        const [x, y] = project(c, p);
        return <BarsBadge key={i} x={x} y={y - 60} f={f} at={marks + 18 + i * 5} ok />;
      })}
      <Pill x={Math.max(240, Math.min(840, ex))} y={Math.min(1650, ey + 30)} f={f} at={(S.j7.dome as number) + 30} text="Jammer ki range" bg="#E03131" size={34} />
      <Caption f={f} at={S.j7.cap as number} l1="Sirf range ke andar" l2="network gayab!" />
    </>
  );
};

const J8: React.FC<SP> = ({ f, dur }) => {
  const c = camAt({ p0: add(JAMMER_POS, [1.3, 0.6, 1.1]), t0: add(JAMMER_POS, [0, 0.15, 0]), p1: add(JAMMER_POS, [0.9, 0.45, 0.8]), t1: add(JAMMER_POS, [0, 0.15, 0]), fov: 45 }, f, dur);
  const stampAt = S.j8.stamp as number;
  const st = usePop(f, stampAt, 9, 260);
  const shake = f >= stampAt && f < stampAt + 8 ? Math.sin(f * 4) * 12 * (1 - (f - stampAt) / 8) : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn noise={0.5} />
        <Cam {...c} />
      </Canvas3D>
      {f >= stampAt && (
        <div style={{ position: "absolute", left: 540, top: 1080, transform: `translate(-50%,-50%) rotate(-12deg) scale(${2.4 - 1.4 * st})`, opacity: clamp(st * 1.4), border: "12px solid #E03131", borderRadius: 28, padding: "10px 40px", color: "#E03131", fontFamily: "Anton", fontSize: 150, letterSpacing: 8, background: "rgba(255,255,255,0.75)" }}>
          ILLEGAL
        </div>
      )}
      <Pill x={540} y={1460} f={f} at={S.j8.sub as number} text="Sirf authorised govt agencies" bg={MG.blue()} size={40} />
      <Pill x={540} y={1560} f={f} at={(S.j8.sub as number) + 8} text="jail · exam centre · security" bg={MG.blue()} size={34} />
      <Caption f={f} at={S.j8.cap as number} l1="India mein bina permission" l2="jammer = illegal" />
    </AbsoluteFill>
  );
};

const J9: React.FC<SP> = ({ f, dur }) => {
  const c = camAt({ p0: [-8, 14, 22], t0: [6, 5, -10], p1: [-20, 26, 42], t1: [6, 5, -10], fov: 52 }, f, dur);
  const b = usePop(f, S.j9.brand as number, 12, 160);
  return (
    <>
      <Canvas3D>
        <World f={f} phone={{ bars: 0, noService: true }} jamOn noise={0.7} waves dome={1} outsiders />
        <Cam {...c} />
      </Canvas3D>
      <Caption f={f} at={S.j9.cap as number} l1="Jammer = itna shor" l2="ki signal dab jaaye!" />
      <div style={{ position: "absolute", left: 540, top: 1500, transform: `translate(-50%,-50%) scale(${b})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ whiteSpace: "nowrap", fontFamily: "Poppins", fontWeight: 800, fontSize: 40, color: MG.ink(), background: MG.cream(), padding: "10px 30px", borderRadius: 999 }}>Follow for more</div>
        <div style={{ whiteSpace: "nowrap", fontFamily: "Poppins", fontWeight: 800, fontSize: 56, color: "#fff", background: MG.red(), padding: "18px 46px", borderRadius: 999, boxShadow: `0 0 ${30 + 15 * Math.sin(f / 5)}px rgba(158,27,34,0.6)` }}>Mindset mode | Explainers</div>
      </div>
    </>
  );
};

const SHOTS: Record<string, React.FC<SP>> = { j1: J1, j2: J2, j3: J3, j4: J4, j5: J5, j6: J6, j7: J7, j8: J8, j9: J9 };

const ShotHost: React.FC<{ id: string; dur: number }> = ({ id, dur }) => {
  const f = useCurrentFrame();
  const ready = useFontsReady();
  const Comp = SHOTS[id];
  if (!ready) return null;
  return <Comp f={f} dur={dur} />;
};

export const JammerReel: React.FC<{ theme?: string; audio?: boolean }> = ({ theme = "classic", audio = true }) => {
  setTheme(theme);
  return (
    <AbsoluteFill style={{ background: TH().bg }}>
      {T.shots.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          <ShotHost id={s.id} dur={s.dur} />
        </Sequence>
      ))}
      <Progress />
      {audio && <Audio src={staticFile("jammer-audio.wav")} />}
    </AbsoluteFill>
  );
};
