// Absent voice: near-dark, no volumes; only faint outlines (the `footprint` surface) are drawn.
import { SURFACE } from '../blend.ts';

export const FRAGMENT = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 colour;
    if (uSurface == ${SURFACE.sky}) {
      colour = mix(vec3(0.075, 0.085, 0.08), vec3(0.03, 0.035, 0.035), smooth01(0.0, 0.5, elevation()));
    } else if (uSurface == ${SURFACE.ground}) {
      colour = vec3(0.055, 0.062, 0.058);
    } else if (uSurface == ${SURFACE.hills}) {
      colour = vec3(0.085, 0.095, 0.09);
    } else {
      colour = vec3(0.30, 0.34, 0.32);
    }
    gl_FragColor = vec4(colour * uReveal, 1.0);
  }
`;

export const HILLS = { radius: 50, base: 1.5, roughness: 1.0 } as const;
