// The central object: one persistent object at the centre of the scene. It never moves; the contexts
// change around it. It has one look per context and blends between them exactly like the contexts
// do, because each look shares its context's pixels. Its shape comes from the example.
import { Group, LineSegments, Mesh, ShaderMaterial, type BufferGeometry } from 'three';
import { createWorldMaterial, SURFACE, type BlendUniforms } from './blend.ts';
import type { ObjectStyle, Context } from './content.ts';

/** Provided by an example. Geometry stands on the ground at the origin. */
export type ObjectShape = {
  /** The surface; `idealised` asks for a smoother version (the engraving look). */
  readonly surface: (idealised: boolean) => BufferGeometry;
  /** Line segments for the outline-only look. */
  readonly outline: () => BufferGeometry;
};

const SOLID = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    float diffuse = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0);
    // Dark green-grey stone with a fine speckle.
    float speckle = noise(vWorldPos.xz * 22.0 + vWorldPos.y * 17.0);
    vec3 albedo = mix(vec3(0.17, 0.24, 0.21), vec3(0.30, 0.36, 0.33), speckle);
    gl_FragColor = vec4(albedo * (0.45 + 0.35 * (0.5 + 0.5 * n.y) + 0.8 * diffuse), 1.0);
  }
`;

const ENGRAVED = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    float diffuse = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0);
    float rim = 1.0 - abs(dot(n, normalize(cameraPosition - vWorldPos)));
    float ink = (1.0 - diffuse) > 0.35 ? hatch(vWorldPos, n, 0.0, 12.0) * 0.8 : 0.0;
    ink = max(ink, smooth01(0.75, 0.95, rim));
    vec3 colour = mix(vec3(0.91, 0.87, 0.78), vec3(0.24, 0.19, 0.13), ink);
    // A faint gold rim: the idealised object.
    colour = mix(colour, vec3(0.78, 0.62, 0.28), smooth01(0.45, 0.8, rim) * 0.55);
    gl_FragColor = vec4(colour, 1.0);
  }
`;

const OUTLINE_VERTEX = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const OUTLINE_FRAGMENT = /* glsl */ `
  uniform float uWeight;
  uniform float uParity;
  float bayer4(vec2 p) {
    ivec2 i = ivec2(mod(p, 4.0));
    float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    return (m[i.x + i.y * 4] + 0.5) / 16.0;
  }
  void main() {
    float b = bayer4(gl_FragCoord.xy);
    if (!(uParity < 0.5 ? b < uWeight : b >= 1.0 - uWeight)) discard;
    gl_FragColor = vec4(0.27, 0.31, 0.29, 1.0);
  }
`;

const lookMesh = (style: ObjectStyle, blend: BlendUniforms, shape: ObjectShape): Mesh | LineSegments => {
  // The object is always lit: it is visible in the dark before the contexts appear.
  const lit = { uReveal: { value: 1 } };
  switch (style) {
    case 'solid':
      return new Mesh(shape.surface(false), createWorldMaterial(SOLID, blend, SURFACE.volume, lit));
    case 'engraving':
      return new Mesh(shape.surface(true), createWorldMaterial(ENGRAVED, blend, SURFACE.volume, lit));
    case 'outline':
      return new LineSegments(
        shape.outline(),
        new ShaderMaterial({ vertexShader: OUTLINE_VERTEX, fragmentShader: OUTLINE_FRAGMENT, uniforms: { ...blend } }),
      );
  }
};

/** One look per context, stacked in place at the centre of the scene. */
export const createCentralObject = (
  contexts: readonly Context[],
  blends: readonly BlendUniforms[],
  shape: ObjectShape,
): Group => {
  const object = new Group();
  object.name = 'central-object';
  contexts.forEach((context, i) => object.add(lookMesh(context.objectState.style, blends[i]!, shape)));
  return object;
};
