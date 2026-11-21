import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Soundtrack } from "./audio";
import { FadeIn } from "./parts";
import {
  AttendantScene,
  BerthStoryScene,
  CalendarScene,
  HookPacketScene,
  KambalBhiScene,
  LaundryScene,
} from "./scenes";
import { BEAT, C, s } from "./theme";

const X = 8; // cross-fade overlap (frames)

const Beat: React.FC<{ b: readonly [number, number]; first?: boolean; children: React.ReactNode }> = ({ b, first, children }) => {
  const from = first ? 0 : s(b[0]) - X;
  return (
    <Sequence from={from} durationInFrames={s(b[1]) - from}>
      {first ? children : <FadeIn frames={X}>{children}</FadeIn>}
    </Sequence>
  );
};

export const RailKambal: React.FC = () => (
  <AbsoluteFill style={{ background: C.wall }}>
    <Beat b={[BEAT.hook[0], BEAT.packet[1]]} first>
      <HookPacketScene />
    </Beat>
    <Beat b={BEAT.attendant}>
      <AttendantScene />
    </Beat>
    <Beat b={BEAT.laundry}>
      <LaundryScene />
    </Beat>
    <Beat b={BEAT.kambalBhi}>
      <KambalBhiScene />
    </Beat>
    <Beat b={BEAT.calendar}>
      <CalendarScene />
    </Beat>
    <Beat b={BEAT.berthStory}>
      <BerthStoryScene />
    </Beat>
    <Soundtrack />
  </AbsoluteFill>
);
