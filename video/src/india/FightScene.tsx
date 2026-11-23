import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "./Highway";
import { HonkBurst } from "./Sprites";
import { AutoSide, CarSide, Cow, Person, SideGlassDef, SpeechBubble } from "./SideArt";
import { DUSK, F, H, W } from "./theme";

// Timeline (local frames, 30fps). 270 frames = 9s.
export const FIGHT_LINES = [
  { who: "owner", from: 20, to: 70, text: "Arre bhai! Dekh ke nahi chala sakta?!" },
  { who: "auto", from: 66, to: 116, text: "Tumne achanak brake kyun maara?!" },
  { who: "owner", from: 112, to: 160, text: "Nayi gaadi hai meri!" },
  { who: "auto", from: 150, to: 196, text: "Toh main kya karu?!" },
  { who: "crowd", from: 176, to: 220, text: "Chhodo na yaar…" },
  { who: "cop", from: 214, to: 268, text: "Side mein lo dono!" },
] as const;

export const FIGHT_HONKS = [
  { at: 40, text: "POM POM!" },
  { at: 95, text: "PEEEP!" },
  { at: 140, text: "PAAAN!" },
  { at: 185, text: "POM POM!" },
];

const pulse = (frame: number, from: number, to: number) => {
  const a = interpolate(frame, [from, from + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const b = interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(a, b);
};

export const FightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hz = 760;
  const zoom = interpolate(frame, [0, 270], [1.02, 1.12]);

  const speaking = (who: string) => FIGHT_LINES.some((l) => l.who === who && frame >= l.from && frame <= l.to);
  const talk = (who: string) => (speaking(who) ? Math.abs(Math.sin(frame / 2.2)) : 0);

  // the shove: owner pushes auto driver at ~f128
  const shove = spring({ frame: frame - 128, fps, config: { damping: 9, stiffness: 180 } });
  const shoveBack = interpolate(frame, [128, 140, 175], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ownerArm: [number, number] = speaking("owner")
    ? [120 + Math.sin(frame / 3) * 40, -30 + Math.sin(frame / 2) * 30]
    : frame > 125 && frame < 145
      ? [95, 0]
      : [20, 20];
  const autoArm: [number, number] = speaking("auto")
    ? [130 + Math.sin(frame / 2.6) * 35, -50 + Math.cos(frame / 2) * 30]
    : [15, 25];

  // traffic cop walks in from right
  const copX = interpolate(frame, [190, 230], [1250, 840], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const copStep = frame > 190 && frame < 230 ? Math.sin(frame / 2) * 4 : 0;
  // fighters step apart once the cop arrives
  const apart = interpolate(frame, [228, 250], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const shakeAmt = frame >= 128 && frame < 140 ? 10 : 0;
  const shx = Math.sin(frame * 3.1) * shakeAmt;
  const shy = Math.cos(frame * 2.7) * shakeAmt;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <SideGlassDef />
        <g transform={`translate(${shx} ${shy}) translate(${W / 2} ${H * 0.65}) scale(${zoom}) translate(${-W / 2} ${-H * 0.65})`}>
          <Backdrop p={DUSK} horizon={hz} frame={frame} sunY={hz - 60} />
          {/* far side: roadside shops */}
          {[
            { x: 40, w: 220, c: "#4C956C", t: "MEDICAL" },
            { x: 280, w: 260, c: "#E36414", t: "VADA PAV CENTRE" },
            { x: 560, w: 220, c: "#2E86AB", t: "PUNCTURE" },
            { x: 800, w: 260, c: "#9A031E", t: "KIRANA STORES" },
          ].map((s) => (
            <g key={s.t}>
              <rect x={s.x} y={hz - 180} width={s.w} height={190} fill={s.c} opacity={0.9} />
              <rect x={s.x + 10} y={hz - 170} width={s.w - 20} height={42} fill="#FFF4E0" />
              <text x={s.x + s.w / 2} y={hz - 140} fontFamily={F.fun} fontWeight={800} fontSize={24} textAnchor="middle" fill="#111">
                {s.t}
              </text>
              <rect x={s.x + 20} y={hz - 110} width={s.w - 40} height={110} fill="#2B1A10" opacity={0.7} />
            </g>
          ))}
          {/* road */}
          <rect x={0} y={hz} width={W} height={420} fill="#2E2C36" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={i * 160 - 40} y={hz + 200} width={90} height={10} fill="#F4E9D8" opacity={0.8} />
          ))}
          {/* stuck traffic queue behind (small, far lane) */}
          {[
            { x: 70, c: "#F2F2F2" },
            { x: 330, c: "#D7263D" },
            { x: 590, c: "#3D5A80" },
            { x: 850, c: "#F2C400" },
          ].map((v, i) => (
            <g key={i} transform={`translate(${v.x + 60} ${hz + 150}) scale(0.55)`}>
              <CarSide color={v.c} lights />
            </g>
          ))}
          {/* shoulder */}
          <rect x={0} y={hz + 420} width={W} height={H} fill="#8A6A45" />
          <rect x={0} y={hz + 420} width={W} height={18} fill="#F4E9D8" opacity={0.6} />

          {/* the accident: car + auto */}
          <g transform="translate(330 1440) scale(1.05)">
            <CarSide color="#F4F4F4" dent />
          </g>
          <g transform="translate(25 1440) scale(1.05)">
            <AutoSide />
          </g>
          {/* hazard blink */}
          {Math.floor(frame / 8) % 2 === 0 && (
            <>
              <circle cx={540} cy={1342} r={22} fill="#FFB347" opacity={0.7} />
              <circle cx={118} cy={1342} r={18} fill="#FFB347" opacity={0.7} />
            </>
          )}

          {/* crowd behind */}
          <Person x={600} y={1520} s={0.9} shirt="#6A994E" head="cap" headColor="#E36414" armR={[160, 10]} armL={[10, 10]} hold="phone" facing={-1} />
          <Person x={700} y={1515} s={0.9} shirt="#F7C548" head="hair" armR={[60, 100]} armL={[30, 80]} facing={-1} mouth={talk("crowd")} />
          <Person x={1010} y={1525} s={0.9} shirt="#C9184A" head="dupatta" headColor="#7B2CBF" skin="#C68B5E" facing={-1} armR={[150, 30]} armL={[10, 10]} hold="phone" />

          {/* cow, unbothered */}
          <Cow x={900} y={1800} s={0.95} chew={Math.sin(frame / 4)} tail={Math.sin(frame / 10)} />

          {/* fighters */}
          <Person
            x={300 - apart + shove * 6}
            y={1790}
            s={1.85}
            shirt="#2E86AB"
            pants="#22223B"
            head="hair"
            angry
            moustache
            facing={1}
            lean={speaking("owner") ? 8 + Math.sin(frame / 3) * 4 : 4}
            armR={ownerArm}
            armL={[30 + Math.sin(frame / 4) * 10, 40]}
            mouth={talk("owner")}
          />
          <Person
            x={650 + apart + shoveBack * 50}
            y={1790}
            s={1.85}
            shirt="#C2A878"
            pants="#6B5B3E"
            head="hair"
            headColor="#2A2A2A"
            angry
            facing={-1}
            lean={speaking("auto") ? 10 + Math.sin(frame / 3) * 5 : -shoveBack * 14}
            armR={autoArm}
            armL={[25, 50]}
            mouth={talk("auto")}
            skin="#9C6644"
          />
          {/* traffic cop */}
          <g transform={`translate(0 ${copStep})`}>
            <Person
              x={copX}
              y={1800}
              s={1.8}
              shirt="#F4F4F4"
              pants="#1B2A4A"
              head="copcap"
              facing={-1}
              moustache
              armR={frame > 214 ? [170, 0] : [130, 60]}
              armL={[15, 15]}
              hold="whistle"
              mouth={talk("cop")}
            />
          </g>
          {frame > 205 && frame < 225 && (
            <g transform={`translate(${copX - 120} 1290)`}>
              <HonkBurst text="TWEEET!" p={pulse(frame, 205, 225)} color="#4CC9F0" rot={6} />
            </g>
          )}
          {/* anger puffs */}
          {frame > 20 && frame < 200 &&
            [0, 1, 2].map((i) => {
              const t = ((frame + i * 12) % 36) / 36;
              return (
                <text key={i} x={470 + (i - 1) * 60} y={1340 - t * 120} fontSize={54} fontFamily={F.fun} fontWeight={800} fill="#FF3B30" opacity={1 - t} textAnchor="middle">
                  {["#@!", "%$#", "!!"][i]}
                </text>
              );
            })}
        </g>

        {/* honks from the queue (screen space) */}
        {FIGHT_HONKS.map((h, i) => (
          <g key={i} transform={`translate(${[230, 800, 420, 700][i]} ${[870, 850, 900, 880][i]})`}>
            <HonkBurst text={h.text} p={pulse(frame, h.at, h.at + 22)} rot={i % 2 ? 8 : -8} />
          </g>
        ))}

        {/* dialogue */}
        {FIGHT_LINES.map((l, i) => {
          const p = pulse(frame, l.from, l.to);
          const pos =
            l.who === "owner"
              ? { x: 360, y: 1040, tail: "left" as const, color: "#FFFFFF" }
              : l.who === "auto"
                ? { x: 700, y: 1040, tail: "right" as const, color: "#FFE08A" }
                : l.who === "crowd"
                  ? { x: 640, y: 1160, tail: "right" as const, color: "#E8F6EF" }
                  : { x: 640, y: 1080, tail: "right" as const, color: "#CDEBFF" };
          return (
            <SpeechBubble
              key={i}
              x={pos.x}
              y={pos.y}
              text={l.text}
              p={p}
              tail={pos.tail}
              color={pos.color}
              angry={l.who === "owner" || l.who === "auto"}
              w={l.who === "crowd" ? 380 : 560}
            />
          );
        })}
      </svg>

      {/* versus card */}
      <VersusCard />
    </AbsoluteFill>
  );
};

const VersusCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 140 } });
  const o = interpolate(frame, [200, 215], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const plate = (t: string, yellow?: boolean) => (
    <div
      style={{
        background: yellow ? "#FFD400" : "#FFF",
        border: "4px solid #111",
        borderRadius: 8,
        padding: "6px 16px 6px 8px",
        fontFamily: F.ui,
        fontWeight: 900,
        fontSize: 34,
        color: "#111",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ background: "#1A3E9A", color: "#fff", fontSize: 14, padding: "4px 5px", borderRadius: 3 }}>IND</span>
      {t}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 210,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 18,
        transform: `scale(${s})`,
        opacity: o,
      }}
    >
      {plate("MH 12 PQ 0420")}
      <span style={{ fontFamily: F.fun, fontWeight: 800, fontSize: 54, color: "#FF9933", textShadow: "0 4px 0 #000" }}>VS</span>
      {plate("MH 12 R 7781", true)}
    </div>
  );
};
