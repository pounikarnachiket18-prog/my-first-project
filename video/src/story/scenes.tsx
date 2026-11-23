/**
 * Scenes for the new storyline. Same visual style as the rebuilt reel
 * (bright coach, charcoal check blanket, kraft packet, maroon accents),
 * but new camera angles and compositions. Times are scene-local frames.
 */
import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, C, FONT, s } from "../rail/theme";
import {
  BerthTop,
  ChadarTop,
  CheckPattern,
  CoachBackdrop,
  PacketTop,
  Pill,
  PillowTop,
  PrintedCover,
  Slab,
  Title,
  World,
  useCam,
} from "../rail/parts";
import { BrandBadge } from "../remix/fx";
import { Bay } from "./bay";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], clamp);

/** Push-in camera on a 1080x1920 layer, focusing on (fx, fy). */
const Push: React.FC<{ z: number; fx: number; fy: number; shake?: number; children: React.ReactNode }> = ({ z, fx, fy, shake = 0, children }) => {
  const frame = useCurrentFrame();
  const sx = shake * Math.sin(frame * 0.9);
  const sy = shake * Math.cos(frame * 1.3);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${fx}px ${fy}px`,
        transform: `translate(${sx}px, ${sy}px) scale(${z})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Ticket-stub label (our own graphic for item names). */
const Ticket: React.FC<{ text: string; x: number; y: number; inAt: number; color?: string }> = ({ text, x, y, inAt, color = C.pill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${p}) rotate(-3deg)`,
        display: "flex",
        alignItems: "stretch",
        fontFamily: FONT.body,
        fontWeight: 800,
        fontSize: 38,
        filter: "drop-shadow(0 8px 14px rgba(40,20,10,0.3))",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ background: color, color: "#FFFFFF", padding: "8px 16px", borderRadius: "14px 0 0 14px", borderRight: "4px dashed #FFFFFF" }}>🎫</div>
      <div style={{ background: "#FFFFFF", color: C.ink, padding: "8px 22px", borderRadius: "0 14px 14px 0" }}>{text}</div>
    </div>
  );
};

/* ================================================================== */
/* 1. Cold open — passenger asleep at night (side-on, low, slow push)  */
/* ================================================================== */
export const SleepScene: React.FC = () => {
  const frame = useCurrentFrame();
  const z = lerp(frame, 0, s(3.5), 1.4, 1.55);
  return (
    <AbsoluteFill style={{ background: "#0B1634" }}>
      <Push z={z} fx={350} fy={1170}>
        <Bay night zzz />
      </Push>
      <Pill text="Raat ka safar 🌙" x={540} y={700} inAt={10} variant="label" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. Hook — eyes snap open, then POV down at the blanket              */
/* ================================================================== */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eyes = spring({ frame: frame - 12, fps, config: { damping: 9, stiffness: 260 } });
  const pushA = lerp(frame, 0, 14, 1.55, 2.7);
  const povIn = lerp(frame, s(1.7), s(2.0), 0, 1);
  const bang = spring({ frame: frame - 16, fps, config: { damping: 8, stiffness: 260 } });
  const povZ = lerp(frame, s(1.7), s(5), 1.05, 1.22);
  return (
    <AbsoluteFill style={{ background: "#0B1634" }}>
      {/* A: face close-up */}
      <AbsoluteFill style={{ opacity: 1 - povIn }}>
        <Push z={pushA} fx={300} fy={1130} shake={frame > 14 && frame < 24 ? 3 : 0}>
          <Bay night eyes={eyes} lamp={lerp(frame, 10, 20, 0, 1)} />
        </Push>
        <div
          style={{
            position: "absolute",
            left: 690,
            top: 760,
            transform: `scale(${bang}) rotate(12deg)`,
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 260,
            color: C.accent,
            WebkitTextStroke: "10px #FFFFFF",
          }}
        >
          !
        </div>
      </AbsoluteFill>
      {/* B: POV looking down at the blanket held in both hands */}
      <AbsoluteFill style={{ opacity: povIn }}>
        <Push z={povZ} fx={540} fy={1100} shake={2}>
          <div style={{ position: "absolute", left: -60, top: 380, transform: "rotate(-4deg)" }}>
            <CheckPattern w={1200} h={1700} cells={3} />
          </div>
          {/* soft fabric folds */}
          <AbsoluteFill style={{ background: "repeating-linear-gradient(170deg, rgba(0,0,0,0) 0 120px, rgba(0,0,0,0.18) 160px, rgba(0,0,0,0) 200px)" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0) 40%, rgba(10,15,40,0.55) 100%)" }} />
          {/* hands at the bottom corners */}
          {[150, 930].map((x, i) => (
            <div
              key={x}
              style={{
                position: "absolute",
                left: x - 120,
                top: 1640,
                width: 240,
                height: 330,
                borderRadius: "120px 120px 40px 40px",
                background: `linear-gradient(180deg, ${C.skin}, ${C.skinShade})`,
                transform: `rotate(${i ? -18 : 18}deg)`,
                boxShadow: "0 -10px 30px rgba(0,0,0,0.3)",
              }}
            />
          ))}
        </Push>
        {/* sniff-test humour: magnifier sweeping the fabric */}
        <div
          style={{
            position: "absolute",
            left: lerp(frame, s(2.0), s(4.8), 180, 760),
            top: 980 + Math.sin(frame / 8) * 60,
            fontSize: 190,
            transform: "rotate(-15deg)",
            opacity: povIn,
            filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.4))",
          }}
        >
          🔍
        </div>
      </AbsoluteFill>
      <Title text={"Kambal *kab*\ndhula tha?"} inAt={s(2.0)} y={210} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. Twist — wide aisle (blanket stays), then split-flap trip board   */
/* ================================================================== */
const Aisle: React.FC = () => {
  const vx = 540;
  const vy = 860;
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <rect width="1080" height="1920" fill={C.wall} />
      <polygon points={`0,0 1080,0 ${vx + 80},${vy - 160} ${vx - 80},${vy - 160}`} fill="#FBFCFE" />
      <polygon points={`0,1920 1080,1920 ${vx + 80},${vy + 160} ${vx - 80},${vy + 160}`} fill={C.wallDeep} />
      {[0, 1, 2, 3].map((i) => {
        const k = 1 / (1 + i * 0.9);
        return <rect key={i} x={vx - 240 * k} y={vy - 160 - 620 * k} width={480 * k} height={30 * k} rx={10 * k} fill="#FFF6D8" />;
      })}
      {rows
        .map((i) => {
          const k1 = 1 / (1 + i * 0.7);
          const k2 = 1 / (1 + (i + 0.55) * 0.7);
          const side = (dir: number) => {
            const xo1 = vx + dir * 700 * k1;
            const xo2 = vx + dir * 700 * k2;
            const xi1 = vx + dir * 360 * k1;
            const xi2 = vx + dir * 360 * k2;
            const t1 = vy + 90 * k1;
            const t2 = vy + 90 * k2;
            const b1 = vy + 470 * k1;
            const b2 = vy + 470 * k2;
            // folded blanket block on each berth
            const bx1 = vx + dir * 600 * k1;
            const bx2 = vx + dir * 460 * k1;
            return (
              <g key={dir}>
                <polygon points={`${xo1},${t1} ${xi1},${t1} ${xi2},${t2} ${xo2},${t2}`} fill={C.berthEdge} />
                <polygon points={`${xi1},${t1} ${xi2},${t2} ${xi2},${b2} ${xi1},${b1}`} fill={C.berth} />
                <polygon points={`${xo1},${vy - 360 * k1} ${xi1},${vy - 360 * k1} ${xi2},${vy - 360 * k2} ${xo2},${vy - 360 * k2}`} fill={C.berthSide} />
                <rect x={Math.min(bx1, bx2)} y={t1 - 60 * k1} width={Math.abs(bx1 - bx2)} height={60 * k1} rx={10 * k1} fill={C.blanket} />
                <rect x={Math.min(bx1, bx2)} y={t1 - 34 * k1} width={Math.abs(bx1 - bx2)} height={5 * k1} fill={C.blanketStripe} />
              </g>
            );
          };
          return (
            <g key={i}>
              {side(-1)}
              {side(1)}
            </g>
          );
        })
        .reverse()}
    </svg>
  );
};

const FlapDigit: React.FC<{ ch: string; flipAt: number; yellow?: boolean }> = ({ ch, flipAt, yellow }) => {
  const frame = useCurrentFrame();
  const t = lerp(frame, flipAt, flipAt + 3, 0, 1);
  return (
    <div
      style={{
        width: 92,
        height: 128,
        background: "#1B1D22",
        borderRadius: 12,
        margin: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: FONT.title,
        fontWeight: 800,
        fontSize: 96,
        color: yellow ? "#FFD23F" : "#F4EBDC",
        transform: `scaleY(${0.6 + 0.4 * t})`,
        boxShadow: "inset 0 -6px 0 rgba(0,0,0,0.4)",
      }}
    >
      {ch}
      <div style={{ position: "absolute", left: 0, right: 0, top: 62, height: 4, background: "rgba(0,0,0,0.6)" }} />
    </div>
  );
};

export const TwistScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardIn = lerp(frame, s(5.6), s(6.0), 0, 1);
  const dolly = lerp(frame, 0, s(5.8), 1.0, 1.18);
  // passengers swapping over the foreground blanket
  const faces = ["🧔", "👩", "👴", "👧", "👨‍🦱", "👵"];
  const fi = Math.min(faces.length - 1, Math.floor(lerp(frame, s(2.8), s(5.6), 0, faces.length)));
  const pop = 0.65 + 0.35 * spring({ frame: (frame - s(2.8)) % Math.round(s(2.8) / faces.length), fps, config: { damping: 9, stiffness: 320 } });
  // board counters
  const bf = frame - s(6.0);
  const trip = Math.max(1, Math.min(30, Math.round(lerp(bf, 6, s(3.0), 1, 30))));
  const tripStr = String(trip).padStart(2, "0");
  const dhulai = bf > s(3.4);
  return (
    <AbsoluteFill>
      {/* A: aisle */}
      <AbsoluteFill style={{ opacity: 1 - boardIn }}>
        <Push z={dolly} fx={540} fy={900}>
          <Aisle />
          {/* foreground blanket on the left lower berth, close to camera */}
          <div style={{ position: "absolute", left: -40, top: 1300, transform: "rotate(-8deg)", boxShadow: "0 30px 50px rgba(0,0,0,0.35)", borderRadius: 24, overflow: "hidden" }}>
            <CheckPattern w={560} h={300} />
          </div>
        </Push>
        {frame > s(2.8) && (
          <div style={{ position: "absolute", left: 300, top: 1180, fontSize: 210, filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.35))", transform: `translate(-50%,-50%) scale(${pop})` }}>{faces[fi]}</div>
        )}
        <Pill text="Kambal coach mein hi" x={600} y={1520} inAt={s(0.6)} variant="key" size={50} />
        <Pill text="🔁 Yatri badalte hain, kambal nahi" x={540} y={560} inAt={s(3.0)} variant="label" size={42} />
      </AbsoluteFill>

      {/* B: split-flap trip board */}
      <AbsoluteFill style={{ opacity: boardIn, background: `linear-gradient(180deg, ${C.wall}, ${C.wallShade})` }}>
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 640,
            width: 940,
            padding: "34px 30px",
            background: "#2A2D34",
            borderRadius: 34,
            border: `10px solid ${C.berthSide}`,
            boxShadow: "0 40px 80px rgba(40,20,10,0.35)",
            transform: `scale(${0.9 + 0.1 * boardIn})`,
          }}
        >
          <div style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: 36, color: "#F4EBDC", letterSpacing: 6, marginBottom: 14 }}>EK KAMBAL • EK MAHINA</div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 64, color: "#F4EBDC", width: 330 }}>TRIP</div>
            {tripStr.split("").map((c, i) => (
              <FlapDigit key={i} ch={c} flipAt={frame - (frame % 2)} />
            ))}
            <div style={{ fontSize: 80, marginLeft: 20 }}>🚆</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 20, opacity: dhulai ? 1 : 0.25 }}>
            <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 64, color: "#FFD23F", width: 330 }}>DHULAI</div>
            <FlapDigit ch={dhulai ? "1" : "-"} flipAt={s(9.4)} yellow />
            <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 54, color: "#FFD23F", marginLeft: 20 }}>/ MAHINA 🧺</div>
          </div>
        </div>
        <Pill text="Kam se kam mahine mein 1 baar" x={540} y={1260} inAt={s(9.6)} variant="key" size={48} />
        <Title text={"Ek kambal,\n*kitne* yatri?"} inAt={s(6.2)} y={200} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. Flashback — overhead tray, sealed packet opens                   */
/* ================================================================== */
export const PacketScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rewind = lerp(frame, 0, 18, 1, 0);
  const lid = lerp(frame, s(0.9), s(1.6), 0, 1);
  const items = [
    { el: <ChadarTop w={380} h={300} />, w: 380, h: 300, x: 70, y: 980, label: "Chadar 1", lx: 260, ly: 1320 },
    { el: <ChadarTop w={380} h={300} />, w: 380, h: 300, x: 630, y: 980, label: "Chadar 2", lx: 820, ly: 1320 },
    { el: <ChadarTop w={300} h={220} />, w: 300, h: 220, x: 110, y: 1420, label: "Takiye ka cover", lx: 260, ly: 1680 },
    {
      el: (
        <div style={{ width: "100%", height: "100%", background: "#FFFFFF", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: "38%", height: 18, background: C.accent }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 8, background: C.blanketStripe }} />
        </div>
      ),
      w: 300,
      h: 200,
      x: 670,
      y: 1430,
      label: "Towel",
      lx: 820,
      ly: 1680,
    },
  ];
  return (
    <AbsoluteFill style={{ background: "#D9DEE5" }}>
      {/* tray table, straight down */}
      <div style={{ position: "absolute", left: 30, top: 300, width: 1020, height: 1500, borderRadius: 60, background: "linear-gradient(160deg, #F4F6F9, #CDD3DC)", boxShadow: "inset 0 0 0 14px rgba(255,255,255,0.6), 0 30px 60px rgba(0,0,0,0.2)" }} />
      {/* packet */}
      <div
        style={{
          position: "absolute",
          left: 240,
          top: lerp(lid, 0, 1, 560, 420),
          width: 600,
          height: 380,
          transform: `rotate(${lerp(lid, 0, 1, -4, 3)}deg) scale(${lerp(lid, 0, 1, 1.1, 0.8)})`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 40px rgba(0,0,0,0.3)",
        }}
      >
        <PacketTop w={600} h={380} />
        {/* tear-off seal band */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, background: C.accent, transform: `translateX(${lid * 700}px) rotate(${lid * 10}deg)` }} />
      </div>
      {items.map((it, i) => {
        const p = spring({ frame: frame - s(1.6) - i * 9, fps, config: { damping: 11, stiffness: 170 } });
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: it.x,
                top: it.y,
                width: it.w,
                height: it.h,
                borderRadius: 14,
                overflow: "hidden",
                opacity: p,
                transform: `translateY(${(1 - p) * -360}px) scale(${0.6 + 0.4 * p}) rotate(${(i % 2 ? 1 : -1) * (1 - p) * 20}deg)`,
                boxShadow: "0 18px 30px rgba(0,0,0,0.25)",
              }}
            >
              {it.el}
            </div>
            <Ticket text={it.label} x={it.lx} y={it.ly} inAt={s(1.9) + i * 9} />
          </React.Fragment>
        );
      })}
      <Pill text="Ye sab fresh ✓" x={540} y={1840} inAt={s(4.5)} variant="key" size={44} />
      {/* flashback rewind effect */}
      <AbsoluteFill
        style={{
          opacity: rewind,
          background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0 4px, rgba(0,0,0,0.25) 4px 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 90, color: "#FFFFFF", background: C.ink, padding: "14px 40px", borderRadius: 30 }}>⏪ Flashback</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. Journey — one sideways tracking shot along a conveyor            */
/* ================================================================== */
const STEPS = ["Collect", "Dhulai", "Steam press", "Naya packet"];

export const JourneyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = s(7);
  const pan = interpolate(frame, [0, dur], [120, -2420], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
  const step = Math.min(3, Math.floor(lerp(frame, 0, dur * 0.92, 0, 4)));
  const roll = frame * 8;
  const sheetX = 300 + frame * 10.5; // sheet rides the belt
  const press = Math.max(0, Math.sin(frame / 5));
  return (
    <AbsoluteFill style={{ background: "#E9ECF0", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: "scale(1.4)", transformOrigin: "540px 1000px" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${pan}px)` }}>
        <svg width="3400" height="1920">
          <rect width="3400" height="1920" fill="#E9ECF0" />
          {Array.from({ length: 34 }).map((_, i) => (
            <rect key={i} x={i * 100} y="0" width="4" height="1150" fill="rgba(0,0,0,0.035)" />
          ))}
          <rect y="1150" width="3400" height="770" fill="#C9D0D8" />
          {/* belt */}
          <rect x="0" y="1060" width="3400" height="60" rx="30" fill="#3A3F47" />
          {Array.from({ length: 70 }).map((_, i) => (
            <circle key={i} cx={((i * 50 - roll) % 3400 + 3400) % 3400} cy="1090" r="14" fill="#5A6070" />
          ))}
          <rect x="0" y="1120" width="3400" height="40" fill="#2A2E35" />
          {/* 1 collect bin */}
          <rect x="120" y="760" width="300" height="300" rx="30" fill="#FFFFFF" stroke={C.berth} strokeWidth="12" />
          <text x="270" y="940" textAnchor="middle" fontSize="120">🧺</text>
          {/* 2 foam tunnel */}
          <path d="M 860 1060 L 860 760 Q 1060 600 1260 760 L 1260 1060 Z" fill={C.machine} stroke="#D5CCBC" strokeWidth="10" />
          <rect x="860" y="740" width="400" height="60" rx="20" fill={C.machinePanel} />
          {Array.from({ length: 18 }).map((_, i) => {
            const bx = 880 + random(`fx${i}`) * 360;
            const by = 1040 - ((frame * (2 + random(`fv${i}`) * 3) + random(`fy${i}`) * 300) % 300);
            return <circle key={i} cx={bx} cy={by} r={14 + random(`fr${i}`) * 24} fill="rgba(255,255,255,0.9)" stroke="rgba(150,190,255,0.8)" strokeWidth="3" />;
          })}
          {/* 3 steam press */}
          <rect x="1600" y="640" width="420" height="80" rx="20" fill={C.machinePanel} />
          <rect x="1780" y="720" width="60" height={140 + press * 120} fill="#8F9AA0" />
          <rect x="1640" y={860 + press * 120} width="340" height="50" rx="12" fill="#B9C2CA" />
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={1650 + i * 80} cy={830 - press * 60 - i * 10} r={30 + press * 30} fill="rgba(255,255,255,0.75)" opacity={press} />
          ))}
          {/* 4 sealing machine */}
          <rect x="2500" y="700" width="460" height="360" rx="40" fill={C.machine} stroke="#D5CCBC" strokeWidth="10" />
          <rect x="2500" y="700" width="460" height="70" rx="30" fill={C.machinePanel} />
          <circle cx="2900" cy="735" r="14" fill="#7CFFB2" />
          <rect x="2560" y="840" width="340" height="140" rx="20" fill="#3A3F47" />
          {/* moving sheet */}
          <rect x={Math.min(sheetX, 2560)} y="1010" width="260" height="50" rx="10" fill="#FFFFFF" stroke="#E6DDD0" strokeWidth="4" />
        </svg>
        {/* packet popping out of the sealer */}
        {frame > dur * 0.78 && (
          <div
            style={{
              position: "absolute",
              left: 3040,
              top: lerp(frame, dur * 0.78, dur * 0.88, 980, 820),
              width: 300,
              height: 190,
              transform: `rotate(${lerp(frame, dur * 0.78, dur * 0.9, 20, -6)}deg)`,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
            }}
          >
            <PacketTop w={300} h={190} />
          </div>
        )}
      </div>
      </AbsoluteFill>
      {/* step tracker */}
      <div style={{ position: "absolute", top: 300, left: 40, right: 40, display: "flex", gap: 14, justifyContent: "center" }}>
        {STEPS.map((t, i) => (
          <div
            key={t}
            style={{
              fontFamily: FONT.body,
              fontWeight: 800,
              fontSize: 36,
              padding: "12px 22px",
              borderRadius: 999,
              background: i <= step ? C.pill : "#FFFFFF",
              color: i <= step ? "#FFFFFF" : C.inkSoft,
              border: `3px solid ${i <= step ? C.pill : C.wallShade}`,
              transform: `scale(${i === step ? 1.08 : 1})`,
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            {i + 1}. {t}
          </div>
        ))}
      </div>
      <Pill text="Har safar ke baad" x={540} y={460} inAt={6} variant="label" size={42} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. Solution — eye-level side view: sheet 1 on berth, sheet 2 cover  */
/* ================================================================== */
export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const drop = lerp(frame, s(0.6), s(1.4), 0, 1);
  const flutter = Math.sin(frame / 3) * (1 - drop) * 6;
  const slide = lerp(frame, s(3.2), s(4.6), 0, 1);
  const z = lerp(frame, 0, s(7), 1.38, 1.48);
  return (
    <AbsoluteFill>
      <Push z={z} fx={540} fy={1200}>
        <Bay person={false} />
        {/* sheet 1 floats down onto the berth */}
        <div
          style={{
            position: "absolute",
            left: 50,
            top: lerp(drop, 0, 1, 820, 1222),
            width: 980,
            height: lerp(drop, 0, 1, 120, 26),
            background: "#FFFFFF",
            borderRadius: 14,
            transform: `skewX(${flutter}deg)`,
            boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
            borderBottom: `6px solid ${C.brandPrint}`,
          }}
        />
        {/* sheet 2 as an envelope; blanket slides in from the right */}
        <div style={{ position: "absolute", left: 300, top: 1100, width: 620, height: 126, opacity: lerp(frame, s(2.6), s(3.0), 0, 1) }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 18 }}>
            <div style={{ position: "absolute", left: lerp(slide, 0, 1, 700, 20), top: 14, width: 580, height: 98, borderRadius: 12, overflow: "hidden" }}>
              <CheckPattern w={580} h={98} cells={4} />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              background: `linear-gradient(90deg, rgba(255,255,255,0.8) 0 ${lerp(slide, 0, 1, 100, 94)}%, rgba(255,255,255,0) ${lerp(slide, 0, 1, 100, 94)}%)`,
              border: "5px solid #E6DDD0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.title,
              fontWeight: 800,
              fontSize: 44,
              color: C.brandPrint,
            }}
          >
            {BRAND.hindi}
          </div>
        </div>
      </Push>
      <Title text={"Isiliye *do*\nchadar"} inAt={4} outAt={s(3.0)} y={180} />
      <Pill text="1 · Berth par" x={540} y={1010} inAt={s(1.4)} outAt={s(3.1)} variant="label" size={46} />
      <Pill text="2 · Kambal ke andar = cover" x={540} y={1010} inAt={s(4.4)} variant="key" size={46} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. Recap — two clocks (fast sheet, slow blanket) → sheet = shield   */
