import type { Group } from 'three';
import { WORLD_STYLES } from '../certainty.ts';
import type { World } from '../content.ts';
import { buildAbsentWorld } from './absent.ts';
import type { BlendUniforms } from './blend.ts';
import { buildEngravingWorld } from './engraving.ts';
import { buildSolidWorld } from './solid.ts';

export type WorldView = { readonly group: Group; readonly blend: BlendUniforms };

const BUILDERS = { solid: buildSolidWorld, engraving: buildEngravingWorld, absent: buildAbsentWorld };

/** Content validation guarantees every world's certainty has a style. */
export const buildWorld = (world: World, index: number): WorldView =>
  BUILDERS[WORLD_STYLES[world.certainty]!](world, index);

export const setWorldWeight = (view: WorldView, weight: number): void => {
  view.blend.uWeight.value = weight;
  // A world with no share of the pixels costs nothing.
  view.group.visible = weight > 0;
};
