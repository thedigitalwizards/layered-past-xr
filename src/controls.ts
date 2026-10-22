// Desktop and mobile input. A drag that starts on the stone turns the dial (a swipe on the stone
// on a phone); a drag anywhere else looks around. A short tap picks up the stone or opens a claim.
import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import { SWIPE_PX_PER_WORLD, type Dial } from './dial.ts';
import type { Look } from './look.ts';
import type { Store } from './state.ts';

const TAP_SLOP_PX = 6;
const WHEEL_PAUSE_MS = 450;

export type ControlsOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera;
  readonly stoneTarget: Object3D;
  readonly claimTargets: () => readonly Object3D[];
  readonly dial: Dial;
  readonly look: Look;
  readonly store: Store;
  /** True when a pointer event landed inside the lens card. */
  readonly inCard: (target: EventTarget | null) => boolean;
  /** Any interaction: brings the world label back. */
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
    // The stone may have just moved (picked up) without a frame drawn since.
    targets.forEach((t) => t.updateWorldMatrix(true, false));
    return raycaster.intersectObjects([...targets], false)[0]?.object;
  };

  let gesture: {
    mode: 'dial' | 'look';
    x0: number;
    y0: number;
    x: number;
    y: number;
    dial0: number;
    id: number;
  } | null = null;

  o.canvas.addEventListener('pointerdown', (e) => {
    if (gesture) return;
    o.onActivity();
    const onStone = !!hitAt(e.clientX, e.clientY, [o.stoneTarget]);
    const mode = onStone && o.store.get().started ? 'dial' : 'look';
    if (mode === 'dial') o.dial.hold();
    gesture = {
      mode,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      dial0: o.dial.value(),
      id: e.pointerId,
    };
    try {
      o.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Not every pointer can be captured (e.g. synthetic events); the gesture still works without it.
    }
  });

  o.canvas.addEventListener('pointermove', (e) => {
    if (gesture && gesture.id === e.pointerId) {
      if (gesture.mode === 'dial') o.dial.set(gesture.dial0 + (e.clientX - gesture.x0) / SWIPE_PX_PER_WORLD);
      else o.look.drag(e.clientX - gesture.x, e.clientY - gesture.y);
      gesture.x = e.clientX;
      gesture.y = e.clientY;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const aimed = hitAt(e.clientX, e.clientY, o.claimTargets())?.userData.claimId as string | undefined;
    const onStone = !!hitAt(e.clientX, e.clientY, [o.stoneTarget]);
    o.onAim(aimed ?? null);
    o.canvas.style.cursor = aimed || (onStone && !o.store.get().started) ? 'pointer' : onStone ? 'ew-resize' : 'grab';
  });

  const end = (e: PointerEvent) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    if (g.mode === 'dial') o.dial.release(performance.now());
    const tapped = Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < TAP_SLOP_PX;
    if (!tapped || e.type === 'pointercancel') return;
    const state = o.store.get();
    if (!state.started) {
      if (hitAt(e.clientX, e.clientY, [o.stoneTarget])) o.store.dispatch({ type: 'pickUp' });
      return;
    }
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
      if (Math.abs(e.deltaY) < 4 || now - lastWheelStep < WHEEL_PAUSE_MS) {
        lastWheelStep = Math.abs(e.deltaY) < 4 ? lastWheelStep : now;
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
        o.store.dispatch({ type: 'pickUp' });
      }
      return;
    }
    if (e.key === 'ArrowRight') o.dial.step(1, performance.now());
    if (e.key === 'ArrowLeft') o.dial.step(-1, performance.now());
  });
};
