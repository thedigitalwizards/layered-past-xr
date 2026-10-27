// npm run export — writes export/<context>.glb and export/demo.jsonld.
// Every glTF node carries its paradata in `extras` (three.js exports `userData` there): the context's
// voice and certainty, each claim with its evidence and approval, and the baetyl's look and certainty.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Group, LineSegments, Mesh, MeshStandardMaterial, Object3D, Scene } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { WORLD_STYLES } from '../src/certainty.ts';
import type { Content, Context } from '../src/content.ts';
import { toJsonLd } from '../src/jsonld.ts';
import { createBaetyl } from '../src/baetyl.ts';
import { validateContent } from '../src/validate.ts';
import { buildWorld } from '../src/worlds/world.ts';

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

const result = validateContent(JSON.parse(readFileSync(new URL('../content/demo.json', import.meta.url), 'utf8')));
if (!result.ok) {
  console.error(`content/demo.json is invalid:\n${result.errors.join('\n')}`);
  process.exit(1);
}
const content: Content = result.content;

// A glTF viewer cannot run our shaders, so each style becomes one flat colour.
const FLAT = { solid: '#B8AF9C', engraving: '#E9DFC8', absent: '#2A302D' } as const;

const exportScene = (context: Context, index: number): Scene => {
  const style = WORLD_STYLES[context.certainty]!;
  const view = buildWorld(context, index);
  const material = new MeshStandardMaterial({ color: FLAT[style], roughness: 1 });
  const root = new Group();
  root.name = context.id;
  root.userData = {
    paradata: 'layered-past-xr',
    object: content.object,
    context: {
      id: context.id,
      title: context.title,
      period: context.period,
      voice: context.voice,
      certainty: context.certainty,
      style,
    },
    voice: { caption: context.audio.caption, synthetic: context.audio.synthetic },
  };
  view.group.children.forEach((child) => {
    // The sky is a 90 m sphere around the visitor: not part of the place.
    if (child.name === 'sky' || !(child instanceof Mesh)) return;
    const geometry = child.geometry.clone();
    geometry.deleteAttribute('aShape');
    const mesh = new Mesh(geometry, material);
    mesh.name = child.name;
    mesh.userData = { style, certainty: context.certainty };
    root.add(mesh);
  });
  context.claims.forEach((claim) => {
    const node = new Object3D();
    node.name = `claim-${claim.id}`;
    node.position.set(...claim.anchor);
    node.userData = { claim };
    root.add(node);
  });
  // The baetyl at the centre, in its look for this context; the site's origin is the baetyl.
  const baetyl = createBaetyl([context], [view.blend]);
  baetyl.children.forEach((look) => {
    if (look instanceof Mesh || look instanceof LineSegments) {
      look.geometry.deleteAttribute('aShape');
      look.material = material;
    }
  });
  baetyl.name = content.object.id;
  baetyl.userData = { object: content.object, baetyl: context.baetyl };
  root.add(baetyl);
  const scene = new Scene();
  scene.add(root);
  return scene;
};

const out = new URL('../export/', import.meta.url);
mkdirSync(out, { recursive: true });
const exporter = new GLTFExporter();
for (const [index, context] of content.contexts.entries()) {
  const glb = (await exporter.parseAsync(exportScene(context, index), { binary: true })) as ArrayBuffer;
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
