import React from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender } from "remotion";
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
import { BEAT, C, FONT_CHECKS, s } from "./theme";

const X = 8; // cross-fade overlap (frames)

const Beat: React.FC<{ b: readonly [number, number]; first?: boolean; children: React.ReactNode }> = ({ b, first, children }) => {
  const from = first ? 0 : s(b[0]) - X;
  return (
    <Sequence from={from} durationInFrames={s(b[1]) - from}>
      {first ? children : <FadeIn frames={X}>{children}</FadeIn>}
    </Sequence>
  );
};

/** Waits (max 10s) for the embedded Devanagari + Latin fonts before rendering. */
const useFonts = () => {
  const [handle] = React.useState(() => delayRender("Loading embedded fonts"));
  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(FONT_CHECKS.flatMap((f) => [document.fonts.load(f, "Aa"), document.fonts.load(f, "भारतीय रेल")]))
      .then(finish)
      .catch(finish);
    const t = setTimeout(finish, 10000);
    return () => clearTimeout(t);
  }, [handle]);
};

export const RailKambal: React.FC = () => {
  useFonts();
  return (
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
};
