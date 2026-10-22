// /editor: heritage experts review and approve claims. Changes are overrides in localStorage,
// shown in the experience at once, and can be exported as the full content JSON.
import '../styles.css';
import './editor.css';
import rawContent from '../../content/demo.json';
import {
  applyOverrides,
  approve,
  loadOverrides,
  markReviewed,
  saveOverrides,
  today,
  type Overrides,
} from '../approvals.ts';
import { approvalLabel, VOICE_LABELS, type Claim, type Content } from '../content.ts';
import { certaintyPill } from '../ui/certainty-pill.ts';
import { byId, h } from '../ui/dom.ts';

const base = rawContent as unknown as Content;
const NAME_KEY = 'layered-past-xr:reviewer';
const list = byId('claims');
const status = byId('status');
const dialog = byId<HTMLDialogElement>('name-dialog');
const nameInput = byId<HTMLInputElement>('name');

let overrides: Overrides = loadOverrides();

const rememberedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
};

/** Asks for the reviewer's name (a native dialog; window.prompt is blocked in some browsers). */
const askName = (): Promise<string | null> =>
  new Promise((resolve) => {
    nameInput.value = rememberedName();
    dialog.returnValue = '';
    dialog.addEventListener(
      'close',
      () => {
        const name = nameInput.value.trim();
        if (dialog.returnValue !== 'ok' || !name) return resolve(null);
        try {
          localStorage.setItem(NAME_KEY, name);
        } catch {
          // Not remembered next time; still used now.
        }
        resolve(name);
      },
      { once: true },
    );
    dialog.showModal();
  });

const record = async (claim: Claim, action: typeof markReviewed, done: string) => {
  const name = await askName();
  if (!name) return;
  overrides = action(overrides, claim.id, name, today());
  status.textContent = saveOverrides(overrides)
    ? `${claim.title}: ${done} by ${name}.`
    : 'This browser does not allow saving; export the JSON before leaving.';
  render();
};

const claimEntry = (claim: Claim) =>
  h(
    'article',
    { className: 'claim' },
    h('div', { className: 'claim__head' }, h('h3', {}, claim.title), certaintyPill(claim.certainty)),
    h('p', {}, claim.text),
    h('p', { className: 'meta' }, `Voice · ${VOICE_LABELS[claim.voice]}`),
    ...(claim.evidence.length
      ? claim.evidence.map((e) => h('p', { className: 'meta' }, `Source · ${e.citation}`))
      : [h('p', { className: 'meta' }, 'Source · none recorded')]),
    h('p', { className: `meta status--${claim.approval.status}` }, approvalLabel(claim.approval)),
    h(
      'p',
      { className: 'actions' },
      h(
        'button',
        {
          type: 'button',
          disabled: claim.approval.status !== 'draft',
          onclick: () => void record(claim, markReviewed, 'marked reviewed'),
        },
        'Mark reviewed',
      ),
      h(
        'button',
        {
          type: 'button',
          disabled: claim.approval.status === 'approved',
          onclick: () => void record(claim, approve, 'approved'),
        },
        'Approve',
      ),
    ),
  );

const render = () => {
  const content = applyOverrides(base, overrides);
  list.replaceChildren(
    ...content.worlds.map((world) =>
      h('section', {}, h('h2', {}, `${world.title} · ${VOICE_LABELS[world.voice]}`), ...world.claims.map(claimEntry)),
    ),
  );
};

byId('export').addEventListener('click', () => {
  const json = `${JSON.stringify(applyOverrides(base, overrides), null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = h('a', { href: url, download: `demo-reviewed-${today()}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Exported. Send the file to the team, or use it to replace content/demo.json.';
});

render();
