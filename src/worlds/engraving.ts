// Imagined: an engraving on sepia paper. The layout is the temple the voice describes: "tall columns,
// a golden roof, a sky full of smoke" — idealised, symmetrical, and drawn rather than built.
import { BackSide, CylinderGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import type { Context } from '../content.ts';
import { createBlendUniforms, createWorldMaterial, SURFACE } from './blend.ts';
import { blob, block, column, ground, hills, merge, named, pointAt, seededRandom, SHAPE, sky } from './pieces.ts';
import type { WorldView } from './world.ts';

const FRAGMENT = /* glsl */ `
  const vec3 PAPER = vec3(0.91, 0.87, 0.78);
  const vec3 INK = vec3(0.24, 0.19, 0.13);
  const vec3 GOLD = vec3(0.70, 0.54, 0.22);
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float diffuse = max(dot(n, normalize(vec3(0.48, 0.78, 0.40))), 0.0);
    float ink;
    if (uSurface == ${SURFACE.sky}) {
      float e = elevation();
      ink = hatch(vec3(0.0, e * 60.0, 0.0), vec3(0.0, 0.0, 1.0), 1.5708, 1.0) * smooth01(0.05, 0.7, e) * 0.5;
    } else if (uSurface == ${SURFACE.ground}) {
      ink = hatch(vWorldPos, n, 0.0, 5.0) * step(0.62, noise(vWorldPos.xz * 0.3)) * 0.35;
    } else if (uSurface == ${SURFACE.hills}) {
      float skyline = 1.0 - smooth01(0.6, 1.6, (1.0 - vUv.y) / max(fwidth(vUv.y), 1e-5));
      ink = max(skyline, hatch(vWorldPos * 0.3, vec3(0.0, 0.0, 1.0), 1.1, 3.0) * 0.45);
    } else if (uSurface == ${SURFACE.smoke}) {
      // Clouds of smoke: an outline drawn round the rim, a few strokes on the shaded underside.
      float rim = 1.0 - abs(dot(n, normalize(cameraPosition - vWorldPos)));
      ink = max(smooth01(0.72, 0.92, rim), hatch(vWorldPos, vec3(0.0, 0.0, 1.0), 0.3, 6.0) * smooth01(0.1, -0.6, n.y) * 0.5);
    } else {
      float shade = 1.0 - (0.25 + 0.75 * diffuse);
      // Strokes along the height first (like engraved columns), cross-hatching in deep shade.
      float h1 = shade > 0.2 ? hatch(vWorldPos, n, 0.0, 9.0) : 0.0;
      float h2 = shade > 0.55 ? hatch(vWorldPos, n, 1.2, 9.0) : 0.0;
      float edge = 1.0 - smooth01(0.6, 1.6, edgePixels(n));
      ink = max(max(h1, h2), edge) * 0.9;
    }
    vec3 colour = mix(PAPER, uSurface == ${SURFACE.accent} ? GOLD : INK, ink);
    gl_FragColor = vec4(colour * uReveal, 1.0);
  }
`;

const ring = (count: number, distance: number, offsetDeg = 0) =>
  Array.from({ length: count }, (_, i) => offsetDeg + (i * 360) / count).map((yaw) => ({
    yaw,
    at: pointAt(yaw, distance),
  }));

export const buildEngravingWorld = (context: Context, index: number): WorldView => {
  const random = seededRandom(context.id);
  const blend = createBlendUniforms(index);
  const material = (surface: number) => createWorldMaterial(FRAGMENT, blend, surface);

  const inner = ring(12, 7.5, 15);
  const chord = 2 * 7.5 * Math.sin(Math.PI / 12);
  const temple = [
    ...inner.map(({ at }) => column(at, 0.32, 6.2)),
    ...inner.map(({ at, yaw }) => block({ at, size: [0.9, 0.3, 0.9], turn: -yaw, lift: 6.2 })),
    ...ring(12, 7.5, 30).map(({ at, yaw }) => block({ at, size: [chord + 0.3, 0.7, 0.8], turn: -yaw, lift: 6.5 })),
    ...ring(18, 15).map(({ at }) => column(at, 0.28, 4.2)),
  ];
  const [altarX, altarZ] = pointAt(120, 4.2);
  const altar = block({ at: [altarX, altarZ], size: [1.4, 1.0, 1.0], turn: -120 });
  const smoke = [
    ...Array.from({ length: 6 }, (_, i) =>
      blob([altarX + (random() - 0.5) * i * 0.4, 1.6 + i * 0.9, altarZ], 0.35 + i * 0.12),
    ),
    ...Array.from({ length: 22 }, () => {
      const [x, z] = pointAt(random() * 360, 14 + random() * 20);
      return blob([x, 9 + random() * 9, z], 0.8 + random() * 1.4);
    }),
  ];
  const pedestals = context.claims.map((c) =>
    column([c.anchor[0], c.anchor[2]], 0.22, Math.max(0.2, c.anchor[1] - 0.12)),
  );

  // The golden roof: a low cone resting on the entablature.
  const roof = new CylinderGeometry(0.6, 9.2, 2.4, 32, 1, true);
  roof.translate(0, 7.2 + 1.2, 0);
  roof.setAttribute(
    'aShape',
    new Float32BufferAttribute(new Array<number>(roof.getAttribute('position').count).fill(SHAPE.other), 1),
  );

  const group = new Group();
  group.name = context.id;
  group.add(
    named('sky', new Mesh(sky(), createWorldMaterial(FRAGMENT, blend, SURFACE.sky, {}, BackSide))),
    named('ground', new Mesh(ground(), material(SURFACE.ground))),
    named('hills', new Mesh(hills(context.id, 50, 4, 3.5), material(SURFACE.hills))),
    named('structures', new Mesh(merge([...temple, altar, ...pedestals]), material(SURFACE.volume))),
    named('smoke', new Mesh(merge(smoke), material(SURFACE.smoke))),
    named('roof', new Mesh(roof, material(SURFACE.accent))),
  );
  return { group, blend };
};
