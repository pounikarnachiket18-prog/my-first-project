import React from "react";
import { Composition } from "remotion";
import { Lookdev } from "./scenes/Lookdev";
import { SkinLook } from "./scenes/SkinLook";
import { RoomLook } from "./scenes/RoomLook";
import { Reel } from "./Reel";
import { TL } from "./core/anim";

export const MosquitoRoot: React.FC = () => (
  <>
    <Composition id="JustKnowIt-Mosquito" component={Reel} durationInFrames={TL.durationInFrames} fps={TL.fps} width={TL.width} height={TL.height} defaultProps={{ captions: false, audio: true }} />
    <Composition id="Lookdev" component={Lookdev} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ view: "side" as const }} />
    <Composition id="SkinLook" component={SkinLook} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{ view: "skin" as const }} />
    <Composition id="RoomLook" component={RoomLook} durationInFrames={60} fps={30} width={1080} height={1920} />
  </>
);
