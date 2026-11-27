import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { Particles } from "../../earth/components/Particles";
import { impulse } from "../../earth/components/Look";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * End title. Frame 0 = the title hit. `sub` = subtitle hit, `final` = final impact, `black` = cut to black.
 * Original typography (Montserrat, OFL); no studio logos.
 */
export const TitleCard: React.FC<{ sub: number; final: number; black: number }> = ({ sub, final, black }) => {
  const f = useCurrentFrame();
  if (f >= black) return <AbsoluteFill style={{ background: "#000" }} />;
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const p = interpolate(f, [0, 30], [0, 1], { ...clamp, easing: ease });
  const track = interpolate(p, [0, 1], [0.7, 0.16]);
  const blur = interpolate(f, [0, 10], [14, 0], clamp);
  const glow = impulse(f, 0, 14) * 0.9 + impulse(f, final, 6) * 1.2;
  const sweep = interpolate(f, [4, 40], [-40, 140], clamp);
  const punch = 1 + impulse(f, final, 5) * 0.06 + interpolate(f, [0, 80], [0.03, 0], clamp);
  const subA = interpolate(f, [sub, sub + 10], [0, 1], clamp);
  const subY = interpolate(f, [sub, sub + 14], [24, 0], { ...clamp, easing: ease });
  const gold = "linear-gradient(180deg, #fff6e6 0%, #f1d3a2 45%, #b98a4f 100%)";
  const textStyle: React.CSSProperties = {
    fontFamily: FONT.sans, fontWeight: 800, color: "transparent", backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0) ${sweep - 12}%, rgba(255,255,255,0.95) ${sweep}%, rgba(255,255,255,0) ${sweep + 12}%), ${gold}`,
    WebkitBackgroundClip: "text", backgroundClip: "text", lineHeight: 1.0, textAlign: "center", whiteSpace: "nowrap",
    filter: `blur(${blur}px) drop-shadow(0 0 ${18 + glow * 40}px rgba(255,170,80,${0.25 + glow * 0.5}))`,
  };
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 45% at 50% 58%, #2a1608 0%, #0a0604 55%, #000 100%)" }}>
      <Particles kind="embers" count={60} seed="ttl" speed={0.5} opacity={0.55} />
      <Particles kind="dust" count={8} seed="ttld" speed={0.4} opacity={0.6} color="#6a4022" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${punch})` }}>
        <div style={{ ...textStyle, fontSize: 118, letterSpacing: `${track}em`, marginRight: `-${track}em` }}>THE LAST</div>
        <div style={{ ...textStyle, fontSize: 196, letterSpacing: `${track * 0.6}em`, marginRight: `-${track * 0.6}em`, marginTop: 6 }}>FLIGHT</div>
        <div style={{ width: interpolate(f, [6, 34], [0, 640], { ...clamp, easing: ease }), height: 2, marginTop: 34,
          background: "linear-gradient(90deg, rgba(240,200,140,0), rgba(240,200,140,0.9), rgba(240,200,140,0))" }} />
        <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 36, color: "#efe2cc", letterSpacing: "0.32em", marginRight: "-0.32em",
          marginTop: 30, opacity: subA, transform: `translateY(${subY}px)`, textShadow: "0 0 18px rgba(0,0,0,0.9)" }}>
          THE DAY THE EARTH STOPPED.
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff2dc", opacity: impulse(f, 0, 4) * 0.85 + impulse(f, final, 4) * 0.9, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};
