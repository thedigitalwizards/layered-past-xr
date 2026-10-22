// Immersive VR on Quest: grab the stone with the grip button, twist the wrist to turn it,
// point and pull the trigger at a glowing detail. Captions follow the view at a comfortable distance.
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Quaternion,
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
import { TWIST_DEG_PER_WORLD, type Dial } from './dial.ts';
import type { Lens } from './lens.ts';
import { EYE_HEIGHT_M, type Stage } from './scene.ts';
import type { State, Store } from './state.ts';
import type { Stone } from './stone.ts';
import { VR_ICON } from './ui/buttons.ts';
import { byId } from './ui/dom.ts';

const REACH_M = 0.5;
const GRAB_DISTANCE_M = 0.3;
/** Below this head height the visitor is probably sitting: lift their eyes to standing height. */
const SEATED_BELOW_M = 1.35;

export type XrOptions = {
  readonly stage: Stage;
  readonly stone: Stone;
  readonly lens: Lens;
  readonly dial: Dial;
  readonly store: Store;
  readonly content: () => Content;
  readonly putOnPlinth: () => void;
  readonly holdInView: () => void;
};

export type Xr = {
  readonly update: (weights: readonly number[], dtMs: number) => void;
  readonly aimedClaimId: () => string | null;
};

/** Rotation of the hand around its own pointing axis since `start`, in degrees; clockwise is positive. */
export const twistDegrees = (start: Quaternion, current: Quaternion): number => {
  const forward = new Vector3(0, 0, -1).applyQuaternion(current);
  const project = (q: Quaternion) => {
    const right = new Vector3(1, 0, 0).applyQuaternion(q);
    return right.sub(forward.clone().multiplyScalar(right.dot(forward))).normalize();
  };
  const a = project(start);
  const b = project(current);
  // Looking along the pointing axis, a right-handed rotation appears clockwise.
  return (Math.atan2(new Vector3().crossVectors(a, b).dot(forward), a.dot(b)) * 180) / Math.PI;
};

const ray = (): Line => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
  const line = new Line(geometry, new LineBasicMaterial({ color: '#9CC2B0', transparent: true, opacity: 0.7 }));
  line.scale.z = 8;
  line.visible = false;
  return line;
};

