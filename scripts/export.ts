// npm run export — writes export/<context>.glb and export/demo.jsonld for the demo example.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { baetylShape } from '../examples/demo/baetyl.ts';
import { demoScenery } from '../examples/demo/scenery.ts';
import { paradataScene } from '../src/core/gltf-export.ts';
import { toJsonLd } from '../src/core/jsonld.ts';
import { validateContent } from '../src/core/validate.ts';
// GLTFExporter reads Blobs with a FileReader, which Node lacks. A plain function returning an
// object works with `new`, so no class is needed.
type Reader = { result: ArrayBuffer | null; onloadend: (() => void) | null; readAsArrayBuffer: (blob: Blob) => void };
(globalThis as Record<string, unknown>).FileReader = function FileReader(): Reader {
  const reader: Reader = {
    result: null,
    onloadend: null,
    readAsArrayBuffer: (blob) =>
      void blob.arrayBuffer().then((buffer) => {
        reader.result = buffer;
        reader.onloadend?.();
      }),
  };
  return reader;
};

const result = validateContent(
  JSON.parse(readFileSync(new URL('../examples/demo/content.json', import.meta.url), 'utf8')),
);
if (!result.ok) {
  console.error(`examples/demo/content.json is invalid:\n${result.errors.join('\n')}`);
  process.exit(1);
}
const content = result.content;

const out = new URL('../export/', import.meta.url);
mkdirSync(out, { recursive: true });
const exporter = new GLTFExporter();
for (const [index, context] of content.contexts.entries()) {
  const glb = (await exporter.parseAsync(paradataScene(content, context, index, demoScenery, baetylShape), {
    binary: true,
  })) as ArrayBuffer;
  writeFileSync(new URL(`${context.id}.glb`, out), Buffer.from(glb));
  console.log(`export/${context.id}.glb  ${(glb.byteLength / 1024).toFixed(0)} kB, ${context.claims.length} claims`);
}
writeFileSync(
  new URL('demo.jsonld', out),
  `${JSON.stringify(
    toJsonLd(content, (id) => `${id}.glb`),
    null,
    2,
  )}\n`,
);
console.log('export/demo.jsonld');
