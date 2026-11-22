import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { Chip, Headline, popStyle, usePop } from "../ui";
import { World3D } from "../three/World3D";
import { STATION } from "../three/track";
import { PortraitLayer } from "../day/DayMain";

export const INTRO_FRAMES = 150;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const X = STATION.x;
const ZC = (STATION.zStart + STATION.zEnd) / 2;

/** New cold open: a busy Indian Railways station as Sapna Express pulls in. */
export const StationIntro: React.FC<{ landscape?: boolean }> = ({ landscape = false }) => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [0, 95], [STATION.sStart - 170, STATION.sStart + 250], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rise = interpolate(frame, [80, 150], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const p0 = new THREE.Vector3(X - 3.1, 2.5, STATION.zEnd + 6);
  const p1 = new THREE.Vector3(X - 30, 34, STATION.zEnd - 30);
  const l0 = new THREE.Vector3(X + 1.2, 3.0, STATION.zEnd + 120);
  const l1 = new THREE.Vector3(X + 4, 2, ZC + 40);
  const cam = {
    pos: new THREE.Vector3().lerpVectors(p0, p1, rise),
    look: new THREE.Vector3().lerpVectors(l0, l1, rise),
    fov: interpolate(rise, [0, 1], [46, 52]),
  };
  const chip = usePop(70);

  return (
    <AbsoluteFill>
      <World3D width={landscape ? 1920 : 1080} height={landscape ? 1080 : 1920} cam={cam} head={head} shadowFocus={new THREE.Vector3(X, 0, ZC)} shadowSize={110} fogFar={2400} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,16,30,0.45), rgba(8,16,30,0) 35%)" }} />
      <PortraitLayer landscape={landscape}>
      <Headline
        lines={[
          ["Kabhi", "socha", "hai..."],
          [
            { t: "Bina", c: C.stripe },
            { t: "internet", c: C.stripe },
            { t: "kaise?", c: C.stripe },
          ],
        ]}
        delay={8}
        top={230}
        size={92}
      />
      <div style={{ position: "absolute", top: 1320, width: "100%", display: "flex", justifyContent: "center", ...popStyle(chip) }}>
        <Chip color={C.stripe} size={36}>
          12345 SAPNA EXPRESS · PF 1 PAR AA RAHI HAI
        </Chip>
      </div>
      </PortraitLayer>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: interpolate(frame, [INTRO_FRAMES - 8, INTRO_FRAMES], [0, 1], clamp),
        }}
      />
    </AbsoluteFill>
  );
};
