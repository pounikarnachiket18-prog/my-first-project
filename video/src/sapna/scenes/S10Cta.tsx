import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { Headline, popStyle, usePop } from "../ui";
import { World3D } from "../three/World3D";
import { poseAt } from "../three/track";

const PREFIX = "Meri sabse lambi journey: ";
const ANSWER = "36 ghante";
const CAM_S = 900;

/** Scene 10: low trackside shot as the train thunders past, with the comment CTA. */
export const S10Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const head = CAM_S - 120 + frame * 1.1;
  const at = poseAt(CAM_S);
  const pos = at.p.clone().addScaledVector(at.side, -14).add({ x: 0, y: 2.2, z: 0 } as never);
  const look = poseAt(CAM_S - 40 + frame * 0.15).p.clone().add({ x: 0, y: 4, z: 0 } as never);
  const card = usePop(20);
  const follow = usePop(105, 9);
  const typed = Math.max(0, Math.floor((frame - 40) / 1.6));
  const shown = (PREFIX + ANSWER).slice(0, typed);
  const caret = Math.floor(frame / 8) % 2 === 0;
  const pulse = 1 + Math.max(0, Math.sin((frame - 105) / 6)) * 0.06;

  return (
    <AbsoluteFill>
      <World3D cam={{ pos, look, fov: 55 }} head={head} shadowFocus={at.p} shadowSize={90} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,20,35,0.45), rgba(10,20,35,0.15) 60%, rgba(10,20,35,0.35))" }} />

      <Headline lines={[["Comment", { t: "karo!", c: C.stripe }]]} delay={4} top={260} size={110} />

      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 560,
          borderRadius: 40,
          background: "rgba(255,255,255,0.92)",
          padding: "36px 42px",
          fontFamily: FONT,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          ...popStyle(card),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 800, letterSpacing: 3, color: C.pink }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: C.pink }} />
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
      <div
        style={{
          position: "absolute",
          top: 1150,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 34,
          color: C.white,
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          opacity: interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Sapna Express phir milegi!
      </div>
    </AbsoluteFill>
  );
};
