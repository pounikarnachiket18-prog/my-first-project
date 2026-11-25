// v7: Mumbai -> Karachi travel time (~883 km great-circle; Mach 3 ~ 14 min, Mach 5 ~ 9 min at sea-level speed of sound).
// Night-reference operator map with racing clocks + day-reference "AT MACH N" finale card.
import React from "react";
import { prog, lerp, clamp01, ease } from "../engine";
import { GLState, Vec3 } from "./GLView";
import { useS, Svg, Panel, SUN } from "./scenes_h3";
import { Bg, Fx } from "./scenes_h4";

const FPS = 30;
const SUP = "#ffb703", HYP = "#ff3d9a";
const T_SUP = 14.3, T_HYP = 8.6; // minutes (883 km at 3,705 / 6,175 km/h)

// rough coastline (lat, lon) for an illustrative map: Makran coast -> Karachi -> Gujarat -> Mumbai -> Konkan
const COAST: [number, number][] = [
  [25.2, 64.6], [25.3, 65.6], [25.0, 66.4], [24.86, 67.0], [24.4, 67.2], [24.1, 67.45], [23.6, 68.3], [23.2, 68.7],
  [23.0, 69.6], [23.0, 70.2], [22.8, 69.9], [22.47, 69.07], [22.24, 68.97], [21.64, 69.6], [20.9, 70.37], [20.71, 70.98],
  [21.1, 71.6], [21.76, 72.15], [22.3, 72.6], [21.7, 72.97], [21.1, 72.65], [20.41, 72.83], [19.6, 72.75], [19.08, 72.85],
  [18.4, 72.95], [17.6, 73.15], [16.9, 73.3],
];
const MUM: [number, number] = [19.08, 72.88], KAR: [number, number] = [24.86, 67.0];

