import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, C, FONT } from "./theme";
import { s } from "./theme";
import {
  BerthTop,
  ChadarTop,
  CheckPattern,
  CoachBackdrop,
  Emblem,
  PacketTop,
  Pill,
  PillowTop,
  PrintedCover,
  Slab,
  Title,
  World,
  useCam,
} from "./parts";

const BW = 640; // berth plane
const BH = 1700;
const BERTH_Z = 70;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number, b: number, from: number, to: number) =>
  interpolate(f, [a, b], [from, to], clamp);

const Berth: React.FC = () => (
  <Slab x={0} y={0} w={BW} h={BH} thick={BERTH_Z} side={C.berthSide} radius={44}>
    <BerthTop />
  </Slab>
);

const Pillow: React.FC = () => (
  <Slab x={110} y={70} w={420} h={200} thick={46} z={BERTH_Z} side={C.sheetSide} radius={70}>
    <PillowTop />
  </Slab>
);

const BlanketStack: React.FC<{ n?: number }> = ({ n = 3 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => (
      <Slab
        key={i}
        x={90 + (i % 2) * 8}
        y={380 - i * 4}
        w={460}
        h={380}
        thick={28}
        z={BERTH_Z + i * 30}
        side={C.blanketSide}
        radius={22}
        rot={i === 1 ? -1.5 : i === 2 ? 1 : 0}
        shadow={i === 0}
      >
        <CheckPattern w={460} h={380} />
      </Slab>
    ))}
  </>
);

