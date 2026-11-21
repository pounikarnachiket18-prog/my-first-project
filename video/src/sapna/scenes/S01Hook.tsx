import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { Chip, Headline, popStyle, usePop } from "../ui";
import { Clouds, Countryside, SunWash, Track, TrainOnPath, coachPose } from "../world";

export const HOOK_TRACK = "M 1300 4600 C 1700 3700, 700 3000, 1150 2200 S 1700 900, 1150 -300";
const W = 2600;
const H = 4600;

/** Scene 1: drone sweeps over sunrise fields and finds Sapna Express. */
export const S01Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const head = 1500 + frame * 7;
  const target = coachPose(HOOK_TRACK, head - 300);
  const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;
  const scale = interpolate(frame, [0, 120], [0.42, 1.0], ease);
  const rot = interpolate(frame, [0, 150], [-35, -78], ease);
  const tag = usePop(55);

  return (
    <AbsoluteFill style={{ background: C.soil, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `translate(540px, 1100px) rotate(${rot}deg) scale(${scale}) translate(${-target.x}px, ${-target.y}px)`,
        }}
      >
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          <Countryside
            width={W}
            height={H}
            seed="hook"
            river="M -200 1500 C 600 1300, 900 1900, 1700 1700 S 2600 1300, 2900 1500"
            villages={[
              [600, 2600],
              [1900, 3300],
              [500, 900],
            ]}
          />
          <Track d={HOOK_TRACK} />
          <TrainOnPath d={HOOK_TRACK} head={head} coaches={10} />
        </svg>
      </div>
      <Clouds seed="hook" count={5} speed={3} />
      <SunWash />
      <Headline lines={[["Namaste!"]]} delay={6} top={230} size={110} exitAt={56} />
      <Headline
        lines={[
          ["Main", "hoon"],
          [
            { t: "Sapna", c: C.stripe },
            { t: "Express", c: C.stripe },
          ],
        ]}
        delay={62}
        top={230}
        size={104}
      />
      <div style={{ position: "absolute", top: 1180, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={popStyle(tag)}>
          <Chip color={C.stripe} size={40}>
            12345 · SAPNA EXPRESS
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};
