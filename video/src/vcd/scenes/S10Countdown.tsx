import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { Cab, LP_HEAD, LP_SEAT, Pilot } from "../three/Cab";
import { DrainBar, Zzz } from "../overlays";
import { mix, ramp } from "../theme";

export const S10_DURATION = 70;

/** Still no response — a few seconds left. */
export const S10Countdown: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = ramp(f, 0, S10_DURATION);
  const cam: CamSpec = { position: mix([1.1, 1.62, 0.35], [0.9, 1.55, 0.1], t), target: [-0.45, 1.1, -0.82], fov: 52 };
  const head = project([LP_HEAD[0], LP_HEAD[1] + 0.12, LP_HEAD[2] - 0.2], cam, width, height);
  return (
    <AbsoluteFill>
      <Stage cam={cam} background="#d9d6cf">
        <Cab lamp={Math.floor(f / 5) % 2 === 0 ? 1 : 0.1} lampColor="#ffd0c8">
          <Pilot position={LP_SEAT} nod={0.95} slump={0.3} eyeOpen={0.05} />
        </Cab>
      </Stage>
      <DrainBar from={2} top={240} label="KUCH SECOND..." progress={ramp(f, 4, 66, 1, 0, (x) => x)} />
      <Zzz from={6} x={head.x} y={head.y} size={130} />
    </AbsoluteFill>
  );
};
