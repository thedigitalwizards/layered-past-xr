// The surroundings of one context: sky, ground and hills in the context's style, plus whatever the
// example's scenery places there. In the code a "world" is these surroundings.
import { BackSide, Group, Mesh, type BufferGeometry } from 'three';
import { createBlendUniforms, createWorldMaterial, SURFACE, type BlendUniforms } from './blend.ts';
import { WORLD_STYLES, type WorldStyle } from './certainty.ts';
import type { Context } from './content.ts';
import { ground, hills, named, sky } from './geometry.ts';
import * as absent from './styles/absent.ts';
import * as engraving from './styles/engraving.ts';
import * as solid from './styles/solid.ts';

export type ScenePart = {
  readonly name: string;
  readonly geometry: BufferGeometry;
  /** Which kind of surface the style draws it as (see SURFACE in blend.ts). */
  readonly surface: number;
};

/** Provided by an example: what stands in a context, given the style it will be drawn in. */
export type Scenery = (context: Context, style: WorldStyle) => readonly ScenePart[];

export type WorldView = { readonly group: Group; readonly blend: BlendUniforms };

const STYLES = { solid, engraving, absent };

/** Content validation guarantees every context's certainty has a style. */
export const buildWorld = (context: Context, index: number, scenery: Scenery): WorldView => {
  const style = WORLD_STYLES[context.certainty]!;
  const { FRAGMENT, HILLS } = STYLES[style];
  const blend = createBlendUniforms(index);
  const material = (surface: number) => createWorldMaterial(FRAGMENT, blend, surface);
  const group = new Group();
  group.name = context.id;
  group.add(
    named('sky', new Mesh(sky(), createWorldMaterial(FRAGMENT, blend, SURFACE.sky, {}, BackSide))),
    named('ground', new Mesh(ground(), material(SURFACE.ground))),
    named('hills', new Mesh(hills(context.id, HILLS.radius, HILLS.base, HILLS.roughness), material(SURFACE.hills))),
    ...scenery(context, style).map((part) => named(part.name, new Mesh(part.geometry, material(part.surface)))),
  );
  return { group, blend };
};

export const setWorldWeight = (view: WorldView, weight: number): void => {
  view.blend.uWeight.value = weight;
  // A world with no share of the pixels costs nothing.
  view.group.visible = weight > 0;
};
