import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { Chip, Headline, popStyle, usePop } from "../ui";
import { World3D } from "../three/World3D";
import { lerpV, offsetFrom, poseAt, vehicleCenterS } from "../three/track";

export const HOOK_HEAD0 = 520;
const SPEED = 0.95; // metres per frame (~100 km/h)

/** Scene 1: drone dives out of the sky and swoops alongside Sapna Express. */
export const S01Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const head = HOOK_HEAD0 + frame * SPEED;
  const focus = poseAt(vehicleCenterS(head, 2));
  const t = interpolate(frame, [0, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const from = offsetFrom(focus, -260, 340, -300);
  const to = offsetFrom(focus, 38, 16, -30);
  const pos = lerpV(from, to, t);
  const look = lerpV(offsetFrom(focus, 60, 0, 0), offsetFrom(focus, 30, 3, 0), t);
  const tag = usePop(60);

  return (
    <AbsoluteFill>
      <World3D cam={{ pos, look, fov: interpolate(t, [0, 1], [42, 50]) }} head={head} shadowSize={interpolate(t, [0, 1], [320, 120])} />
      <Headline lines={[["Namaste!"]]} delay={6} top={220} size={110} exitAt={56} />
      <Headline
        lines={[
          ["Main", "hoon"],
          [
            { t: "Sapna", c: C.stripe },
            { t: "Express", c: C.stripe },
          ],
        ]}
        delay={62}
        top={220}
        size={104}
      />
      <div style={{ position: "absolute", top: 1300, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={popStyle(tag)}>
          <Chip color={C.stripe} size={40}>
            12345 · SAPNA EXPRESS
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};
