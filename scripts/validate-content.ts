import { existsSync, readFileSync } from 'node:fs';
import { validateContent } from '../src/core/validate.ts';

const root = new URL('../', import.meta.url);
const result = validateContent(JSON.parse(readFileSync(new URL('examples/demo/content.json', root), 'utf8')), (path) =>
  existsSync(new URL(`examples/demo/public/${path}`, root)),
);

if (!result.ok) {
  console.error(`examples/demo/content.json is invalid:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
const claims = result.content.contexts.reduce((n, w) => n + w.claims.length, 0);
console.log(`examples/demo/content.json is valid: ${result.content.contexts.length} contexts, ${claims} claims.`);