export const H7Time: React.FC = () => {
  const { f, W, dur, T } = useS("time");
  const p1 = W(9, 4), p2 = W(9, 9);
  // map projection into the panel (equirectangular, cos-lat scaled)
  const X0 = 90, Y0 = 400, MW = 900, MH = 470;
  const lon0 = 63.6, lon1 = 75.2, lat0 = 16.4, lat1 = 26.2;
  const k = Math.cos((21 * Math.PI) / 180);
  const sx = MW / ((lon1 - lon0) * k), sy = MH / (lat1 - lat0), sc = Math.min(sx, sy);
  const ox = X0 + (MW - (lon1 - lon0) * k * sc) / 2, oy = Y0 + (MH - (lat1 - lat0) * sc) / 2;
  const P = ([la, lo]: [number, number]): [number, number] => [ox + (lo - lon0) * k * sc, oy + (lat1 - la) * sc];
  const coast = COAST.map(P);
  const land = `M${coast.map((p) => p.join(" ")).join(" L")} L${ox + (lon1 - lon0) * k * sc + 40} ${oy + (lat1 - lat0) * sc + 40} L${ox + (lon1 - lon0) * k * sc + 40} ${oy - 40} L${ox - 40} ${oy - 40} L${ox - 40} ${coast[0][1]} Z`;
  const A = P(MUM), B = P(KAR);
  // race: map time runs while the line is spoken
  const run = prog(f, p1, dur - 6, (x) => x);
  const tMin = run * T_SUP;
  const qS = clamp01(tMin / T_SUP), qH = clamp01(tMin / T_HYP);
  const at = (q: number): [number, number] => [lerp(A[0], B[0], q), lerp(A[1], B[1], q) - Math.sin(q * Math.PI) * 30];
  const ds = at(qS), dh = at(qH);
  const clock = (m: number) => `${String(Math.floor(m)).padStart(2, "0")}:${String(Math.floor((m % 1) * 60)).padStart(2, "0")}`;
  const camFn = (fr: number): GLState["cam"] => ({ pos: [fr * 14, 30, -fr * 4], target: [fr * 14 + 400, 60, 900], fov: 0.7 });
  const a = camFn(f), b = camFn(f + 1);
  const vel: Vec3 = [(b.pos[0] - a.pos[0]) * FPS, 0, (b.pos[2] - a.pos[2]) * FPS];
  const s: GLState = { t: T, cam: a, exposure: 0.78, day: true, hideObjects: true, moonDir: SUN, mountains: 1, mist: 1, vel, shutter: 1 / 60 };
  const phase2 = f >= p2;
  const base = phase2 ? p2 : p1;
  const ln = (d: number) => {
    const q = prog(f, base + d, base + d + 8);
    return { opacity: q, transform: `translateY(${(1 - ease(q)) * 18}px) scaleX(0.82)` };
  };
  const shadow = "0 3px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.55)";
  const zoom = 1 + 0.035 * (f / dur);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: "brightness(0.9)" }}><Bg s={s} /><Fx s={s} /></div>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "50% 35%" }}>
        <Svg>
          <Panel y={330} h={590} title="MUMBAI → KARACHI · ≈ 880 km" f={f}>
            <defs><clipPath id="mapclip"><rect x={X0} y={Y0} width={MW} height={MH} rx={6} /></clipPath></defs>
            <g clipPath="url(#mapclip)">
              <rect x={X0} y={Y0} width={MW} height={MH} fill="#06243a" />
              {Array.from({ length: 16 }, (_, i) => <line key={`v${i}`} x1={X0 + i * 60} y1={Y0} x2={X0 + i * 60} y2={Y0 + MH} stroke="rgba(57,208,255,0.07)" />)}
              {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1={X0} y1={Y0 + i * 60} x2={X0 + MW} y2={Y0 + i * 60} stroke="rgba(57,208,255,0.07)" />)}
              <path d={land} fill="#123247" stroke="rgba(150,220,255,0.55)" strokeWidth={2.5} />
              <text x={X0 + 40} y={Y0 + MH - 120} fill="rgba(150,220,255,0.35)" fontFamily="JetBrains Mono" fontSize={20} letterSpacing={6}>ARABIAN SEA</text>
              <path d={`M${A[0]} ${A[1]} Q${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 - 60} ${B[0]} ${B[1]}`} stroke="rgba(255,255,255,0.45)" strokeWidth={3} strokeDasharray="10 10" fill="none" />
              {[[A, "MUMBAI", 1], [B, "KARACHI", -1]].map(([p, n, d], i) => (
                <g key={i}>
                  <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={10} fill="#fff" />
                  <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={20 + (f % 20)} fill="none" stroke="#fff" strokeWidth={2} opacity={1 - (f % 20) / 20} />
                  <text x={(p as number[])[0] + ((d as number) > 0 ? -18 : 18)} y={(p as number[])[1] + ((d as number) > 0 ? 40 : -22)} textAnchor={(d as number) > 0 ? "end" : "start"} fill="#fff" fontFamily="Inter" fontWeight={900} fontSize={34}>{n as string}</text>
                </g>
              ))}
              {f >= p1 && <circle cx={ds[0]} cy={ds[1]} r={12} fill={SUP} style={{ filter: `drop-shadow(0 0 8px ${SUP})` }} />}
              {f >= p1 && <circle cx={dh[0]} cy={dh[1]} r={12} fill={HYP} style={{ filter: `drop-shadow(0 0 8px ${HYP})` }} />}
            </g>
            {/* racing clocks (night-reference style) */}
            {[["SUPERSONIC · MACH 3", Math.min(tMin, T_SUP), SUP, 120], ["HYPERSONIC · MACH 5", Math.min(tMin, T_HYP), HYP, 590]].map(([n, m, col, x], i) => (
              <g key={i} transform={`translate(${x},${Y0 + MH - 84})`} opacity={prog(f, p1, p1 + 8)}>
                <rect width={370} height={64} rx={6} fill="rgba(3,10,16,0.85)" stroke={col as string} strokeWidth={2} />
                <text x={16} y={26} fill="rgba(255,255,255,0.75)" fontFamily="JetBrains Mono" fontSize={17}>{n as string}</text>
                <text x={354} y={52} textAnchor="end" fill={col as string} fontFamily="JetBrains Mono" fontWeight={600} fontSize={34}>{clock(m as number)}</text>
              </g>
            ))}
            <text x={540} y={905} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontFamily="JetBrains Mono" fontSize={16}>illustrative map · great-circle ≈ 883 km · sea-level speed of sound</text>
          </Panel>
        </Svg>
      </div>
      {f >= p1 && (
        <div key={phase2 ? "b" : "a"} style={{ position: "absolute", left: 0, width: 1080, top: 950, textAlign: "center", fontFamily: "Inter", fontWeight: 900, textShadow: shadow, lineHeight: 1.02 }}>
          <div style={{ ...ln(0), fontSize: 56, color: phase2 ? HYP : "#ffc233" }}>AT MACH {phase2 ? "5" : "3"}:</div>
          <div style={{ ...ln(3), fontSize: 84, color: "#fff" }}>MUMBAI → KARACHI</div>
          <div style={{ ...ln(6), fontSize: 84, color: "#fff" }}>IN ABOUT {phase2 ? 9 : 14} MINUTES</div>
        </div>
      )}
    </>
  );
};
void clamp01;
