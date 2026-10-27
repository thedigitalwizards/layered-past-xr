import { CERTAINTY_COLOURS, CERTAINTY_LABELS } from '../certainty.ts';
import type { Certainty } from '../content.ts';
import { h } from './dom.ts';

/** Outlined pill in the certainty's colour, always with its name written out. */
export const certaintyPill = (certainty: Certainty): HTMLSpanElement =>
  h('span', { className: 'pill', style: `--pill: ${CERTAINTY_COLOURS[certainty]}` }, CERTAINTY_LABELS[certainty]);
