import React from "react";
import { Composition, Still } from "remotion";
import { Thumbnail } from "./Thumbnail";
import { VCDExplainer } from "./VCDExplainer";

// Separate entry point: uses only locally bundled fonts, so it renders offline.
export const VCDRoot: React.FC = () => (
  <>
    <Composition id="VCDExplainer" component={VCDExplainer} durationInFrames={1320} fps={30} width={1080} height={1920} />
    <Still id="VCDThumb" component={Thumbnail} width={1080} height={1920} />
  </>
);
