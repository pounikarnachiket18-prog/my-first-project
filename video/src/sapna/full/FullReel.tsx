import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { FONT } from "../theme";
import { DayMain } from "../day/DayMain";
import { INTRO_FRAMES, StationIntro } from "../night/StationIntro";
import { VO_SECONDS, warp } from "./warp";

export const FULL_FRAMES = Math.ceil(VO_SECONDS * 30);

/** Station opening + day reel, re-timed to follow the ElevenLabs voiceover. Works in 9:16 and 16:9. */
export const FullReel: React.FC<{ landscape?: boolean }> = ({ landscape = false }) => {
  const frame = useCurrentFrame();
  const d = warp(frame / 30);
  const introEnd = INTRO_FRAMES / 30;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {d < introEnd ? (
        <Freeze frame={Math.min(d * 30, INTRO_FRAMES - 0.001)}>
          <StationIntro landscape={landscape} />
        </Freeze>
      ) : (
        <Freeze frame={(d - introEnd) * 30}>
          <DayMain landscape={landscape} />
        </Freeze>
      )}
      {d >= introEnd ? (
        <div style={{ position: "absolute", top: 0, left: 0, height: landscape ? 6 : 9, width: `${(frame / FULL_FRAMES) * 100}%`, background: "#F97316" }} />
      ) : null}
      <span style={{ fontFamily: FONT, position: "absolute", opacity: 0 }}>.</span>
    </AbsoluteFill>
  );
};
