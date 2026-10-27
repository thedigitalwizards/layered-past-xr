// The demo's central object: a monumental, aniconic baetyl on a low base.
import { BoxGeometry, BufferGeometry, EdgesGeometry, Float32BufferAttribute, LatheGeometry, Vector2 } from 'three';
import type { ObjectShape } from '../../src/core/central-object.ts';
import { merge, seededRandom, SHAPE } from '../../src/core/geometry.ts';

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
const baetylGeometry = (roughness: number): BufferGeometry => {
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

export const baetylShape: ObjectShape = {
  surface: (idealised) => baetylGeometry(idealised ? 0.3 : 1),
  outline: outlineGeometry,
};
