/**
 * SAMOSA SCENE — concrete example: same ₹100, fewer samose.
 * "Then" card lands, "Now" card lands, the count ticks down 10 → 5.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FluidGradientBg, GlassCard, GradientWord, C, FONT, INTER } from "../primitives";
import { enter, exitFade, ramp } from "./anim";

export const SAMOSA_FRAMES = 210;

const Card: React.FC<{ label: string; count: number; highlight?: boolean; portrait: boolean }> = ({ label, count, highlight, portrait }) => (
  <GlassCard style={{ width: portrait ? 820 : 640, padding: portrait ? "40px 48px" : "44px 52px", textAlign: "center" }}>
    <div style={{ fontFamily: FONT.mono, fontSize: 30, letterSpacing: 5, textTransform: "uppercase", color: C.inkSoft, fontWeight: 600 }}>{label}</div>
    <div style={{ fontFamily: INTER, fontSize: 56, fontWeight: 700, color: C.ink, marginTop: 18 }}>₹100 =</div>
    <div style={{ fontFamily: FONT.display, fontSize: portrait ? 150 : 170, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: C.ink, marginTop: 8 }}>
      {highlight ? <GradientWord>{count}</GradientWord> : count}
    </div>
    <div style={{ fontFamily: INTER, fontSize: 52, fontWeight: 700, color: C.ink, marginTop: 6 }}>samose</div>
  </GlassCard>
);

export const SamosaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;

  // "Now" count ticks from 10 down to 5
  const nowCount = Math.round(ramp(frame, 70, 120, 10, 5));

  return (
    <AbsoluteFill style={{ opacity: exitFade(frame, SAMOSA_FRAMES) }}>
      <FluidGradientBg variant="amberCream" speed={1} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: portrait ? 48 : 64 }}>
        <div style={{ ...enter(frame, 0, fps), fontFamily: INTER, fontSize: portrait ? 76 : 88, fontWeight: 800, letterSpacing: -2, color: C.ink, textAlign: "center", padding: "0 60px" }}>
          Same ₹100. <GradientWord>Aadhe samose.</GradientWord>
        </div>
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: portrait ? 40 : 72, alignItems: "center" }}>
          <div style={enter(frame, 20, fps)}><Card label="10 saal pehle" count={10} portrait={portrait} /></div>
          <div style={enter(frame, 50, fps)}><Card label="Aaj" count={nowCount} highlight={frame > 120} portrait={portrait} /></div>
        </div>
        <div style={{ opacity: ramp(frame, 130, 145, 0, 0.7), fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, letterSpacing: 2 }}>
          *SAMJHANE KE LIYE EXAMPLE
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
