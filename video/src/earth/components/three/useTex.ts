import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";

/**
 * Textures are preloaded OUTSIDE the <ThreeCanvas> (which only re-draws when the Remotion
 * frame changes), then read synchronously inside it.
 */
const resolved = new Map<string, THREE.Texture>();
const pending = new Map<string, Promise<THREE.Texture>>();

export const ALL_TEXTURES: { file: string; srgb: boolean }[] = [
  { file: "earth/textures/earth-blue-marble.jpg", srgb: true },
  { file: "earth/textures/earth-night.jpg", srgb: true },
  { file: "earth/textures/earth-water.png", srgb: false },
  { file: "earth/textures/earth-topology.png", srgb: false },
  { file: "earth/textures/clouds-alpha.jpg", srgb: false },
  { file: "earth/textures/night-sky.png", srgb: true },
];

const load = (file: string, srgb: boolean): Promise<THREE.Texture> => {
  if (!pending.has(file)) {
    pending.set(
      file,
      new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
          staticFile(file),
          (t) => {
            t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            t.anisotropy = 8;
            t.wrapS = THREE.RepeatWrapping;
            t.generateMipmaps = true;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            resolved.set(file, t);
            resolve(t);
          },
          undefined,
          reject,
        );
      }),
    );
  }
  return pending.get(file)!;
};

/** Call outside the canvas; returns true once every texture is ready (render is blocked until then). */
export const usePreloadTextures = () => {
  const [ready, setReady] = useState(() => ALL_TEXTURES.every((t) => resolved.has(t.file)));
  const [handle] = useState(() => (ready ? null : delayRender("earth textures")));
  useEffect(() => {
    if (ready) return;
    Promise.all(ALL_TEXTURES.map((t) => load(t.file, t.srgb)))
      .then(() => setReady(true))
      .catch((e) => console.error(e))
      .finally(() => handle !== null && continueRender(handle));
  }, [ready, handle]);
  return ready;
};

export const tex = (file: string): THREE.Texture => {
  const t = resolved.get(file);
  if (!t) throw new Error(`texture not preloaded: ${file}`);
  return t;
};

/** Backwards-compatible helper used inside the canvas (synchronous). */
export const useTextures = (files: { file: string; srgb?: boolean }[]) => files.map((f) => tex(f.file));
