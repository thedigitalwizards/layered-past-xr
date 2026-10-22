// npm run export — writes export/<world>.glb and export/demo.jsonld.
// Every glTF node carries its paradata in `extras` (three.js exports `userData` there): the world's
// voice and certainty, each claim with its evidence and approval, and the stone's state.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Group, LineSegments, Mesh, MeshStandardMaterial, Object3D, Scene } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { WORLD_STYLES } from '../src/certainty.ts';
import type { Content, World } from '../src/content.ts';
import { toJsonLd } from '../src/jsonld.ts';
import { createStone } from '../src/stone.ts';
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

const exportScene = (world: World, index: number): Scene => {
  const style = WORLD_STYLES[world.certainty]!;
  const view = buildWorld(world, index);
  const material = new MeshStandardMaterial({ color: FLAT[style], roughness: 1 });
  const root = new Group();
  root.name = world.id;
  root.userData = {
    paradata: 'layered-past-xr',
    object: content.object,
    world: {
      id: world.id,
      title: world.title,
      period: world.period,
      voice: world.voice,
      certainty: world.certainty,
      style,
    },
    voice: { caption: world.audio.caption, synthetic: world.audio.synthetic },
  };
  view.group.children.forEach((child) => {
    // The sky is a 90 m sphere around the visitor: not part of the place.
    if (child.name === 'sky' || !(child instanceof Mesh)) return;
    const geometry = child.geometry.clone();
    geometry.deleteAttribute('aShape');
    const mesh = new Mesh(geometry, material);
    mesh.name = child.name;
    mesh.userData = { style, certainty: world.certainty };
    root.add(mesh);
  });
  world.claims.forEach((claim) => {
    const node = new Object3D();
    node.name = `claim-${claim.id}`;
    node.position.set(...claim.anchor);
    node.userData = { claim };
    root.add(node);
  });
  const stone = createStone([world], [view.blend]);
  stone.object.children[0]!.children.forEach((state) => {
    if (state instanceof Mesh || state instanceof LineSegments) {
      state.geometry.deleteAttribute('aShape');
      state.material = material;
    }
  });
  stone.object.remove(stone.hitTarget);
  stone.object.name = content.object.id;
  stone.object.position.set(0, 1.0, -0.6);
  stone.object.userData = { object: content.object, stoneStyle: world.stone.style };
  root.add(stone.object);
  const scene = new Scene();
  scene.add(root);
  return scene;
};

const out = new URL('../export/', import.meta.url);
mkdirSync(out, { recursive: true });
const exporter = new GLTFExporter();
for (const [index, world] of content.worlds.entries()) {
  const glb = (await exporter.parseAsync(exportScene(world, index), { binary: true })) as ArrayBuffer;
  writeFileSync(new URL(`${world.id}.glb`, out), Buffer.from(glb));
  console.log(`export/${world.id}.glb  ${(glb.byteLength / 1024).toFixed(0)} kB, ${world.claims.length} claims`);
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
