import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { Cab, LP_HEAD, LP_SEAT, Pilot } from "../three/Cab";
import { TimerRing, Zzz } from "../overlays";
import { ramp } from "../theme";

export const S08_DURATION = 60;

/** He stops moving. The ring keeps draining. */
export const S08DozeSide: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam: CamSpec = { position: [1.0, 1.6, 0.3], target: [-0.45, 1.18, -0.75], fov: ramp(f, 0, 60, 54, 48) };
  const head = project([LP_HEAD[0], LP_HEAD[1] + 0.3, LP_HEAD[2]], cam, width, height);
  return (
    <AbsoluteFill>
      <Stage cam={cam} background="#d9d6cf">
        <Cab>
          <Pilot position={LP_SEAT} nod={ramp(f, 8, 56, 0, 0.5)} slump={ramp(f, 8, 56, 0, 0.15)} eyeOpen={ramp(f, 4, 40, 1, 0.1)} />
        </Cab>
      </Stage>
      <TimerRing progress={ramp(f, 0, 60, 0.32, 0.06, (x) => x)} x={width - 210} y={330} size={230} warn />
      <Zzz from={34} x={head.x} y={head.y} size={72} />
    </AbsoluteFill>
  );
};