/* ================================================================== */
/* 1+2. Hook → bedroll packet opens (0 – 8.7s)                         */
/* ================================================================== */
export const HookPacketScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam([
    { t: 0, rx: 58, rz: -34, s: 1.35, x: 60, y: 260 },
    { t: 4.2, rx: 56, rz: -30, s: 1.25, x: 40, y: 160 },
    { t: 5.2, rx: 48, rz: -20, s: 1.55, x: 40, y: -330 },
    { t: 8.7, rx: 46, rz: -18, s: 1.62, x: 40, y: -360 },
  ]);
  // packet opening
  const open = lerp(frame, s(5.3), s(6.3), 0, 1);
  const chadarOut = lerp(frame, s(5.6), s(6.6), 0, 1);
  const coverOut = lerp(frame, s(6.3), s(7.3), 0, 1);

  return (
    <AbsoluteFill>
      <CoachBackdrop />
      <World cam={cam} w={BW} h={BH}>
        <Berth />
        <Pillow />
        <BlanketStack />
        {/* bedroll packet: base stays, lid slides off */}
        <Slab x={100} y={860} w={440} h={290} thick={34} z={BERTH_Z} side={C.packetSide} radius={16} opacity={1 - lerp(frame, s(7.0), s(7.6), 0, 0.85)}>
          <div style={{ width: "100%", height: "100%", background: `radial-gradient(ellipse at 50% 50%, #B9772A, ${C.packetSide})`, boxShadow: "inset 0 0 40px rgba(60,30,0,0.6)" }} />
        </Slab>
        {/* folded chadar */}
        <Slab
          x={lerp(chadarOut, 0, 1, 130, -10)}
          y={lerp(chadarOut, 0, 1, 880, 1220)}
          w={300}
          h={230}
          thick={16}
          z={BERTH_Z + 34 + chadarOut * 6}
          side={C.sheetSide}
          radius={10}
          opacity={lerp(frame, s(5.4), s(5.6), 0, 1)}
        >
          <ChadarTop w={300} h={230} />
        </Slab>
        {/* pillow cover */}
        <Slab
          x={lerp(coverOut, 0, 1, 180, 340)}
          y={lerp(coverOut, 0, 1, 900, 1250)}
          w={230}
          h={170}
          thick={10}
          z={BERTH_Z + 34 + coverOut * 4}
          side={C.sheetSide}
          radius={10}
          opacity={lerp(frame, s(6.2), s(6.4), 0, 1)}
        >
          <ChadarTop w={230} h={170} />
        </Slab>
        {/* lid */}
        <Slab
          x={100 + open * 380}
          y={860 - open * 40}
          w={440}
          h={290}
          thick={14}
          z={BERTH_Z + 34 + open * 30}
          side={C.packetSide}
          radius={16}
          rot={open * 18}
          opacity={1 - lerp(open, 0.6, 1, 0, 1)}
        >
          <PacketTop w={440} h={290} />
        </Slab>
      </World>
      <Title text={"Kambal *kab*\ndhula?"} inAt={2} outAt={s(4.5)} />
      <Pill text="Chadar" x={520} y={1330} inAt={s(6.0)} outAt={s(8.7)} />
      <Pill text="Takiye ka cover" x={800} y={680} inAt={s(6.8)} outAt={s(8.7)} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. Attendant — "Har trip ke baad" (8.7 – 11.2s)                     */
/* ================================================================== */
const Corridor: React.FC = () => {
  const vx = 540;
  const vy = 720;
  const berths = [0, 1, 2, 3, 4, 5];
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <rect width="1080" height="1920" fill={C.wall} />
      {/* ceiling + floor */}
      <polygon points={`0,0 1080,0 ${vx + 90},${vy - 120} ${vx - 90},${vy - 120}`} fill="#FBF6EE" />
      <polygon points={`0,1920 1080,1920 ${vx + 90},${vy + 140} ${vx - 90},${vy + 140}`} fill={C.wallDeep} />
      {/* ceiling light strips */}
      {[0, 1, 2, 3].map((i) => {
        const k = 1 / (1 + i * 0.9);
        return (
          <rect
            key={i}
            x={vx - 260 * k}
            y={vy - 120 - 520 * k}
            width={520 * k}
            height={34 * k}
            rx={10 * k}
            fill="#FFF3D0"
            opacity={0.95}
          />
        );
      })}
      {/* berths both sides, receding */}
      {berths.map((i) => {
        const k1 = 1 / (1 + i * 0.75);
        const k2 = 1 / (1 + (i + 0.6) * 0.75);
        const side = (dir: number) => {
          const xo1 = vx + dir * 640 * k1;
          const xo2 = vx + dir * 640 * k2;
          const xi1 = vx + dir * 380 * k1;
          const xi2 = vx + dir * 380 * k2;
          const yt1 = vy + 60 * k1;
          const yt2 = vy + 60 * k2;
          const yb1 = vy + 420 * k1;
          const yb2 = vy + 420 * k2;
          return (
            <g key={dir}>
              <polygon points={`${xo1},${yt1} ${xi1},${yt1} ${xi2},${yt2} ${xo2},${yt2}`} fill={C.berthEdge} />
              <polygon points={`${xi1},${yt1} ${xi2},${yt2} ${xi2},${yb2} ${xi1},${yb1}`} fill={C.berth} />
              {/* upper berth */}
              <polygon
                points={`${xo1},${vy - 330 * k1} ${xi1},${vy - 330 * k1} ${xi2},${vy - 330 * k2} ${xo2},${vy - 330 * k2}`}
                fill={C.berthSide}
              />
            </g>
          );
        };
        return (
          <g key={i}>
            {side(-1)}
            {side(1)}
          </g>
        );
      }).reverse()}
      <rect width="1080" height="1920" fill="url(#vig)" />
      <defs>
        <radialGradient id="vig" cx="50%" cy="40%" r="75%">
          <stop offset="0.6" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(60,30,10,0.25)" />
        </radialGradient>
      </defs>
    </svg>
  );
};

