import React, { useContext } from "react";
import tlNight from "./timeline.json";

export type TL = typeof tlNight;
/** which narration timeline drives the scenes (v2 night = timeline.json, v3 day = ../v3/timeline.json) */
export const TimelineCtx = React.createContext<TL>(tlNight);
export const useTL = () => useContext(TimelineCtx);

/** motion style: fast = snappier pops/transitions + extra motion graphics (v3) */
export const MotionCtx = React.createContext<{ fast: boolean }>({ fast: false });
export const useMotion = () => useContext(MotionCtx);

/** composition-level scene transitions: when set, Stage skips its own zoom-blur enter/exit,
 *  and `shift` frames of pre-roll are subtracted so scene-local timing stays voice-locked */
export const SceneXCtx = React.createContext<{ managed: boolean; shift: number }>({ managed: false, shift: 0 });
export const useSceneX = () => useContext(SceneXCtx);
