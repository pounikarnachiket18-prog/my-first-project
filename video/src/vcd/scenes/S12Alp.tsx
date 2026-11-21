import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { ALP_SEAT, Cab, LP_HEAD, LP_SEAT, Pilot, Seat } from "../three/Cab";
import { Chip } from "../overlays";
import { COLOR, mix, ramp } from "../theme";

export const S12_DURATION = 90;

/** Plus a second pair of eyes: the Assistant Loco Pilot. */
export const S12Alp: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = ramp(f, 0, S12_DURATION);
  const cam: CamSpec = { position: mix([0.25, 2.25, 2.6], [0.25, 2.2, 2.25], t), target: [0.25, 0.85, -1.0], fov: 62 };
  const lp = project([LP_HEAD[0], LP_HEAD[1] + 0.32, LP_HEAD[2]], cam, width, height);
  const alp = project([ALP_SEAT[0], LP_HEAD[1] + 0.32, ALP_SEAT[2]], cam, width, height);
  return (
    <AbsoluteFill>
      <Stage cam={cam} background="#d9d6cf">
        <Cab>
          <Pilot position={LP_SEAT} />
          <Seat position={ALP_SEAT} />
          <Pilot position={ALP_SEAT} shirt={COLOR.shirtAlp} hair="#2f2721" rotationY={0.25} />
        </Cab>
      </Stage>
      <Chip from={6} top={240} size={56} color={COLOR.teal}>
        Assistant Loco Pilot
      </Chip>
      <Chip from={24} top={lp.y - 50} left={lp.x} size={40} color={COLOR.gold}>
        LP
      </Chip>
      <Chip from={32} top={alp.y - 50} left={alp.x} size={40} color={COLOR.teal}>
        ALP
      </Chip>
    </AbsoluteFill>
  );
};
