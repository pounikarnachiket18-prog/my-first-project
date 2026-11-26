/**
 * Stage — one 3D "shot". Wraps <ThreeCanvas>, owns the virtual camera and
 * the CameraPipeline. Children animate imperatively through useTick(cb),
 * which lets the pipeline re-evaluate the whole scene at sub-frame times
 * for physically correct shutter motion blur.
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { FPS } from "./anim";
import { CameraPipeline, BloomSettings, GradeSettings } from "./postfx";
import { EnvKind, makeEnvironment } from "./environment";

export type V3 = [number, number, number];

export type Shot = {
  pos: V3;
  target: V3;
  fov: number;
  roll?: number;
  /** Focus distance; defaults to |target - pos|. */
  focus?: number;
  /** Thin-lens strength (diopter scale). 0 disables DOF. */
  aperture?: number;
  maxBlur?: number;
  /** Motion-blur samples per frame (1 = off) and shutter fraction of a frame. */
  samples?: number;
  shutter?: number;
  bloom?: BloomSettings;
  grade?: GradeSettings;
  near?: number;
  far?: number;
};

export type ShotFn = (t: number) => Shot;

type TickFn = (t: number) => void;
const TickCtx = createContext<{ add: (f: TickFn) => () => void } | null>(null);

/** Register an animation callback receiving absolute reel time in seconds. */
export function useTick(fn: TickFn) {
  const ctx = useContext(TickCtx);
  const ref = useRef(fn);
  ref.current = fn;
  // Layout effect: registered synchronously at commit, before the first advance().
  useLayoutEffect(() => {
    if (!ctx) return;
    return ctx.add((t) => ref.current(t));
  }, [ctx]);
}

const tmpV = new THREE.Vector3();

export function applyShot(cam: THREE.PerspectiveCamera, s: Shot, aspect: number) {
  cam.position.set(...s.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(tmpV.set(...s.target));
  if (s.roll) cam.rotateZ(s.roll);
  cam.fov = s.fov;
  cam.aspect = aspect;
  const dist = cam.position.distanceTo(tmpV.set(...s.target));
  cam.near = s.near ?? Math.max(0.0004, dist * 0.02);
  cam.far = s.far ?? Math.max(30, dist * 400);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

/** Project a world point for HTML overlays (labels anchored to 3D objects). */
export function projectPoint(s: Shot, p: V3, width: number, height: number) {
  const cam = new THREE.PerspectiveCamera();
  applyShot(cam, s, width / height);
  const v = new THREE.Vector3(...p).project(cam);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, behind: v.z > 1 };
}

const Pipeline: React.FC<{ shot: ShotFn; timeRef: React.MutableRefObject<number>; ticks: Set<TickFn>; env: EnvKind; bg: string; envIntensity: number }> = ({
  shot,
  timeRef,
  ticks,
  env,
  bg,
  envIntensity,
}) => {
  const { gl, scene, camera, size } = useThree();
  const pipe = useMemo(() => {
    const dpr = gl.getPixelRatio();
    return new CameraPipeline(Math.round(size.width * dpr), Math.round(size.height * dpr));
  }, [gl, size.width, size.height]);

  useMemo(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.NoToneMapping;
    gl.autoClear = true;
    scene.background = new THREE.Color(bg);
    scene.environment = makeEnvironment(gl, env);
    scene.environmentIntensity = envIntensity;
  }, [gl, scene, env, bg, envIntensity]);

  useEffect(() => () => pipe.dispose(), [pipe]);

  useFrame(() => {
    // Light targets that are not in the scene graph never get their world
    // matrix updated by three; refresh them so spot/directional lights aim.
    scene.traverse((o) => {
      const tg = (o as THREE.SpotLight).target as THREE.Object3D | undefined;
      if (tg && !tg.parent) tg.updateMatrixWorld();
    });
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const t0 = timeRef.current;
    const s0 = shot(t0);
    const n = Math.max(1, Math.round(s0.samples ?? 1));
    const shutter = s0.shutter ?? 0.5;
    const runAt = (t: number) => {
      ticks.forEach((f) => f(t));
      applyShot(cam, shot(t), aspect);
    };
    if (n > 1) {
      // Center sample last so its depth drives the DOF.
      const order: number[] = [];
      for (let i = 0; i < n; i++) order.push(i);
      const mid = Math.floor(n / 2);
      order.splice(mid, 1);
      order.push(mid);
      order.forEach((i, k) => {
        const ti = t0 + (((i + 0.5) / n - 0.5) * shutter) / FPS;
        runAt(k === n - 1 ? t0 : ti);
        pipe.renderScene(gl, scene, cam);
        pipe.accumulate(gl, 1 / n, k === 0);
      });
    } else {
      runAt(t0);
      pipe.renderScene(gl, scene, cam);
    }
    const dist = cam.position.distanceTo(tmpV.set(...s0.target));
    const aperture = s0.aperture ?? 0;
    pipe.setLens(cam, { focus: s0.focus ?? dist, aperture, maxBlur: s0.maxBlur ?? 28 });
    pipe.finish(gl, {
      accumulated: n > 1,
      dof: aperture > 0,
      bloom: s0.bloom ?? { strength: 0.35, radius: 0.55, threshold: 0.8 },
      grade: s0.grade ?? {},
      time: t0,
    });
  }, 1);
  return null;
};

export const Stage: React.FC<{
  /** Absolute reel frame where this Sequence starts (so ticks get reel time). */
  from: number;
  shot: ShotFn;
  env?: EnvKind;
  bg?: string;
  /** Image-based-lighting strength (low for night scenes). */
  envIntensity?: number;
  /** Canvas size override (e.g. 540 for a split-screen half). */
  width?: number;
  height?: number;
  children: React.ReactNode;
}> = ({ from, shot, env = "night", bg = "#000000", envIntensity = 1, width: wProp, height: hProp, children }) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const width = wProp ?? vc.width;
  const height = hProp ?? vc.height;
  const timeRef = useRef(0);
  timeRef.current = (frame + from) / FPS;
  const ticks = useMemo(() => new Set<TickFn>(), []);
  const ctx = useMemo(
    () => ({
      add: (f: TickFn) => {
        ticks.add(f);
        return () => ticks.delete(f);
      },
    }),
    [ticks],
  );
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }} dpr={1}>
      <TickCtx.Provider value={ctx}>
        {children}
        <Pipeline shot={shot} timeRef={timeRef} ticks={ticks} env={env} bg={bg} envIntensity={envIntensity} />
      </TickCtx.Provider>
    </ThreeCanvas>
  );
};
