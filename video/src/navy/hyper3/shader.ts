// Cinematic night-ocean renderer (raw WebGL fragment shader, no external 3D libs).
// World: metres, y up, sea surface at y = 0. Objects are signed-distance fields, raymarched only
// inside their bounding spheres; the ocean is a ray/plane hit with analytic wave normals.

export const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos, uCamTarget;
uniform float uFov, uRoll, uExposure;
uniform vec3 uMoonDir;
// missiles: a = nose position + on, b = direction + length, c = radius, plasma, type(0 cruise/1 glide), burn
uniform vec4 uM0a, uM0b, uM0c, uM1a, uM1b, uM1c;
uniform vec4 uTrail0, uTrail1;     // trail length, width, glowColorMode(0 white/1 pink), opacity
uniform vec4 uJet, uJetD;          // pos + on ; dir + scale
uniform vec4 uShip, uShipX;        // pos + on ; yaw, damage, fire, sink
uniform vec4 uBoom;                // shock (vapour) cone on missile 0: amount, mach, 0, 0
uniform vec4 uEx0, uEx0b, uEx1, uEx1b; // explosion pos + age(s) ; size, 0,0,0
uniform float uFlash, uSeaAmp, uWake;
uniform vec3 uVel;        // camera velocity (m/s) for motion blur of the sea + mist
uniform float uShutter, uMountains, uMist, uIce; // uIce: frozen-sea surface (reference look)
uniform float uDay, uLayer, uHideObj; // day look ; 0 = background layer, 1 = effects layer (transparent) ; skip SDF objects (sprites used)

#define PI 3.14159265

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float noise3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float n000 = hash3(i), n100 = hash3(i+vec3(1,0,0)), n010 = hash3(i+vec3(0,1,0)), n110 = hash3(i+vec3(1,1,0));
  float n001 = hash3(i+vec3(0,0,1)), n101 = hash3(i+vec3(1,0,1)), n011 = hash3(i+vec3(0,1,1)), n111 = hash3(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * noise3(p); p *= 2.03; a *= 0.5; } return s; }

// ---------------- ocean ----------------
// slope (dh/dx, dh/dz) of a sum of directional waves; detail fades with distance to avoid shimmer
vec2 waveSlope(vec2 x, float t, float dist){
  vec2 g = vec2(0.0);
  float amp = 0.34 * uSeaAmp, freq = 0.30, sp = 1.3;
  for (int i = 0; i < 9; i++){
    float fi = float(i);
    float ang = fi * 1.7 + 0.4;
    vec2 d = vec2(cos(ang), sin(ang));
    float k = freq;
    float ph = dot(d, x) * k + t * sp * sqrt(k * 9.8) * 0.35 + fi * 2.1;
    float fade = exp(-dist * k * 0.018);
    g += d * amp * k * cos(ph) * fade;
    amp *= 0.62; freq *= 1.72;
  }
  // fine chop
  float fade2 = exp(-dist * 0.02);
  vec2 q = x * 2.3 + vec2(t * 0.6, -t * 0.4);
  float n0 = noise(q), nx = noise(q + vec2(0.05, 0.0)), nz = noise(q + vec2(0.0, 0.05));
  g += vec2(nx - n0, nz - n0) / 0.05 * 0.035 * fade2 * uSeaAmp;
  return g;
}

