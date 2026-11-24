/**
 * Scenes for the "5 cheezein, 1 raaz" explainer. No characters; all new
 * compositions: mystery-box lineup, wash loop, split comparison with a
 * day odometer, exploded-view berth, wrap-on printed cover, recap card.
 * Times are scene-local frames (30 fps).
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, s } from "../rail/theme";
import { BerthTop, ChadarTop, CheckPattern, CoachBackdrop, PacketTop, PillowTop, PrintedCover, Slab, Title, World, useCam } from "../rail/parts";
import { Ring } from "../story/Recut";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], clamp);
const BLUE = "#2F44E0";
const GREEN = "#1DB954";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Warm studio backdrop with two spotlight cones (matches the channel's beige stations). */
const Studio: React.FC<{ spots?: boolean }> = ({ spots = true }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 40) * 30;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #FFF9EF 0%, #F1E4CB 55%, #D8C29C 100%)" }}>
      {spots && (
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="exCone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="1" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <polygon points={`${300 + sway},0 ${380 + sway},0 ${700 + sway},1500 ${-60 + sway},1500`} fill="url(#exCone)" opacity="0.55" />
          <polygon points={`${700 - sway},0 ${780 - sway},0 ${1140 - sway},1500 ${380 - sway},1500`} fill="url(#exCone)" opacity="0.45" />
          <ellipse cx="540" cy="1520" rx="560" ry="120" fill="rgba(120,80,30,0.12)" />
        </svg>
      )}
    </AbsoluteFill>
  );
};

/** A single object in its own perspective space, centred at (x, y) on screen. */
const Obj3D: React.FC<{ x: number; y: number; w: number; h: number; rx?: number; rz?: number; scale?: number; children: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  rx = 55,
  rz = 0,
  scale = 1,
  children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, perspective: 1400 }}>
    <div
      style={{
        position: "absolute",
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        transformStyle: "preserve-3d",
        transform: `scale(${scale}) rotateX(${rx}deg) rotateZ(${rz}deg)`,
      }}
    >
      {children}
    </div>
  </div>
);

const Towel: React.FC = () => (
  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #FFFFFF, #F1F3F6)", position: "relative" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: "62%", height: "12%", background: C.accent }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: "78%", height: "5%", background: C.blanketStripe }} />
  </div>
);

/** Pill-shaped item label (white, maroon border). */
const Tag: React.FC<{ text: string; x: number; y: number; inAt: number; color?: string; textColor?: string; size?: number }> = ({
  text,
  x,
  y,
  inAt,
  color = "#FFFFFF",
  textColor = C.ink,
  size = 38,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 12, stiffness: 210 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${p})`,
        background: color,
        color: textColor,
        border: `4px solid ${C.accent}`,
        borderRadius: 999,
        padding: `${size * 0.2}px ${size * 0.55}px`,
        fontFamily: FONT.body,
        fontWeight: 800,
        fontSize: size,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 24px rgba(60,30,10,0.25)",
      }}
    >
      {text}
    </div>
  );
};

/** Big round badge: ✓, ?, or a step number. */
const Badge: React.FC<{ x: number; y: number; inAt: number; label: string; bg: string; size?: number }> = ({ x, y, inAt, label, bg, size = 84 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 9, stiffness: 240 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#FFFFFF",
        border: "5px solid #FFFFFF",
        fontFamily: FONT.title,
        fontWeight: 800,
        fontSize: size * 0.58,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${p})`,
        boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
      }}
    >
      {label}
    </div>
  );
};

/* ================================================================== */
/* 1–3. Mystery boxes → 5 items → reveal: the blanket                  */
/* ================================================================== */
const ITEMS = [
  { name: "Chadar 1", x: 230, y: 760, w: 250, h: 190, el: (w: number, h: number) => <ChadarTop w={w} h={h} /> },
  { name: "Chadar 2", x: 540, y: 760, w: 250, h: 190, el: (w: number, h: number) => <ChadarTop w={w} h={h} /> },
  { name: "Takiye ka cover", x: 850, y: 760, w: 210, h: 160, el: (w: number, h: number) => <ChadarTop w={w} h={h} /> },
  { name: "Towel", x: 340, y: 1190, w: 220, h: 150, el: () => <Towel /> },
  { name: "Kambal", x: 720, y: 1190, w: 280, h: 210, el: (w: number, h: number) => <CheckPattern w={w} h={h} /> },
];

