// The baetyl: a monumental, aniconic stone at the centre of the scene. It never moves; the
// contexts change around it. It has one look per context (`baetyl.style` in the content) and
// blends between them exactly like the contexts do, because each look shares its context's pixels.
import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineSegments,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { BaetylStyle, Context } from './content.ts';
import { createWorldMaterial, SURFACE, type BlendUniforms } from './worlds/blend.ts';
import { merge, seededRandom, SHAPE } from './worlds/pieces.ts';

// TODO: placeholder scale. Ground the height, width and base in documented measurements of the
// baetyl, with the heritage adviser.
export const BAETYL_HEIGHT_M = 1.6;
const BASE: readonly [number, number, number] = [1.3, 0.3, 1.3];

// Radius and height along the profile, from the bottom to the tip, in units of the baetyl's height.
const PROFILE: readonly [number, number][] = [
  [0, 0],
  [0.26, 0.005],
  [0.33, 0.05],
  [0.32, 0.22],
  [0.27, 0.45],
  [0.19, 0.7],
  [0.1, 0.9],
  [0.03, 0.99],
  [0, 1],
];

const withShape = (geometry: BufferGeometry, shape: number): BufferGeometry => {
  geometry.setAttribute(
    'aShape',
    new Float32BufferAttribute(new Array<number>(geometry.getAttribute('position').count).fill(shape), 1),
  );
  return geometry;
};

const baseGeometry = (): BufferGeometry => {
  const base = new BoxGeometry(...BASE);
  base.translate(0, BASE[1] / 2, 0);
  return base;
};

/** `roughness` 1 is the stone as found; lower values smooth it out (the idealised baetyl of an imagined context). */
export const baetylGeometry = (roughness: number): BufferGeometry => {
  const stone = new LatheGeometry(
    PROFILE.map(([r, h]) => new Vector2(r * BAETYL_HEIGHT_M, h * BAETYL_HEIGHT_M)),
    48,
  );
  const random = seededRandom('demo-stone');
  const bumps = Array.from({ length: 6 }, () => [random() * Math.PI * 2, 0.02 + random() * 0.03] as const);
  const position = stone.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const k = 1 + roughness * bumps.reduce((sum, [phase, amp], j) => sum + amp * Math.sin(angle * (j + 2) + phase), 0);
    position.setXYZ(i, x * k, position.getY(i) + BASE[1], z * k);
  }
  stone.computeVertexNormals();
  return merge([withShape(stone, SHAPE.other), withShape(baseGeometry(), SHAPE.box)]);
};

/** Meridians and rings of the baetyl and the edges of its base, for the outline-only look. */
const outlineGeometry = (): BufferGeometry => {
  const at = (r: number, h: number, a: number) => [
    Math.cos(a) * r * BAETYL_HEIGHT_M,
    h * BAETYL_HEIGHT_M + BASE[1],
    Math.sin(a) * r * BAETYL_HEIGHT_M,
  ];
  const points: number[] = [];
  for (let m = 0; m < 10; m += 1) {
    const a = (m / 10) * Math.PI * 2;
    PROFILE.slice(0, -1).forEach(([r, h], i) => {
      const [r2, h2] = PROFILE[i + 1]!;
      points.push(...at(r, h, a), ...at(r2, h2, a));
    });
  }
  [1, 3, 5].forEach((i) => {
    const [r, h] = PROFILE[i]!;
    for (let s = 0; s < 40; s += 1)
      points.push(...at(r, h, (s / 40) * Math.PI * 2), ...at(r, h, ((s + 1) / 40) * Math.PI * 2));
  });
  const baseEdges = new EdgesGeometry(baseGeometry()).getAttribute('position');
  for (let i = 0; i < baseEdges.count; i += 1) points.push(baseEdges.getX(i), baseEdges.getY(i), baseEdges.getZ(i));
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return geometry;
};

const SOLID = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    float diffuse = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0);
    // Gabbro: dark green-grey with a fine speckle.
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
    // A faint gold rim: the idealised baetyl.
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

const lookMesh = (style: BaetylStyle, blend: BlendUniforms): Mesh | LineSegments => {
  // The baetyl is always lit: it is visible in the dark before the contexts appear.
  const lit = { uReveal: { value: 1 } };
  switch (style) {
    case 'solid':
      return new Mesh(baetylGeometry(1), createWorldMaterial(SOLID, blend, SURFACE.volume, lit));
    case 'engraving':
      return new Mesh(baetylGeometry(0.3), createWorldMaterial(ENGRAVED, blend, SURFACE.volume, lit));
    case 'outline':
      return new LineSegments(
        outlineGeometry(),
        new ShaderMaterial({ vertexShader: OUTLINE_VERTEX, fragmentShader: OUTLINE_FRAGMENT, uniforms: { ...blend } }),
      );
  }
};

/** One look per context, stacked in place at the centre of the scene. */
export const createBaetyl = (contexts: readonly Context[], blends: readonly BlendUniforms[]): Group => {
  const baetyl = new Group();
  baetyl.name = 'baetyl';
  contexts.forEach((context, i) => baetyl.add(lookMesh(context.baetyl.style, blends[i]!)));
  return baetyl;
};