/* ================================================================== */
const Clock: React.FC<{ speed: number }> = ({ speed }) => {
  const frame = useCurrentFrame();
  const a = frame * speed;
  return (
    <svg width="200" height="200" viewBox="-100 -100 200 200">
      <circle r="92" fill="#FFFFFF" stroke={C.ink} strokeWidth="10" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="0" y1="-78" x2="0" y2="-64" stroke={C.ink} strokeWidth="6" transform={`rotate(${i * 30})`} />
      ))}
      <line x1="0" y1="0" x2="0" y2="-62" stroke={C.accent} strokeWidth="9" strokeLinecap="round" transform={`rotate(${a})`} />
      <line x1="0" y1="0" x2="0" y2="-42" stroke={C.ink} strokeWidth="11" strokeLinecap="round" transform={`rotate(${a / 12})`} />
      <circle r="10" fill={C.ink} />
    </svg>
  );
};

export const RecapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shield = spring({ frame: frame - s(2.8), fps, config: { damping: 9, stiffness: 200 } });
  const card = (i: number) => spring({ frame: frame - i * 8, fps, config: { damping: 14, stiffness: 150 } });
  const row = (i: number, icon: React.ReactNode, label: string, speed: number) => (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 480 + i * 470,
        width: 940,
        height: 400,
        background: "#FFFFFF",
        borderRadius: 40,
        boxShadow: "0 30px 60px rgba(40,20,10,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 40,
        padding: "0 50px",
        boxSizing: "border-box",
        transform: `translateX(${(1 - card(i)) * (i ? 1100 : -1100)}px)`,
      }}
    >
      <div style={{ width: 260, height: 200, borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.2)" }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Clock speed={speed} />
        <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 50, color: C.ink, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.wall}, ${C.wallShade})` }}>
      {row(0, <ChadarTop w={260} h={200} />, "Chadar: har trip", 40)}
      {row(1, <CheckPattern w={260} h={200} />, "Kambal: mahine mein", 1.2)}
      {/* shield over the sheet card */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1500,
          transform: `translate(-50%,-50%) scale(${shield})`,
          display: "flex",
          alignItems: "center",
          gap: 20,
          background: C.pill,
          color: "#FFFFFF",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 58,
          padding: "16px 44px",
          borderRadius: 999,
          border: "6px solid #FFFFFF",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        🛡️ Chadar = aapki dhaal
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 8. Bonus — low angle from the foot end, printed cover zips on       */
/* ================================================================== */
export const BonusScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam([
    { t: 0, rx: 66, rz: 0, s: 1.05, x: 0, y: 380 },
    { t: 5.5, rx: 60, rz: 6, s: 1.18, x: 0, y: 300 },
  ]);
  const zip = lerp(frame, s(1.0), s(2.6), 0, 1);
  const BW = 640;
  const BH = 1700;
  const PCH = 1300;
  return (
    <AbsoluteFill>
      <CoachBackdrop />
      <World cam={cam} w={BW} h={BH}>
        <Slab x={0} y={0} w={BW} h={BH} thick={70} side={C.berthSide} radius={44}>
          <BerthTop />
        </Slab>
        <Slab x={110} y={70} w={420} h={200} thick={46} z={70} side={C.sheetSide} radius={70}>
          <PillowTop />
        </Slab>
        <Slab x={90} y={340} w={460} h={PCH} thick={18} z={72} side={C.blanketSide} radius={18}>
          <CheckPattern w={460} h={PCH} />
        </Slab>
        {zip > 0 && (
          <Slab x={70} y={320 + (PCH + 40) * (1 - zip)} w={500} h={(PCH + 40) * zip} thick={24} z={74} side="#4A0D17" radius={22}>
            <div style={{ position: "absolute", left: 0, bottom: 0 }}>
              <PrintedCover w={500} h={PCH + 40} />
            </div>
            {/* zipper pull riding the top edge */}
            <div style={{ position: "absolute", left: 230, top: -6, width: 40, height: 40, borderRadius: 20, background: "#FFD23F", border: "5px solid #FFFFFF" }} />
          </Slab>
        )}
      </World>
      <Pill text="Kuch trains mein: printed cover" x={540} y={560} inAt={s(0.3)} variant="key" size={44} />
      <Pill text="✓ Alag se dhulta" x={540} y={1450} inAt={s(3.0)} variant="label" size={50} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 9. Ending — back to sleep under the covered blanket, then follow    */
/* ================================================================== */
export const EndingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const thumb = spring({ frame: frame - s(0.8), fps, config: { damping: 9, stiffness: 200 } });
  const thumbOut = lerp(frame, s(2.4), s(2.8), 1, 0);
  const pull = lerp(frame, s(2.8), s(3.6), 1.0, 0.55);
  const slate = lerp(frame, s(3.0), s(3.5), 0, 1);
  const btn = spring({ frame: frame - s(3.5), fps, config: { damping: 10, stiffness: 180 } });
  const tap = 1 + Math.max(0, Math.sin((frame - s(4)) / 4)) * 0.05;
  return (
    <AbsoluteFill style={{ background: "#0B1634" }}>
      <AbsoluteFill style={{ transform: `scale(${pull})`, transformOrigin: "50% 60%", borderRadius: 60 * (1 - pull) * 4, overflow: "hidden" }}>
        <Push z={1.5} fx={350} fy={1170}>
          <Bay night cover={1} zzz={frame > s(2.0)} lamp={lerp(frame, 0, s(1.2), 0.8, 0)} />
        </Push>
        <div
          style={{
            position: "absolute",
            left: 560,
            top: 1010,
            fontSize: 150,
            transform: `translate(-50%,-50%) scale(${thumb * thumbOut}) rotate(-10deg)`,
            filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.35))",
          }}
        >
          👍
        </div>
      </AbsoluteFill>
      {/* follow slate */}
      <AbsoluteFill
        style={{
          opacity: slate,
          background: `linear-gradient(180deg, rgba(163,25,46,0.85), rgba(21,23,28,0.9))`,
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
        }}
      >
        <BrandBadge big color={C.accent} />
        <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 64, color: "#FFFFFF", textAlign: "center", lineHeight: 1.15 }}>
          Aise hi 1-minute
          <br />
          explainers ke liye 👇
        </div>
        <div
          style={{
            transform: `scale(${btn * tap})`,
            background: "#FFD23F",
            color: C.ink,
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 72,
            padding: "18px 80px",
            borderRadius: 999,
            border: "8px solid #FFFFFF",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          Follow karo 🔔
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
