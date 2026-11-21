import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { Chip, Headline, popStyle, usePop } from "../ui";
import { World3D } from "../three/World3D";
import { RIYA_LOCAL, S4_INDEX, lerpV, localToWorld } from "../three/track";

export const COACH_HEAD0 = 760;

/** Scene 2: drone drops onto coach S4, the roof turns to glass, push in on Riya. */
export const S02Coach: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = COACH_HEAD0 + frame * 0.95;
  const cut = interpolate(frame, [28, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const drop = interpolate(frame, [0, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const push = spring({ frame: frame - 85, fps, config: { damping: 24, stiffness: 55 } });

  const w = (l: [number, number, number]) => localToWorld(head, S4_INDEX, l);
  const riya = w(RIYA_LOCAL);
  // high overhead -> above the coach -> close over Riya's shoulder
  const p0 = w([-30, 90, -40]);
  const p1 = w([-6, 17, -7]);
  const p2 = w([RIYA_LOCAL[0] - 2.4, 4.6, RIYA_LOCAL[2] + 1.9]);
  const pos = lerpV(lerpV(p0, p1, drop), p2, push);
  const look = lerpV(lerpV(w([4, 0, 0]), w([0, 1.5, 0]), drop), riya, push);
  const label = usePop(150);
  const ring = interpolate(frame, [95, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <World3D cam={{ pos, look, fov: interpolate(push, [0, 1], [48, 52]) }} head={head} cutaway={cut} shadowFocus={w([0, 0, 0])} shadowSize={60} />
      {/* focus ring on Riya (camera ends centred on her) */}
      <div
        style={{
          position: "absolute",
          left: 540 - 170,
          top: 960 - 170,
          width: 340,
          height: 340,
          borderRadius: "50%",
          border: `6px solid ${C.stripe}`,
          boxShadow: "0 0 40px rgba(255,201,60,0.6)",
          opacity: ring * push,
          scale: 1 + Math.sin(frame / 5) * 0.03,
        }}
      />
      <Headline lines={[["Andar", "chalo..."]]} delay={4} top={210} exitAt={95} />
      <Headline
        lines={[
          ["Riya", "ka", "sawaal:"],
          [
            { t: "Main", c: C.stripe },
            { t: "kahan", c: C.stripe },
            { t: "pahunchi?", c: C.stripe },
          ],
        ]}
        delay={105}
        top={210}
        size={80}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1170, display: "flex", justifyContent: "center", ...popStyle(label) }}>
        <Chip color={C.pink} size={38}>
          Coach S4 · Seat 32
        </Chip>
      </div>
    </AbsoluteFill>
  );
};