export const LineupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // local timeline (scene starts at global 1.4s)
  const openAt = (i: number) => s(3.9) + i * s(0.7);
  const reveal = s(7.7);
  const timer = lerp(frame, s(1.2), s(3.8), 1, 0);
  const spin = (frame / 60) * 6;
  return (
    <AbsoluteFill>
      <Studio />
      {ITEMS.map((it, i) => {
        const o = spring({ frame: frame - openAt(i), fps, config: { damping: 12, stiffness: 160 } });
        const isKambal = i === 4;
        const dim = frame > reveal && !isKambal ? 0.75 : 1;
        const hop = isKambal && frame > reveal ? Math.abs(Math.sin((frame - reveal) / 5)) * 18 * lerp(frame, reveal, reveal + s(1.5), 1, 0.3) : 0;
        return (
          <React.Fragment key={it.name}>
            <Obj3D x={it.x} y={it.y - hop} w={it.w} h={it.h} rz={-8 + spin + i * 3} scale={isKambal && frame > reveal ? 1.3 : 1.15}>
              {/* item rises out of its box */}
              <Slab x={0} y={0} w={it.w} h={it.h} thick={isKambal ? 34 : 16} z={o * 70} side={isKambal ? C.blanketSide : C.sheetSide} radius={12} opacity={o * dim}>
                {it.el(it.w, it.h)}
              </Slab>
              {/* kraft mystery box: lid pops off */}
              <Slab
                x={-14}
                y={-14}
                w={it.w + 28}
                h={it.h + 28}
                thick={90}
                z={-10 + o * 160}
                side={C.packetSide}
                radius={14}
                opacity={1 - o}
                shadow={o < 0.2}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: `radial-gradient(ellipse at 40% 30%, #EDC489, ${C.packet})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.title,
                    fontWeight: 800,
                    fontSize: it.h * 0.6,
                    color: C.packetPrint,
                  }}
                >
                  ?
                </div>
              </Slab>
            </Obj3D>
            <Tag text={it.name} x={it.x} y={it.y + 175} inAt={openAt(i) + 6} size={isKambal ? 44 : 34} />
            {frame > reveal && !isKambal && <Badge x={it.x + it.w / 2 - 10} y={it.y - 70} inAt={reveal + i * 3} label="✓" bg={GREEN} size={70} />}
          </React.Fragment>
        );
      })}
      {/* reveal: ring + "?" on the blanket */}
      <Ring x={720} y={1170} r={210} n={5} inAt={reveal} />
      <Badge x={890} y={1040} inAt={reveal + 4} label="?" bg={C.accent} size={96} />

      {/* countdown timer ring during the quiz */}
      {frame < s(3.9) && (
        <svg width="170" height="170" viewBox="-85 -85 170 170" style={{ position: "absolute", left: 455, top: 1420, opacity: lerp(frame, s(0.6), s(1.0), 0, 1) }}>
          <circle r="70" fill="#FFFFFF" stroke="#E6DDD0" strokeWidth="14" />
          <circle r="70" fill="none" stroke={C.accent} strokeWidth="14" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - timer} transform="rotate(-90)" />
          <text y="22" textAnchor="middle" fontFamily={FONT.title} fontWeight={800} fontSize="64" fill={C.ink}>
            {Math.max(1, Math.ceil(timer * 3))}
          </text>
        </svg>
      )}
      <Title text={"5 cheezein,\n1 raaz 🤔"} inAt={4} outAt={s(3.9)} y={200} />
      <Title text={"Har trip nahi dhulta:\nKambal!"} inAt={reveal + 6} y={200} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. Fresh loop: wash → steam → seal → fresh packet                   */
/* ================================================================== */
const STATIONS = [
  { label: "Dhulai", icon: "🫧", a: -90 },
  { label: "Steam press", icon: "♨️", a: 0 },
  { label: "Seal", icon: "📦", a: 90 },
  { label: "Fresh ✓", icon: "✨", a: 180 },
];

export const FreshLoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const R = 330;
  const cx = 540;
  const cy = 1000;
  const sweep = lerp(frame, s(0.4), s(5.4), -90, 270); // one lap
  const active = Math.max(0, Math.min(3, Math.floor((sweep + 90 + 45) / 90)));
  const stamp = spring({ frame: frame - s(5.6), fps, config: { damping: 9, stiffness: 260 } });
  return (
    <AbsoluteFill>
      <Studio spots={false} />
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#E6D6B8" strokeWidth="46" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={C.accent}
          strokeWidth="46"
          strokeLinecap="round"
          pathLength={360}
          strokeDasharray={`${Math.max(0, sweep + 90)} 360`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="14 18" opacity="0.8" />
      </svg>
      {STATIONS.map((st, i) => {
        const rad = (st.a * Math.PI) / 180;
        const x = cx + Math.cos(rad) * R;
        const y = cy + Math.sin(rad) * R;
        const on = i <= active && frame > s(0.4);
        return (
          <React.Fragment key={st.label}>
            <div
              style={{
                position: "absolute",
                left: x - 75,
                top: y - 75,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: on ? "#FFFFFF" : "#F4EBDC",
                border: `8px solid ${on ? C.accent : "#D8C29C"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 74,
                transform: `scale(${i === active ? 1.12 : 1})`,
                boxShadow: "0 14px 30px rgba(60,30,10,0.25)",
              }}
            >
              {st.icon}
            </div>
            <Tag
              text={st.label}
              x={x + (st.a === 0 ? 0 : st.a === 180 ? 0 : 0)}
              y={y + (st.a === -90 ? -125 : 125)}
              inAt={s(0.4) + i * s(1.2)}
              color={on ? C.accent : "#FFFFFF"}
              textColor={on ? "#FFFFFF" : C.ink}
              size={36}
            />
          </React.Fragment>
        );
      })}
      {/* travelling sheet on the loop */}
      {(() => {
        const rad = (sweep * Math.PI) / 180;
        return (
          <div
            style={{
              position: "absolute",
              left: cx + Math.cos(rad) * R - 70,
              top: cy + Math.sin(rad) * R - 50,
              width: 140,
              height: 100,
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
              transform: `rotate(${sweep + 90}deg)`,
              opacity: lerp(frame, s(0.3), s(0.5), 0, 1),
            }}
          >
            <ChadarTop w={140} h={100} />
          </div>
        );
      })()}
      {/* centre: sealed packet spinning */}
      <Obj3D x={cx} y={cy} w={300} h={200} rx={20} rz={Math.sin(frame / 18) * 12} scale={0.9 + 0.1 * stamp}>
        <Slab x={0} y={0} w={300} h={200} thick={40} side={C.packetSide} radius={16}>
          <PacketTop w={300} h={200} />
        </Slab>
      </Obj3D>
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy + 170,
          transform: `translate(-50%,-50%) rotate(-10deg) scale(${lerp(stamp, 0, 1, 2.4, 1)})`,
          opacity: stamp,
          color: GREEN,
          border: `8px solid ${GREEN}`,
          borderRadius: 18,
          padding: "6px 26px",
          background: "rgba(255,255,255,0.92)",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 56,
          letterSpacing: 3,
          whiteSpace: "nowrap",
        }}
      >
        SEALED ✓
      </div>
      <Title text={"Har safar\nke baad"} inAt={3} y={200} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. Split comparison: sheet loop (fast) vs blanket (30-day odometer) */
