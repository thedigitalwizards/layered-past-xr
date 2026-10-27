// Bottom centre: what the voice is saying. Halfway between contexts both voices are heard, so the
// quieter one's caption sits above, smaller.
import { voiceLabel, type Content } from '../content.ts';
import { h } from './dom.ts';

export type Caption = { readonly render: (weights: readonly number[]) => void };

export const mountCaption = (host: HTMLElement, content: Content): Caption => {
  let lastKey = '';
  const line = (i: number, secondary: boolean) => {
    const context = content.contexts[i]!;
    return h(
      'div',
      { className: secondary ? 'caption__line caption__line--secondary' : 'caption__line', lang: 'en' },
      h('p', { className: 'caption__text' }, context.audio.caption),
      h(
        'p',
        { className: 'caption__source' },
        voiceLabel(content, context.voice),
        context.audio.synthetic ? ' · Synthetic placeholder voice' : '',
      ),
    );
  };
  return {
    render: (weights) => {
      const ranked = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0]);
      const [first, second] = ranked;
      if (!first) return;
      const both = second && second[0] >= 0.3;
      const key = both ? `${first[1]}+${second[1]}` : `${first[1]}`;
      if (key === lastKey) return;
      lastKey = key;
      host.replaceChildren(...(both ? [line(second[1], true)] : []), line(first[1], false));
    },
  };
};
