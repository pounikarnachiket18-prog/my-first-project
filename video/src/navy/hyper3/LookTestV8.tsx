import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GLView, GLState, Vec3 } from "./GLView";
import { Sprite, RealismCtx, MarkingsCtx } from "./Sprite";
import { SUN } from "./scenes_h3";

const base = (cam: GLState["cam"], vel: Vec3, extra: Partial<GLState> = {}): GLState =>
  ({ t: 4.2, cam, exposure: 0.8, day: true, hideObjects: true, moonDir: SUN, mountains: 1.3, mist: 0.7, ice: 1, vel, shutter: 1 / 24, ...extra });

export const LookTestV8: React.FC = () => {
  const k = useCurrentFrame();
  let s: GLState, sprites: React.ReactNode;
  if (k === 0) {
    // reference #10 shot: missile broadside, camera low beside it, terrain streaking
    const c: Vec3 = [0, 6, 0];
    const cam = { pos: [-1.5, 5.2, -11] as Vec3, target: [-1.0, 6.3, 0] as Vec3, fov: 0.62 };
    s = base(cam, [900, 0, 0], { m0: { on: true, nose: [3.1, 6, 0], dir: [1, 0, 0], len: 6.2, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 120, width: 0.5, pink: false, opacity: 0.7 } } });
    sprites = <Sprite cam={cam} model="missile_cool" center={c} dir={[1, 0, 0]} length={6.2} />;
  } else if (k === 1) {
    // three-quarter front, missile overflowing the frame
    const c: Vec3 = [0, 5, 0];
    const cam = { pos: [-7, 5.6, 5.5] as Vec3, target: [0, 5.2, 0] as Vec3, fov: 0.62 };
    s = base(cam, [0, 0, 1500], { m0: { on: true, nose: [0, 5, 2.9], dir: [0, 0, 1], len: 5.8, radius: 0.35, plasma: 0.8, glide: true, burn: 0, trail: { len: 200, width: 0.3, pink: true, opacity: 0.5 } } });
    sprites = <Sprite cam={cam} model="missile" center={c} dir={[0, 0, 1]} length={5.8} glow="rgba(255,61,154,0.45)" />;
  } else if (k === 2) {
    // missile pulling away toward the mountains
    const c: Vec3 = [0, 7, 60];
    const cam = { pos: [-3, 6, -4] as Vec3, target: [0, 7, 60] as Vec3, fov: 0.6 };
    s = base(cam, [0, 0, 300], { m0: { on: true, nose: [0, 7, 63], dir: [0, 0, 1], len: 6.2, radius: 0.3, plasma: 0, glide: false, burn: 1, trail: { len: 60, width: 0.6, pink: false, opacity: 0.8 } } });
    sprites = <Sprite cam={cam} model="missile_cool" center={c} dir={[0, 0, 1]} length={6.2} />;
  } else {
    // the ship in an open-water lead in the ice
    const cam = { pos: [-300, 30, -260] as Vec3, target: [0, 12, 0] as Vec3, fov: 0.42 };
    s = base(cam, [20, 0, 20], { ship: { pos: [0, 0, 0], yaw: 0, damage: 0, fire: 0, sink: 0 } });
    sprites = <Sprite cam={cam} model="ship" center={[0, 0, 0]} dir={[1, 0, -0.3]} length={150} waterline />;
  }
  return (
    <RealismCtx.Provider value={true}>
      <MarkingsCtx.Provider value={true}>
        <AbsoluteFill>
          <GLView s={s} scale={0.75} />
          {sprites}
          <GLView s={s} scale={0.75} layer="fx" />
        </AbsoluteFill>
      </MarkingsCtx.Provider>
    </RealismCtx.Provider>
  );
};
