/**
 * WHY SCENE — three short lines build the mechanism, last one is the payoff.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FluidGradientBg, GradientWord, C, FONT, INTER } from "../primitives";
import { enter, exitFade } from "./anim";

export const WHY_FRAMES = 180;

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const line = { fontFamily: INTER, fontSize: portrait ? 52 : 72, fontWeight: 700, color: C.ink, letterSpacing: -1.5, lineHeight: 1.15, textAlign: "center" as const };

  return (
    <AbsoluteFill style={{ opacity: exitFade(frame, WHY_FRAMES) }}>
      <FluidGradientBg variant="brightSun" speed={1.1} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: portrait ? 56 : 44, padding: portrait ? "0 70px" : "0 120px" }}>
        <div style={{ ...enter(frame, 0, fps), fontFamily: FONT.display, fontSize: portrait ? 150 : 140, fontWeight: 800, color: C.brand, letterSpacing: -4 }}>Kyun?</div>
        <div style={{ ...line, ...enter(frame, 22, fps) }}>Prices har saal thoda badhte hain…</div>
        <div style={{ ...line, ...enter(frame, 52, fps) }}>…par aapke ₹100, ₹100 hi rehte hain.</div>
        <div style={{ ...line, ...enter(frame, 90, fps), fontSize: portrait ? 72 : 84, fontWeight: 800, marginTop: 12 }}>
          6% inflation = ~12 saal mein prices <GradientWord>double</GradientWord>.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
