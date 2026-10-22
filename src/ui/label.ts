// Top left: which world this is, its period and its certainty. Fades after a few quiet seconds and
// comes back when the world changes or the visitor does something.
import type { Content } from '../content.ts';
import { certaintyPill } from './certainty-pill.ts';
import { h } from './dom.ts';

const FADE_AFTER_MS = 3000;

export type Label = {
  readonly render: (weights: readonly number[]) => void;
  /** Shows the label again and restarts the fade timer. */
  readonly wake: () => void;
};

export const mountLabel = (host: HTMLElement, content: Content): Label => {
  let timer: number | undefined;
  let lastKey = '';
  const wake = () => {
    host.classList.add('is-awake');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => host.classList.remove('is-awake'), FADE_AFTER_MS);
  };
  return {
    wake,
    render: (weights) => {
      // Halfway between two worlds both are named, strongest first.
      const shown = weights
        .map((weight, i) => ({ weight, world: content.worlds[i]! }))
        .filter((s) => s.weight >= 0.15)
        .sort((a, b) => b.weight - a.weight);
      const key = shown.map((s) => s.world.id).join('+');
      if (key === lastKey) return;
      lastKey = key;
      host.replaceChildren(
        ...shown.map(({ world }) =>
          h(
            'p',
            { className: 'label__world' },
            h('span', {}, `${world.title} · ${world.period}`),
            certaintyPill(world.certainty),
          ),
        ),
      );
      wake();
    },
  };
};
