import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { VERT, FRAG } from "./shader";

export type Vec3 = [number, number, number];
export type Missile = { on: boolean; nose: Vec3; dir: Vec3; len: number; radius: number; plasma: number; glide: boolean; burn: number; trail?: { len: number; width: number; pink: boolean; opacity: number } };
export type GLState = {
  t: number;
  cam: { pos: Vec3; target: Vec3; fov: number; roll?: number };
  exposure?: number;
  moonDir?: Vec3;
  m0?: Missile; m1?: Missile;
  jet?: { pos: Vec3; dir: Vec3; scale: number };
  ship?: { pos: Vec3; yaw: number; damage: number; fire: number; sink: number };
  boom?: { amt: number; mach: number; phase?: number };
  ex0?: { pos: Vec3; age: number; size: number };
  ex1?: { pos: Vec3; age: number; size: number };
  flash?: number;
  seaAmp?: number;
  day?: boolean;
  hideObjects?: boolean;
  vel?: Vec3;          // camera velocity m/s (motion blur)
  shutter?: number;    // seconds
  mountains?: number;
  mist?: number;
  ice?: number;
};

const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const MOON: Vec3 = norm([0.35, 0.16, 1]);

/** same camera model as the shader -> screen pixels (for HTML labels); null if behind camera */
export const projectGL = (cam: GLState["cam"], p: Vec3, W = 1080, H = 1920): [number, number] | null => {
  const fw = norm([cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]]);
  const rt = norm([fw[2], 0, -fw[0]]); // cross(worldUp, fw): +x is screen right looking down +z
  const up: Vec3 = [fw[1] * rt[2] - fw[2] * rt[1], fw[2] * rt[0] - fw[0] * rt[2], fw[0] * rt[1] - fw[1] * rt[0]]; // cross(fw, rt)
  const r = cam.roll ?? 0, cr = Math.cos(r), sr = Math.sin(r);
  const r2: Vec3 = [rt[0] * cr + up[0] * sr, rt[1] * cr + up[1] * sr, rt[2] * cr + up[2] * sr];
  const u2: Vec3 = [up[0] * cr - rt[0] * sr, up[1] * cr - rt[1] * sr, up[2] * cr - rt[2] * sr];
  const d: Vec3 = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
  const z = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2];
  if (z <= 0.01) return null;
  const fl = (1 / Math.tan(cam.fov / 2)) * 0.5;
  const x = (d[0] * r2[0] + d[1] * r2[1] + d[2] * r2[2]) / z * fl;
  const y = (d[0] * u2[0] + d[1] * u2[1] + d[2] * u2[2]) / z * fl;
  return [W / 2 + x * H, H / 2 - y * H];
};

/** pixels per metre at world point p (for drawing world-sized rings in overlays) */
export const pxPerMetre = (cam: GLState["cam"], p: Vec3, H = 1920) => {
  const fw = norm([cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]]);
  const z = (p[0] - cam.pos[0]) * fw[0] + (p[1] - cam.pos[1]) * fw[1] + (p[2] - cam.pos[2]) * fw[2];
  return z > 0.01 ? ((1 / Math.tan(cam.fov / 2)) * 0.5 * H) / z : 0;
};

const OFF: Missile = { on: false, nose: [0, 0, 0], dir: [0, 0, 1], len: 1, radius: 0.1, plasma: 0, glide: false, burn: 0 };

