import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { Headline, popStyle, usePop } from "../ui";
import { Countryside, Track, TrainOnPath, coachPose } from "../world";
import { HOOK_TRACK } from "./S01Hook";

const W = 2600;
const H = 4600;
const PREFIX = "Meri sabse lambi journey: ";
const ANSWER = "36 ghante";

/** Scene 10: comment call-to-action over a slow drone shot. */
export const S10Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const head = 2600 + frame * 5;
  const focus = coachPose(HOOK_TRACK, head - 400);
  const card = usePop(20);
  const follow = usePop(105, 9);
  const typed = Math.max(0, Math.floor((frame - 40) / 1.6));
  const full = PREFIX + ANSWER;
  const shown = full.slice(0, typed);
  const caret = Math.floor(frame / 8) % 2 === 0;
  const pulse = 1 + Math.max(0, Math.sin((frame - 105) / 6)) * 0.06;

  return (
    <AbsoluteFill style={{ background: C.soil, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `translate(540px, 1200px) rotate(-70deg) scale(0.8) translate(${-focus.x}px, ${-focus.y}px)`,
        }}
      >
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          <Countryside width={W} height={H} seed="hook" river="M -200 1500 C 600 1300, 900 1900, 1700 1700 S 2600 1300, 2900 1500" />
          <Track d={HOOK_TRACK} />
          <TrainOnPath d={HOOK_TRACK} head={head} coaches={10} />
        </svg>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(19,35,58,0.25)" }} />

      <Headline lines={[["Comment", { t: "karo!", c: C.stripe }]]} delay={4} top={260} size={110} />

      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 560,
          borderRadius: 40,
          background: C.white,
          padding: "36px 42px",
          fontFamily: FONT,
          boxShadow: "0 24px 60px rgba(19,35,58,0.3)",
          ...popStyle(card),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 800, letterSpacing: 3, color: C.pink }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: C.stripe }} />
          COMMENT
        </div>
        <div style={{ marginTop: 20, fontSize: 50, fontWeight: 700, color: C.ink, minHeight: 130, lineHeight: 1.3 }}>
          {shown.slice(0, PREFIX.length)}
          <span style={{ color: "#D97706" }}>{shown.slice(PREFIX.length)}</span>
          <span style={{ opacity: caret ? 1 : 0, color: C.train }}>|</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1000, width: "100%", display: "flex", justifyContent: "center", ...popStyle(follow) }}>
        <div
          style={{
            padding: "26px 60px",
            borderRadius: 999,
            background: C.pink,
            color: C.white,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 50,
            boxShadow: "0 18px 40px rgba(255,92,138,0.45)",
            scale: pulse,
          }}
        >
          Follow karo · EP 02 jaldi!
        </div>
      </div>
      <div style={{ position: "absolute", top: 1150, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: 34, color: C.white, opacity: interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        Sapna Express phir milegi!
      </div>
    </AbsoluteFill>
  );
};
