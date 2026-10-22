import { existsSync, readFileSync } from 'node:fs';
import { validateContent } from '../src/validate.ts';

const root = new URL('../', import.meta.url);
const result = validateContent(JSON.parse(readFileSync(new URL('content/demo.json', root), 'utf8')), (path) =>
  existsSync(new URL(`public/${path}`, root)),
);

if (!result.ok) {
  console.error(`content/demo.json is invalid:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
const claims = result.content.worlds.reduce((n, w) => n + w.claims.length, 0);
console.log(`content/demo.json is valid: ${result.content.worlds.length} worlds, ${claims} claims.`);
