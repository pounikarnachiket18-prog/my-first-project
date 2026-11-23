import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "./Highway";
import { DUSK, F, H, W } from "./theme";
import { CarSide, Person, SideGlassDef, TruckSide } from "./SideArt";

const Steam: React.FC<{ x: number; y: number; frame: number; scale?: number }> = ({ x, y, frame, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {[0, 1, 2].map((i) => {
      const t = ((frame + i * 18) % 54) / 54;
      return (
        <path
          key={i}
          d={`M ${i * 8 - 8} 0 Q ${-12 + Math.sin(frame / 8 + i) * 10} -30 ${i * 6} -60 Q ${14} -85 ${-4 + i * 4} -110`}
          stroke="#FFFFFF"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          opacity={(1 - t) * 0.55}
          transform={`translate(0 ${-t * 40})`}
        />
      );
    })}
  </g>
);

const Charpai: React.FC<{ x: number; y: number; w?: number }> = ({ x, y, w = 300 }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={w / 2} cy={4} rx={w * 0.6} ry={14} fill="#000" opacity={0.25} />
    <rect x={0} y={-62} width={14} height={62} fill="#6B4A2B" />
    <rect x={w - 14} y={-62} width={14} height={62} fill="#6B4A2B" />
    <rect x={-6} y={-74} width={w + 12} height={16} rx={6} fill="#8B5E34" />
    {Array.from({ length: Math.floor(w / 18) }, (_, i) => (
      <line key={i} x1={6 + i * 18} y1={-72} x2={18 + i * 18} y2={-60} stroke="#E6CFA0" strokeWidth={5} />
    ))}
  </g>
);

export const DhabaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 240], [1.0, 1.1]);
  const hz = 780;
  const bulbs = Array.from({ length: 22 }, (_, i) => i);

  // background highway traffic (side view, small)
  const trafficX = (base: number, speed: number) => ((base + frame * speed) % 1700) - 300;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <SideGlassDef />
        <defs>
          <radialGradient id="warm">
            <stop offset="0%" stopColor="#FFB347" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#FFB347" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="fire">
            <stop offset="0%" stopColor="#FFE08A" />
            <stop offset="50%" stopColor="#FF7A1A" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#FF3B00" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g transform={`translate(${W / 2} ${H * 0.62}) scale(${zoom}) translate(${-W / 2} ${-H * 0.62})`}>
          <Backdrop p={DUSK} horizon={hz} frame={frame} sunY={hz - 80} />
          {/* highway band behind dhaba */}
          <rect x={0} y={hz + 10} width={W} height={70} fill="#2E2C36" />
          <rect x={0} y={hz + 43} width={W} height={4} fill="#F4E9D8" strokeDasharray="30 30" />
          {[
            { b: 0, s: 9, c: "#D7263D" },
            { b: 600, s: 7, c: "#F2F2F2" },
            { b: 1100, s: 11, c: "#2E86AB" },
          ].map((v, i) => (
            <g key={i} transform={`translate(${trafficX(v.b, v.s)} ${hz + 70}) scale(0.28)`}>
              <CarSide color={v.c} spin={frame * 20} lights />
            </g>
          ))}
          <g transform={`translate(${1500 - ((frame * 5) % 2200)} ${hz + 68}) scale(0.3)`}>
            <TruckSide />
          </g>
          {/* courtyard ground */}
          <rect x={0} y={hz + 80} width={W} height={H} fill="#8A6A45" />
          <rect x={0} y={hz + 80} width={W} height={40} fill="#6E5236" />

          {/* ===== DHABA BUILDING ===== */}
          <g transform="translate(0 0)">
            {/* tin roof */}
            <path d="M 40 900 L 1040 900 L 990 840 L 90 840 Z" fill="#8E9AA3" />
            {Array.from({ length: 24 }, (_, i) => (
              <line key={i} x1={95 + i * 38} y1={842} x2={60 + i * 41} y2={898} stroke="#6E7A83" strokeWidth={3} />
            ))}
            {/* walls */}
            <rect x={80} y={900} width={920} height={360} fill="#F2C14E" />
            <rect x={80} y={1180} width={920} height={80} fill="#3A5BA0" />
            {/* open kitchen front with warm light */}
            <rect x={130} y={960} width={380} height={220} fill="#5A2E14" />
            <rect x={130} y={960} width={380} height={220} fill="url(#warm)" />
            <rect x={570} y={960} width={380} height={220} fill="#5A2E14" />
            <rect x={570} y={960} width={380} height={220} fill="url(#warm)" />
            {/* tandoor + cook */}
            <ellipse cx={230} cy={1180} rx={70} ry={20} fill="#3B2A20" />
            <path d="M 165 1180 Q 160 1100 200 1095 L 260 1095 Q 300 1100 295 1180 Z" fill="#B5651D" />
            <ellipse cx={230} cy={1097} rx={32} ry={9} fill="#1A0D05" />
            <circle cx={230} cy={1090} r={40 + Math.sin(frame / 3) * 6} fill="url(#fire)" />
            <Person x={360} y={1180} s={0.95} shirt="#F4F4F4" pants="#555" head="turban" headColor="#E0592A" armR={[110, 20]} armL={[60, 40]} moustache facing={-1} />
            {/* big chai pot on stove */}
            <rect x={700} y={1130} width={120} height={50} fill="#3B3B3B" />
            <path d="M 715 1130 L 805 1130 L 795 1060 L 725 1060 Z" fill="#B8BCC2" />
            <ellipse cx={760} cy={1060} rx={36} ry={8} fill="#7A4A2A" />
            <circle cx={760} cy={1150} r={18 + Math.sin(frame / 2) * 3} fill="url(#fire)" />
            <Steam x={760} y={1050} frame={frame} scale={1.4} />
            <Person x={880} y={1180} s={0.95} shirt="#2E86AB" head="hair" armR={[150, -40]} armL={[20, 30]} mouth={0.3} facing={-1} />
          </g>

          {/* sign board */}
          <g>
            <rect x={110} y={600} width={860} height={230} rx={18} fill="#B3001B" stroke="#FFD400" strokeWidth={10} />
            <rect x={490} y={830} width={14} height={30} fill="#555" />
            <rect x={580} y={830} width={14} height={30} fill="#555" />
            <text x={540} y={700} fontFamily={F.fun} fontWeight={800} fontSize={86} fill="#FFD400" textAnchor="middle">
              SHER-E-PUNJAB
            </text>
            <text x={540} y={772} fontFamily={F.deva} fontWeight={800} fontSize={50} fill="#FFFFFF" textAnchor="middle">
              शेर-ए-पंजाब ढाबा
            </text>
            <text x={540} y={815} fontFamily={F.ui} fontWeight={800} fontSize={22} letterSpacing={2} fill="#FFE08A" textAnchor="middle">
              24 HRS · PURE VEG &amp; NON-VEG · TRUCKERS WELCOME
            </text>
          </g>
          {/* string lights */}
          {bulbs.map((i) => {
            const x = 60 + i * 45;
            const y = 870 + Math.sin((i / 21) * Math.PI) * 40;
            const on = (Math.floor(frame / 5) + i) % 3 !== 0;
            const c = ["#FF5E5B", "#FFD400", "#3DDC97", "#4CC9F0"][i % 4];
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={9} fill={on ? c : "#555"} />
                {on && <circle cx={x} cy={y} r={26} fill={c} opacity={0.3} />}
              </g>
            );
          })}

          {/* menu board */}
          <g transform="translate(790 1300)">
            <rect x={0} y={0} width={270} height={300} rx={10} fill="#1F3B2D" stroke="#C8A26B" strokeWidth={10} />
            <rect x={127} y={300} width={16} height={130} fill="#6B4A2B" />
            <text x={135} y={48} fontFamily={F.fun} fontWeight={800} fontSize={36} fill="#FFD400" textAnchor="middle">MENU</text>
            {[
              ["Chai", "₹15"],
              ["Aloo Paratha", "₹60"],
              ["Dal Makhani", "₹140"],
              ["Butter Roti", "₹20"],
              ["Lassi", "₹40"],
            ].map(([n, p], i) => (
              <g key={n}>
                <text x={16} y={96 + i * 44} fontFamily={F.fun} fontWeight={700} fontSize={25} fill="#FFF">{n}</text>
                <text x={254} y={96 + i * 44} fontFamily={F.fun} fontWeight={800} fontSize={25} fill="#FFE08A" textAnchor="end">{p}</text>
              </g>
            ))}
          </g>

          {/* parked truck at left edge */}
          <g transform="translate(-130 1330) scale(0.75)">
            <TruckSide flip />
          </g>

          {/* charpais with customers */}
          <Charpai x={120} y={1560} w={330} />
          <Person x={190} y={1490} s={1.1} sitting shirt="#3D5A80" head="turban" headColor="#FF9933" moustache armR={[150, 30]} armL={[60, 40]} hold="cup" mouth={Math.max(0, Math.sin(frame / 6)) * 0.5} />
          <Steam x={265} y={1300} frame={frame} scale={0.6} />
          <Person x={380} y={1490} s={1.1} sitting facing={-1} shirt="#E36414" head="cap" headColor="#1A1A1A" armR={[90 + Math.sin(frame / 5) * 25, 40]} armL={[30, 20]} mouth={Math.max(0, Math.sin(frame / 5 + 2)) * 0.8} />
          {/* plates on charpai */}
          <ellipse cx={285} cy={1484} rx={44} ry={10} fill="#D9D9D9" />
          <ellipse cx={285} cy={1480} rx={30} ry={6} fill="#C98A3A" />

          <Charpai x={480} y={1720} w={360} />
          <Person x={560} y={1650} s={1.2} sitting shirt="#6A994E" head="hair" armR={[140, 50]} armL={[40, 30]} hold="cup" />
          <Steam x={645} y={1440} frame={frame + 20} scale={0.6} />
          <Person x={760} y={1650} s={1.2} sitting facing={-1} shirt="#F4F4F4" head="dupatta" headColor="#C9184A" skin="#C68B5E" armR={[120, 60]} armL={[20, 20]} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
