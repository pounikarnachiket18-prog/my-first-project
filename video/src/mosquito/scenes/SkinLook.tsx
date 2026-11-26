import React from "react";
import { Stage, Shot } from "../core/Stage";
import { Skin } from "../models/Skin";
import { Molecule, CO2, LACTIC, carboxylicAcid } from "../models/Molecule";

const ACID = carboxylicAcid(10);
export const SkinLook: React.FC<{ view?: "skin" | "mol" }> = ({ view = "skin" }) => {
  const shot = (t: number): Shot =>
    view === "skin"
      ? { pos: [2.0, 1.6, 7.6], target: [4.2, 0.0, 3.8], fov: 32, aperture: 0.6, maxBlur: 26, grade: { exposure: 1.0 } }
      : { pos: [0, 2, 16], target: [0, 0, 0], fov: 30, aperture: 0, grade: { exposure: 1.1 } };
  return (
    <Stage from={0} shot={shot} env={view === "skin" ? "skin" : "lab"} bg={view === "skin" ? "#120806" : "#03070c"}>
      <ambientLight intensity={0.05} />
      <directionalLight position={[-3, 4, 2]} intensity={3} color="#ffe2c4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <directionalLight position={[4, 1.5, -4]} intensity={2.5} color="#9cc0ff" />
      {view === "skin" ? (
        <Skin />
      ) : (
        <>
          <Molecule data={CO2} place={(t, g) => { g.position.set(-5, 4, 0); g.rotation.set(0.3, t, 0); }} />
          <Molecule data={LACTIC} place={(t, g) => { g.position.set(4, 4, 0); g.rotation.set(0.3, t, 0); }} />
          <Molecule data={ACID} glow={() => ({ base: 0, cooh: 1 })} place={(t, g) => { g.position.set(0, -2, 0); g.rotation.set(0.4, 0.3, 0); }} />
        </>
      )}
    </Stage>
  );
};
