import '@fontsource/gentium-book-plus/latin-400.css';
import '@fontsource/gentium-book-plus/latin-700.css';
import '@fontsource/ibm-plex-sans-condensed/latin-500.css';
import './styles.css';
import rawContent from '../content/demo.json';
import { applyOverrides, loadOverrides, STORAGE_KEY } from './approvals.ts';
import { createVoices } from './audio.ts';
import type { Content } from './content.ts';
import { attachControls } from './controls.ts';
import { mountDebug } from './debug.ts';
import { createDial, nearestWorld, TRANSITION_MS, worldWeights } from './dial.ts';
import { createLens } from './lens.ts';
import { createLook } from './look.ts';
import { createStage } from './scene.ts';
import { createStore, initialState } from './state.ts';
import { createStone, STONE_HEIGHT_M } from './stone.ts';
import { mountSoundButton } from './ui/buttons.ts';
import { mountCaption } from './ui/caption.ts';
import { mountClaimsNav } from './ui/claims-nav.ts';
import { byId } from './ui/dom.ts';
import { mountLabel } from './ui/label.ts';
import { mountLensCard } from './ui/lens-card.ts';
import { mountPrompt } from './ui/prompt.ts';
import { reveal } from './worlds/blend.ts';
import { buildWorld, setWorldWeight } from './worlds/world.ts';
import { setupXr } from './xr.ts';

// Validated against schema/demo.schema.json at build time (vite.config.ts).
const baseContent = rawContent as unknown as Content;
const store = createStore(initialState(loadOverrides()));
let content = applyOverrides(baseContent, store.get().approvals);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const stage = createStage(byId('viewport'));
const { renderer, scene, camera, world } = stage;
const worlds = content.worlds.map(buildWorld);
worlds.forEach((w) => world.add(w.group));
const stone = createStone(
  content.worlds,
  worlds.map((w) => w.blend),
);
const lens = createLens(content);
world.add(lens.group);

// Before the experience starts, the stone waits on a plinth just in front of the visitor.
const PLINTH_DISTANCE_M = 1.3;
stone.plinth.position.set(0, 0, -PLINTH_DISTANCE_M);
world.add(stone.plinth);
const putOnPlinth = () => {
  world.add(stone.object);
  stone.object.position.set(0, 0.9 + STONE_HEIGHT_M / 2, -PLINTH_DISTANCE_M);
  stone.object.rotation.set(0, 0, 0);
};
const holdInView = () => {
  camera.add(stone.object);
  stone.object.position.set(0, -0.2, -0.55);
  stone.object.rotation.set(0.12, 0, 0);
};
putOnPlinth();

const dial = createDial(worlds.length, { instant: () => reducedMotion.matches });
const look = createLook(camera, -25);
const voices = createVoices(camera, content.worlds);

const label = mountLabel(byId('label'), content);
const caption = mountCaption(byId('caption'), content);
const prompt = mountPrompt(byId('prompt'));
const card = mountLensCard(byId('card'), store);
const claimsNav = mountClaimsNav(byId('claims-nav'), store);
mountSoundButton(byId<HTMLButtonElement>('sound'), store);
const debug = new URLSearchParams(location.search).has('debug') ? mountDebug(renderer) : null;

let aimedClaimId: string | null = null;
attachControls({
  canvas: renderer.domElement,
  camera,
  stoneTarget: stone.hitTarget,
  claimTargets: lens.targets,
  dial,
  look,
  store,
  inCard: card.contains,
  onActivity: () => store.get().started && label.wake(),
  onAim: (id) => (aimedClaimId = id),
});

const xr = setupXr({
  stage,
  stone,
  lens,
  dial,
  store,
  content: () => content,
  putOnPlinth,
  holdInView,
});

prompt.show('Pick up the stone');
let startedAt = -1;
let travelled = false;

store.subscribe((state, previous) => {
  if (state.started && !previous.started) {
    startedAt = performance.now();
    stone.plinth.visible = false;
    if (!renderer.xr.isPresenting) holdInView();
    look.pitchTo(-4);
    void voices.start();
    if (matchMedia('(pointer: coarse)').matches) void look.useDeviceOrientation();
    prompt.show(renderer.xr.isPresenting ? null : 'Turn the stone to travel');
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
  const weights = worldWeights(value, worlds.length);
  const nearest = nearestWorld(value);

  // The worlds come out of the dark when the stone is picked up.
  reveal.value = started ? (reducedMotion.matches ? 1 : Math.min(1, (now - startedAt) / TRANSITION_MS)) : 0;
  worlds.forEach((w, i) => setWorldWeight(w, weights[i] ?? 0));
  if (!renderer.xr.isPresenting) {
    stone.turnTo(value);
    look.update(dt);
  }

  if (started) {
    voices.update(weights);
    label.render(weights);
    caption.render(weights);
    claimsNav.render(content, nearest);
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