const captionRuns = (content: Content, weights: readonly number[], hint: boolean, px: number): Run[] => {
  const shown = weights
    .map((weight, i) => ({ weight, world: content.worlds[i]! }))
    .filter((s) => s.weight >= 0.3)
    .sort((a, b) => b.weight - a.weight);
  return [
    ...(hint
      ? [{ text: 'Turn the stone to travel: hold grip and twist your wrist', px, font: 'label', gapAfter: 18 } as const]
      : []),
    ...shown.flatMap(({ world, weight }, i): Run[] => [
      { text: `${world.title} · ${world.period}`, px, font: 'label', gapAfter: 8, alpha: i ? 0.7 : 1 },
      {
        text: CERTAINTY_LABELS[world.certainty],
        px,
        font: 'label',
        pill: CERTAINTY_COLOURS[world.certainty],
        gapAfter: 10,
      },
      { text: world.audio.caption, px: Math.round(px * 1.15), gapAfter: 6, alpha: i ? 0.7 : 1 },
      {
        text: `${VOICE_LABELS[world.voice]}${world.audio.synthetic ? ' · Synthetic placeholder voice' : ''}`,
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
  const { renderer, scene, camera, world } = o.stage;
  const ui = new Group();
  ui.visible = false;
  scene.add(ui);

  // Panels, sized for the distance they are read at.
  const captionPx = minFontPx(1000, 1.4);
  const caption = createPanel(0.95, 1000, 40);
  const cardPx = minFontPx(1500, 1.0);
  const card = createPanel(0.75, 1500, 56);
  const promptPanel = createPanel(0.42, 1500, 36);
  ui.add(caption.mesh, card.mesh, promptPanel.mesh);
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
    return {
      index,
      pointer,
      grip,
      beam,
      aimed: null as string | null,
      twist: null as { start: Quaternion; dial: number } | null,
    };
  });
  let holding = -1;
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

  const near = (grip: XRGripSpace) =>
    o.stone.hitTarget.getWorldPosition(new Vector3()).distanceTo(grip.getWorldPosition(new Vector3())) <
    GRAB_DISTANCE_M;

  const hold = (index: number) => {
    const hand = hands[index]!;
    holding = index;
    hand.grip.add(o.stone.object);
    o.stone.object.position.set(0, 0.05, -0.04);
    o.stone.object.rotation.set(0, 0, 0);
  };

  const grab = (hand: (typeof hands)[number]) => {
    if (!o.store.get().started) {
      if (!near(hand.grip) && !aim(hand.pointer, [o.stone.hitTarget])) return;
      hold(hand.index);
      o.store.dispatch({ type: 'pickUp' });
    }
    if (hand.index !== holding) return;
    // Holding the grip turns the dial with the wrist; letting go lets it settle.
    hand.twist = { start: hand.grip.quaternion.clone(), dial: o.dial.value() };
    o.dial.hold();
  };

  hands.forEach((hand) => {
    hand.pointer.addEventListener('connected', (e) => (hand.beam.visible = e.data.targetRayMode === 'tracked-pointer'));
    hand.pointer.addEventListener('disconnected', () => (hand.beam.visible = false));
    hand.pointer.addEventListener('squeezestart', () => grab(hand));
    hand.pointer.addEventListener('squeezeend', () => {
      if (!hand.twist) return;
      hand.twist = null;
      o.dial.release(performance.now());
    });
    hand.pointer.addEventListener('select', () => {
      const state = o.store.get();
      if (!state.started) return grab(hand);
      if (state.openClaimId) return o.store.dispatch({ type: 'closeClaim' });
      const claimId = aim(hand.pointer, o.lens.targets())?.object.userData.claimId as string | undefined;
      if (claimId) o.store.dispatch({ type: 'openClaim', claimId });
    });
  });

  const head = new Vector3();
  const forward = new Vector3();
  const lookFlat = () => {
    camera.getWorldDirection(forward);
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
    const xrCamera = renderer.xr.getCamera();
    xrCamera.getWorldPosition(head);
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
    if (o.store.get().started) hold(1);
  });
  renderer.xr.addEventListener('sessionend', () => {
    ui.visible = false;
    holding = -1;
    world.position.y = 0;
    if (o.store.get().started) o.holdInView();
    else o.putOnPlinth();
  });

  mountVrButton(renderer.xr);

  return {
    aimedClaimId: () => aimed,
    update: (weights, dtMs) => {
      if (!renderer.xr.isPresenting) return;
      const xrCamera = renderer.xr.getCamera();
      xrCamera.getWorldPosition(head);
      const started = o.store.get().started;

      // Once the headset pose has settled: seated visitors get standing eye height,
      // and the stone waits within reach, in front of them.
      if (calibrateIn > 0 && --calibrateIn === 0) {
        world.position.y = head.y < SEATED_BELOW_M ? head.y - EYE_HEIGHT_M : 0;
        if (!started) {
          const dir = lookFlat();
          o.stone.plinth.position.set(head.x + dir.x * REACH_M, 0, head.z + dir.z * REACH_M);
          o.putOnPlinth();
          o.stone.object.position.set(o.stone.plinth.position.x, 0.98, o.stone.plinth.position.z);
        }
      }

      hands.forEach((hand) => {
        if (hand.twist)
          o.dial.set(hand.twist.dial + twistDegrees(hand.twist.start, hand.grip.quaternion) / TWIST_DEG_PER_WORLD);
        const hit = hand.beam.visible && started ? aim(hand.pointer, o.lens.targets()) : undefined;
        hand.aimed = (hit?.object.userData.claimId as string | undefined) ?? null;
        hand.beam.scale.z = hit?.distance ?? 8;
      });
      aimed = hands.find((h) => h.aimed)?.aimed ?? null;

      promptPanel.mesh.visible = !started && calibrateIn === 0;
      if (promptPanel.mesh.visible && promptPanel.mesh.userData.drawn !== true) {
        promptPanel.draw([
          { text: 'Pick up the stone', px: Math.round(minFontPx(1500, 0.7) * 1.3), weight: 700, gapAfter: 8 },
          { text: 'Reach for it and press grip', px: minFontPx(1500, 0.7), font: 'label', colour: PANEL_COLOURS.muted },
        ]);
        promptPanel.mesh.userData.drawn = true;
      }
      if (promptPanel.mesh.visible) {
        o.stone.hitTarget.getWorldPosition(promptPanel.mesh.position);
        promptPanel.mesh.position.y += 0.22;
        promptPanel.mesh.lookAt(head);
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
