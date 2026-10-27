// glTF paradata: each context exported with its claims, evidence, certainty and approval in the
// nodes' `extras` (three.js writes `userData` there), so the paradata travels with the 3D file.
import { Group, LineSegments, Mesh, MeshStandardMaterial, Object3D, Scene } from 'three';
import { createCentralObject, type ObjectShape } from './central-object.ts';
import { WORLD_STYLES } from './certainty.ts';
import { voiceLabel, type Content, type Context } from './content.ts';
import { buildWorld, type Scenery } from './surroundings.ts';

// A glTF viewer cannot run our shaders, so each style becomes one flat colour.
const FLAT = { solid: '#B8AF9C', engraving: '#E9DFC8', absent: '#2A302D' } as const;

/**
 * One context as a plain three.js scene ready for GLTFExporter: its surroundings in flat colours, an
 * empty node at every claim anchor, and the central object, each carrying its paradata in `userData`.
 */
export const paradataScene = (
  content: Content,
  context: Context,
  index: number,
  scenery: Scenery,
  shape: ObjectShape,
): Scene => {
  const style = WORLD_STYLES[context.certainty]!;
  const view = buildWorld(context, index, scenery);
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
    voice: {
      label: voiceLabel(content, context.voice),
      caption: context.audio.caption,
      synthetic: context.audio.synthetic,
    },
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
  // The central object, in its look for this context, at the origin.
  const central = createCentralObject([context], [view.blend], shape);
  central.children.forEach((look) => {
    if (look instanceof Mesh || look instanceof LineSegments) {
      look.geometry.deleteAttribute('aShape');
      look.material = material;
    }
  });
  central.name = content.object.id;
  central.userData = { object: content.object, objectState: context.objectState };
  root.add(central);
  const scene = new Scene();
  scene.add(root);
  return scene;
};
