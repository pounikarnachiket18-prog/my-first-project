import React from "react";
import { Stage, Shot } from "../core/Stage";
import { Bedroom } from "../models/Bedroom";
import { Person } from "../models/Human";
import { PEOPLE } from "./cast";

export const RoomLook: React.FC = () => {
  const shot = (): Shot => ({ pos: [1.5, 1.4, 4.5], target: [0.1, 0.8, 0], fov: 45, aperture: 1.2, maxBlur: 22, focus: 4.3, grade: { exposure: 0.9, lift: [0.0, 0.01, 0.025], saturation: 0.9 } });
  return (
    <Stage from={0} shot={shot} env="night" bg="#020308" envIntensity={0.25}>
      <Bedroom />
      {PEOPLE.map((p, i) => (
        <Person key={i} look={p.look} position={p.pos} rotationY={p.rotY} />
      ))}
    </Stage>
  );
};
