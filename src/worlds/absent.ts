// Absent voice: near-dark, no volumes, only faint dashed outlines on the ground where houses stood.
// Nothing is drawn that this voice has not told us.
import { BackSide, Group, Mesh } from 'three';
import type { World } from '../content.ts';
import { createBlendUniforms, createWorldMaterial, SURFACE } from './blend.ts';
import { dashedOutline, ground, hills, merge, named, pointAt, rectangle, seededRandom, sky, yawOf } from './pieces.ts';
import type { WorldView } from './world.ts';

const FRAGMENT = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 colour;
    if (uSurface == ${SURFACE.sky}) {
      colour = mix(vec3(0.075, 0.085, 0.08), vec3(0.03, 0.035, 0.035), smooth01(0.0, 0.5, elevation()));
    } else if (uSurface == ${SURFACE.ground}) {
      colour = vec3(0.055, 0.062, 0.058);
    } else if (uSurface == ${SURFACE.hills}) {
      colour = vec3(0.085, 0.095, 0.09);
    } else {
      colour = vec3(0.30, 0.34, 0.32);
    }
    gl_FragColor = vec4(colour * uReveal, 1.0);
  }
`;

export const buildAbsentWorld = (world: World, index: number): WorldView => {
  const random = seededRandom(world.id);
  const blend = createBlendUniforms(index);
  const material = (surface: number) => createWorldMaterial(FRAGMENT, blend, surface);

  const houses = Array.from({ length: 6 }, (_, k) => {
    const yaw = k * 60 + random() * 40;
    return dashedOutline(rectangle(pointAt(yaw, 5 + random() * 6), 2.5 + random() * 1.5, 3 + random(), -yaw));
  });
  const marks = world.claims.map((c) =>
    dashedOutline(rectangle([c.anchor[0], c.anchor[2]], 0.8, 0.8, -yawOf(c.anchor[0], c.anchor[2]))),
  );

  const group = new Group();
  group.name = world.id;
  group.add(
    named('sky', new Mesh(sky(), createWorldMaterial(FRAGMENT, blend, SURFACE.sky, {}, BackSide))),
    named('ground', new Mesh(ground(), material(SURFACE.ground))),
    named('hills', new Mesh(hills(world.id, 50, 1.5, 1.0), material(SURFACE.hills))),
    named('outlines', new Mesh(merge([...houses, ...marks]), material(SURFACE.footprint))),
  );
  return { group, blend };
};
