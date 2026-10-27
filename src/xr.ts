// Immersive VR on Quest. The baetyl stands in front of the visitor; the thumbstick moves through
// time one context at a time; pointing and pulling the trigger opens a claim. Captions follow the
// view at a comfortable distance.
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Raycaster,
  Vector3,
  type Object3D,
  type XRGripSpace,
  type XRTargetRaySpace,
} from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { CERTAINTY_COLOURS, CERTAINTY_LABELS } from './certainty.ts';
import { approvalLabel, findClaim, VOICE_LABELS, type Content } from './content.ts';
import { createPanel, minFontPx, PANEL_COLOURS, type Run } from './canvas-text.ts';
import type { Dial } from './dial.ts';
import type { Lens } from './lens.ts';
import { EYE_HEIGHT_M, type Stage } from './scene.ts';
import type { State, Store } from './state.ts';
import { VR_ICON } from './ui/buttons.ts';
import { byId } from './ui/dom.ts';

/** Below this head height the visitor is probably sitting: lift their eyes to standing height. */
const SEATED_BELOW_M = 1.35;
/** Thumbstick: past this it steps once; it must come back under the re-arm level to step again. */
const STICK = { step: 0.7, rearm: 0.3 } as const;

export type XrOptions = {
  readonly stage: Stage;
  readonly lens: Lens;
  readonly dial: Dial;
  readonly store: Store;
  readonly content: () => Content;
  /** Pressable things in the scene (the time dial); `userData.press` is called on the trigger. */
  readonly pressTargets: () => readonly Object3D[];
};

export type Xr = {
  readonly update: (weights: readonly number[], dtMs: number) => void;
  readonly aimedClaimId: () => string | null;
};

/** One thumbstick reading → a step (-1, 0, 1) and whether the stick is armed for the next one. */
export const stickStep = (x: number, armed: boolean): { readonly step: -1 | 0 | 1; readonly armed: boolean } => {
  if (armed && Math.abs(x) >= STICK.step) return { step: x > 0 ? 1 : -1, armed: false };
  return { step: 0, armed: armed || Math.abs(x) < STICK.rearm };
};

const ray = (): Line => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
  const line = new Line(geometry, new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
  line.scale.z = 8;
  line.visible = false;
  return line;
};

const captionRuns = (content: Content, weights: readonly number[], hint: boolean, px: number): Run[] => {
  const shown = weights
    .map((weight, i) => ({ weight, context: content.contexts[i]! }))
    .filter((s) => s.weight >= 0.3)
    .sort((a, b) => b.weight - a.weight);
  return [
    ...(hint
      ? [{ text: 'Push the thumbstick left or right to move through time', px, font: 'label', gapAfter: 18 } as const]
      : []),
    ...shown.flatMap(({ context, weight }, i): Run[] => [
      { text: `${context.title} · ${context.period}`, px, font: 'label', gapAfter: 8, alpha: i ? 0.7 : 1 },
      {
        text: CERTAINTY_LABELS[context.certainty],
        px,
        font: 'label',
        pill: CERTAINTY_COLOURS[context.certainty],
        gapAfter: 6,
      },
      {
        text: `Baetyl: ${CERTAINTY_LABELS[context.baetyl.certainty]}`,
        px,
        font: 'label',
        pill: CERTAINTY_COLOURS[context.baetyl.certainty],
        gapAfter: 10,
      },
      { text: context.audio.caption, px: Math.round(px * 1.15), gapAfter: 6, alpha: i ? 0.7 : 1 },
      {
        text: `${VOICE_LABELS[context.voice]}${context.audio.synthetic ? ' · Synthetic placeholder voice' : ''}`,
        px: Math.round(px * 0.85),
        font: 'label',
        colour: PANEL_COLOURS.muted,
        gapAfter: i === 0 && shown.length > 1 ? 28 : 0,
        alpha: weight < 0.5 ? 0.7 : 1,
      },
    ]),
  ];
};

