import type { Certainty } from './content.ts';

/** How a world is drawn. Only three styles exist so far; see docs/certainty.md. */
export type WorldStyle = 'solid' | 'engraving' | 'absent';

export const CERTAINTY_LABELS: Readonly<Record<Certainty, string>> = {
  documented: 'Documented',
  interpreted: 'Interpreted',
  hypothesis: 'Hypothesis',
  imagined: 'Imagined',
  unknown: 'Unknown',
  'absent-voice': 'Absent voice',
};

export const CERTAINTY_COLOURS: Readonly<Record<Certainty, string>> = {
  documented: '#2E6B4F',
  interpreted: '#2F5D8A',
  hypothesis: '#9A5413',
  imagined: '#6B5A86',
  unknown: '#5E6762',
  'absent-voice': '#5E6762',
};

// TODO: add world styles for interpreted (painted), hypothesis (line drawing) and unknown (outlines).
export const WORLD_STYLES: Readonly<Partial<Record<Certainty, WorldStyle>>> = {
  documented: 'solid',
  imagined: 'engraving',
  'absent-voice': 'absent',
};
