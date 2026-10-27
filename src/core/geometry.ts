// Procedural building blocks shared by the world styles. No DOM: also used by the export script.
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Shape ids for edge drawing in the shaders (see edgePixels in blend.ts). */
export const SHAPE = { box: 0, cylinder: 1, other: 2 } as const;

/** Deterministic random numbers (mulberry32), so a world looks the same on every visit. */
export const seededRandom = (seed: string): (() => number) => {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The central object stands at the centre of every context (the origin here); the visitor stands this far
 * in front of it, at +z, looking at it.
 */
export const VISITOR_DISTANCE_M = 4;

/** Keeps procedural pieces from being built where the visitor stands. */
export const clearOfVisitor = (at: readonly [number, number], radius = 1.6): boolean =>
  Math.hypot(at[0], at[1] - VISITOR_DISTANCE_M) > radius;

/** Point on the ground at `distance` metres, `yawDeg` clockwise from straight ahead (-z). */
export const pointAt = (yawDeg: number, distance: number): [number, number] => {
  const r = (yawDeg * Math.PI) / 180;
  return [Math.sin(r) * distance, -Math.cos(r) * distance];
};

export const yawOf = (x: number, z: number): number => ((((Math.atan2(x, -z) * 180) / Math.PI) % 360) + 360) % 360;

const withShape = (geometry: BufferGeometry, shape: number): BufferGeometry => {
  geometry.setAttribute(
    'aShape',
    new Float32BufferAttribute(new Array<number>(geometry.getAttribute('position').count).fill(shape), 1),
  );
  return geometry;
};

export type Block = {
  readonly at: readonly [number, number];
  readonly size: readonly [number, number, number];
  /** Degrees, counter-clockwise from above (three.js rotation.y). */
  readonly turn?: number;
  readonly lift?: number;
};

export const block = ({ at, size, turn = 0, lift = 0 }: Block): BufferGeometry => {
  const g = withShape(new BoxGeometry(...size), SHAPE.box);
  g.rotateY((turn * Math.PI) / 180);
  g.translate(at[0], lift + size[1] / 2, at[1]);
  return g;
};

export const column = (at: readonly [number, number], radius: number, height: number, lift = 0): BufferGeometry => {
  const g = withShape(new CylinderGeometry(radius, radius * 1.08, height, 14), SHAPE.cylinder);
  g.translate(at[0], lift + height / 2, at[1]);
  return g;
};

export const blob = (at: readonly [number, number, number], radius: number): BufferGeometry => {
  const g = withShape(new SphereGeometry(radius, 10, 7), SHAPE.other);
  g.translate(...at);
  return g;
};

export const named = <T extends { name: string }>(name: string, object: T): T => {
  object.name = name;
  return object;
};

export const merge = (parts: readonly BufferGeometry[]): BufferGeometry => {
  const merged = mergeGeometries([...parts]) ?? new BufferGeometry();
  parts.forEach((p) => p.dispose());
  return merged;
};

export const ground = (radius = 60): BufferGeometry => {
  const g = withShape(new CircleGeometry(radius, 48), SHAPE.other);
  g.rotateX(-Math.PI / 2);
  return g;
};

export const sky = (): BufferGeometry => withShape(new SphereGeometry(90, 32, 16), SHAPE.other);

/** A ring of hills: uv.y is 0 at the foot and 1 on the skyline. */
export const hills = (seed: string, radius: number, base: number, roughness: number): BufferGeometry => {
  const random = seededRandom(seed);
  const waves = Array.from({ length: 4 }, (_, i) => [2 + i * 3 + Math.floor(random() * 3), random() * 6.28] as const);
  const height = (t: number) =>
    base + waves.reduce((h, [k, phase], i) => h + (roughness / (i + 1)) * Math.sin(k * t + phase), 0);
  const segments = 160;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.sin(t) * radius;
    const z = -Math.cos(t) * radius;
    positions.push(x, -1, z, x, height(t), z);
    uvs.push(i / segments, 0, i / segments, 1);
    if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return withShape(g, SHAPE.other);
};

export type Point2 = readonly [number, number];

/** Splits a closed outline into dashes; the pattern carries on round the corners. */
export const dashes = (outline: readonly Point2[], dash: number, gap: number): [Point2, Point2][] => {
  const period = dash + gap;
  const result: [Point2, Point2][] = [];
  let travelled = 0;
  outline.forEach((start, i) => {
    const end = outline[(i + 1) % outline.length]!;
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const at = (s: number): Point2 => [start[0] + (dx * s) / length, start[1] + (dz * s) / length];
    for (let s = -(travelled % period); s < length; s += period) {
      const a = Math.max(0, s);
      const b = Math.min(length, s + dash);
      if (b > a) result.push([at(a), at(b)]);
    }
    travelled += length;
  });
  return result;
};

export const rectangle = (at: Point2, width: number, depth: number, turnDeg: number): Point2[] => {
  const r = (turnDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const corners: Point2[] = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ];
  return corners.map(([x, z]) => [at[0] + x * cos + z * sin, at[1] - x * sin + z * cos]);
};

/** Flat dashed outline on the ground, made of thin quads (WebGL lines are 1 px wide in VR). */
export const dashedOutline = (outline: readonly Point2[], width = 0.06): BufferGeometry =>
  merge(
    dashes(outline, 0.35, 0.25).map(([[x1, z1], [x2, z2]]) => {
      const q = withShape(new PlaneGeometry(Math.hypot(x2 - x1, z2 - z1), width), SHAPE.other);
      q.rotateX(-Math.PI / 2);
      q.rotateY(-Math.atan2(z2 - z1, x2 - x1));
      q.translate((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      return q;
    }),
  );
