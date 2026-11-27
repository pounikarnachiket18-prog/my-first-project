// GLSL for the photoreal Earth. All lighting is done in linear space, ACES tone-mapped,
// then encoded to sRGB by hand (ShaderMaterial output is written raw).

export const common = /* glsl */ `
float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0., 1.); return t*t*(3. - 2.*t); }
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308,c)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
`;

export const surfaceVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vEast; varying vec3 vNorth;
void main(){
  vUv = uv;
  vec3 p = normalize(position);
  vec3 east = normalize(cross(vec3(0.,1.,0.), p) + vec3(1e-5));
  vec3 north = cross(p, east);
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * p); vEast = normalize(m * east); vNorth = normalize(m * north);
  vec4 wp = modelMatrix * vec4(position, 1.);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const surfaceFrag = /* glsl */ `
uniform sampler2D dayTex, nightTex, waterTex, topoTex, cloudTex;
uniform vec3 sunDir; uniform float sunI, exposure, nightStrength, heat, frost, cloudU, cloudAmt, bumpK, saturation;
uniform vec3 tint;
varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vEast; varying vec3 vNorth;
${common}
void main(){
  vec3 Ng = normalize(vN);
  vec3 L = normalize(sunDir);
  vec3 V = normalize(cameraPosition - vPos);
  // bump from topology
  vec2 du = vec2(1./2048., 0.), dv = vec2(0., 1./1024.);
  float hx = texture2D(topoTex, vUv+du).r - texture2D(topoTex, vUv-du).r;
  float hy = texture2D(topoTex, vUv+dv).r - texture2D(topoTex, vUv-dv).r;
  vec3 Nb = normalize(Ng - bumpK*(hx*vEast + hy*vNorth));
  float dNL = dot(Ng, L);
  float lit = ss(-0.10, 0.22, dNL);
  float diff = max(dot(Nb, L), 0.) * ss(-0.12, 0.08, dNL);
  vec3 day = texture2D(dayTex, vUv).rgb;
  float lum = dot(day, vec3(.2126,.7152,.0722));
  day = max(mix(vec3(lum), day, saturation), 0.);
  float water = texture2D(waterTex, vUv).r;
  vec3 night = texture2D(nightTex, vUv).rgb;
  // cloud shadow: clouds sit slightly sun-ward
  vec2 cuv = vUv + vec2(cloudU, 0.);
  float cs = texture2D(cloudTex, cuv + vec2(0.0015, 0.0008)).r * cloudAmt;
  vec3 sunCol = vec3(1.0, 0.96, 0.9) * sunI;
  vec3 col = day * diff * sunCol * (1. - 0.5*cs);
  // ocean: glint + fresnel sky reflection
  vec3 H = normalize(L + V);
  float nh = max(dot(Ng, H), 0.);
  float fres = pow(1. - max(dot(Ng, V), 0.), 5.);
  col += water * (1.-cs) * lit * sunCol * (pow(nh, 1400.)*0.55 + pow(nh, 160.)*0.06 + pow(nh, 18.)*0.01);
  col += water * fres * vec3(0.10,0.22,0.5) * lit * 0.6;
  // aerial perspective / limb haze
  float limb = pow(1. - max(dot(Ng, V), 0.), 2.6);
  col = mix(col, vec3(0.22,0.48,1.0) * sunI * 0.5 * (0.3 + 0.7*diff), clamp(limb*0.7 + 0.04, 0., 1.) * lit);
  // terminator warmth
  float term = ss(-0.10, 0.0, dNL) * ss(0.16, 0.0, dNL);
  col += vec3(1.0, 0.38, 0.12) * term * 0.012 * sunI;
  // city lights on the night side
  float dark = ss(0.06, -0.22, dNL);
  float cityI = ss(0.05, 0.55, night.r);
  col += cityI * vec3(1.0, 0.68, 0.36) * 1.4 * dark * nightStrength * (1. - 0.7*cs);
  // "year-long day" variants: scorched day side, frozen night side
  col = mix(col, col * vec3(1.55, 0.82, 0.5) + vec3(0.05, 0.012, 0.0) * sunI, heat * lit);
  float ice = (0.35 + 0.65 * (1. - water)) * fbm(vUv * vec2(80., 40.));
  col += vec3(0.035, 0.07, 0.14) * frost * dark * (0.2 + ice);
  col += day * 0.004;
  col *= tint;
  gl_FragColor = vec4(toSRGB(aces(col * exposure)), 1.);
}`;

