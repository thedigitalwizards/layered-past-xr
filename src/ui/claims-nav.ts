// Keyboard and screen-reader path to the lens: one button per detail in the world in front.
// Hidden until focused, so the screen stays clear.
import type { Content } from '../content.ts';
import type { Store } from '../state.ts';
import { h } from './dom.ts';

export type ClaimsNav = { readonly render: (content: Content, worldIndex: number) => void };

export const mountClaimsNav = (host: HTMLElement, store: Store): ClaimsNav => {
  let last = -1;
  return {
    render: (content, worldIndex) => {
      if (worldIndex === last) return;
      last = worldIndex;
      const world = content.worlds[worldIndex];
      host.replaceChildren(
        ...(world?.claims ?? []).map((claim) =>
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
