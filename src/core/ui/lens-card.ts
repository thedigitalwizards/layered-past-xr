// The lens card: the claim behind a detail. A bottom sheet with title, certainty, text, voice,
// source and approval note. Closes with Esc, a click outside, or a swipe down.
import { approvalLabel, findClaim, isApproved, voiceLabel, type Content } from '../content.ts';
import type { Store } from '../state.ts';
import { certaintyPill } from './certainty-pill.ts';
import { h } from './dom.ts';

export type LensCard = {
  readonly render: (content: Content) => void;
  readonly contains: (target: EventTarget | null) => boolean;
};

export const mountLensCard = (card: HTMLElement, store: Store): LensCard => {
  const close = () => store.dispatch({ type: 'closeClaim' });
  card.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  let swipe: { y: number; id: number } | null = null;
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') swipe = { y: e.clientY, id: e.pointerId };
  });
  card.addEventListener('pointermove', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    card.style.transform = `translateY(${Math.max(0, e.clientY - swipe.y)}px)`;
  });
  const endSwipe = (e: PointerEvent) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const pulled = e.clientY - swipe.y;
    swipe = null;
    card.style.transform = '';
    if (pulled > 70) close();
  };
  card.addEventListener('pointerup', endSwipe);
  card.addEventListener('pointercancel', endSwipe);

  return {
    contains: (target) => target instanceof Node && card.contains(target),
    render: (content) => {
      const id = store.get().openClaimId;
      const found = id ? findClaim(content, id) : undefined;
      if (!found) {
        card.hidden = true;
        return;
      }
      const { claim } = found;
      const title = h('h2', { id: 'card-title', tabindex: '-1' }, claim.title);
      card.replaceChildren(
        h('span', { className: 'card__handle', 'aria-hidden': 'true' }),
        h('div', { className: 'card__head' }, title, certaintyPill(claim.certainty)),
        h('p', { className: 'card__text' }, claim.text),
        h('p', { className: 'card__meta' }, `Voice · ${voiceLabel(content, claim.voice)}`),
        ...(claim.evidence.length
          ? claim.evidence.map((e) =>
              h(
                'p',
                { className: 'card__meta' },
                'Source · ',
                e.url ? h('a', { href: e.url, rel: 'noopener', target: '_blank' }, e.citation) : e.citation,
              ),
            )
          : [h('p', { className: 'card__meta' }, 'Source · none recorded')]),
        h(
          'p',
          { className: isApproved(claim.approval) ? 'card__note' : 'card__note card__note--draft' },
          approvalLabel(claim.approval),
        ),
      );
      card.hidden = false;
      title.focus({ preventScroll: true });
    },
  };
};