export const cloudFrag = /* glsl */ `
uniform sampler2D cloudTex; uniform vec3 sunDir; uniform float sunI, exposure, cloudAmt, storm, time, dark;
uniform vec3 tint;
varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vEast; varying vec3 vNorth;
${common}
void main(){
  vec3 Ng = normalize(vN); vec3 L = normalize(sunDir); vec3 V = normalize(cameraPosition - vPos);
  vec2 uv = vUv;
  if (storm > 0.) {
    float n = fbm(uv * vec2(24., 12.) + vec2(time*0.25, 0.));
    uv.x += storm * (0.012*sin(uv.y*90. + time*1.5) + 0.02*(n-.5));
    uv.y += storm * 0.006 * (fbm(uv*vec2(30.,15.) - time*0.2) - .5);
  }
  float c = texture2D(cloudTex, uv).r;
  if (storm > 0.) {
    float extra = ss(0.42, 0.78, fbm(uv * vec2(18., 9.) + vec2(time*0.35, 0.)));
    float streak = ss(0.5, 0.9, fbm(vec2(uv.x*6., uv.y*160.) + vec2(time*0.6, 0.)));
    c = clamp(c + storm * (0.75*extra + 0.35*streak), 0., 1.);
  }
  c = ss(0.06, 0.85, c) * cloudAmt;
  float dNL = dot(Ng, L);
  float diff = ss(-0.15, 0.6, dNL);
  vec3 sunCol = vec3(1.0, 0.97, 0.92) * sunI;
  vec3 base = mix(vec3(0.95), vec3(0.62, 0.64, 0.68), storm*0.6);
  vec3 col = base * diff * sunCol;
  float term = ss(-0.12, 0.0, dNL) * ss(0.18, 0.0, dNL);
  col = mix(col, vec3(1.0, 0.5, 0.25) * sunI * 0.5, term * 0.45);
  float limb = pow(1. - max(dot(Ng, V), 0.), 3.0);
  col = mix(col, vec3(0.45,0.65,1.0) * sunI * 0.6, limb * 0.5 * diff);
  col *= tint;
  gl_FragColor = vec4(toSRGB(aces(col * exposure)), c * (1. - dark*ss(0.1,-0.3,dNL)*0.0));
}`;

export const atmoVert = /* glsl */ `
varying vec3 vPos;
void main(){ vec4 wp = modelMatrix * vec4(position,1.); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

// Limb glow from the ray's closest approach to the planet centre (exponential density falloff),
// sun-side only, warm at the terminator, plus forward (Mie-like) scattering toward the sun.
export const atmoFrag = /* glsl */ `
uniform vec3 center, sunDir; uniform float Re, Ra, sunI, exposure, strength, mie; uniform vec3 tint;
varying vec3 vPos;
${common}
void main(){
  vec3 ro = cameraPosition; vec3 D = normalize(vPos - ro);
  vec3 oc = center - ro; float t = dot(oc, D); vec3 P = ro + D*t;
  float h = length(P - center);
  if (h < Re) discard;
  float x = clamp((h - Re) / (Ra - Re), 0., 1.);
  float dens = exp(-x * 5.5) * (1. - x);
  vec3 n = normalize(P - center); vec3 L = normalize(sunDir);
  float s = dot(n, L);
  float lit = ss(-0.32, 0.35, s);
  float term = ss(-0.35, -0.02, s) * ss(0.45, 0.0, s);
  vec3 ray = vec3(0.22, 0.48, 1.0);
  vec3 col = mix(ray, vec3(1.0, 0.45, 0.18), term*0.85) * dens * (lit + term*0.6);
  float fwd = pow(max(dot(D, L), 0.), 10.) * mie;
  col += vec3(1.0, 0.75, 0.45) * fwd * dens * 3.0;
  col *= strength * sunI * tint;
  gl_FragColor = vec4(toSRGB(aces(col * exposure)), 1.);
}`;

export const starFrag = /* glsl */ `
uniform sampler2D skyTex; uniform float brightness; varying vec2 vUv;
${common}
void main(){ vec3 c = texture2D(skyTex, vUv*vec2(2.,1.)).rgb; gl_FragColor = vec4(c*brightness, 1.); }`;

export const basicVert = /* glsl */ `
varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

export const sunFrag = /* glsl */ `
uniform float intensity, time; uniform vec3 color; varying vec2 vUv;
${common}
void main(){
  vec2 p = vUv*2.-1.; float r = length(p);
  float a = atan(p.y, p.x);
  float core = ss(0.075, 0.06, r);
  float glow = exp(-r*7.0)*1.2 + exp(-r*2.6)*0.35 + exp(-r*18.)*2.0;
  float rays = pow(max(0., fbm(vec2(a*6.0, time*0.2))-0.35), 2.0) * exp(-r*3.5) * 1.2;
  vec3 c = color * (glow + rays) + vec3(1.)*core*3.;
  c *= intensity * ss(1.0, 0.7, r);
  gl_FragColor = vec4(toSRGB(aces(c)), 1.);
}`;