const Attendant: React.FC = () => {
  const frame = useCurrentFrame();
  const blink = frame % 70 < 4 ? 0.12 : 1;
  const breathe = Math.sin(frame / 9) * 4;
  return (
    <svg width="760" height="1300" viewBox="0 0 760 1300" style={{ display: "block" }}>
      <defs>
        <linearGradient id="jacket" x1="0" x2="1">
          <stop offset="0" stopColor={C.uniformDark} />
          <stop offset="0.5" stopColor={C.uniform} />
          <stop offset="1" stopColor={C.uniformDark} />
        </linearGradient>
      </defs>
      {/* hair bun (behind head) */}
      <circle cx="380" cy="150" r="70" fill={C.hair} />
      {/* torso */}
      <g transform={`translate(0 ${breathe})`}>
        <path d="M 200 470 Q 380 410 560 470 L 600 900 L 160 900 Z" fill="url(#jacket)" />
        {/* shirt V */}
        <path d="M 330 440 L 380 560 L 430 440 Z" fill="#FFFFFF" />
        <path d="M 300 450 L 380 600 L 345 455 Z" fill={C.uniformDark} />
        <path d="M 460 450 L 380 600 L 415 455 Z" fill={C.uniformDark} />
        {/* saffron dupatta across shoulder */}
        <path d="M 230 470 Q 300 460 330 450 L 560 860 L 500 890 Z" fill={C.dupatta} />
        <path d="M 250 472 L 520 880" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="6" strokeDasharray="14 12" />
        {/* ID card */}
        <path d="M 345 455 L 300 640 M 415 455 L 300 640" stroke="#2B1B14" strokeWidth="4" fill="none" />
        <rect x="262" y="636" width="78" height="100" rx="8" fill="#FFFFFF" stroke="#2B1B14" strokeWidth="3" />
        <rect x="276" y="650" width="50" height="34" rx="4" fill={C.accent} />
        <rect x="276" y="694" width="50" height="6" fill="#2B1B14" />
        <rect x="276" y="708" width="36" height="6" fill="#2B1B14" />
        {/* arms */}
        <path d="M 200 480 Q 150 640 170 780 L 230 790 Q 230 660 260 560 Z" fill="url(#jacket)" />
        <path d="M 560 480 Q 610 640 590 780 L 530 790 Q 530 660 500 560 Z" fill="url(#jacket)" />
        <path d="M 170 770 Q 200 860 300 860 L 300 820 Q 240 820 230 780 Z" fill={C.skin} />
        <path d="M 590 770 Q 560 860 460 860 L 460 820 Q 520 820 530 780 Z" fill={C.skin} />
      </g>
      {/* neck */}
      <rect x="345" y="330" width="70" height="110" rx="20" fill={C.skinShade} />
      {/* head */}
      <g transform={`translate(0 ${breathe * 0.6})`}>
        <ellipse cx="290" cy="265" rx="22" ry="32" fill={C.skinShade} />
        <ellipse cx="470" cy="265" rx="22" ry="32" fill={C.skinShade} />
        <circle cx="290" cy="300" r="8" fill={C.accent} />
        <circle cx="470" cy="300" r="8" fill={C.accent} />
        <ellipse cx="380" cy="250" rx="95" ry="118" fill={C.skin} />
        {/* hair with centre parting */}
        <path d="M 282 240 Q 280 130 380 125 Q 480 130 478 240 Q 470 170 380 160 Q 290 170 282 240 Z" fill={C.hair} />
        <path d="M 380 128 L 380 162" stroke={C.skinShade} strokeWidth="5" />
        {/* brows */}
        <path d="M 318 222 Q 340 210 360 220" stroke={C.hair} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M 400 220 Q 420 210 442 222" stroke={C.hair} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* eyes */}
        <g transform={`translate(0 248) scale(1 ${blink}) translate(0 -248)`}>
          <ellipse cx="340" cy="248" rx="17" ry="12" fill="#FFFFFF" />
          <ellipse cx="420" cy="248" rx="17" ry="12" fill="#FFFFFF" />
          <circle cx="342" cy="249" r="8" fill="#2B1B14" />
          <circle cx="422" cy="249" r="8" fill="#2B1B14" />
        </g>
        {/* bindi, nose, smile */}
        <circle cx="380" cy="205" r="6" fill={C.berth} />
        <path d="M 380 258 Q 372 290 384 296" stroke={C.skinShade} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 345 318 Q 380 345 415 318" stroke="#7A2E22" strokeWidth="7" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export const AttendantScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sc = lerp(frame, 0, s(2.5), 0.96, 1.06);
  const sway = Math.sin(frame / 6) * 1.2;
  return (
    <AbsoluteFill>
      <Corridor />
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 360,
          transformOrigin: "50% 100%",
          transform: `scale(${sc}) rotate(${sway}deg)`,
        }}
      >
        <Attendant />
        {/* the branded chadar she holds up */}
        <div
          style={{
            position: "absolute",
            left: 120,
            top: 820,
            width: 520,
            height: 560,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 30px 60px rgba(60,30,10,0.35)",
            transform: `skewX(${Math.sin(frame / 8) * 1.5}deg)`,
          }}
        >
          <ChadarTop w={520} h={560} big label="HAR TRIP • FRESH" />
        </div>
      </div>
      <Pill text="Har trip ke baad" x={540} y={1800} variant="key" size={54} inAt={8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. Laundry — Dhulai → Press → Naya packet (11.2 – 16s)              */
/* ================================================================== */
const Worker: React.FC<{ x: number; y: number; sc?: number; flip?: boolean }> = ({ x, y, sc = 1, flip }) => {
  const frame = useCurrentFrame();
  const arm = Math.sin(frame / 5) * 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})`}>
      <rect x="-38" y="150" width="30" height="150" rx="12" fill="#2B2B33" />
      <rect x="8" y="150" width="30" height="150" rx="12" fill="#2B2B33" />
      <path d="M -60 40 Q 0 10 60 40 L 52 170 L -52 170 Z" fill={C.uniform} />
      <rect x={-78} y={50} width="26" height="110" rx="12" fill={C.uniform} transform={`rotate(${arm} -65 55)`} />
      <rect x={52} y={50} width="26" height="110" rx="12" fill={C.uniform} transform={`rotate(${-arm} 65 55)`} />
      <circle cx="0" cy="0" r="44" fill={C.skinShade} />
      <path d="M -44 -6 Q -40 -48 0 -48 Q 40 -48 44 -6 Q 0 -20 -44 -6 Z" fill={C.hair} />
    </g>
  );
};

const Machine: React.FC<{ x: number; y: number; spin: number }> = ({ x, y, spin }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="0" width="300" height="400" rx="26" fill={C.machine} stroke="#D5CCBC" strokeWidth="6" />
    <rect x="0" y="0" width="300" height="70" rx="26" fill={C.machinePanel} />
    <circle cx="240" cy="35" r="10" fill="#7CFFB2" />
    <circle cx="205" cy="35" r="10" fill={C.accent} />
    <circle cx="150" cy="230" r="118" fill="#D5CCBC" />
    <circle cx="150" cy="230" r="100" fill="#4B5C66" />
    <g transform={`rotate(${spin} 150 230)`}>
      <ellipse cx="120" cy="260" rx="52" ry="34" fill="#FFFFFF" />
      <ellipse cx="185" cy="205" rx="44" ry="30" fill={C.blanketStripe} opacity="0.9" />
      <ellipse cx="150" cy="180" rx="36" ry="24" fill="#FFFFFF" />
      <ellipse cx="190" cy="275" rx="30" ry="22" fill={C.packet} />
    </g>
    <circle cx="150" cy="230" r="100" fill="rgba(255,255,255,0.12)" />
    <path d="M 90 170 Q 120 140 160 140" stroke="rgba(255,255,255,0.5)" strokeWidth="10" fill="none" strokeLinecap="round" />
  </g>
);

export const LaundryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pan = interpolate(frame, [0, s(1.7), s(2.2), s(3.0), s(3.5), s(4.8)], [0, -60, -1080, -1120, -2160, -2200], clamp);
  const zoom = interpolate(frame, [0, s(4.8)], [1.2, 1.14], clamp);
  const roller = frame * 6;
  const sheetX = (frame * 9) % 900;
  const packets = Array.from({ length: 9 }).map((_, i) => {
    const p = spring({ frame: frame - s(3.4) - i * 3, fps, config: { damping: 12, stiffness: 180 } });
    return p;
  });
  return (
    <AbsoluteFill style={{ background: C.laundryWall, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "540px 1000px" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${pan}px)` }}>
        <svg width="3240" height="1920">
          <rect width="3240" height="1920" fill={C.laundryWall} />
          <rect y="1250" width="3240" height="670" fill="#C9D3CE" />
          {Array.from({ length: 30 }).map((_, i) => (
            <rect key={i} x={i * 110} y="0" width="6" height="1250" fill="rgba(0,0,0,0.04)" />
          ))}
          {/* station 1: machines */}
          <Machine x={40} y={600} spin={frame * 14} />
          <Machine x={390} y={600} spin={frame * 14 + 90} />
          <Machine x={740} y={600} spin={frame * 14 + 200} />
          <Worker x={300} y={1200} sc={1.25} />
          <Worker x={820} y={1280} sc={1.4} flip />
          {/* station 2: press */}
          <rect x={1160} y={760} width={920} height={360} rx={30} fill={C.machine} stroke="#D5CCBC" strokeWidth="6" />
          <rect x={1160} y={760} width={920} height={60} rx={20} fill={C.machinePanel} />
          <rect x={1220} y={880} width={800} height={150} rx={75} fill="#8F9AA0" />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x={1220 + (((i * 70 + roller) % 800) + 800) % 800}
              y={890}
              width={10}
              height={130}
              fill="rgba(255,255,255,0.35)"
            />
          ))}
          <rect x={1120 + sheetX} y={1040} width={380} height={40} rx={6} fill="#FFFFFF" />
          <rect x={1120 + sheetX - 900} y={1040} width={380} height={40} rx={6} fill="#FFFFFF" />
          <rect x={1160} y={1120} width={920} height={130} fill="#B7C1BC" />
          <Worker x={1620} y={1330} sc={1.3} />
          {/* station 3: packing table */}
          <polygon points="2250,1060 3180,1060 3230,1200 2200,1200" fill="#9FA8A3" />
          <rect x={2230} y={1200} width={30} height={300} fill="#7F8883" />
          <rect x={3170} y={1200} width={30} height={300} fill="#7F8883" />
          <Worker x={3080} y={880} sc={1.1} />
          <rect x={2300} y={1010} width={200} height={50} rx={6} fill="#FFFFFF" />
          <rect x={2310} y={970} width={180} height={40} rx={6} fill="#FFFFFF" />
        </svg>
        {/* packets stacking (HTML so the Hindi print renders crisply) */}
        {packets.map((p, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 2560 + col * 190,
                top: 980 - row * 64 - (1 - p) * 200,
                width: 180,
                height: 70,
                opacity: p,
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 6px 10px rgba(0,0,0,0.25)",
                border: `3px solid ${C.packetSide}`,
              }}
            >
              <PacketTop w={180} h={70} />
            </div>
          );
        })}
      </div>
      </div>
      <Pill text="Dhulai" x={540} y={470} inAt={s(0.3)} outAt={s(1.9)} />
      <Pill text="Press" x={540} y={600} inAt={s(2.2)} outAt={s(3.3)} />
      <Pill text="Naya packet" x={540} y={560} inAt={s(3.6)} outAt={s(4.9)} variant="key" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. "Toh kambal bhi?" — "Coach mein hi" (16 – 20s)                   */