/** full-frame WebGL view; scale < 1 renders at reduced internal resolution (upscaled by the browser) */
export const GLView: React.FC<{ s: GLState; scale?: number; layer?: "bg" | "fx" }> = ({ s, scale = 1, layer = "bg" }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<{ gl: WebGLRenderingContext; prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null> } | null>(null);
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const W = Math.round(width * scale), H = Math.round(height * scale);

  useLayoutEffect(() => {
    const cv = ref.current!;
    if (!glRef.current) {
      const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: layer === "fx", premultipliedAlpha: true })!;
      const mk = (type: number, src: string) => {
        const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(sh));
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const names = ["uRes", "uTime", "uCamPos", "uCamTarget", "uFov", "uRoll", "uExposure", "uMoonDir", "uM0a", "uM0b", "uM0c", "uM1a", "uM1b", "uM1c", "uTrail0", "uTrail1", "uJet", "uJetD", "uShip", "uShipX", "uBoom", "uEx0", "uEx0b", "uEx1", "uEx1b", "uFlash", "uSeaAmp", "uWake", "uDay", "uLayer", "uHideObj", "uVel", "uShutter", "uMountains", "uMist", "uIce"];
      const loc: Record<string, WebGLUniformLocation | null> = {};
      names.forEach((n) => (loc[n] = gl.getUniformLocation(prog, n)));
      glRef.current = { gl, prog, loc };
    }
    const { gl, loc } = glRef.current;
    gl.viewport(0, 0, W, H);
    const u2 = (n: string, a: number, b: number) => gl.uniform2f(loc[n], a, b);
    const u3 = (n: string, v: Vec3) => gl.uniform3f(loc[n], v[0], v[1], v[2]);
    const u4 = (n: string, a: number, b: number, c: number, d: number) => gl.uniform4f(loc[n], a, b, c, d);
    const u1 = (n: string, a: number) => gl.uniform1f(loc[n], a);
    u2("uRes", W, H); u1("uTime", s.t);
    u3("uCamPos", s.cam.pos); u3("uCamTarget", s.cam.target); u1("uFov", s.cam.fov); u1("uRoll", s.cam.roll ?? 0);
    u1("uExposure", s.exposure ?? 1); u3("uMoonDir", norm(s.moonDir ?? MOON));
    const mis = (k: "0" | "1", m?: Missile) => {
      const x = m ?? OFF;
      u4(`uM${k}a`, x.nose[0], x.nose[1], x.nose[2], x.on ? 1 : 0);
      u4(`uM${k}b`, x.dir[0], x.dir[1], x.dir[2], x.len);
      u4(`uM${k}c`, x.radius, x.plasma, x.glide ? 1 : 0, x.burn);
      const tr = x.trail;
      u4(`uTrail${k}`, tr && x.on ? tr.len : 0, tr?.width ?? 0, tr?.pink ? 1 : 0, tr?.opacity ?? 0);
    };
    mis("0", s.m0); mis("1", s.m1);
    const j = s.jet;
    u4("uJet", j?.pos[0] ?? 0, j?.pos[1] ?? 0, j?.pos[2] ?? 0, j ? 1 : 0);
    u4("uJetD", j?.dir[0] ?? 0, j?.dir[1] ?? 0, j?.dir[2] ?? 1, j?.scale ?? 1);
    const sh = s.ship;
    u4("uShip", sh?.pos[0] ?? 0, sh?.pos[1] ?? 0, sh?.pos[2] ?? 0, sh ? 1 : 0);
    u4("uShipX", sh?.yaw ?? 0, sh?.damage ?? 0, sh?.fire ?? 0, sh?.sink ?? 0);
    u4("uBoom", s.boom?.amt ?? 0, s.boom?.mach ?? 2, s.boom?.phase ?? 0, 0);
    const ex = (k: "0" | "1", e?: { pos: Vec3; age: number; size: number }) => {
      u4(`uEx${k}`, e?.pos[0] ?? 0, e?.pos[1] ?? 0, e?.pos[2] ?? 0, e ? e.age : -1);
      u4(`uEx${k}b`, e?.size ?? 1, 0, 0, 0);
    };
    ex("0", s.ex0); ex("1", s.ex1);
    u1("uFlash", layer === "fx" ? 0 : s.flash ?? 0); u1("uSeaAmp", s.seaAmp ?? 1); u1("uWake", 0);
    u3("uVel", s.vel ?? [0, 0, 0]); u1("uShutter", s.shutter ?? 1 / 60); u1("uMountains", s.mountains ?? 0); u1("uMist", s.mist ?? 0); u1("uIce", s.ice ?? 0);
    u1("uDay", s.day ? 1 : 0); u1("uLayer", layer === "fx" ? 1 : 0); u1("uHideObj", s.hideObjects ? 1 : 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  });
  void frame;
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
