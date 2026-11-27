import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SHOTS, TOTAL } from "./timeline";
import { Subtitles } from "./components/Subtitles";
import { S1Hook } from "./scenes/S1Hook";
import { S2Speed } from "./scenes/S2Speed";
import { S3Inertia } from "./scenes/S3Inertia";
import { S4Destruction } from "./scenes/S4Destruction";
import { S5YearDay } from "./scenes/S5YearDay";
import { S6Twist } from "./scenes/S6Twist";
import { S7Ending } from "./scenes/S7Ending";

const span = (a: keyof typeof SHOTS, b: keyof typeof SHOTS) => ({ from: SHOTS[a].from, durationInFrames: SHOTS[b].to - SHOTS[a].from });

/** "What If Earth Suddenly Stopped Rotating?" — 50 s vertical science explainer (Hinglish). */
export const EarthStopped: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence {...span("A1", "A1")} name="1 Hook"><S1Hook /></Sequence>
    <Sequence {...span("B1", "B2")} name="2 Invisible speed"><S2Speed /></Sequence>
    <Sequence {...span("C1", "C3")} name="3 Inertia"><S3Inertia /></Sequence>
    <Sequence {...span("D1", "D4")} name="4 Global destruction"><S4Destruction /></Sequence>
    <Sequence {...span("E1", "E2")} name="5 Year-long day"><S5YearDay /></Sequence>
    <Sequence {...span("F1", "F3")} name="6 Final twist"><S6Twist /></Sequence>
    <Sequence {...span("G1", "G1")} name="7 Ending"><S7Ending /></Sequence>
    <Sequence from={0} durationInFrames={TOTAL - 14} name="Subtitles"><Subtitles /></Sequence>
    {audio && <Audio src={staticFile("earth/audio/final_mix.wav")} />}
  </AbsoluteFill>
);