/* ================================================================== */
export const KambalBhiScene: React.FC = () => {
  const cam = useCam([
    { t: 0, rx: 8, rz: -6, s: 2.7, x: 0, y: 1050 },
    { t: 1.6, rx: 10, rz: -8, s: 2.5, x: 0, y: 990 },
    { t: 2.6, rx: 56, rz: -28, s: 1.3, x: 60, y: 200 },
    { t: 4.0, rx: 56, rz: -30, s: 1.25, x: 60, y: 170 },
  ]);
  return (
    <AbsoluteFill>
      <CoachBackdrop />
      <World cam={cam} w={BW} h={BH}>
        <Berth />
        <Pillow />
        <BlanketStack />
        <Slab x={100} y={860} w={440} h={290} thick={40} z={BERTH_Z} side={C.packetSide} radius={16}>
          <PacketTop w={440} h={290} />
        </Slab>
      </World>
      <Title text={"Toh kambal\n*bhi?*"} inAt={3} outAt={s(4.0)} />
      <Pill text="Coach mein hi" x={540} y={1520} inAt={s(2.4)} outAt={s(4.0)} variant="key" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. Calendar — "Mahine mein ek baar?" (20 – 27s)                     */
/* ================================================================== */
export const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCam([{ t: 0, rx: 52, rz: -12, s: 1.15, x: 0, y: 300 }]);
  const enter = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 120 } });
  const ring = spring({ frame: frame - s(2.4), fps, config: { damping: 10, stiffness: 160 } });
  const cardY = interpolate(frame, [s(3.9), s(4.6)], [0, 120], clamp);
  return (
    <AbsoluteFill>
      <CoachBackdrop />
      <World cam={cam} w={BW} h={BH}>
        <Berth />
        <Pillow />
        <BlanketStack />
      </World>
      <AbsoluteFill style={{ background: "rgba(43,27,20,0.25)" }} />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 620 + cardY,
          width: 900,
          transform: `translateY(${(1 - enter) * 300}px) scale(${0.85 + 0.15 * enter})`,
          opacity: enter,
          background: "#FFFFFF",
          borderRadius: 34,
          boxShadow: "0 40px 80px rgba(40,20,10,0.35)",
          overflow: "hidden",
          fontFamily: FONT.body,
        }}
      >
        <div
          style={{
            background: C.berth,
            color: "#FFFFFF",
            textAlign: "center",
            fontWeight: 800,
            fontSize: 48,
            padding: "26px 0",
            position: "relative",
          }}
        >
          Ek mahina
          {[150, 750].map((x) => (
            <div key={x} style={{ position: "absolute", left: x, top: -18, width: 22, height: 56, borderRadius: 11, background: C.ink }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, padding: "26px 30px 10px" }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const d = i + 1;
            const pop = spring({ frame: frame - 8 - i * 2, fps, config: { damping: 11, stiffness: 220 } });
            return (
              <div key={d} style={{ height: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
                <div style={{ fontWeight: 700, fontSize: 30, color: C.inkSoft }}>{d}</div>
                <div
                  style={{
                    width: 54,
                    height: 30,
                    borderRadius: 6,
                    background: C.packet,
                    border: `2px solid ${C.packetSide}`,
                    transform: `scale(${pop})`,
                  }}
                />
                {d === 30 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -6,
                      borderRadius: 999,
                      border: `7px solid ${C.blanket}`,
                      transform: `scale(${ring})`,
                      opacity: ring,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "16px 50px 30px",
            fontWeight: 700,
            fontSize: 30,
            color: C.ink,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 44, height: 24, borderRadius: 5, background: C.packet, border: `2px solid ${C.packetSide}` }} /> ek trip
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 32, height: 32, borderRadius: 99, border: `5px solid ${C.blanket}` }} /> kambal dhulai
          </span>
        </div>
      </div>
      <Pill text="Kam se kam 1 baar" x={540} y={1560 + cardY} inAt={s(2.6)} outAt={s(7)} variant="key" size={50} />
      <Title text={"Mahine mein\n*ek* baar?"} inAt={s(4.0)} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7–11. Berth story: do chadar → cover → printed cover → end card     */
/* ================================================================== */
export const BerthStoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = useCam([
    { t: 0, rx: 0, rz: 0, s: 1.0, x: 0, y: 60 },
    { t: 3.0, rx: 0, rz: 0, s: 1.04, x: 0, y: 60 },
    { t: 7.4, rx: 6, rz: 0, s: 1.06, x: 0, y: 40 },
    { t: 11.0, rx: 8, rz: 0, s: 1.08, x: 0, y: 40 },
    { t: 12.2, rx: 52, rz: -6, s: 1.2, x: 0, y: 260 },
    { t: 22.4, rx: 54, rz: -8, s: 1.24, x: 0, y: 260 },
  ]);

  // sheet 1 unfolds to cover the berth
  const s1 = lerp(t, 3.3, 4.4, 0, 1);
  // blanket unfolds + goes inside sheet 2
  const bl = lerp(t, 5.6, 6.8, 0, 1);
  const s2merge = lerp(t, 5.4, 6.0, 0, 1);
  const packetOut = lerp(t, 3.0, 3.6, 0, 1);
  // printed cover wipes up from the foot
  const pc = lerp(t, 12.6, 14.0, 0, 1);

  const blX = lerp(bl, 0, 1, 170, 105);
  const blY = lerp(bl, 0, 1, 400, 360);
  const blW = lerp(bl, 0, 1, 300, 430);
  const blH = lerp(bl, 0, 1, 300, 1180);

  const PCH = 1330;
  return (
    <AbsoluteFill>
      <CoachBackdrop lamp={t > 11} />
      <World cam={cam} w={BW} h={BH}>
        <Berth />
        {/* sheet 1 → spreads over berth */}
        <Slab
          x={lerp(s1, 0, 1, 100, 14)}
          y={lerp(s1, 0, 1, 820, 14)}
          w={lerp(s1, 0, 1, 190, 612)}
          h={lerp(s1, 0, 1, 210, 1672)}
          thick={lerp(s1, 0, 1, 14, 4)}
          z={BERTH_Z}
          side={C.sheetSide}
          radius={lerp(s1, 0, 1, 10, 34)}
          shadow={s1 < 0.5}
        >
          <ChadarTop w={lerp(s1, 0, 1, 190, 612)} h={lerp(s1, 0, 1, 210, 1672)} big={s1 > 0.6} />
          <Badge n={1} show={1 - s1} />
        </Slab>
        <Pillow />
        {/* sheet 2 → becomes the blanket's cover */}
        <Slab
          x={lerp(s2merge, 0, 1, 350, blX - 16)}
          y={lerp(s2merge, 0, 1, 820, blY - 16)}
          w={bl > 0 ? blW + 32 : lerp(s2merge, 0, 1, 190, blW + 32)}
          h={bl > 0 ? blH + 32 : lerp(s2merge, 0, 1, 210, blH + 32)}
          thick={8}
          z={BERTH_Z + 6}
          side={C.sheetSide}
          radius={14}
        >
          <ChadarTop w={bl > 0 ? blW + 32 : lerp(s2merge, 0, 1, 190, blW + 32)} h={bl > 0 ? blH + 32 : lerp(s2merge, 0, 1, 210, blH + 32)} />
          <Badge n={2} show={1 - s2merge} />
        </Slab>
        {/* blanket inside the cover */}
        <Slab x={blX} y={blY} w={blW} h={blH} thick={lerp(bl, 0, 1, 40, 12)} z={BERTH_Z + 10} side={C.blanketSide} radius={14} shadow={false}>
          <CheckPattern w={blW} h={blH} cells={2} />
          {/* cover's translucent sheen + turned-down top band */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.10)", opacity: bl }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 110,
              opacity: bl,
              background: "#FFFFFF",
              borderBottom: `6px solid ${C.brandPrint}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: C.brandPrint,
              fontFamily: FONT.title,
              fontWeight: 800,
              fontSize: 48,
            }}
          >
            <Emblem size={52} color={C.brandPrint} />
            {BRAND.hindi}
          </div>
        </Slab>
        {/* packet leaves */}
        <Slab x={170} y={lerp(packetOut, 0, 1, 1130, 1900)} w={300} h={220} thick={30} z={BERTH_Z} side={C.packetSide} radius={14} opacity={1 - packetOut}>
          <PacketTop w={300} h={220} />
        </Slab>
        {/* printed cover (some trains) */}
        {pc > 0 && (
          <Slab x={30} y={340 + PCH * (1 - pc)} w={580} h={PCH * pc} thick={22} z={BERTH_Z + 4} side="#55111C" radius={20}>
            <div style={{ position: "absolute", left: 0, bottom: 0 }}>
              <PrintedCover w={580} h={PCH} />
            </div>
          </Slab>
        )}
      </World>

      <Title text={"Packet mein\n*do* chadar"} inAt={4} outAt={s(3.2)} />
      <Pill text="1 · berth ke liye" x={540} y={560} inAt={s(3.6)} outAt={s(5.4)} />
      <Pill text="2 · kambal ke andar" x={540} y={760} inAt={s(5.9)} outAt={s(7.5)} />
      <Title text={"Doosri chadar =\nkambal ka *cover*"} inAt={s(7.6)} outAt={s(11.0)} />
      <Pill text="Chadar: har trip" x={540} y={560} inAt={s(8.4)} outAt={s(11.4)} variant="key" />
      <Pill text="Kambal: mahine mein" x={540} y={1560} inAt={s(9.0)} outAt={s(11.4)} />
      <Pill text="Kuch trains mein" x={540} y={1650} inAt={s(11.8)} outAt={s(14.0)} variant="key" />
      <Pill text="Printed cover: alag se dhulta" x={540} y={1650} inAt={s(14.0)} outAt={s(22.5)} variant="key" size={46} />
      <EndCard inAt={s(17.0)} />
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ n: number; show: number }> = ({ n, show }) => (
  <div
    style={{
      position: "absolute",
      top: 14,
      left: "50%",
      marginLeft: -32,
      width: 64,
      height: 64,
      borderRadius: 99,
      background: C.accent,
      color: "#FFFFFF",
      fontFamily: FONT.title,
      fontWeight: 800,
      fontSize: 42,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: show,
    }}
  >
    {n}
  </div>
);

/* ------------------------------------------------------------------ */
/* End card — "Agli video"                                             */
/* ------------------------------------------------------------------ */
const EndCard: React.FC<{ inAt: number }> = ({ inAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 15, stiffness: 140 } });
  const route = interpolate(frame - inAt, [10, 60], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 760,
        width: 940,
        height: 470,
        background: "#FFFFFF",
        borderRadius: 40,
        boxShadow: "0 40px 90px rgba(40,20,10,0.4)",
        transform: `translateY(${(1 - p) * 400}px) scale(${0.9 + 0.1 * p})`,
        opacity: p,
        display: "flex",
        gap: 40,
        padding: 34,
        boxSizing: "border-box",
        fontFamily: FONT.body,
      }}
    >
      {/* phone mock with a route map */}
      <div style={{ width: 230, height: 400, borderRadius: 34, background: C.ink, padding: 10, boxSizing: "border-box", flexShrink: 0 }}>
        <svg width="210" height="380" style={{ borderRadius: 26, background: "#F4EEE2", display: "block" }}>
          {[60, 130, 200, 270, 340].map((y) => (
            <line key={y} x1="0" x2="210" y1={y} y2={y} stroke="#E0D6C4" strokeWidth="10" />
          ))}
          {[50, 120, 170].map((x) => (
            <line key={x} x1={x} x2={x} y1="0" y2="380" stroke="#E0D6C4" strokeWidth="10" />
          ))}
          <path
            d="M 40 330 L 40 270 L 120 270 L 120 130 L 170 130 L 170 50"
            fill="none"
            stroke={C.accent}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - route}
          />
          <circle cx="40" cy="330" r="14" fill={C.berth} />
          <circle cx="170" cy="50" r="14" fill={C.blanket} />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        <div style={{ color: C.accent, fontWeight: 800, fontSize: 30, letterSpacing: 4 }}>AGLI VIDEO</div>
        <div style={{ fontFamily: FONT.title, color: C.ink, fontWeight: 800, fontSize: 66, lineHeight: 1.02 }}>
          {BRAND.nextVideoTitle}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 99,
              background: C.berth,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 0, height: 0, borderLeft: "22px solid #FFF", borderTop: "14px solid transparent", borderBottom: "14px solid transparent", marginLeft: 6 }} />
          </div>
          <div style={{ color: C.inkSoft, fontWeight: 700, fontSize: 32 }}>{BRAND.handle}</div>
        </div>
      </div>
    </div>
  );
};
