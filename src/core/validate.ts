// Content validation for build time and tests. Not imported by the app, so Ajv stays out of the bundle.
import { Ajv2020 } from 'ajv/dist/2020.js';
import schema from './content.schema.json' with { type: 'json' };
import { WORLD_STYLES } from './certainty.ts';
import type { Content } from './content.ts';

export type Validation =
  { readonly ok: true; readonly content: Content } | { readonly ok: false; readonly errors: string[] };

const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

const duplicates = (ids: readonly string[]) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

/** Rules the schema cannot express. `fileExists` checks audio paths (relative to the example's public folder). */
export const contentErrors = (content: Content, fileExists: (path: string) => boolean = () => true): string[] => {
  const claims = content.contexts.flatMap((w) => w.claims);
  return [
    ...duplicates([...content.contexts, ...(content.pendingContexts ?? [])].map((w) => w.id)).map(
      (id) => `duplicate context id "${id}"`,
    ),
    ...duplicates(claims.map((c) => c.id)).map((id) => `duplicate claim id "${id}"`),
    ...[
      ...content.contexts.map((c) => ({ where: `context "${c.id}"`, voice: c.voice })),
      ...claims.map((c) => ({ where: `claim "${c.id}"`, voice: c.voice })),
    ]
      .filter(({ voice }) => !(voice in content.voices))
      .map(({ where, voice }) => `${where}: voice "${voice}" is not declared in voices`),
    ...content.contexts
      .filter((w) => !WORLD_STYLES[w.certainty])
      .map((w) => `context "${w.id}": there is no context style for certainty "${w.certainty}" yet`),
    ...content.contexts
      .filter((w) => !fileExists(w.audio.src))
      .map((w) => `context "${w.id}": audio file ${w.audio.src} not found`),
    ...claims
      .filter((c) => {
        const d = Math.hypot(c.anchor[0], c.anchor[2]);
        return d < 2 || d > 20;
      })
      .map((c) => `claim "${c.id}": anchor should be 2–20 m from the central object`),
    ...claims
      .filter((c) => c.approval.status !== 'draft' && (!c.approval.by || !c.approval.date))
      .map((c) => `claim "${c.id}": a ${c.approval.status} claim needs "by" and "date"`),
  ];
};

export const validateContent = (data: unknown, fileExists?: (path: string) => boolean): Validation => {
  if (!validateSchema(data)) {
    return {
      ok: false,
      errors: (validateSchema.errors ?? []).map((e) => {
        const allowed = e.params && 'allowedValues' in e.params ? ` (${String(e.params.allowedValues)})` : '';
        return `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}${allowed}`;
      }),
    };
  }
  const errors = contentErrors(data as Content, fileExists);
  return errors.length ? { ok: false, errors } : { ok: true, content: data as Content };
};
