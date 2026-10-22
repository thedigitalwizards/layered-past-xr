// Two worlds are blended by giving each a share of the pixels (ordered dithering) instead of
// transparency. Neighbouring worlds use complementary patterns, so together they cover every
// pixel exactly once: no sorting, no z-fighting between two full skies, and it stays cheap on Quest.
import { DoubleSide, ShaderMaterial, type IUniform, type Side } from 'three';

export type BlendUniforms = {
  readonly uWeight: { value: number };
  readonly uParity: { value: number };
};

/** Shared by every world: 0 before the stone is picked up (darkness), 1 afterwards. */
export const reveal = { value: 0 };

export const createBlendUniforms = (worldIndex: number): BlendUniforms => ({
  uWeight: { value: 0 },
  uParity: { value: worldIndex % 2 },
});

export const SURFACE = { volume: 0, ground: 1, sky: 2, hills: 3, accent: 4, footprint: 5, smoke: 6 } as const;

export const VERTEX = /* glsl */ `
  attribute float aShape;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vShape;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vShape = aShape;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Common fragment code: blending, noise, edges from UVs, and engraving-style hatching. */
export const FRAGMENT_PRELUDE = /* glsl */ `
  uniform float uWeight;
  uniform float uParity;
  uniform float uReveal;
  uniform int uSurface;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vShape;

  float bayer4(vec2 p) {
    ivec2 i = ivec2(mod(p, 4.0));
    float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    return (m[i.x + i.y * 4] + 0.5) / 16.0;
  }

  void keepShareOrDiscard() {
    float b = bayer4(gl_FragCoord.xy);
    bool keep = uParity < 0.5 ? b < uWeight : b >= 1.0 - uWeight;
    if (!keep) discard;
  }

  float smooth01(float e0, float e1, float x) {
    float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float elevation() { return clamp(normalize(vWorldPos - cameraPosition).y, 0.0, 1.0); }

  // Distance in pixels to the drawn edges of a box face or a cylinder's rims.
  float edgePixels(vec3 n) {
    if (vShape < 0.5) {
      vec2 e = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-5));
      return min(e.x, e.y);
    }
    if (vShape < 1.5 && abs(n.y) < 0.5) return min(vUv.y, 1.0 - vUv.y) / max(fwidth(vUv.y), 1e-5);
    return 1e5;
  }

  // 2D coordinates that follow a surface, in metres: across and up a wall, around and up a column,
  // or across the ground. Hatching drawn in them lies on the surface like strokes on a print.
  vec2 surfaceCoord(vec3 p, vec3 n) {
    if (abs(n.y) > 0.7) return p.xz;
    if (vShape > 0.5 && vShape < 1.5) return vec2(vUv.x * 2.4, p.y);
    vec2 across = normalize(vec2(-n.z, n.x));
    return vec2(dot(p.xz, across), p.y);
  }

  // Thin engraved lines. When lines get closer than ~2 px they fade to their average tone (no moiré).
  float hatch(vec3 p, vec3 n, float angle, float freq) {
    vec2 q = surfaceCoord(p, n);
    float t = dot(q, vec2(cos(angle), sin(angle))) * freq;
    float w = fwidth(t);
    float d = abs(fract(t) - 0.5);
    float line = smooth01(0.4 - w, 0.4 + w, d);
    return mix(line, 0.2, smooth01(0.2, 0.45, w));
  }
`;

export const createWorldMaterial = (
  fragmentMain: string,
  blend: BlendUniforms,
  surface: number,
  extra: Record<string, IUniform> = {},
  side: Side = DoubleSide,
): ShaderMaterial =>
  new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: `${FRAGMENT_PRELUDE}\n${fragmentMain}`,
    uniforms: { ...blend, uReveal: reveal, uSurface: { value: surface }, ...extra },
    side,
  });
