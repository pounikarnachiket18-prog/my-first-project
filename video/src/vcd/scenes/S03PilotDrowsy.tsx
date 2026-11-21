import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { Cab, LP_SEAT, Pilot } from "../three/Cab";
import { ramp } from "../theme";

export const S03_DURATION = 60;

/** Close-up: heavy eyelids. */
export const S03PilotDrowsy: React.FC = () => {
  const f = useCurrentFrame();
  const eyeOpen =
    f < 14 ? 1 : f < 22 ? ramp(f, 14, 22, 1, 0.08) : f < 44 ? ramp(f, 22, 30, 0.08, 0.5) : ramp(f, 44, 52, 0.5, 0.08) + ramp(f, 52, 60, 0, 0.25);
  return (
    <AbsoluteFill>
      <Stage cam={{ position: [LP_SEAT[0] + 0.08, 1.42, -1.52], target: [LP_SEAT[0], 1.22, -0.3], fov: ramp(f, 0, 60, 52, 44) }} background="#d9d6cf">
        <Cab backWall>
          <Pilot position={LP_SEAT} eyeOpen={eyeOpen} nod={ramp(f, 0, 60, 0, 0.18)} />
        </Cab>
      </Stage>
    </AbsoluteFill>
  );
};
