/**
 * Post-processing pipeline (camera simulation):
 *   1. Scene render into an MSAA half-float target with a depth texture.
 *      Optional sub-frame accumulation = true shutter motion blur.
 *   2. Thin-lens depth of field: circle of confusion is proportional to
 *      |1/focus - 1/distance| (diopters), gathered at half resolution
 *      (Gustafsson single-pass bokeh), then composited over the sharp image.
 *   3. Bloom (three's UnrealBloomPass) for specular glints and emissives.
 *   4. Grade: exposure, ACES filmic, lift/gain split-toning, saturation,
 *      vignette, chromatic aberration, deterministic film grain.
 */
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DEPTH_FN = /* glsl */ `
uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uAperture; uniform float uMaxBlur;
float viewDist(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
float coc(float dist){ return clamp(abs(1.0 / uFocus - 1.0 / dist) * uAperture, 0.0, 1.0) * uMaxBlur; }
`;

const DOF_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uTexel;
varying vec2 vUv;
${DEPTH_FN}
const float GOLDEN = 2.39996323;
void main(){
  float cd = viewDist(texture2D(tDepth, vUv).x);
  float cs = coc(cd);
  vec3 col = texture2D(tColor, vUv).rgb;
  float tot = 1.0;
  float spill = 0.0;
  float radius = 1.5;
  float ang = 0.0;
  for (int i = 0; i < 220; i++) {
    if (radius > uMaxBlur) break;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uTexel * radius;
    vec3 sc = texture2D(tColor, tc).rgb;
    float sd = viewDist(texture2D(tDepth, tc).x);
    float ss = coc(sd);
    if (sd > cd) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    col += mix(col / tot, sc, m);
    tot += 1.0;
    if (sd < cd) spill = max(spill, m * ss);
    ang += GOLDEN;
    radius += 4.0 / radius;
  }
  gl_FragColor = vec4(col / tot, max(cs, spill));
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tSharp; uniform sampler2D tBlur; uniform sampler2D tDepth;
varying vec2 vUv;
${DEPTH_FN}
void main(){
  vec3 sharp = texture2D(tSharp, vUv).rgb;
  vec4 b = texture2D(tBlur, vUv);
  float c = max(coc(viewDist(texture2D(tDepth, vUv).x)), b.a);
  float a = smoothstep(0.6, 3.0, c);
  gl_FragColor = vec4(mix(sharp, b.rgb, a), 1.0);
}`;

const ACCUM_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform float uWeight; varying vec2 vUv;
void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * uWeight, 1.0); }`;

const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime;
uniform float uExposure; uniform float uGrain; uniform float uVignette; uniform float uCA;
uniform float uSaturation; uniform float uContrast; uniform vec3 uLift; uniform vec3 uGain; uniform float uFade;
varying vec2 vUv;
vec3 aces(vec3 x){ const float a=2.51; const float b=0.03; const float c=2.43; const float d=0.59; const float e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 dir = vUv - 0.5;
  float ca = uCA * dot(dir, dir) * 4.0;
  vec3 c;
  c.r = texture2D(tDiffuse, vUv - dir * ca).r;
  c.g = texture2D(tDiffuse, vUv).g;
  c.b = texture2D(tDiffuse, vUv + dir * ca).b;
  c = aces(c * uExposure);
  c = pow(c, vec3(1.0 / 2.2));
  c = c * uGain + uLift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = (c - 0.5) * uContrast + 0.5;
  float v = smoothstep(0.95, 0.25, length(dir * vec2(1.0, 0.82)));
  c *= mix(1.0, v, uVignette);
  float g = hash(vUv * uRes + fract(uTime * 13.37) * 100.0) - 0.5;
  float mid = 1.0 - abs(l - 0.45) * 1.4;
  c += g * uGrain * max(mid, 0.25);
  c *= (1.0 - uFade);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export type GradeSettings = {
  exposure?: number;
  grain?: number;
  vignette?: number;
  ca?: number;
  saturation?: number;
  contrast?: number;
  lift?: [number, number, number];
  gain?: [number, number, number];
  fade?: number;
};

export type LensSettings = {
  focus: number; // metres (world units) to focal plane
  aperture: number; // CoC scale in diopter units → 0..1
  maxBlur: number; // max CoC radius in output pixels
};

export type BloomSettings = { strength: number; radius: number; threshold: number };

export class CameraPipeline {
  w: number;
  h: number;
  sceneRT: THREE.WebGLRenderTarget;
  accumRT: THREE.WebGLRenderTarget;
  dofRT: THREE.WebGLRenderTarget;
  compRT: THREE.WebGLRenderTarget;
  accumQuad: FullScreenQuad;
  dofQuad: FullScreenQuad;
  compQuad: FullScreenQuad;
  gradeQuad: FullScreenQuad;
  bloom: UnrealBloomPass;
  dofMat: THREE.ShaderMaterial;
  compMat: THREE.ShaderMaterial;
  gradeMat: THREE.ShaderMaterial;
  accumMat: THREE.ShaderMaterial;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.FloatType;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture,
    });
    this.accumRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    this.dofRT = new THREE.WebGLRenderTarget(Math.round(w / 2), Math.round(h / 2), {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.compRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });

    const lensUniforms = () => ({
      uNear: { value: 0.01 },
      uFar: { value: 100 },
      uFocus: { value: 1 },
      uAperture: { value: 0.1 },
      uMaxBlur: { value: 20 },
    });
    this.accumMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uWeight: { value: 1 } },
      vertexShader: VERT,
      fragmentShader: ACCUM_FRAG,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.dofMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, ...lensUniforms() },
      vertexShader: VERT,
      fragmentShader: DOF_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: { tSharp: { value: null }, tBlur: { value: null }, tDepth: { value: null }, ...lensUniforms() },
      vertexShader: VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.gradeMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uRes: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0 },
        uExposure: { value: 1 },
        uGrain: { value: 0.035 },
        uVignette: { value: 0.55 },
        uCA: { value: 0.0025 },
        uSaturation: { value: 1 },
        uContrast: { value: 1.04 },
        uLift: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uFade: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: GRADE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.accumQuad = new FullScreenQuad(this.accumMat);
    this.dofQuad = new FullScreenQuad(this.dofMat);
    this.compQuad = new FullScreenQuad(this.compMat);
    this.gradeQuad = new FullScreenQuad(this.gradeMat);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.5, 0.6, 0.85);
  }

  setLens(cam: THREE.PerspectiveCamera, lens: LensSettings) {
    for (const m of [this.dofMat, this.compMat]) {
      m.uniforms.uNear.value = cam.near;
      m.uniforms.uFar.value = cam.far;
      m.uniforms.uFocus.value = lens.focus;
      m.uniforms.uAperture.value = lens.aperture;
      m.uniforms.uMaxBlur.value = lens.maxBlur;
    }
  }

  /** Render one sample of the scene into sceneRT (color + depth). */
  renderScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera) {
    gl.setRenderTarget(this.sceneRT);
    gl.clear();
    gl.render(scene, cam);
  }

  accumulate(gl: THREE.WebGLRenderer, weight: number, first: boolean) {
    gl.setRenderTarget(this.accumRT);
    if (first) {
      gl.setClearColor(0x000000, 1);
      gl.clear();
    }
    this.accumMat.uniforms.tSrc.value = this.sceneRT.texture;
    this.accumMat.uniforms.uWeight.value = weight;
    this.accumQuad.render(gl);
  }

  finish(
    gl: THREE.WebGLRenderer,
    opts: { accumulated: boolean; bloom: BloomSettings; grade: GradeSettings; time: number; dof: boolean },
  ) {
    const color = opts.accumulated ? this.accumRT.texture : this.sceneRT.texture;
    // DOF
    if (opts.dof) {
      this.dofMat.uniforms.tColor.value = color;
      this.dofMat.uniforms.tDepth.value = this.sceneRT.depthTexture;
      gl.setRenderTarget(this.dofRT);
      this.dofQuad.render(gl);
      this.compMat.uniforms.tSharp.value = color;
      this.compMat.uniforms.tBlur.value = this.dofRT.texture;
      this.compMat.uniforms.tDepth.value = this.sceneRT.depthTexture;
    } else {
      this.compMat.uniforms.tSharp.value = color;
      this.compMat.uniforms.tBlur.value = color;
      this.compMat.uniforms.tDepth.value = this.sceneRT.depthTexture;
      this.compMat.uniforms.uMaxBlur.value = 0;
    }
    gl.setRenderTarget(this.compRT);
    this.compQuad.render(gl);
    // Bloom (adds onto compRT)
    if (opts.bloom.strength > 0) {
      this.bloom.strength = opts.bloom.strength;
      this.bloom.radius = opts.bloom.radius;
      this.bloom.threshold = opts.bloom.threshold;
      this.bloom.render(gl, this.compRT, this.compRT, 0, false);
    }
    // Grade to screen
    const u = this.gradeMat.uniforms;
    const g = opts.grade;
    u.tDiffuse.value = this.compRT.texture;
    u.uTime.value = opts.time;
    u.uExposure.value = g.exposure ?? 1;
    u.uGrain.value = g.grain ?? 0.035;
    u.uVignette.value = g.vignette ?? 0.55;
    u.uCA.value = g.ca ?? 0.0025;
    u.uSaturation.value = g.saturation ?? 1;
    u.uContrast.value = g.contrast ?? 1.04;
    u.uLift.value.set(...(g.lift ?? [0, 0, 0]));
    u.uGain.value.set(...(g.gain ?? [1, 1, 1]));
    u.uFade.value = g.fade ?? 0;
    gl.setRenderTarget(null);
    this.gradeQuad.render(gl);
  }

  dispose() {
    [this.sceneRT, this.accumRT, this.dofRT, this.compRT].forEach((r) => r.dispose());
    this.bloom.dispose();
  }
}