// ---------------- sky ----------------
float fbm2(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.07 + vec2(1.7, 9.2); a *= 0.5; } return s; }
vec3 skyDay(vec3 rd){
  float h = max(rd.y, 0.0);
  vec3 zen = vec3(0.02, 0.13, 0.48), hor = vec3(0.30, 0.52, 0.82);
  vec3 c = mix(hor, zen, pow(h, 0.55));
  float sd = max(dot(rd, uMoonDir), 0.0);
  c += vec3(1.0, 0.92, 0.75) * pow(sd, 8.0) * 0.35 + vec3(1.0, 0.95, 0.85) * pow(sd, 300.0) * 1.2;
  c += vec3(3.0, 2.9, 2.6) * smoothstep(0.99955, 0.99975, sd);
  // clouds on a high layer, drifting
  if (rd.y > 0.0){
    float tc = 1800.0 / max(rd.y, 0.02);
    vec2 cp = rd.xz * tc * 0.00055 + vec2(uTime * 0.012, uTime * 0.004);
    float n = fbm2(cp);
    float cov = smoothstep(0.48, 0.78, n) * smoothstep(0.0, 0.12, rd.y);
    vec3 cc = mix(vec3(0.78, 0.82, 0.88), vec3(1.0), smoothstep(0.5, 0.9, n)) + vec3(1.0, 0.95, 0.85) * pow(sd, 6.0) * 0.4;
    c = mix(c, cc, cov * 0.92);
  }
  // low haze
  c = mix(c, vec3(0.62, 0.76, 0.92), exp(-abs(rd.y) * 40.0) * 0.35);
  // snowy mountain ranges on the horizon (far away: no parallax)
  if (uMountains > 0.0 && rd.y > -0.002){
    float az = atan(rd.z, rd.x);
    float range = smoothstep(0.30, 0.62, noise(vec2(az * 2.2 + 3.0, 1.7)));
    float ridge = uMountains * range * (0.01 + 0.07 * pow(fbm2(vec2(az * 9.0, 0.5)), 1.5) + 0.012 * fbm2(vec2(az * 45.0, 2.0)));
    if (rd.y < ridge){
      float hh = clamp(rd.y / max(ridge, 1e-4), 0.0, 1.0);
      vec2 mp = vec2(az * 38.0, rd.y * 160.0);
      float n1 = fbm2(mp), n2 = fbm2(mp * 2.7 + 5.0);
      float snowLine = 0.35 + 0.25 * n1;
      float rock = smoothstep(snowLine - 0.08, snowLine + 0.08, 1.0 - hh + (n2 - 0.5) * 0.6);
      float lit = 0.55 + 0.45 * smoothstep(0.35, 0.65, fbm2(vec2(az * 70.0, rd.y * 60.0)));   // sunlit vs shaded slopes
      vec3 snow = mix(vec3(0.62, 0.72, 0.86), vec3(1.0, 1.0, 1.0), lit);
      vec3 stone = mix(vec3(0.10, 0.13, 0.18), vec3(0.28, 0.32, 0.38), lit);
      vec3 m = mix(snow, stone, rock * 0.9);
      m = mix(m, vec3(0.58, 0.70, 0.86), 0.18 + 0.3 * (1.0 - range));   // light aerial haze
      c = mix(c, m, smoothstep(0.0, 0.004, ridge - rd.y));
    }
  }
  return c;
}
// ---------------- frozen sea (reference look) ----------------
vec2 hash22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// distance to the nearest crack (Voronoi F2-F1) in metres-ish units
float cracks(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    float d = length(g + o - f);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
vec3 iceColor(vec2 xz, float dist){
  // dark glossy blue ice, big wind-streaked snow drifts, sparse irregular cracks
  float plate = fbm2(xz * 0.003 + 7.0);
  vec3 c = mix(vec3(0.010, 0.040, 0.085), vec3(0.04, 0.12, 0.21), smoothstep(0.3, 0.8, plate));
  vec2 fd = length(uVel.xz) > 1.0 ? normalize(uVel.xz) : vec2(0.8, 0.6);
  vec2 sw = vec2(dot(xz, fd) * 0.0045, dot(xz, vec2(-fd.y, fd.x)) * 0.035);   // drifts streak along the flight line
  float drift = smoothstep(0.44, 0.6, fbm2(sw)) + smoothstep(0.5, 0.64, fbm2(sw * 2.7 + 2.0)) * 0.35;
  c = mix(c, vec3(0.92, 0.95, 1.0), clamp(drift, 0.0, 1.0));
  float show = smoothstep(0.5, 0.7, noise(xz * 0.004 + 3.0));          // cracks only in some areas
  float cr = 1.0 - smoothstep(0.0, 0.02, cracks(xz * 0.009 + vec2(noise(xz * 0.02) * 0.6)));
  c = mix(c, vec3(0.75, 0.85, 0.95), cr * show * 0.7 * exp(-dist * 0.003));
  return c;
}

vec3 sky(vec3 rd){
  if (uDay > 0.5) return skyDay(rd);
  float h = max(rd.y, 0.0);
  vec3 zen = vec3(0.003, 0.005, 0.013), hor = vec3(0.022, 0.034, 0.060);
  vec3 c = mix(hor, zen, pow(h, 0.45));
  float md = dot(rd, uMoonDir);
  c += vec3(0.55, 0.62, 0.80) * pow(max(md, 0.0), 400.0) * 0.45;   // halo
  c += vec3(0.30, 0.36, 0.52) * pow(max(md, 0.0), 30.0) * 0.06;   // wide glow
  c += vec3(1.6, 1.62, 1.7) * smoothstep(0.99990, 0.99994, md) * 3.0; // disc
  // stars
  vec3 sd = rd * 420.0; vec3 cell = floor(sd);
  float st = hash3(cell);
  if (st > 0.9965 && rd.y > 0.03){ float tw = 0.6 + 0.4 * sin(uTime * 3.0 + st * 100.0); c += vec3(0.8, 0.85, 1.0) * tw * smoothstep(0.42, 0.0, length(fract(sd) - 0.5)) * 0.9; }
  // horizon haze band
  c += vec3(0.05, 0.07, 0.11) * exp(-abs(rd.y) * 40.0) * 0.35;
  return c;
}

// ---------------- SDF helpers ----------------
mat3 basis(vec3 f){ f = normalize(f); vec3 up = abs(f.y) > 0.98 ? vec3(1,0,0) : vec3(0,1,0);
  vec3 r = normalize(cross(up, f)); vec3 u = cross(f, r); return mat3(r, u, f); }
vec3 toLocal(vec3 p, vec3 o, mat3 B){ vec3 q = p - o; return vec3(dot(q, B[0]), dot(q, B[1]), dot(q, B[2])); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCapsuleZ(vec3 p, float a, float b, float r){ p.z -= clamp(p.z, a, b); return length(p) - r; }

// missile in local frame: nose tip at z = 0, body along -z
float sdCruise(vec3 p, float L, float R){
  float nose = L * 0.16;
  float body = sdCapsuleZ(p, -L + R, -nose, R);
  float t = clamp(-p.z / nose, 0.0, 1.0);
  float ogive = (p.z < 0.0 && p.z > -nose) ? (length(p.xy) - R * sqrt(t) ) * 0.8 : 1e5;
  vec3 q = p; q.xy = abs(q.xy); if (q.x < q.y) q.xy = q.yx;
  float fins = sdBox(q - vec3(R * 1.5, 0.0, -L + R * 2.2), vec3(R * 0.9, R * 0.06, R * 1.4));
  float wings = sdBox(q - vec3(R * 1.3, 0.0, -L * 0.48), vec3(R * 0.6, R * 0.05, R * 1.0));
  return min(min(min(body, ogive), fins), wings);
}
float sdGlide(vec3 p, float L, float R){
  // slender cone that blends into a short flared body, small rear flaps
  float s = clamp(-p.z / L, 0.0, 1.0);
  float r = R * (s < 0.7 ? 0.08 + 0.92 * s / 0.7 : 1.0 + 0.12 * (s - 0.7) / 0.3);
  float body = max((length(p.xy) - r) * 0.85, max(p.z, -p.z - L));
  vec3 q = p; q.xy = abs(q.xy); if (q.x < q.y) q.xy = q.yx;
  float flap = sdBox(q - vec3(R * 1.1, 0.0, -L + R * 0.8), vec3(R * 0.45, R * 0.05, R * 0.7));
  return min(body, flap);
}
float sdJet(vec3 p, float S){
  p /= S;
  // nose at +z (~6.6), tail at -6.6; tailless compound delta, single fin, lateral intakes
  float fus = sdCapsuleZ(p * vec3(1.0, 1.1, 1.0), -6.0, 4.0, 0.62);
  float nt = clamp((p.z - 4.0) / 2.6, 0.0, 1.0);
  float nose = (p.z > 4.0 && p.z < 6.6) ? (length(p.xy) - 0.62 * sqrt(1.0 - nt)) * 0.8 : 1e5;
  float wz = clamp(p.z, -6.2, 2.6);
  float half_ = mix(4.1, 0.6, (wz + 6.2) / 8.8);           // compound delta planform
  float wing = max(max(abs(p.x) - half_, abs(p.y + 0.15) - 0.06 * (1.0 + (1.0 - abs(p.x) / 4.1))), max(p.z - 2.6, -p.z - 6.2));
  float fz = clamp((-p.z - 3.2) / 3.0, 0.0, 1.0);
  float fin = max(max(abs(p.x) - 0.05, p.y - 0.4 - 2.4 * fz), max(-p.y, max(-p.z - 6.3, p.z + 3.0)));
  float intake = sdBox(vec3(abs(p.x) - 0.75, p.y + 0.1, p.z - 0.5), vec3(0.28, 0.35, 1.4));
  float canopy = length((p - vec3(0.0, 0.5, 3.0)) * vec3(1.7, 1.6, 0.6)) - 0.5;
  return min(min(min(fus, nose), min(wing, fin)), min(intake, canopy)) * S;
}
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
float sdShip(vec3 p){
  // ~120 m frigate, bow at +z; stealth-style sloped superstructure
  float L = 60.0;
  float taper = clamp((p.z - 20.0) / 40.0, 0.0, 1.0);
  float hw = 7.5 * (1.0 - taper * taper * 0.92);
  float hull = sdRBox(p - vec3(0.0, 2.0 + taper * 1.2, 0.0), vec3(hw + max(p.y, 0.0) * 0.06, 5.0 + taper * 1.0, L), 0.6);
  hull = max(hull, -(p.y + 3.0));
  hull = max(hull, (p.z - L) + (p.y + 3.0) * -0.35);              // raked bow
  vec3 q = p - vec3(0.0, 12.0, 10.0);
  float sup = sdRBox(q, vec3(5.6, 5.0, 16.0), 0.8);
  sup = max(sup, abs(q.x) - 5.6 + max(q.y, 0.0) * 0.32);           // sloped sides
  sup = max(sup, q.z - 16.0 + max(q.y + 5.0, 0.0) * 0.55);          // sloped bridge front
  float hangar = sdRBox(p - vec3(0.0, 10.5, -18.0), vec3(6.2, 3.5, 10.0), 0.6);
  float mast = sdRBox(p - vec3(0.0, 24.0, 12.0), vec3(1.8 - (p.y - 17.0) * 0.08, 7.0, 1.8 - (p.y - 17.0) * 0.08), 0.3);
  float mastTop = sdBox(p - vec3(0.0, 31.5, 12.0), vec3(2.6, 0.25, 0.25));
  float funnel = sdRBox(p - vec3(0.0, 18.5, -2.0), vec3(2.2, 2.5, 3.4), 0.6);
  float gun = sdRBox(p - vec3(0.0, 9.6, 40.0), vec3(1.8, 1.2, 2.4), 0.6);
  float barrel = sdCapsuleZ(p - vec3(0.0, 9.9, 40.0), 2.0, 8.0, 0.2);
  return min(min(min(hull, sup), min(hangar, mast)), min(min(mastTop, funnel), min(gun, barrel)));
}

// ---------------- scene ----------------
// returns distance; id: 1,2 missiles, 3 jet, 4 ship
float mapObj(vec3 p, out float id){
  float d = 1e5; id = 0.0;
  if (uM0a.w > 0.5){ vec3 q = toLocal(p, uM0a.xyz, basis(uM0b.xyz)); float e = uM0c.z > 0.5 ? sdGlide(q, uM0b.w, uM0c.x) : sdCruise(q, uM0b.w, uM0c.x); if (e < d){ d = e; id = 1.0; } }
  if (uM1a.w > 0.5){ vec3 q = toLocal(p, uM1a.xyz, basis(uM1b.xyz)); float e = uM1c.z > 0.5 ? sdGlide(q, uM1b.w, uM1c.x) : sdCruise(q, uM1b.w, uM1c.x); if (e < d){ d = e; id = 2.0; } }
  if (uJet.w > 0.5){ vec3 q = toLocal(p, uJet.xyz, basis(uJetD.xyz)); float e = sdJet(q, uJetD.w); if (e < d){ d = e; id = 3.0; } }
  if (uShip.w > 0.5){ float c = cos(uShipX.x), s = sin(uShipX.x); vec3 q = p - uShip.xyz; q.xz = mat2(c, -s, s, c) * q.xz; q.y += uShipX.w * 10.0;
    float e = sdShip(q); if (e < d){ d = e; id = 4.0; } }
  return d;
}
float mapD(vec3 p){ float id; return mapObj(p, id); }
vec3 nrm(vec3 p, float e){ vec2 h = vec2(e, 0.0);
  return normalize(vec3(mapD(p + h.xyy) - mapD(p - h.xyy), mapD(p + h.yxy) - mapD(p - h.yxy), mapD(p + h.yyx) - mapD(p - h.yyx))); }

// ray vs sphere entry distance (or -1)
float sph(vec3 ro, vec3 rd, vec3 c, float r){ vec3 oc = ro - c; float b = dot(oc, rd); float h = b*b - dot(oc, oc) + r*r; if (h < 0.0) return -1.0; return -b - sqrt(h); }

// closest distance between ray and segment a-b; t along ray (>0), s 0..1 along segment
vec3 raySeg(vec3 ro, vec3 rd, vec3 a, vec3 b){
  vec3 ba = b - a;
  float baba = max(dot(ba, ba), 1e-6);
  vec3 w0 = ro - a;
  float bb = dot(rd, ba), dd = dot(rd, w0), ee = dot(ba, w0);
  float den = baba - bb * bb;
  float s = den > 1e-6 ? clamp((ee - bb * dd) / den, 0.0, 1.0) : 0.0;
  float t = max(dot(a + ba * s - ro, rd), 0.0);
  s = clamp(dot(ro + rd * t - a, ba) / baba, 0.0, 1.0);
  t = max(dot(a + ba * s - ro, rd), 0.0);
  vec3 pr = ro + rd * t, ps = a + ba * s;
  return vec3(length(pr - ps), t, s);
}

vec3 plasmaCol(float mode){ return mode > 0.5 ? vec3(1.0, 0.28, 0.78) : vec3(1.0, 0.62, 0.22); }

// emissive glows along a ray up to distance tMax (plasma sheath, exhaust trail, jet burner, explosions)
vec3 glows(vec3 ro, vec3 rd, float tMax, float hitId, float part){
  bool bgP = part != 1.0, fxP = part != 0.0;
  vec3 c = vec3(0.0);
  for (int m = 0; m < 2; m++){
    vec4 A = m == 0 ? uM0a : uM1a; vec4 B = m == 0 ? uM0b : uM1b; vec4 C = m == 0 ? uM0c : uM1c; vec4 T = m == 0 ? uTrail0 : uTrail1;
    if (A.w < 0.5) continue;
    vec3 f = normalize(B.xyz), nose = A.xyz, tail = nose - f * B.w;
    float R = C.x;
    // plasma sheath hugging the body, hottest at the nose
    if (fxP && C.y > 0.001){
      vec3 h = raySeg(ro, rd, nose + f * R * 0.6, tail);
      if (h.y < tMax + R * 4.0){
        float w = R * (0.3 + 0.6 * h.z * h.z);
        float k = exp(-pow(max(h.x - R * 0.9, 0.0) / w, 1.3));
        float own = abs(hitId - float(m + 1)) < 0.1 ? 0.03 : 1.0;
        float hot = mix(1.8, 0.6, h.z) * own;
        c += mix(vec3(1.0, 0.85, 0.95), plasmaCol(1.0), clamp(h.z * 1.6 + 0.2, 0.0, 1.0)) * k * hot * C.y * mix(1.0, 0.08, uDay) * (uHideObj > 0.5 && uDay < 0.5 ? 0.3 : 1.0);
      }
    }
    // engine flame / exhaust
    if (bgP && C.w > 0.001){
      vec3 h = raySeg(ro, rd, tail, tail - f * R * 7.0);
      float k = exp(-pow(h.x / (R * (0.5 + 1.3 * h.z)), 2.0)) * (1.0 - h.z);
      c += vec3(1.0, 0.7, 0.35) * k * 1.8 * C.w;
    }
    // long trail
    if (bgP && T.x > 0.0 && (T.z > 0.5 || uDay < 0.5)){
      vec3 h = raySeg(ro, rd, tail, tail - f * T.x);
      float wdt = T.y * (0.4 + 0.9 * h.z);
      float k = exp(-pow(h.x / wdt, 2.0)) * pow(1.0 - h.z, 1.6) * smoothstep(6.0, 40.0, h.y);
      vec3 col = T.z > 0.5 ? vec3(1.0, 0.35, 0.8) : vec3(0.85, 0.9, 1.0);
      c += col * k * T.w * 1.1 * (abs(hitId - float(m + 1)) < 0.1 ? 0.05 : 1.0) * (uHideObj > 0.5 && uDay < 0.5 && T.z > 0.5 ? 0.55 : 1.0);
    }
  }
  // shock-wave rings around missile 0: uBoom = amount, mach, phase (0..1), 0
  if (fxP && uBoom.x > 0.001 && uM0a.w > 0.5){
    vec3 f = normalize(uM0b.xyz); float R = uM0c.x, L = uM0b.w;
    for (int k = 0; k < 3; k++){
      float ph = fract(uBoom.z + float(k) / 3.0);
      vec3 ctr = uM0a.xyz - f * (L * 0.15 + ph * L * 1.4);
      float dn = dot(rd, f);
      if (abs(dn) < 1e-3) continue;
      float tp = dot(ctr - ro, f) / dn;
      if (tp < 0.0 || tp > tMax) continue;
      vec3 q = ro + rd * tp - ctr;
      float rr = R * (1.5 + ph * 9.0 * (1.0 / max(uBoom.y, 1.05) + 0.4));
      float d = abs(length(q) - rr);
      float w = R * (0.25 + ph * 1.2);
      float vap = 0.6 + 0.6 * noise(vec2(atan(q.y, q.x) * 3.0, ph * 5.0 + uTime));
      c += vec3(0.85, 0.92, 1.0) * exp(-pow(d / (w * mix(1.0, 0.6, uDay)), 2.0)) * (1.0 - ph) * vap * uBoom.x * mix(1.4, 0.4, uDay);
    }
  }
  // jet burner + nav lights
  if ((uHideObj > 0.5 ? fxP : bgP) && uJet.w > 0.5){   // with sprites the burner must draw over the model
    vec3 f = normalize(uJetD.xyz); float S = uJetD.w; mat3 Bj = basis(f);
    vec3 tail = uJet.xyz - f * 6.2 * S;
    vec3 h = raySeg(ro, rd, tail, tail - f * mix(5.0, 9.0, max(uDay, uHideObj)) * S);
    {
      float w = mix(0.55, 0.8, max(uDay, uHideObj)) * S * (1.0 - h.z * 0.55);
      float core = exp(-pow(h.x / w, 2.0)) * pow(1.0 - h.z, 1.3);
      float hot = exp(-pow(h.x / (w * 0.4), 2.0)) * exp(-h.z * 5.0);
      float diamonds = 0.55 + 0.45 * pow(0.5 + 0.5 * cos(h.z * 34.0 - uTime * 40.0), 3.0);
      vec3 flame = mix(vec3(1.0, 0.32, 0.04), vec3(1.0, 0.62, 0.18), exp(-h.z * 2.5));
      vec3 ab = mix(vec3(0.45, 0.65, 1.0) * core * 2.5, flame * core * diamonds * 3.2 + vec3(1.0, 0.95, 0.85) * hot * 3.0, max(uDay, uHideObj));
      c += ab;
    }
    vec3 wl = uJet.xyz + Bj[0] * 4.1 * S - f * 6.0 * S, wr = uJet.xyz - Bj[0] * 4.1 * S - f * 6.0 * S;
    vec3 hl = raySeg(ro, rd, wl, wl + f * 0.01), hr = raySeg(ro, rd, wr, wr + f * 0.01);
    float blink = step(0.5, fract(uTime * 1.2)) * (1.0 - uDay);
    c += (vec3(1.0, 0.1, 0.1) * exp(-hl.x / (0.12 * S)) * 1.4 + vec3(0.1, 1.0, 0.3) * exp(-hr.x / (0.12 * S)) * 1.4) * (1.0 - uDay);
    c += vec3(1.0) * exp(-raySeg(ro, rd, uJet.xyz + Bj[1] * 2.8 * S - f * 6.1 * S, uJet.xyz + Bj[1] * 2.8 * S - f * 6.1 * S + f * 0.01).x / (0.1 * S)) * blink * 2.0;
  }
  // explosions
  for (int e = 0; e < 2; e++){
    if (!fxP) break;
    vec4 E = e == 0 ? uEx0 : uEx1; float sz = e == 0 ? uEx0b.x : uEx1b.x;
    if (E.w < 0.0 || E.w > 8.0) continue;
    float age = E.w;
    float r = sz * (4.0 + 18.0 * (1.0 - exp(-age * 2.6)));
    vec3 h = raySeg(ro, rd, E.xyz, E.xyz + vec3(0.0, r * 0.5, 0.0));
    if (h.y > tMax + r) continue;
    float n0 = fbm3((ro + rd * h.y) * (0.06 / sz) + vec3(age * 0.5, -age * 1.5, 0.0));
    float k = exp(-pow(h.x / (r * (0.6 + 0.8 * n0)), 2.0) * 2.5);
    float heat = exp(-age * 1.3);
    float n = fbm3((ro + rd * h.y) * (0.12 / sz) + vec3(0.0, -age, 0.0));
    vec3 fire = mix(vec3(0.9, 0.22, 0.03), vec3(1.0, 0.75, 0.35), heat * n) * (0.3 + n);
    c += fire * k * (heat * 4.0 + 0.1) * smoothstep(0.25, 0.65, n0 + heat * 0.3);
  }
  // ship fires
  if (fxP && uShip.w > 0.5 && uShipX.z > 0.001){
    vec3 fp = uShip.xyz + vec3(0.0, 12.0 - uShipX.w * 10.0, 4.0);
    vec3 h = raySeg(ro, rd, fp, fp + vec3(0.0, 18.0, 0.0));
    float fl = fbm3(vec3(h.z * 3.0, uTime * 2.5, 0.0));
    c += vec3(1.0, 0.45, 0.1) * exp(-pow(h.x / (5.0 * (1.0 - h.z * 0.7)), 2.0)) * (1.0 - h.z) * (1.2 + fl) * uShipX.z * 2.0;
  }
  return c;
}

// returns (density) of grey smoke along the ray: day contrails behind missiles, explosion/fire smoke
float smoke(vec3 ro, vec3 rd, float tMax, bool trails, bool fires){
  float dens = 0.0;
  if (trails && uDay > 0.5){
    for (int m = 0; m < 2; m++){
      vec4 A = m == 0 ? uM0a : uM1a; vec4 B = m == 0 ? uM0b : uM1b; vec4 T = m == 0 ? uTrail0 : uTrail1;
      if (A.w < 0.5 || T.x <= 0.0 || T.z > 0.5) continue;
      vec3 f = normalize(B.xyz), tail = A.xyz - f * B.w;
      vec3 h = raySeg(ro, rd, tail, tail - f * T.x);
      if (h.y > tMax) continue;
      float wdt = T.y * (0.6 + 2.2 * h.z);
      float n = 0.65 + 0.5 * noise(vec2(h.z * 40.0, uTime * 0.5 + float(m) * 7.0));
      dens += exp(-pow(h.x / wdt, 2.0)) * pow(1.0 - h.z, 1.2) * T.w * n * smoothstep(6.0, 40.0, h.y);
    }
  }
  if (fires){
    for (int e = 0; e < 2; e++){
      vec4 E = e == 0 ? uEx0 : uEx1; float sz = e == 0 ? uEx0b.x : uEx1b.x;
      if (E.w < 0.15) continue;
      float age = E.w;
      vec3 base = E.xyz + vec3(age * 2.0, 0.0, 0.0);
      float top = sz * (10.0 + age * 14.0);
      vec3 h = raySeg(ro, rd, base, base + vec3(age * 6.0, top, 0.0));
      if (h.y > tMax + 40.0) continue;
      float w = sz * (5.0 + 9.0 * h.z + age * 2.5);
      float n = fbm3((ro + rd * h.y) * 0.05 + vec3(0.0, -uTime * 0.6, 0.0));
      dens += exp(-pow(h.x / (w * (0.7 + 0.6 * n)), 2.0)) * smoothstep(0.15, 0.6, age) * (0.6 + 0.6 * n) * 0.9;
    }
    if (uShip.w > 0.5 && uShipX.z > 0.001){
      vec3 fp = uShip.xyz + vec3(0.0, 16.0 - uShipX.w * 10.0, 4.0);
      vec3 h = raySeg(ro, rd, fp, fp + vec3(40.0, 120.0, 10.0));
      float n = fbm3((ro + rd * h.y) * 0.04 + vec3(0.0, -uTime * 0.5, 0.0));
      dens += exp(-pow(h.x / ((6.0 + 30.0 * h.z) * (0.7 + 0.6 * n)), 2.0)) * (1.0 - h.z * 0.6) * uShipX.z * (0.5 + 0.6 * n);
    }
  }
  return clamp(dens, 0.0, 1.0);
}

vec3 shadeObj(vec3 p, vec3 rd, float id){
  vec3 n = nrm(p, 0.02);
  vec3 L = uMoonDir;
  float dif = max(dot(n, L), 0.0);
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float spec = pow(max(dot(reflect(rd, n), L), 0.0), 40.0);
  vec3 base = id < 2.5 ? vec3(0.035, 0.038, 0.045) : id < 3.5 ? vec3(0.07, 0.075, 0.085) : vec3(0.11, 0.12, 0.135);
  vec3 c = base * (0.25 + dif * 1.4) + vec3(0.55, 0.62, 0.8) * spec * (id < 2.5 ? 0.9 : 0.35) + vec3(0.12, 0.16, 0.25) * rim * 0.6;
  // sky fill from above, sea bounce from below
  c += base * vec3(0.10, 0.14, 0.22) * max(n.y, 0.0) * 1.5;
  // missile plasma lights its own skin
  if (id < 1.5 && uM0c.y > 0.0) c += plasmaCol(1.0) * uM0c.y * 0.6 * rim + plasmaCol(1.0) * uM0c.y * 0.015;
  if (id > 1.5 && id < 2.5 && uM1c.y > 0.0) c += plasmaCol(1.0) * uM1c.y * 0.6 * rim + plasmaCol(1.0) * uM1c.y * 0.015;
  // ship windows / deck lights
  if (id > 3.5){
    float lights = step(0.985, hash(floor(p.xz * vec2(1.3, 0.7)) + floor(p.y * 0.8))) * step(5.0, p.y + uShipX.w * 10.0);
    c += vec3(1.0, 0.8, 0.5) * lights * 1.5 * (1.0 - uShipX.y);
    c *= 1.0 - 0.6 * uShipX.y * smoothstep(0.3, 0.8, noise(p.xz * 0.15));
  }
  return c;
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 fw = normalize(uCamTarget - uCamPos);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));   // +x world = screen right when looking down +z
  vec3 up = cross(fw, rt);
  float cr = cos(uRoll), sr = sin(uRoll);
  vec3 r2 = rt * cr + up * sr, u2 = up * cr - rt * sr;
  float fl = 1.0 / tan(uFov * 0.5);
  vec3 rd = normalize(uv.x * r2 + uv.y * u2 + fl * 0.5 * fw);
  vec3 ro = uCamPos;

  // --- objects: march inside bounding spheres
  float tObj = 1e9, idObj = 0.0;
  {
    float tStart = 1e9, tEnd = 0.0;
    for (int k = 0; k < 4; k++){
      vec3 c; float r; bool on;
      if (k == 0){ on = uM0a.w > 0.5; c = uM0a.xyz - normalize(uM0b.xyz) * uM0b.w * 0.5; r = uM0b.w * 0.6 + uM0c.x * 3.0; }
      else if (k == 1){ on = uM1a.w > 0.5; c = uM1a.xyz - normalize(uM1b.xyz) * uM1b.w * 0.5; r = uM1b.w * 0.6 + uM1c.x * 3.0; }
      else if (k == 2){ on = uJet.w > 0.5; c = uJet.xyz; r = 8.0 * uJetD.w; }
      else { on = uShip.w > 0.5; c = uShip.xyz + vec3(0.0, 8.0, 0.0); r = 70.0; }
      if (!on) continue;
      float t0 = sph(ro, rd, c, r);
      vec3 oc = ro - c; bool inside = dot(oc, oc) < r * r;
      if (t0 > 0.0 || inside){ float te = inside ? 0.0 : t0; tStart = min(tStart, te); float b = dot(oc, rd); float h = sqrt(max(b*b - dot(oc,oc) + r*r, 0.0)); tEnd = max(tEnd, -b + h); }
    }
    if (tStart < 1e8 && uHideObj < 0.5){
      float t = tStart;
      for (int i = 0; i < 110; i++){
        vec3 p = ro + rd * t; float id; float d = mapObj(p, id);
        if (d < 0.0015 * t + 0.002){ tObj = t; idObj = id; break; }
        t += d * 0.9;
        if (t > tEnd) break;
      }
    }
  }

  // --- ocean
  float tSea = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  vec2 q = gl_FragCoord.xy / uRes;
  if (uLayer > 0.5){
    // effects layer: emissive glows + smoke on transparent background (premultiplied alpha)
    vec3 g = glows(ro, rd, tSea, 0.0, 1.0) * uExposure;
    float sm = smoke(ro, rd, tSea, false, true);
    vec3 gc = aces(g);
    float ga = clamp(max(gc.r, max(gc.g, gc.b)), 0.0, 1.0);
    vec3 smc = mix(vec3(0.16, 0.15, 0.15), vec3(0.42, 0.42, 0.44), uDay) * sm;
    float a = clamp(ga + sm * (1.0 - ga), 0.0, 1.0);
    vec3 outc = gc + smc * (1.0 - ga);
    gl_FragColor = vec4(pow(max(outc, 0.0), vec3(1.0 / 2.2)) * (a > 0.0 ? 1.0 : 0.0), a);
    return;
  }
  vec3 col;
  float tHit = min(tObj, tSea);
  if (tObj < tSea){
    col = shadeObj(ro + rd * tObj, rd, idObj);
    if (tSea < 1e8){ /* nothing */ }
  } else if (tSea < 1e8){
    vec3 p = ro + rd * tSea;
    float dist = tSea;
    vec2 g = vec2(0.0);
    vec3 blurV = uVel * uShutter;
    for (int k = 0; k < 5; k++){
      vec3 pk = p + blurV * (float(k) / 4.0 - 0.5);
      g += waveSlope(pk.xz, uTime, dist) * 0.2;
    }
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    // wake behind the ship
    if (uIce > 0.0){
      // open water lead around the ship, ice everywhere else
      float lead = uShip.w > 0.5 ? smoothstep(260.0, 160.0, length(p.xz - uShip.xz)) : 0.0;
      float iceAmt = uIce * (1.0 - lead);
      if (iceAmt > 0.01){
        vec3 ic = vec3(0.0);
        for (int k = 0; k < 8; k++){
          vec3 pk = p + uVel * uShutter * (float(k) / 7.0 - 0.5);
          ic += iceColor(pk.xz, dist) * 0.125;
        }
        vec3 rr0 = reflect(rd, vec3(0.0, 1.0, 0.0));
        float fr0 = 0.04 + 0.5 * pow(1.0 - max(-rd.y, 0.0), 6.0);
        vec3 iceC = mix(ic, skyDay(rr0), fr0 * 0.3) + vec3(1.0, 0.95, 0.85) * pow(max(dot(rr0, uMoonDir), 0.0), 300.0) * 2.0;
        float fogI = 1.0 - exp(-dist * 0.00030);
        iceC = mix(iceC, skyDay(normalize(vec3(rd.x, -0.01, rd.z))), fogI);
        // keep the water shading for the lead and blend
        g *= 1.0;
        n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 rrw = reflect(rd, n); rrw.y = abs(rrw.y);
        float fresw = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
        vec3 water = mix(vec3(0.01, 0.06, 0.11), skyDay(rrw), fresw * 0.7) + vec3(1.0, 0.96, 0.88) * pow(max(dot(rrw, uMoonDir), 0.0), 900.0) * 18.0;
        water = mix(water, skyDay(normalize(vec3(rd.x, -0.01, rd.z))), 1.0 - exp(-dist * 0.00025));
        col = mix(water, iceC, iceAmt);
        col += glows(p + vec3(0.0, 0.05, 0.0), reflect(rd, vec3(0.0, 1.0, 0.0)), 2000.0, 0.0, 2.0) * 0.35;
      }
    }
    if (!(uIce > 0.0 && uIce * (1.0 - (uShip.w > 0.5 ? smoothstep(260.0, 160.0, length(p.xz - uShip.xz)) : 0.0)) > 0.01)) {
    vec3 rr = reflect(rd, n); rr.y = abs(rr.y);
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    vec3 refl = sky(rr) + glows(p + n * 0.05, rr, 2000.0, 0.0, 2.0) * 0.55;
    // object reflections (cheap: only if reflected ray hits an object bound within 400 m)
    vec3 deep = uDay > 0.5 ? vec3(0.01, 0.08, 0.14) + vec3(0.0, 0.06, 0.06) * max(0.0, g.x + g.y) : vec3(0.002, 0.007, 0.014);
    col = mix(deep, refl, uDay > 0.5 ? fres * 0.7 : fres);
    // moon / sun glitter
    float sp = pow(max(dot(rr, uMoonDir), 0.0), 900.0) * 18.0 + pow(max(dot(rr, uMoonDir), 0.0), 90.0) * 0.35;
    col += (uDay > 0.5 ? vec3(1.0, 0.96, 0.88) * 1.4 : vec3(0.85, 0.9, 1.0)) * sp;
    // distance haze toward horizon
    float fog = 1.0 - exp(-dist * mix(0.00045, 0.00025, uDay));
    col = mix(col, sky(normalize(vec3(rd.x, uDay > 0.5 ? -0.01 : 0.002, rd.z))), fog);
    }
  } else {
    col = sky(rd);
  }
  // low mist / sea-smoke streaks rushing past (reference look)
  if (uMist > 0.0 && uDay > 0.5){
    vec2 fd = length(uVel.xz) > 1.0 ? normalize(uVel.xz) : vec2(1.0, 0.0);
    vec2 fs = vec2(-fd.y, fd.x);
    float tEnd = min(tHit, 320.0);
    float dm = 0.0;
    for (int i = 0; i < 6; i++){
      float tt = mix(4.0, tEnd, pow((float(i) + 0.5) / 6.0, 1.7));
      vec3 pp = ro + rd * tt;
      if (pp.y > 9.0 || pp.y < 0.0) continue;
      float acc = 0.0;
      for (int k = 0; k < 3; k++){
        vec3 pk = pp + uVel * uShutter * (float(k) / 2.0 - 0.5);
        vec2 q = vec2(dot(pk.xz, fd) * 0.012, dot(pk.xz, fs) * 0.07);
        acc += smoothstep(0.6, 0.9, fbm2(q + vec2(0.0, 3.0))) / 3.0;
      }
      dm += acc * exp(-pp.y / 2.5) * (tEnd / 6.0) * 0.004;
    }
    col = mix(col, vec3(0.93, 0.96, 1.0), clamp(dm * uMist, 0.0, 0.6));
  }
  // emissive volumes in front of the hit
  col += glows(ro, rd, tHit, tObj < tSea ? idObj : 0.0, uHideObj > 0.5 ? 0.0 : 2.0);
  float smk = smoke(ro, rd, tHit, true, uHideObj < 0.5);
  col = mix(col, uDay > 0.5 ? vec3(0.93, 0.94, 0.96) : vec3(0.15), smk * 0.85);
  col += vec3(1.0) * uFlash;
  col *= uExposure;
  col = aces(col);
  if (uDay > 0.5){ float l = dot(col, vec3(0.299, 0.587, 0.114)); col = clamp(mix(vec3(l), col, 1.28), 0.0, 1.0); }
  // vignette + grain
  col *= mix(0.55, 0.8, uDay) + mix(0.45, 0.2, uDay) * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.22);
  col += (hash(gl_FragCoord.xy + uTime * 61.0) - 0.5) * 0.018;
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}
`;