/* ================================================================== */
const OdoDigit: React.FC<{ value: number }> = ({ value }) => {
  const d = Math.floor(value) % 10;
  const frac = value - Math.floor(value);
  const roll = frac > 0.7 ? (frac - 0.7) / 0.3 : 0;
  return (
    <div style={{ width: 96, height: 130, overflow: "hidden", background: "#1B1D22", borderRadius: 14, margin: 4, position: "relative", boxShadow: "inset 0 -8px 0 rgba(0,0,0,0.4)" }}>
      {[d, (d + 1) % 10].map((n, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: (i - roll) * 130,
            height: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 100,
            color: "#F4EBDC",
          }}
        >
          {n}
        </div>
      ))}
    </div>
  );
};

export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const day = lerp(frame, s(1.2), s(5.2), 1, 30);
  const dhulai = spring({ frame: frame - s(5.6), fps, config: { damping: 9, stiffness: 250 } });
  const spinFast = frame * 14;
  const cam = useCam([
    { t: 0, rx: 50, rz: -30, s: 0.62, x: 0, y: 470 },
    { t: 7, rx: 50, rz: -24, s: 0.66, x: 0, y: 470 },
  ]);
  return (
    <AbsoluteFill>
      {/* bottom half: blanket stays on the berth */}
      <AbsoluteFill style={{ clipPath: "inset(860px 0 0 0)" }}>
        <CoachBackdrop lamp={false} />
        <World cam={cam} w={640} h={1700}>
          <Slab x={0} y={0} w={640} h={1700} thick={70} side={C.berthSide} radius={44}>
            <BerthTop />
          </Slab>
          <Slab x={90} y={300} w={460} h={1250} thick={30} z={70} side={C.blanketSide} radius={20}>
            <CheckPattern w={460} h={1250} />
          </Slab>
        </World>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1450, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 60, color: "#FFFFFF", background: C.ink, padding: "8px 22px", borderRadius: 16, marginRight: 10 }}>DIN</div>
          <OdoDigit value={day / 10} />
          <OdoDigit value={day} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 1660,
            transform: `translate(-50%,-50%) rotate(-6deg) scale(${lerp(dhulai, 0, 1, 2.2, 1)})`,
            opacity: dhulai,
            background: C.accent,
            color: "#FFFFFF",
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 54,
            padding: "8px 32px",
            borderRadius: 18,
            border: "6px solid #FFFFFF",
            whiteSpace: "nowrap",
          }}
        >
          DHULAI: 1 🧺
        </div>
        <div style={{ position: "absolute", left: 40, top: 900 }}>
          <Tag text="Kambal: coach mein hi" x={250} y={30} inAt={8} size={40} color={C.accent} textColor="#FFFFFF" />
        </div>
      </AbsoluteFill>

      {/* top half: the sheet loop spinning fast */}
      <AbsoluteFill style={{ clipPath: "inset(0 0 1060px 0)" }}>
        <Studio spots={false} />
        <svg width="1080" height="860" style={{ position: "absolute", left: 0, top: 0 }}>
          <circle cx="540" cy="500" r="200" fill="none" stroke="#E6D6B8" strokeWidth="30" />
          <circle cx="540" cy="500" r="200" fill="none" stroke={C.accent} strokeWidth="30" strokeDasharray="60 40" transform={`rotate(${spinFast} 540 500)`} />
        </svg>
        <div style={{ position: "absolute", left: 540 - 90, top: 500 - 65, width: 180, height: 130, borderRadius: 12, overflow: "hidden", transform: `rotate(${Math.sin(frame / 4) * 6}deg)`, boxShadow: "0 12px 24px rgba(0,0,0,0.25)" }}>
          <ChadarTop w={180} h={130} />
        </div>
        <Tag text="Chadar: har trip ⚡" x={540} y={250} inAt={4} size={42} color={GREEN} textColor="#FFFFFF" />
      </AbsoluteFill>
      {/* divider */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 856, height: 10, background: "linear-gradient(90deg, #2F44E0, " + C.accent + ")" }} />
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 861,
          transform: "translate(-50%,-50%)",
          background: "#FFFFFF",
          border: `6px solid ${C.ink}`,
          borderRadius: 999,
          padding: "4px 26px",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 48,
          color: C.ink,
        }}
      >
        VS
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6–7. Exploded berth: 3 steps, then "sirf fresh chadar"              */
/* ================================================================== */
const STEP = [s(2.6), s(5.2), s(8.0)]; // local start of steps 1–3
const PAYOFF = s(10.5);

