import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { CheckIcon, Chip, Headline, popStyle, usePop } from "../ui";
import { Clouds, Countryside, SunWash, Track, TrainOnPath, coachPose } from "../world";

const W = 2200;
const H = 4200;
const TRACK = "M 1000 4400 L 1000 -300";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Platform: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <g>
    <rect x={x + 10} y={1210} width={w} height={1400} fill="rgba(0,0,0,0.18)" />
    <rect x={x} y={1200} width={w} height={1400} fill="#D1D5DB" />
    <rect x={x} y={1200} width={14} height={1400} fill={C.stripe} />
    <rect x={x + w - 14} y={1200} width={14} height={1400} fill={C.stripe} />
    {/* canopy roofs */}
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x={x + 30} y={1260 + i * 260} width={w - 60} height={190} rx={10} fill={i % 2 ? "#E07A4F" : "#C96A4A"} />
    ))}
  </g>
);

/** Scene 9: Sapna Express rolls into a sunny Bardhaman Jn; drone pulls away. */
export const S09Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [0, 150], [1500, 3050], { ...clamp, easing: Easing.out(Easing.cubic) });
  const focus = coachPose(TRACK, 3000);
  const scale = interpolate(frame, [0, 240], [1.35, 0.62], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const rot = interpolate(frame, [0, 240], [-12, 6], clamp);
  const sign = usePop(40);
  const done = usePop(150);

  return (
    <AbsoluteFill style={{ background: C.soil, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `translate(540px, 1050px) rotate(${rot}deg) scale(${scale}) translate(${-focus.x - 120}px, ${-focus.y}px)`,
        }}
      >
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          <Countryside width={W} height={H} seed="payoff" villages={[[1700, 700], [400, 3000]]} />
          <rect x={720} y={1150} width={720} height={1500} fill="#B8B1A0" />
          <Track d="M 1160 4400 L 1160 -300" />
          <Platform x={1220} w={200} />
          <Platform x={740} w={200} />
          <Track d={TRACK} />
          {/* station building */}
          <rect x={1480} y={1500} width={420} height={700} rx={16} fill="#F2E3C6" />
          <rect x={1480} y={1500} width={420} height={110} rx={16} fill="#C96A4A" />
          {/* people on platform */}
          {new Array(26).fill(0).map((_, i) => (
            <circle
              key={i}
              cx={1250 + random(`p${i}x`) * 140}
              cy={1300 + random(`p${i}y`) * 1200}
              r={13}
              fill={["#EF4444", "#10B981", "#6366F1", "#F59E0B", "#0EA5E9"][i % 5]}
            />
          ))}
          <TrainOnPath d={TRACK} head={head} coaches={10} />
        </svg>
      </div>
      <Clouds seed="payoff" count={4} speed={2.5} opacity={0.7} />
      <SunWash />
      <div style={{ position: "absolute", left: 120, top: 1180, ...popStyle(sign) }}>
        <div
          style={{
            padding: "16px 30px",
            borderRadius: 16,
            background: C.stripe,
            border: `6px solid ${C.ink}`,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 48,
            color: C.ink,
            boxShadow: "0 14px 30px rgba(19,35,58,0.3)",
          }}
        >
          BARDHAMAN JN
        </div>
      </div>
      <div style={{ position: "absolute", top: 1330, left: 120, ...popStyle(done), transformOrigin: "left center" }}>
        <Chip color={C.green} size={38} icon={<CheckIcon size={44} />}>
          Riya pahunch gayi!
        </Chip>
      </div>
      <Headline
        lines={[
          ["Internet", "na", "ho..."],
          ["location", { t: "phir", c: C.stripe }, { t: "bhi!", c: C.stripe }],
        ]}
        delay={60}
        top={190}
        size={96}
      />
    </AbsoluteFill>
  );
};
