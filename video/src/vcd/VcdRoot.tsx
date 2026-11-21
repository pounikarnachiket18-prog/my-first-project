import React from "react";
import { Composition, Folder } from "remotion";
import { VCD_SCENES, VCD_TOTAL, VigilanceVCD } from "./VigilanceVCD";

export const VcdCompositions: React.FC = () => (
  <>
    <Composition
      id="VigilanceVCD"
      component={VigilanceVCD}
      durationInFrames={VCD_TOTAL}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ brand: "HYPOEXPLAINED" }}
    />
    <Folder name="VigilanceVCD-Scenes">
      {VCD_SCENES.map(({ id, component, durationInFrames }) => (
        <Composition key={id} id={id} component={component as React.FC} durationInFrames={durationInFrames} fps={30} width={1080} height={1920} />
      ))}
    </Folder>
  </>
);

export const VcdRoot = VcdCompositions;