export const HowToScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCam([
    { t: 0, rx: 58, rz: -40, s: 0.74, x: 0, y: 330 },
    { t: 10.5, rx: 54, rz: -22, s: 0.9, x: 0, y: 250 },
    { t: 14, rx: 50, rz: -18, s: 0.95, x: 0, y: 240 },
  ]);
  const settle = (i: number) => spring({ frame: frame - STEP[i], fps, config: { damping: 13, stiffness: 140 } });
  const s1 = settle(0);
  const s2 = settle(1);
  const s3 = settle(2);
  const bob = (i: number) => Math.sin((frame + i * 20) / 14) * 12;
  const BZ = 70;
  const glow = lerp(frame, PAYOFF, PAYOFF + 10, 0, 1);
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin((frame - PAYOFF) / 8));
  return (
    <AbsoluteFill>
      <CoachBackdrop lamp />
      <World cam={cam} w={640} h={1700}>
        <Slab x={0} y={0} w={640} h={1700} thick={BZ} side={C.berthSide} radius={44}>
          <BerthTop />
        </Slab>
        {/* step 1: first sheet onto the berth */}
        <Slab x={16} y={16} w={608} h={1668} thick={4} z={BZ + (1 - s1) * (160 + bob(1))} side={C.sheetSide} radius={36} shadow={false}>
          <ChadarTop w={608} h={1668} big />
        </Slab>
        {/* step 2: blanket slides into the second sheet (cover) */}
        <Slab x={70} y={330} w={500} h={1260} thick={30} z={BZ + 6 + (1 - s2) * (300 + bob(2))} side={C.blanketSide} radius={20} shadow={false}>
          <CheckPattern w={500} h={1260} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.86)", transform: `translateY(${(1 - s2) * -110}%)` }}>
            <div style={{ position: "absolute", inset: 12, border: `6px dashed ${C.brandPrint}`, borderRadius: 14 }} />
          </div>
        </Slab>
        {/* step 3: pillow + cover */}
        <Slab x={110} y={60} w={420} h={210} thick={46} z={BZ + 6 + (1 - Math.max(s1, 0)) * (440 + bob(3))} side={C.sheetSide} radius={80}>
          <PillowTop />
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - s3) * -110}%)` }}>
            <ChadarTop w={420} h={210} />
          </div>
        </Slab>
      </World>

      {/* step badges */}
      {[
        ["1", "Pehli chadar → berth"],
        ["2", "Doosri chadar → kambal ka cover"],
        ["3", "Takiye par cover"],
      ].map(([n, t], i) => {
        const p = spring({ frame: frame - STEP[i], fps, config: { damping: 12, stiffness: 200 } });
        if (frame < STEP[i]) return null;
        return (
          <div
            key={n}
            style={{
              position: "absolute",
              left: 60,
              top: 1220 + i * 120,
              display: "flex",
              alignItems: "center",
              gap: 18,
              transform: `translateX(${(1 - p) * -700}px)`,
              opacity: frame > PAYOFF ? 0.55 : 1,
            }}
          >
            <div style={{ width: 86, height: 86, borderRadius: "50%", background: BLUE, color: "#FFFFFF", border: "5px solid #FFFFFF", fontFamily: FONT.title, fontWeight: 800, fontSize: 52, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.25)" }}>
              {n}
            </div>
            <div style={{ background: "#FFFFFF", color: C.ink, fontFamily: FONT.body, fontWeight: 800, fontSize: 44, padding: "10px 26px", borderRadius: 18, border: `4px solid ${C.accent}`, whiteSpace: "nowrap", boxShadow: "0 10px 20px rgba(0,0,0,0.18)" }}>{t}</div>
          </div>
        );
      })}

      {/* payoff: the skin-contact zone glows on the fresh sheet */}
      <AbsoluteFill style={{ opacity: glow * pulse, background: "radial-gradient(ellipse at 52% 52%, rgba(120,220,255,0.35), rgba(120,220,255,0) 45%)" }} />
      <Title text={"Smart tareeka\nkya hai?"} inAt={4} outAt={STEP[0]} y={200} />
      <Title text={"Aapko chhuegi\nsirf fresh chadar ✓"} inAt={PAYOFF + 4} y={200} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 8. Bonus: printed cover wraps the folded blanket, then its own wash */
/* ================================================================== */
export const BonusScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wrap = spring({ frame: frame - s(0.5), fps, config: { damping: 12, stiffness: 120 } });
  const lift = lerp(frame, s(2.2), s(3.0), 0, 1);
  const drum = frame * 10;
  return (
    <AbsoluteFill>
      <Studio />
      <Obj3D x={540} y={lerp(lift, 0, 1, 820, 1180)} w={440} h={320} rx={52} rz={frame * 1.2} scale={lerp(lift, 0, 1, 1, 0.55)}>
        <Slab x={0} y={0} w={440} h={320} thick={60} side={C.blanketSide} radius={22}>
          <CheckPattern w={440} h={320} />
        </Slab>
        <Slab x={-10} y={-10} w={460} h={340} thick={8} z={60 + (1 - wrap) * 300} side="#4A0D17" radius={24} opacity={wrap} shadow={false}>
          <PrintedCover w={460} h={340} />
        </Slab>
      </Obj3D>
      {/* its own wash drum */}
      <div style={{ position: "absolute", left: 540 - 170, top: 1260, width: 340, height: 340, borderRadius: "50%", background: "#F7F8FA", border: "18px solid #D5CCBC", opacity: lerp(frame, s(1.8), s(2.2), 0, 1), boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: "#4B5C66", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, transform: `rotate(${drum}deg)` }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: "absolute", left: 90 + Math.cos(i * 1.6) * 60, top: 90 + Math.sin(i * 1.6) * 60, width: 70, height: 50, borderRadius: 20, background: i % 2 ? C.cover : "#FFFFFF", opacity: 0.9 }} />
            ))}
          </div>
        </div>
      </div>
      <Tag text="Kuch trains mein: printed cover" x={540} y={560} inAt={6} size={42} />
      <Tag text="✓ Alag se dhulta" x={540} y={1680} inAt={s(2.6)} size={48} color={C.accent} textColor="#FFFFFF" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 9. Recap card                                                        */
/* ================================================================== */
export const RecapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (i: number) => spring({ frame: frame - 4 - i * 6, fps, config: { damping: 13, stiffness: 170 } });
  const card = (i: number, title: string, line: string, icon: React.ReactNode, color: string) => (
    <div
      style={{
        width: 440,
        height: 760,
        background: "#FFFFFF",
        borderRadius: 40,
        border: `8px solid ${color}`,
        boxShadow: "0 30px 60px rgba(60,30,10,0.25)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        transform: `translateY(${(1 - col(i)) * 600}px)`,
      }}
    >
      <div style={{ width: 300, height: 220, borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.2)" }}>{icon}</div>
      <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 70, color: C.ink }}>{title}</div>
      <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 52, color: "#FFFFFF", background: color, padding: "8px 26px", borderRadius: 20, whiteSpace: "nowrap" }}>{line}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Studio spots={false} />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40, paddingTop: 140 }}>
        {card(0, "CHADAR", "har trip ✓", <ChadarTop w={300} h={220} />, GREEN)}
        {card(1, "KAMBAL", "mahine mein", <CheckPattern w={300} h={220} />, C.accent)}
      </AbsoluteFill>
      <Title text={"Yaad\nrakho!"} inAt={2} y={170} />
    </AbsoluteFill>
  );
};
