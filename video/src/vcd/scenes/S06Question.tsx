import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { Cab, LP_HEAD, LP_SEAT, Pilot, VCD_POS } from "../three/Cab";
import { Chip } from "../overlays";
import { COLOR, ramp } from "../theme";

export const S06_DURATION = 60;

/** The VCD "scans" the pilot: is he awake? */
export const S06Question: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam: CamSpec = { position: [1.4, 1.65, 0.4], target: [-0.75, 1.15, -0.85], fov: 58 };
  const a = project([VCD_POS[0] + 0.11, VCD_POS[1] + 0.05, VCD_POS[2]], cam, width, height);
  const b = project(LP_HEAD, cam, width, height);
  const grow = ramp(f, 6, 22);
  return (
    <AbsoluteFill>
      <Stage cam={cam} background="#d9d6cf">
        <Cab lamp={0.6 + 0.4 * Math.sin(f / 4)}>
          <Pilot position={LP_SEAT} />
        </Cab>
      </Stage>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={a.x}
          y1={a.y}
          x2={a.x + (b.x - a.x) * grow}
          y2={a.y + (b.y - a.y) * grow}
          stroke={COLOR.teal}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="22 18"
          strokeDashoffset={-f * 3}
        />
        <circle cx={b.x} cy={b.y} r={ramp(f, 20, 30, 0, 120)} fill="none" stroke={COLOR.teal} strokeWidth={5} opacity={ramp(f, 20, 30, 0, 0.9)} />
      </svg>
      <Chip from={8} top={240} size={56}>
        Pilot jaag raha hai?
      </Chip>
    </AbsoluteFill>
  );
};
