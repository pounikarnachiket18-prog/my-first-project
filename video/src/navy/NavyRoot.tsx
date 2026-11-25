import React from "react";
import { Composition } from "remotion";
import { NavyVideo, NAVY_FRAMES } from "./NavyVideo";
import { HyperVideo, HYPER_FRAMES } from "./hyper/HyperVideo";
import { HyperVideo2, HYPER2_FRAMES } from "./hyper2/HyperVideo2";
import { LookTest } from "./hyper3/LookTest";
import { LookTestDay } from "./hyper3/LookTestDay";
import { HyperVideo4, HYPER4_FRAMES } from "./hyper3/HyperVideo4";
import { HyperVideo5, HYPER5_FRAMES } from "./hyper3/HyperVideo5";
import { HyperVideo6, HYPER6_FRAMES } from "./hyper3/HyperVideo6";
import { HyperVideo7, HYPER7_FRAMES } from "./hyper3/HyperVideo7";
import { HyperVideo3, HYPER3_FRAMES } from "./hyper3/HyperVideo3";
import { NavyV2, NAVY_V2_FRAMES, NAVY_V3_FRAMES, NAVY_V4_FRAMES, NAVY_V5_FRAMES } from "./v2/NavyV2";

export const NavyRoot: React.FC = () => (
  <>
    <Composition id="IndianNavy" component={NavyVideo} durationInFrames={NAVY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IndianNavyV2" component={NavyV2} durationInFrames={NAVY_V2_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IndianNavyV3Day" component={NavyV2} durationInFrames={NAVY_V3_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ variant: "v3-day" as const }} />
    <Composition id="IndianNavyV4Day60" component={NavyV2} durationInFrames={NAVY_V4_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ variant: "v4-day60" as const }} />
    <Composition id="IndianNavyV5Day60EL" component={NavyV2} durationInFrames={NAVY_V5_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ variant: "v5-day60-el" as const }} />
    <Composition id="SupersonicVsHypersonic" component={HyperVideo} durationInFrames={HYPER_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV3" component={HyperVideo3} durationInFrames={HYPER3_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV7" component={HyperVideo7} durationInFrames={HYPER7_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV6Dogfight" component={HyperVideo6} durationInFrames={HYPER6_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV5Best" component={HyperVideo5} durationInFrames={HYPER5_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV4Day" component={HyperVideo4} durationInFrames={HYPER4_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="H4LookTestDay" component={LookTestDay} durationInFrames={4} fps={30} width={1080} height={1920} />
    <Composition id="H3LookTest" component={LookTest} durationInFrames={4} fps={30} width={1080} height={1920} />
    <Composition id="SupersonicVsHypersonicV2" component={HyperVideo2} durationInFrames={HYPER2_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
