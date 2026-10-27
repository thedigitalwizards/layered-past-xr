// Keyboard and screen-reader path to the lens: one button per detail in the context in front.
// Hidden until focused, so the screen stays clear.
import type { Content } from '../content.ts';
import type { Store } from '../state.ts';
import { h } from './dom.ts';

export type ClaimsNav = { readonly render: (content: Content, contextIndex: number) => void };

export const mountClaimsNav = (host: HTMLElement, store: Store): ClaimsNav => {
  let last = -1;
  return {
    render: (content, contextIndex) => {
      if (contextIndex === last) return;
      last = contextIndex;
      const context = content.contexts[contextIndex];
      host.replaceChildren(
        ...(context?.claims ?? []).map((claim) =>
          h(
            'button',
            { type: 'button', onclick: () => store.dispatch({ type: 'openClaim', claimId: claim.id }) },
            `Inspect: ${claim.title}`,
          ),
        ),
      );
    },
  };
};
