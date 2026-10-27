// Desktop and mobile input. Dragging looks around. Moving through time: scroll or ← → on a desktop,
// a quick horizontal swipe on a touch screen. A short tap opens a claim or presses the time dial.
import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import type { Dial } from './dial.ts';
import type { Look } from './look.ts';
import type { Store } from './state.ts';

const TAP_SLOP_PX = 6;
const WHEEL_PAUSE_MS = 450;
/** A swipe is short, fast and mostly horizontal; anything slower is looking around. */
const SWIPE = { maxMs: 350, minPx: 50 } as const;

export type ControlsOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera;
  readonly claimTargets: () => readonly Object3D[];
  /** Pressable things in the scene (the time dial); `userData.press` is called on a tap. */
  readonly pressTargets: () => readonly Object3D[];
  readonly dial: Dial;
  readonly look: Look;
  readonly store: Store;
  /** True when a pointer event landed inside the lens card. */
  readonly inCard: (target: EventTarget | null) => boolean;
  /** Any interaction: brings the context label back. */
  readonly onActivity: () => void;
  readonly onAim: (claimId: string | null) => void;
};

export const attachControls = (o: ControlsOptions): void => {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hitAt = (x: number, y: number, targets: readonly Object3D[]) => {
    const rect = o.canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, o.camera);
    return raycaster.intersectObjects([...targets], false)[0]?.object;
  };

  let gesture: { x0: number; y0: number; x: number; y: number; t0: number; id: number; touch: boolean } | null = null;

  o.canvas.addEventListener('pointerdown', (e) => {
    if (gesture) return;
    o.onActivity();
    gesture = {
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      t0: performance.now(),
      id: e.pointerId,
      touch: e.pointerType === 'touch',
    };
    try {
      o.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Not every pointer can be captured (e.g. synthetic events); the gesture still works without it.
    }
  });

  o.canvas.addEventListener('pointermove', (e) => {
    if (gesture && gesture.id === e.pointerId) {
      o.look.drag(e.clientX - gesture.x, e.clientY - gesture.y);
      gesture.x = e.clientX;
      gesture.y = e.clientY;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const aimed = hitAt(e.clientX, e.clientY, o.claimTargets())?.userData.claimId as string | undefined;
    const pressable = !!hitAt(e.clientX, e.clientY, o.pressTargets());
    o.onAim(aimed ?? null);
    o.canvas.style.cursor = aimed || pressable ? 'pointer' : 'grab';
  });

  const end = (e: PointerEvent) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    if (e.type === 'pointercancel') return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const state = o.store.get();

    const swiped =
      g.touch &&
      performance.now() - g.t0 < SWIPE.maxMs &&
      Math.abs(dx) > SWIPE.minPx &&
      Math.abs(dx) > 2 * Math.abs(dy);
    if (swiped && state.started) {
      // The swipe also turned the view a little while it moved: put the view back.
      o.look.drag(-dx, -dy);
      o.dial.step(dx < 0 ? 1 : -1, performance.now());
      return;
    }

    if (Math.hypot(dx, dy) >= TAP_SLOP_PX || !state.started) return;
    const pressed = hitAt(e.clientX, e.clientY, o.pressTargets());
    if (pressed) return void (pressed.userData.press as () => void)();
    const claimId = hitAt(e.clientX, e.clientY, o.claimTargets())?.userData.claimId as string | undefined;
    if (claimId) o.store.dispatch({ type: 'openClaim', claimId });
    else if (state.openClaimId) o.store.dispatch({ type: 'closeClaim' });
  };
  o.canvas.addEventListener('pointerup', end);
  o.canvas.addEventListener('pointercancel', end);

  let lastWheelStep = 0;
  o.canvas.addEventListener(
    'wheel',
    (e) => {
      if (!o.store.get().started) return;
      e.preventDefault();
      o.onActivity();
      // One step per scroll gesture: trackpads send many small events, so wait for a pause.
      const now = performance.now();
      if (Math.abs(e.deltaY) < 4) return;
      if (now - lastWheelStep < WHEEL_PAUSE_MS) {
        lastWheelStep = now;
        return;
      }
      lastWheelStep = now;
      o.dial.step(e.deltaY > 0 ? 1 : -1, now);
    },
    { passive: false },
  );

  // A click outside the card (on the page, not the scene) also closes it.
  document.addEventListener('pointerdown', (e) => {
    if (o.store.get().openClaimId && e.target !== o.canvas && !o.inCard(e.target))
      o.store.dispatch({ type: 'closeClaim' });
  });

  window.addEventListener('keydown', (e) => {
    o.onActivity();
    if (e.key === 'Escape') o.store.dispatch({ type: 'closeClaim' });
    if (e.target instanceof HTMLButtonElement) return;
    if (!o.store.get().started) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        o.store.dispatch({ type: 'begin' });
      }
      return;
    }
    if (e.key === 'ArrowRight') o.dial.step(1, performance.now());
    if (e.key === 'ArrowLeft') o.dial.step(-1, performance.now());
  });
};
