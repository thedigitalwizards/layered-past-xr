// Bottom right: sound on/off, and Enter VR when the browser supports it. Icons only, labelled for
// screen readers.
import type { Store } from '../state.ts';

const SOUND_ON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SOUND_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
export const VR_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3.2l-1.8-2.4a1.9 1.9 0 0 0-3 0L8.7 16.5H5.5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.3" cy="11.3" r="1.5" fill="currentColor"/><circle cx="15.7" cy="11.3" r="1.5" fill="currentColor"/></svg>';

export const mountSoundButton = (button: HTMLButtonElement, store: Store): void => {
  const render = () => {
    const muted = store.get().muted;
    button.innerHTML = muted ? SOUND_OFF : SOUND_ON;
    button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    button.setAttribute('aria-pressed', String(!muted));
  };
  button.addEventListener('click', () => store.dispatch({ type: 'toggleSound' }));
  store.subscribe((s, p) => s.muted !== p.muted && render());
  render();
};
