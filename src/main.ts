import { Group } from 'three';
import './styles.css';
import { baetylShape } from '../examples/demo/baetyl.ts';
import rawContent from '../examples/demo/content.json';
import { demoScenery } from '../examples/demo/scenery.ts';
import { applyOverrides, loadOverrides, STORAGE_KEY } from './core/approvals.ts';
import { createVoices } from './core/audio.ts';
import { createCentralObject } from './core/central-object.ts';
import type { Content } from './core/content.ts';
import { attachControls } from './core/controls.ts';
import { mountDebug } from './core/debug.ts';
import { createDial, nearestContext, TRANSITION_MS, contextWeights } from './core/dial.ts';
import { createLens } from './core/lens.ts';
import { createLook } from './core/look.ts';
import { createStage } from './core/scene.ts';
import { createStore, initialState } from './core/state.ts';
import { createTimeDial } from './core/time-dial.ts';
import { mountSoundButton } from './core/ui/buttons.ts';
import { mountCaption } from './core/ui/caption.ts';
import { mountClaimsNav } from './core/ui/claims-nav.ts';
import { byId } from './core/ui/dom.ts';
import { mountLabel } from './core/ui/label.ts';
import { mountLensCard } from './core/ui/lens-card.ts';
import { mountPrompt } from './core/ui/prompt.ts';
import { reveal } from './core/blend.ts';
import { VISITOR_DISTANCE_M } from './core/geometry.ts';
import { buildWorld, setWorldWeight } from './core/surroundings.ts';
import { setupXr } from './core/xr.ts';

// Validated against schema/demo.schema.json at build time (vite.config.ts).
const baseContent = rawContent as unknown as Content;
const store = createStore(initialState(loadOverrides()));
let content = applyOverrides(baseContent, store.get().approvals);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const stage = createStage(byId('viewport'));
const { renderer, scene, camera, world } = stage;

// Everything in a context is laid out around the baetyl, which stands in front of the visitor.
const site = new Group();
site.position.set(0, 0, -VISITOR_DISTANCE_M);
world.add(site);
const worlds = content.contexts.map((context, i) => buildWorld(context, i, demoScenery));
worlds.forEach((w) => site.add(w.group));
site.add(
  createCentralObject(
    content.contexts,
    worlds.map((w) => w.blend),
    baetylShape,
  ),
);
const lens = createLens(content);
site.add(lens.group);

const dial = createDial({ instant: () => reducedMotion.matches });
const look = createLook(camera, -6);
const voices = createVoices(camera, content.contexts);

const label = mountLabel(byId('label'), content);
const caption = mountCaption(byId('caption'), content);
const prompt = mountPrompt(byId('prompt'));
const card = mountLensCard(byId('card'), store);
const claimsNav = mountClaimsNav(byId('claims-nav'), store);
mountSoundButton(byId<HTMLButtonElement>('sound'), store);
const debug = new URLSearchParams(location.search).has('debug') ? mountDebug(renderer) : null;

const timeDial = createTimeDial(content, {
  step: (direction) => dial.step(direction, performance.now()),
  goTo: (index) => dial.goTo(index, worlds.length, performance.now()),
});
site.add(timeDial.group);

let aimedClaimId: string | null = null;
attachControls({
  canvas: renderer.domElement,
  camera,
  claimTargets: lens.targets,
  pressTargets: timeDial.targets,
  dial,
  look,
  store,
  inCard: card.contains,
  onActivity: () => store.get().started && label.wake(),
  onAim: (id) => (aimedClaimId = id),
});

const xr = setupXr({ stage, lens, dial, store, content: () => content, pressTargets: timeDial.targets });

const beginButton = byId<HTMLButtonElement>('begin');
beginButton.addEventListener('click', () => store.dispatch({ type: 'begin' }));
const travelHint = matchMedia('(pointer: coarse)').matches
  ? 'Swipe left or right to move through time'
  : 'Scroll, or press ← →, to move through time';
let startedAt = -1;
let travelled = false;

store.subscribe((state, previous) => {
  if (state.started && !previous.started) {
    startedAt = performance.now();
    beginButton.hidden = true;
    timeDial.setVisible(true);
    void voices.start();
    if (matchMedia('(pointer: coarse)').matches) void look.useDeviceOrientation();
    prompt.show(renderer.xr.isPresenting ? null : travelHint);
  }
  if (state.muted !== previous.muted) voices.setMuted(state.muted);
  if (state.approvals !== previous.approvals) content = applyOverrides(baseContent, state.approvals);
  if (state.openClaimId !== previous.openClaimId || state.approvals !== previous.approvals) card.render(content);
});

// Approvals made in the editor, in another tab, appear here straight away.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) store.dispatch({ type: 'setApprovals', approvals: loadOverrides() });
});

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(100, now - last);
  last = now;
  const started = store.get().started;
  const value = dial.update(now);
  const weights = contextWeights(value, worlds.length);
  const nearest = nearestContext(value, worlds.length);

  // The contexts come out of the dark when the visitor begins.
  reveal.value = started ? (reducedMotion.matches ? 1 : Math.min(1, (now - startedAt) / TRANSITION_MS)) : 0;
  worlds.forEach((w, i) => setWorldWeight(w, weights[i] ?? 0));
  if (!renderer.xr.isPresenting) look.update();

  if (started) {
    voices.update(weights);
    label.render(weights);
    caption.render(weights);
    claimsNav.render(content, nearest);
    timeDial.render(nearest);
    if (!travelled && nearest !== 0) {
      travelled = true;
      prompt.show(null);
    }
  }
  lens.update(started ? weights : weights.map(() => 0), now, aimedClaimId ?? xr.aimedClaimId());
  xr.update(weights, dt);
  debug?.update(now, renderer.xr.isPresenting);
  renderer.render(scene, camera);
});
