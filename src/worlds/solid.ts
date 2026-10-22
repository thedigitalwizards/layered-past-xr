// Documented: solid, lit, matte. The layout reads as an excavated site: low foundations and a few
// standing stones, "measured and recorded where they stand".
import { BackSide, Group, Mesh } from 'three';
import type { World } from '../content.ts';
import { createBlendUniforms, createWorldMaterial, SURFACE } from './blend.ts';
import { block, ground, hills, merge, named, pointAt, seededRandom, sky, yawOf } from './pieces.ts';
import type { WorldView } from './world.ts';

const FRAGMENT = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float diffuse = max(dot(n, normalize(vec3(0.48, 0.78, 0.40))), 0.0);
    vec3 colour;
    if (uSurface == ${SURFACE.sky}) {
      colour = mix(vec3(0.88, 0.89, 0.85), vec3(0.58, 0.68, 0.74), smooth01(0.0, 0.55, elevation()));
    } else if (uSurface == ${SURFACE.ground}) {
      colour = vec3(0.70, 0.66, 0.57) * (0.88 + 0.12 * noise(vWorldPos.xz * 0.8));
    } else if (uSurface == ${SURFACE.hills}) {
      colour = mix(vec3(0.50, 0.56, 0.52), vec3(0.62, 0.67, 0.64), vUv.y);
    } else {
      vec3 albedo = vec3(0.76, 0.72, 0.65) * (0.9 + 0.1 * noise(vWorldPos.xz * 4.0 + vWorldPos.y * 3.0));
      colour = albedo * (0.32 + 0.28 * (0.5 + 0.5 * n.y) + 0.55 * diffuse);
      colour *= 1.0 - 0.15 * (1.0 - smooth01(0.6, 1.8, edgePixels(n)));
      // Darker where stones meet the ground.
      colour *= mix(0.78, 1.0, smooth01(0.0, 0.4, vWorldPos.y));
    }
    gl_FragColor = vec4(colour * uReveal, 1.0);
  }
`;

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

export const buildSolidWorld = (world: World, index: number): WorldView => {
  const random = seededRandom(world.id);
  const blend = createBlendUniforms(index);
  const material = (surface: number) => createWorldMaterial(FRAGMENT, blend, surface);

  const standingStones = Array.from({ length: 5 }, () => {
    const yaw = 40 + random() * 280;
    return block({
      at: pointAt(yaw, 3.5 + random() * 5),
      size: [0.5, 1.2 + random() * 1.0, 0.3],
      turn: random() * 40 - yaw,
    });
  });
  const pedestals = world.claims.map((c) =>
    block({
      at: [c.anchor[0], c.anchor[2]],
      size: [0.45, Math.max(0.2, c.anchor[1] - 0.12), 0.45],
      turn: -yawOf(c.anchor[0], c.anchor[2]),
    }),
  );

  const group = new Group();
  group.name = world.id;
  group.add(
    named('sky', new Mesh(sky(), createWorldMaterial(FRAGMENT, blend, SURFACE.sky, {}, BackSide))),
    named('ground', new Mesh(ground(), material(SURFACE.ground))),
    named('hills', new Mesh(hills(world.id, 48, 2.5, 2.2), material(SURFACE.hills))),
    named(
      'structures',
      new Mesh(merge([...foundations(random), ...standingStones, ...pedestals]), material(SURFACE.volume)),
    ),
  );
  return { group, blend };
};
