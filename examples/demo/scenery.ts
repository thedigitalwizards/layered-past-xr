// The demo's own scenery: what stands in each context, drawn in that context's style. Everything
// here is invented and procedural; nothing resembles a real place.
import { CylinderGeometry, Float32BufferAttribute } from 'three';
import { SURFACE } from '../../src/core/blend.ts';
import type { Context } from '../../src/core/content.ts';
import {
  blob,
  block,
  clearOfVisitor,
  column,
  dashedOutline,
  merge,
  pointAt,
  rectangle,
  seededRandom,
  SHAPE,
  yawOf,
} from '../../src/core/geometry.ts';
import type { ScenePart, Scenery } from '../../src/core/surroundings.ts';

const foundations = (random: () => number) =>
  Array.from({ length: 6 }, (_, k) => {
    const yaw = k * 60 + 15 + random() * 30;
    const centre = pointAt(yaw, 7 + random() * 5);
    const width = 3 + random() * 2.5;
    const depth = 3 + random() * 1.5;
    const height = 0.35 + random() * 0.5;
    const turn = -yaw;
    const r = (turn * Math.PI) / 180;
    // Four walls of a room; one is left out, as if robbed out or not yet excavated.
    const walls = [
      { offset: [0, -depth / 2], size: [width, height, 0.45] },
      { offset: [0, depth / 2], size: [width, height, 0.45] },
      { offset: [-width / 2, 0], size: [0.45, height, depth] },
      { offset: [width / 2, 0], size: [0.45, height, depth] },
    ] as const;
    const missing = Math.floor(random() * 4);
    if (!clearOfVisitor(centre, 4.5)) return [];
    return walls
      .filter((_, i) => i !== missing)
      .map(({ offset: [ox, oz], size }) =>
        block({
          at: [centre[0] + ox * Math.cos(r) + oz * Math.sin(r), centre[1] - ox * Math.sin(r) + oz * Math.cos(r)],
          size,
          turn,
        }),
      );
  }).flat();

/** Documented: an excavated site, "measured and recorded where they stand". */
const excavation = (context: Context): ScenePart[] => {
  const random = seededRandom(context.id);
  const standingStones = Array.from({ length: 5 }, () => {
    const yaw = 40 + random() * 280;
    return { yaw, at: pointAt(yaw, 3.5 + random() * 5), height: 1.2 + random() * 1.0, turn: random() * 40 - yaw };
  })
    .filter(({ at }) => clearOfVisitor(at))
    .map(({ at, height, turn }) => block({ at, size: [0.5, height, 0.3], turn }));
  const pedestals = context.claims.map((c) =>
    block({
      at: [c.anchor[0], c.anchor[2]],
      size: [0.45, Math.max(0.2, c.anchor[1] - 0.12), 0.45],
      turn: -yawOf(c.anchor[0], c.anchor[2]),
    }),
  );

  return [
    {
      name: 'structures',
      surface: SURFACE.volume,
      geometry: merge([...foundations(random), ...standingStones, ...pedestals]),
    },
  ];
};

const ring = (count: number, distance: number, offsetDeg = 0) =>
  Array.from({ length: count }, (_, i) => offsetDeg + (i * 360) / count).map((yaw) => ({
    yaw,
    at: pointAt(yaw, distance),
  }));

/** Imagined: the temple the voice describes, "tall columns, a golden roof, a sky full of smoke". */
const imaginedTemple = (context: Context): ScenePart[] => {
  const random = seededRandom(context.id);
  const inner = ring(12, 7.5, 15);
  const chord = 2 * 7.5 * Math.sin(Math.PI / 12);
  const temple = [
    ...inner.map(({ at }) => column(at, 0.32, 6.2)),
    ...inner.map(({ at, yaw }) => block({ at, size: [0.9, 0.3, 0.9], turn: -yaw, lift: 6.2 })),
    ...ring(12, 7.5, 30).map(({ at, yaw }) => block({ at, size: [chord + 0.3, 0.7, 0.8], turn: -yaw, lift: 6.5 })),
    ...ring(18, 15).map(({ at }) => column(at, 0.28, 4.2)),
  ];
  const [altarX, altarZ] = pointAt(120, 4.2);
  const altar = block({ at: [altarX, altarZ], size: [1.4, 1.0, 1.0], turn: -120 });
  const smoke = [
    ...Array.from({ length: 6 }, (_, i) =>
      blob([altarX + (random() - 0.5) * i * 0.4, 1.6 + i * 0.9, altarZ], 0.35 + i * 0.12),
    ),
    ...Array.from({ length: 22 }, () => {
      const [x, z] = pointAt(random() * 360, 14 + random() * 20);
      return blob([x, 9 + random() * 9, z], 0.8 + random() * 1.4);
    }),
  ];
  const pedestals = context.claims.map((c) =>
    column([c.anchor[0], c.anchor[2]], 0.22, Math.max(0.2, c.anchor[1] - 0.12)),
  );

  // The golden roof: a low cone resting on the entablature.
  const roof = new CylinderGeometry(0.6, 9.2, 2.4, 32, 1, true);
  roof.translate(0, 7.2 + 1.2, 0);
  roof.setAttribute(
    'aShape',
    new Float32BufferAttribute(new Array<number>(roof.getAttribute('position').count).fill(SHAPE.other), 1),
  );

  return [
    { name: 'structures', surface: SURFACE.volume, geometry: merge([...temple, altar, ...pedestals]) },
    { name: 'smoke', surface: SURFACE.smoke, geometry: merge(smoke) },
    { name: 'roof', surface: SURFACE.accent, geometry: roof },
  ];
};

/** Absent voice: only the outlines of houses, where people lived. */
const outlinesOfHouses = (context: Context): ScenePart[] => {
  const random = seededRandom(context.id);
  const houses = Array.from({ length: 6 }, (_, k) => {
    const yaw = k * 60 + random() * 40;
    return dashedOutline(rectangle(pointAt(yaw, 5 + random() * 6), 2.5 + random() * 1.5, 3 + random(), -yaw));
  });
  const marks = context.claims.map((c) =>
    dashedOutline(rectangle([c.anchor[0], c.anchor[2]], 0.8, 0.8, -yawOf(c.anchor[0], c.anchor[2]))),
  );

  return [{ name: 'outlines', surface: SURFACE.footprint, geometry: merge([...houses, ...marks]) }];
};

export const demoScenery: Scenery = (context, style) =>
  ({ solid: excavation, engraving: imaginedTemple, absent: outlinesOfHouses })[style](context);
