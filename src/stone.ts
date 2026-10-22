// The Demo Stone. It has one state per world (from `stone.style` in the content) and blends between
// them exactly like the worlds do, because each state shares its world's pixel share.
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import type { StoneStyle, World } from './content.ts';
import { createWorldMaterial, SURFACE, type BlendUniforms } from './worlds/blend.ts';
import { seededRandom, SHAPE } from './worlds/pieces.ts';

export const STONE_HEIGHT_M = 0.16;

// Radius and height along the profile, from the base to the tip, in units of the stone's height.
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

/** `roughness` 1 is the stone as found; lower values smooth it out (the idealised stone of World B). */
export const stoneGeometry = (roughness: number): BufferGeometry => {
  const geometry = new LatheGeometry(
    PROFILE.map(([r, h]) => new Vector2(r * STONE_HEIGHT_M, h * STONE_HEIGHT_M)),
    40,
  );
  const random = seededRandom('demo-stone');
  const bumps = Array.from({ length: 6 }, () => [random() * Math.PI * 2, 0.02 + random() * 0.03] as const);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const k = 1 + roughness * bumps.reduce((sum, [phase, amp], j) => sum + amp * Math.sin(angle * (j + 2) + phase), 0);
    position.setXYZ(i, x * k, position.getY(i) - STONE_HEIGHT_M / 2, z * k);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('aShape', new Float32BufferAttribute(new Array<number>(position.count).fill(SHAPE.other), 1));
  return geometry;
};

/** Meridians and rings of the stone's surface, for the outline-only state. */
const outlineGeometry = (): BufferGeometry => {
  const at = (r: number, h: number, a: number) => [
    Math.cos(a) * r * STONE_HEIGHT_M,
    (h - 0.5) * STONE_HEIGHT_M,
    Math.sin(a) * r * STONE_HEIGHT_M,
  ];
  const points: number[] = [];
  for (let m = 0; m < 8; m += 1) {
    const a = (m / 8) * Math.PI * 2;
    PROFILE.slice(0, -1).forEach(([r, h], i) => {
      const [r2, h2] = PROFILE[i + 1]!;
      points.push(...at(r, h, a), ...at(r2, h2, a));
    });
  }
  [1, 3, 5].forEach((i) => {
    const [r, h] = PROFILE[i]!;
    for (let s = 0; s < 32; s += 1)
      points.push(...at(r, h, (s / 32) * Math.PI * 2), ...at(r, h, ((s + 1) / 32) * Math.PI * 2));
  });
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
    float speckle = noise(vWorldPos.xz * 180.0 + vWorldPos.y * 140.0);
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
    float ink = (1.0 - diffuse) > 0.35 ? hatch(vWorldPos * 12.0, n, 0.0, 6.0) * 0.8 : 0.0;
    ink = max(ink, smooth01(0.75, 0.95, rim));
    vec3 colour = mix(vec3(0.91, 0.87, 0.78), vec3(0.24, 0.19, 0.13), ink);
    // A faint gold rim: the idealised stone.
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

const stateMesh = (style: StoneStyle, blend: BlendUniforms): Mesh | LineSegments => {
  // The stone is always lit: it is visible in the dark before the worlds appear.
  const lit = { uReveal: { value: 1 } };
  switch (style) {
    case 'solid':
      return new Mesh(stoneGeometry(1), createWorldMaterial(SOLID, blend, SURFACE.volume, lit));
    case 'engraving':
      return new Mesh(stoneGeometry(0.3), createWorldMaterial(ENGRAVED, blend, SURFACE.volume, lit));
    case 'outline':
      return new LineSegments(
        outlineGeometry(),
        new ShaderMaterial({ vertexShader: OUTLINE_VERTEX, fragmentShader: OUTLINE_FRAGMENT, uniforms: { ...blend } }),
      );
  }
};

export type Stone = {
  /** Move this to hold the stone: on the plinth, in front of the camera, or in a VR hand. */
  readonly object: Group;
  /** A generous invisible sphere, so the stone is easy to click, tap and grab. */
  readonly hitTarget: Mesh;
  readonly plinth: Group;
  /** Turns the stone with the dial (outside VR; in VR the visitor's own hand turns it). */
  readonly turnTo: (dialValue: number) => void;
};

export const createStone = (worlds: readonly World[], blends: readonly BlendUniforms[]): Stone => {
  const spin = new Group();
  worlds.forEach((world, i) => spin.add(stateMesh(world.stone.style, blends[i]!)));
  const hitTarget = new Mesh(new SphereGeometry(0.11, 12, 8), new MeshBasicMaterial({ visible: false }));
  hitTarget.userData.isStone = true;
  const object = new Group();
  object.add(spin, hitTarget);

  const plinth = new Group();
  const base = new Mesh(new BoxGeometry(0.34, 0.9, 0.34), new MeshBasicMaterial({ color: '#171c19' }));
  base.position.y = 0.45;
  const halo = new Mesh(
    new RingGeometry(0.12, 0.135, 48),
    new MeshBasicMaterial({ color: '#9CC2B0', transparent: true, opacity: 0.8 }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.902;
  plinth.add(base, halo);

  return {
    object,
    hitTarget,
    plinth,
    // A third of a turn per world: the stone reads as a dial.
    turnTo: (dialValue) => (spin.rotation.y = (dialValue * 2 * Math.PI) / 3),
  };
};
