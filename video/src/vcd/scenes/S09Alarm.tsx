import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CamSpec, Stage, project } from "../three/Stage";
import { Cab, LP_SEAT, Pilot, VCD_POS } from "../three/Cab";
import { AlarmRings, Chip } from "../overlays";
import { COLOR } from "../theme";

export const S09_DURATION = 80;

/** Warning 1: the lamp flashes. Warning 2: the buzzer. */
export const S09Alarm: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam: CamSpec = { position: [VCD_POS[0] + 0.12, 1.2, -0.62], target: [VCD_POS[0], 1.06, VCD_POS[2]], fov: 56 };
  const lampPx = project([VCD_POS[0] + 0.11, VCD_POS[1] + 0.045, VCD_POS[2] + 0.02], cam, width, height);
  const period = f < 40 ? 8 : 5;
  const lamp = Math.floor(f / period) % 2 === 0 ? 1 : 0.1;
  return (
    <AbsoluteFill>
      <Stage cam={cam} background="#d9d6cf">
        <Cab lamp={lamp} lampColor={f < 40 ? "#fff3c4" : "#ffd0c8"}>
          <Pilot position={LP_SEAT} nod={0.5} />
        </Cab>
      </Stage>
      <AlarmRings x={lampPx.x} y={lampPx.y} from={40} />
      <Chip from={4} top={260} size={60} color={COLOR.gold}>
        1. Light
      </Chip>
      <Chip from={40} top={380} size={60} color={COLOR.coral}>
        2. Buzzer
      </Chip>
    </AbsoluteFill>
  );
};
