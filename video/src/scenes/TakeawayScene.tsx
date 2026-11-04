/**
 * TAKEAWAY SCENE — the one thing to remember, on a dark backdrop.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FluidGradientBg, GradientWord, FONT, INTER } from "../primitives";
import { enter, exitFade } from "./anim";

export const TAKEAWAY_FRAMES = 159;

export const TakeawayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;

  return (
    <AbsoluteFill style={{ opacity: exitFade(frame, TAKEAWAY_FRAMES) }}>
      <FluidGradientBg variant="darkGold" speed={0.9} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, padding: "0 80px", textAlign: "center" }}>
        <div style={{ ...enter(frame, 4, fps), fontFamily: INTER, fontSize: portrait ? 96 : 110, fontWeight: 800, color: "#FFFFFF", letterSpacing: -3, lineHeight: 1.05 }}>
          Paisa sirf bachao mat —
        </div>
        <div style={{ ...enter(frame, 30, fps), fontFamily: FONT.display, fontSize: portrait ? 210 : 220, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>
          <GradientWord>badhao.</GradientWord>
        </div>
        <div style={{ ...enter(frame, 62, fps), fontFamily: INTER, fontSize: portrait ? 44 : 46, fontWeight: 500, color: "rgba(255,255,255,0.85)", maxWidth: 1300, lineHeight: 1.3 }}>
          Aisi jagah lagao jahan return inflation se zyada ho.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
