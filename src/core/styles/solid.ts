// Documented: solid, lit, matte materials.
import { SURFACE } from '../blend.ts';

export const FRAGMENT = /* glsl */ `
  void main() {
    keepShareOrDiscard();
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float diffuse = max(dot(n, normalize(vec3(0.48, 0.78, 0.40))), 0.0);
    vec3 colour;
    if (uSurface == ${SURFACE.sky}) {
      colour = mix(vec3(0.88, 0.89, 0.85), vec3(0.58, 0.68, 0.74), smooth01(0.0, 0.55, elevation()));
    } else if (uSurface == ${SURFACE.ground}) {
      colour = vec3(0.70, 0.66, 0.57) * (0.88 + 0.12 * noise(vWorldPos.xz * 0.8));
    } else if (uSurface == ${SURFACE.hills}) {
      colour = mix(vec3(0.50, 0.56, 0.52), vec3(0.62, 0.67, 0.64), vUv.y);
    } else {
      vec3 albedo = vec3(0.76, 0.72, 0.65) * (0.9 + 0.1 * noise(vWorldPos.xz * 4.0 + vWorldPos.y * 3.0));
      colour = albedo * (0.32 + 0.28 * (0.5 + 0.5 * n.y) + 0.55 * diffuse);
      colour *= 1.0 - 0.15 * (1.0 - smooth01(0.6, 1.8, edgePixels(n)));
      // Darker where stones meet the ground.
      colour *= mix(0.78, 1.0, smooth01(0.0, 0.4, vWorldPos.y));
    }
    gl_FragColor = vec4(colour * uReveal, 1.0);
  }
`;

export const HILLS = { radius: 48, base: 2.5, roughness: 2.2 } as const;
