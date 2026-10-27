// Imagined: an engraving on sepia paper. Surfaces are hatched; the `accent` surface is inked in gold,
// and the `smoke` surface is drawn as outlined clouds.
import { SURFACE } from '../blend.ts';

export const FRAGMENT = /* glsl */ `
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

export const HILLS = { radius: 50, base: 4, roughness: 3.5 } as const;
