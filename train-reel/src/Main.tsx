import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import T from "./timeline.json";
import { SceneWrap, ProgressTrain } from "./ui";
import { Hook } from "./scenes/Hook";
import { Title } from "./scenes/Title";
import { Pauses } from "./scenes/Pauses";
import { Reveal } from "./scenes/Reveal";
import { Studio } from "./scenes/Studio";
import { Data } from "./scenes/Data";
import { Stitch } from "./scenes/Stitch";
import { MathScene } from "./scenes/MathScene";
import { Digits } from "./scenes/Digits";
import { Pitch } from "./scenes/Pitch";
import { Lang } from "./scenes/Lang";
import { Stations } from "./scenes/Stations";
import { Pros } from "./scenes/Pros";
import { Outro } from "./scenes/Outro";
import { C } from "./tokens";

const SCENES: Record<string, React.FC> = {
  hook: Hook,
  title: Title,
  pauses: Pauses,
  reveal: Reveal,
  studio: Studio,
  data: Data,
  stitch: Stitch,
  math: MathScene,
  digits: Digits,
  pitch: Pitch,
  lang: Lang,
  stations: Stations,
  pros: Pros,
  outro: Outro,
};

export const Main: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: C.night }}>
    {T.scenes.map((s) => {
      const Comp = SCENES[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          <SceneWrap dur={s.dur}>
            <Comp />
          </SceneWrap>
        </Sequence>
      );
    })}
    <ProgressTrain total={T.total} />
    {withAudio && <Audio src={staticFile("soundtrack.wav")} />}
  </AbsoluteFill>
);
