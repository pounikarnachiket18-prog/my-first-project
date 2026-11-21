import React, { useLayoutEffect } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLOR, V3 } from "../theme";

export type CamSpec = { position: V3; target: V3; fov: number };

/** Positions the default R3F camera every frame (driven by props, never by useFrame). */
export const CameraRig: React.FC<CamSpec> = ({ position, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
};

/** Project a world point to pixel coordinates for a given camera, so HTML overlays can track 3D objects. */
export const project = (p: V3, cam: CamSpec, width: number, height: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.05, 1000);
  c.position.set(...cam.position);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
};

/** Full-frame 3D canvas. Put HTML overlays as siblings after it. */
export const Stage: React.FC<{
  cam: CamSpec;
  background?: string;
  fog?: [number, number];
  children: React.ReactNode;
}> = ({ cam, background = COLOR.sky, fog, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <ThreeCanvas
        width={width}
        height={height}
        flat
        shadows
        camera={{ fov: cam.fov, near: 0.05, far: 900, position: cam.position }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[background]} />
        {fog ? <fog attach="fog" args={[background, fog[0], fog[1]]} /> : null}
        <CameraRig {...cam} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