export const setupXr = (o: XrOptions): Xr => {
  const { renderer, scene, world } = o.stage;
  const ui = new Group();
  ui.visible = false;
  scene.add(ui);

  // Panels, sized for the distance they are read at.
  const captionPx = minFontPx(1000, 1.4);
  const caption = createPanel(0.95, 1000, 40);
  const cardPx = minFontPx(1500, 1.0);
  const card = createPanel(0.75, 1500, 56);
  const beginPx = minFontPx(1500, 2.5);
  const beginPanel = createPanel(0.9, 1500, 48);
  ui.add(caption.mesh, card.mesh, beginPanel.mesh);
  card.mesh.visible = false;

  const factory = new XRControllerModelFactory();
  const raycaster = new Raycaster();
  const matrix = new Matrix4();
  const hands = [0, 1].map((index) => {
    const pointer = renderer.xr.getController(index) as XRTargetRaySpace;
    const grip = renderer.xr.getControllerGrip(index) as XRGripSpace;
    grip.add(factory.createControllerModel(grip));
    const beam = ray();
    pointer.add(beam);
    scene.add(pointer, grip);
    return { pointer, beam, source: null as XRInputSource | null, armed: true, aimed: null as string | null };
  });
  let aimed: string | null = null;
  let hintShown = true;
  let calibrateIn = 0;
  let captionKey = '';

  const aim = (pointer: Object3D, targets: readonly Object3D[]) => {
    matrix.identity().extractRotation(pointer.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(pointer.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(matrix);
    return raycaster.intersectObjects([...targets], false)[0];
  };

  hands.forEach((hand) => {
    hand.pointer.addEventListener('connected', (e) => {
      hand.source = e.data;
      hand.beam.visible = e.data.targetRayMode === 'tracked-pointer';
    });
    hand.pointer.addEventListener('disconnected', () => {
      hand.source = null;
      hand.beam.visible = false;
    });
    hand.pointer.addEventListener('select', () => {
      const state = o.store.get();
      if (!state.started) return o.store.dispatch({ type: 'begin' });
      if (state.openClaimId) return o.store.dispatch({ type: 'closeClaim' });
      const pressed = aim(hand.pointer, o.pressTargets())?.object;
      if (pressed) return (pressed.userData.press as () => void)();
      const claimId = aim(hand.pointer, o.lens.targets())?.object.userData.claimId as string | undefined;
      if (claimId) o.store.dispatch({ type: 'openClaim', claimId });
    });
  });

  const head = new Vector3();
  const forward = new Vector3();
  const lookFlat = () => {
    renderer.xr.getCamera().getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    return forward.normalize();
  };

  const showCard = (state: State) => {
    const found = state.openClaimId ? findClaim(o.content(), state.openClaimId) : undefined;
    card.mesh.visible = !!found && renderer.xr.isPresenting;
    if (!found || !renderer.xr.isPresenting) return;
    const { claim } = found;
    card.draw([
      { text: claim.title, px: Math.round(cardPx * 1.5), weight: 700, gapAfter: 14 },
      {
        text: CERTAINTY_LABELS[claim.certainty],
        px: cardPx,
        font: 'label',
        pill: CERTAINTY_COLOURS[claim.certainty],
        gapAfter: 18,
      },
      { text: claim.text, px: Math.round(cardPx * 1.1), gapAfter: 18 },
      {
        text: `Voice · ${VOICE_LABELS[claim.voice]}`,
        px: cardPx,
        font: 'label',
        colour: PANEL_COLOURS.muted,
        gapAfter: 8,
      },
      ...claim.evidence.map((e): Run => ({
        text: `Source · ${e.citation}`,
        px: cardPx,
        font: 'label',
        colour: PANEL_COLOURS.muted,
        gapAfter: 8,
      })),
      { text: approvalLabel(claim.approval), px: cardPx, font: 'label', colour: '#9A5413', gapAfter: 0 },
    ]);
    renderer.xr.getCamera().getWorldPosition(head);
    const dir = lookFlat();
    card.mesh.position.copy(head).addScaledVector(dir, 1.0);
    card.mesh.position.y = head.y - 0.12;
    card.mesh.lookAt(head.x, card.mesh.position.y, head.z);
  };

  o.store.subscribe((state, previous) => {
    if (state.openClaimId !== previous.openClaimId || state.approvals !== previous.approvals) showCard(state);
  });

  renderer.xr.addEventListener('sessionstart', () => {
    ui.visible = true;
    calibrateIn = 30;
    captionKey = '';
  });
  renderer.xr.addEventListener('sessionend', () => {
    ui.visible = false;
    world.position.set(0, 0, 0);
    world.rotation.set(0, 0, 0);
  });

  mountVrButton(renderer.xr);

  return {
    aimedClaimId: () => aimed,
    update: (weights, dtMs) => {
      if (!renderer.xr.isPresenting) return;
      renderer.xr.getCamera().getWorldPosition(head);
      const started = o.store.get().started;

      // Once the headset pose has settled: turn the scene so the baetyl stands in front of the
      // visitor, wherever they face, and give seated visitors standing eye height.
      if (calibrateIn > 0 && --calibrateIn === 0) {
        const dir = lookFlat();
        world.rotation.y = Math.atan2(-dir.x, -dir.z);
        world.position.set(head.x, head.y < SEATED_BELOW_M ? head.y - EYE_HEIGHT_M : 0, head.z);
      }

      hands.forEach((hand) => {
        const pad = hand.source?.gamepad;
        // xr-standard controllers put the thumbstick on axes 2 and 3.
        const x = pad ? (pad.axes[2] ?? pad.axes[0] ?? 0) : 0;
        const stick = stickStep(x, hand.armed);
        hand.armed = stick.armed;
        if (stick.step && started) o.dial.step(stick.step, performance.now());
        const hit =
          hand.beam.visible && started ? aim(hand.pointer, [...o.pressTargets(), ...o.lens.targets()]) : undefined;
        hand.aimed = (hit?.object.userData.claimId as string | undefined) ?? null;
        hand.beam.scale.z = hit?.distance ?? 8;
      });
      aimed = hands.find((h) => h.aimed)?.aimed ?? null;

      beginPanel.mesh.visible = !started && calibrateIn === 0;
      if (beginPanel.mesh.visible && beginPanel.mesh.userData.drawn !== true) {
        beginPanel.draw([
          { text: 'Begin', px: Math.round(beginPx * 1.3), weight: 700, gapAfter: 8 },
          { text: 'Pull the trigger', px: beginPx, font: 'label', colour: PANEL_COLOURS.muted },
        ]);
        beginPanel.mesh.userData.drawn = true;
        // Above the baetyl, facing the visitor.
        const dir = lookFlat();
        beginPanel.mesh.position.copy(head).addScaledVector(dir, 2.5);
        beginPanel.mesh.position.y = head.y + 0.35;
        beginPanel.mesh.lookAt(head);
      }

      // Captions: redrawn only when what they say changes, eased towards a spot below the view.
      if (hintShown && Math.round(o.dial.value()) !== 0) hintShown = false;
      const key = `${weights.map((w) => (w >= 0.3 ? 1 : 0)).join('')}${weights.indexOf(Math.max(...weights))}${hintShown}`;
      caption.mesh.visible = started;
      if (started && key !== captionKey) {
        captionKey = key;
        caption.draw(captionRuns(o.content(), weights, hintShown, captionPx));
      }
      const dir = lookFlat();
      const target = head.clone().addScaledVector(dir, 1.4);
      target.y = head.y - 0.5;
      caption.mesh.position.lerp(target, 1 - Math.exp(-dtMs / 350));
      caption.mesh.lookAt(head.x, caption.mesh.position.y + 0.25, head.z);
    },
  };
};

/** Round "Enter VR" button, shown only when the browser can open an immersive session. */
const mountVrButton = (xr: Stage['renderer']['xr']) => {
  const button = byId<HTMLButtonElement>('vr');
  button.innerHTML = VR_ICON;
  if (!('xr' in navigator) || !navigator.xr || !isSecureContext) return;
  void navigator.xr
    .isSessionSupported('immersive-vr')
    .then((supported) => {
      if (!supported) return;
      button.hidden = false;
      let session: XRSession | null = null;
      button.addEventListener('click', async () => {
        if (session) return void session.end();
        try {
          session = await navigator.xr!.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
          });
          session.addEventListener('end', () => {
            session = null;
            button.setAttribute('aria-label', 'Enter VR');
          });
          await xr.setSession(session);
          button.setAttribute('aria-label', 'Exit VR');
        } catch (error) {
          console.error('Could not start VR', error);
        }
      });
    })
    .catch(() => undefined);
};
