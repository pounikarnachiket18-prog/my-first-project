/**
 * SCENE 6 — BRAND ENDING (33–35 s). Clean black stage, extruded 3D
 * "JUST KNOW IT" wordmark (Inter Tight Black, bevelled, brushed metal),
 * letters rise out of depth with a stagger while a light sweeps across.
 */
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Stage, Shot, useTick } from "../core/Stage";
import { cine, clamp, lerp, smoothstep, SC, FPS } from "../core/anim";

const T0 = SC.brand.from / FPS; // 33

export const brandShot = (t: number): Shot => {
  const u = cine(clamp((t - T0) / 2));
  return {
    pos: [lerp(-1.2, 0.6, u), lerp(0.6, 0.2, u), lerp(30, 27, u)],
    target: [0, 0, 0],
    fov: 30,
    aperture: 0,
    grade: { exposure: 1.1, lift: [0, 0, 0], saturation: 1, contrast: 1.06, vignette: 0.5, grain: 0.03, fade: 0 },
    bloom: { strength: 0.45, radius: 0.5, threshold: 0.85 },
  };
};

const useBrandFont = () => {
  const [font, setFont] = useState<Font | null>(null);
  const [h] = useState(() => delayRender("Loading 3D typeface"));
  useEffect(() => {
    fetch(staticFile("jki/fonts/InterTight-Black.typeface.json"))
      .then((r) => r.json())
      .then((j) => {
        setFont(new FontLoader().parse(j));
        continueRender(h);
      })
      .catch((e) => {
        console.error(e);
        continueRender(h);
      });
  }, [h]);
  return font;
};

const Wordmark: React.FC<{ font: Font }> = ({ font }) => {
  const built = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({ color: "#e9edf2", metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    const accent = new THREE.MeshPhysicalMaterial({ color: "#7ff3ff", metalness: 0.3, roughness: 0.25, emissive: new THREE.Color("#3fd8ff"), emissiveIntensity: 0.8 });
    const group = new THREE.Group();
    const letters: { m: THREE.Mesh; i: number; x: number }[] = [];
    const text = "JUST KNOW IT.";
    const size = 1.05;
    let x = 0;
    let i = 0;
    for (const ch of text) {
      const glyph = (font.data as any).glyphs[ch];
      const adv = ((glyph?.ha ?? 300) / 1000) * size;
      if (ch !== " ") {
        const geo = new TextGeometry(ch, { font, size, depth: 0.32, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 4 });
        const m = new THREE.Mesh(geo, ch === "." ? accent : mat);
        m.position.x = x;
        group.add(m);
        letters.push({ m, i: i++, x });
      }
      x += adv * 1.02;
    }
    group.position.x = -x / 2;
    group.position.y = -size * 0.36;
    return { group, letters };
  }, [font]);
  useTick((t) => {
    built.letters.forEach(({ m, i }) => {
      const a = cine(clamp((t - T0 - 0.05 - i * 0.035) / 0.55));
      m.position.z = lerp(-6, 0, a);
      m.position.y = lerp(-0.6, 0, a);
      m.rotation.x = lerp(-0.9, 0, a);
      (m.material as THREE.Material).opacity = 1;
      m.visible = a > 0.001;
    });
  });
  return <primitive object={built.group} />;
};

const Sweep: React.FC = () => {
  const l = useMemo(() => new THREE.PointLight("#ffffff", 0, 14, 1.6), []);
  useTick((t) => {
    const u = clamp((t - T0 - 0.4) / 1.2);
    l.position.set(lerp(-9, 9, u), 1.6, 2.4);
    l.intensity = 30 * Math.sin(Math.PI * u);
  });
  return <primitive object={l} />;
};

export const BrandScene: React.FC = () => {
  const font = useBrandFont();
  return (
    <Stage from={SC.brand.from} shot={brandShot} env="studio" bg="#000000" envIntensity={0.9}>
      <directionalLight position={[3, 5, 8]} intensity={2.6} />
      <directionalLight position={[-6, -2, -4]} intensity={2} color="#3fd8ff" />
      <Sweep />
      {font ? <Wordmark font={font} /> : null}
    </Stage>
  );
};
