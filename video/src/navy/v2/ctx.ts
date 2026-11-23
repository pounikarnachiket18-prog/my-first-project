import React, { useContext } from "react";
import tlNight from "./timeline.json";

export type TL = typeof tlNight;
/** which narration timeline drives the scenes (v2 night = timeline.json, v3 day = ../v3/timeline.json) */
export const TimelineCtx = React.createContext<TL>(tlNight);
export const useTL = () => useContext(TimelineCtx);

/** motion style: fast = snappier pops/transitions + extra motion graphics (v3) */
export const MotionCtx = React.createContext<{ fast: boolean }>({ fast: false });
export const useMotion = () => useContext(MotionCtx);
