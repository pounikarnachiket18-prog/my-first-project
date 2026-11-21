import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { Cab, LP_SEAT, Pilot, VCD_POS } from "../three/Cab";
import { Chip } from "../overlays";
import { COLOR, EASE, mix, ramp } from "../theme";

export const S05_DURATION = 150;

/** Push in from the cab to the VCD box: "Vigilance Control Device = Dead Man Switch". */
export const S05System: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 4, 74, 0, 1);
  const pos = mix([0.4, 1.78, 0.55], [VCD_POS[0] + 0.05, 1.2, -0.62], t);
  const target = mix([-0.25, 0.95, -1.5], [VCD_POS[0], 1.075, VCD_POS[2]], t);
  const lamp = ramp(f, 72, 82, 0, 1) * (0.85 + 0.15 * Math.sin(f / 5));
  return (
    <AbsoluteFill>
      <Stage cam={{ position: pos, target, fov: 58 }} background="#d9d6cf">
        <Cab lamp={lamp}>
          <Pilot position={LP_SEAT} />
        </Cab>
      </Stage>
      <Chip from={18} to={70} top={250} color={COLOR.gold} size={58}>
        Ek khas system
      </Chip>
      <Chip from={78} top={190} size={100}>
        <div>Vigilance</div>
        <div style={{ color: COLOR.gold, fontSize: 74, opacity: ramp(f, 84, 94, 0, 1, EASE) }}>Control Device</div>
      </Chip>
      <Chip from={104} top={470} size={54} color={COLOR.teal} accent={COLOR.teal}>
        = Dead Man Switch
      </Chip>
    </AbsoluteFill>
  );
};
