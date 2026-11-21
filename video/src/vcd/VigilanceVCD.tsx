import React from "react";
import { AbsoluteFill, Series } from "remotion";
import * as S from "./scenes";

/** Ordered scene list — used by the main video, the Root registration and the duration total. */
export const VCD_SCENES = [
  { id: "VCD-01-NightOpen", component: S.S01NightOpen, durationInFrames: S.S01_DURATION },
  { id: "VCD-02-TrainSpeed", component: S.S02TrainSpeed, durationInFrames: S.S02_DURATION },
  { id: "VCD-03-PilotDrowsy", component: S.S03PilotDrowsy, durationInFrames: S.S03_DURATION },
  { id: "VCD-04-Bekaabu", component: S.S04Bekaabu, durationInFrames: S.S04_DURATION },
  { id: "VCD-05-System", component: S.S05System, durationInFrames: S.S05_DURATION },
  { id: "VCD-06-Question", component: S.S06Question, durationInFrames: S.S06_DURATION },
  { id: "VCD-07-Rule", component: S.S07Rule, durationInFrames: S.S07_DURATION },
  { id: "VCD-08-DozeSide", component: S.S08DozeSide, durationInFrames: S.S08_DURATION },
  { id: "VCD-09-Alarm", component: S.S09Alarm, durationInFrames: S.S09_DURATION },
  { id: "VCD-10-Countdown", component: S.S10Countdown, durationInFrames: S.S10_DURATION },
  { id: "VCD-11-Brake", component: S.S11Brake, durationInFrames: S.S11_DURATION },
  { id: "VCD-12-Alp", component: S.S12Alp, durationInFrames: S.S12_DURATION },
  { id: "VCD-13-Human", component: S.S13Human, durationInFrames: S.S13_DURATION },
  { id: "VCD-14-Outro", component: S.S14Outro, durationInFrames: S.S14_DURATION },
] as const;

export const VCD_TOTAL = VCD_SCENES.reduce((a, s) => a + s.durationInFrames, 0);

export type VigilanceVCDProps = { brand: string };

/** 44 s vertical explainer: how the Vigilance Control Device keeps a train safe if the pilot dozes off. */
export const VigilanceVCD: React.FC<VigilanceVCDProps> = ({ brand }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Series>
      {VCD_SCENES.map(({ id, component: C, durationInFrames }) => (
        <Series.Sequence key={id} name={id} durationInFrames={durationInFrames}>
          {id === "VCD-14-Outro" ? <S.S14Outro brand={brand} /> : <C />}
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
