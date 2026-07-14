// Ashima 3D simplex noise + curl, shared by the velocity compute shader.
export const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 snoise3(vec3 p) {
  return vec3(snoise(p), snoise(p + vec3(31.4, -53.2, 12.9)), snoise(p + vec3(-19.1, 88.3, -41.7)));
}
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 x0 = snoise3(p - dx), x1 = snoise3(p + dx);
  vec3 y0 = snoise3(p - dy), y1 = snoise3(p + dy);
  vec3 z0 = snoise3(p - dz), z1 = snoise3(p + dz);
  float x = (y1.z - y0.z) - (z1.y - z0.y);
  float y = (z1.x - z0.x) - (x1.z - x0.z);
  float z = (x1.y - x0.y) - (y1.x - y0.x);
  return normalize(vec3(x, y, z) / (2.0 * e) + 1e-6);
}
`

// GPUComputationRenderer injects: uniform sampler2D texturePos/textureVel, define resolution.
export const velFrag = noiseGLSL + /* glsl */ `
uniform float uTime; uniform float uDt; uniform float uCurl; uniform float uSpeed;
uniform vec3 uCursor;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePos, uv);
  vec3 v = texture2D(textureVel, uv).xyz;
  v += curlNoise(pos.xyz * 0.35 + uTime * 0.05) * uCurl * uDt;
  v += vec3(2.2, 0.0, 0.0) * uSpeed * uDt;              // stream +x through the chip
  float pre = smoothstep(1.0, -1.0, pos.x);              // funnel toward core before the chip
  v.yz -= pos.yz * pre * 1.2 * uDt;
  vec3 toC = uCursor - pos.xyz;
  float d = length(toC);
  v += (toC / max(d, 0.001)) * (3.5 / (1.0 + d * d)) * uDt; // cursor attractor
  v *= 0.96;                                             // drag
  gl_FragColor = vec4(v, 1.0);
}
`

export const posFrag = /* glsl */ `
uniform float uTime; uniform float uDt;
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePos, uv);
  vec3 v = texture2D(textureVel, uv).xyz;
  vec3 p = pos.xyz + v * uDt;
  float life = pos.w - uDt * 0.12;
  if (p.x > 6.0 || life <= 0.0) {
    float r1 = rand(uv + fract(uTime));
    float r2 = rand(uv * 2.7 + fract(uTime * 1.3));
    float r3 = rand(uv * 5.1 + fract(uTime * 0.7));
    p = vec3(-6.0 + r1 * 1.5, (r2 - 0.5) * 2.6, (r3 - 0.5) * 2.6);
    life = 0.5 + r1 * 0.8;
  }
  gl_FragColor = vec4(p, life);
}
`

export const pointsVert = /* glsl */ `
uniform sampler2D uPos; uniform sampler2D uVel; uniform float uSize;
attribute vec2 ref;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec4 pos = texture2D(uPos, ref);
  vec3 vel = texture2D(uVel, ref).xyz;
  float speed = clamp(length(vel) * 0.35, 0.0, 1.0);
  vColor = mix(vec3(0.49, 0.95, 1.0), vec3(0.54, 0.36, 1.0), speed); // cyan → violet
  vAlpha = smoothstep(0.0, 0.15, pos.w) * smoothstep(6.0, 4.5, pos.x);
  vec4 mv = modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_PointSize = uSize / -mv.z; // uSize 26 at ~8 units → ~3px
  gl_Position = projectionMatrix * mv;
}
`

export const pointsFrag = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d) * vAlpha * uOpacity;
  gl_FragColor = vec4(vColor * a, a);
}
`
