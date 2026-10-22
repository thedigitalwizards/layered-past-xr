// Glowing points: the details behind which a claim waits. Only the world in front of the visitor
// shows its points, fading in and out with the dial.
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { Content } from './content.ts';

const HIT_RADIUS_M = 0.45;

const glowTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 250, 235, 1)');
  gradient.addColorStop(0.18, 'rgba(255, 244, 214, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 236, 190, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 236, 190, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
};

export type Lens = {
  readonly group: Group;
  /** Invisible spheres to aim at; `userData.claimId` names the claim. */
  readonly targets: () => readonly Mesh[];
  readonly update: (weights: readonly number[], now: number, aimedClaimId: string | null) => void;
};

export const createLens = (content: Content): Lens => {
  const group = new Group();
  const texture = glowTexture();
  const hitMaterial = new MeshBasicMaterial({ visible: false });
  const points = content.worlds.flatMap((world, worldIndex) =>
    world.claims.map((claim, k) => {
      const holder = new Group();
      holder.position.set(...claim.anchor);
      const glow = new Sprite(
        new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true }),
      );
      const hit = new Mesh(new SphereGeometry(HIT_RADIUS_M, 8, 6), hitMaterial);
      hit.userData.claimId = claim.id;
      holder.add(glow, hit);
      group.add(holder);
      return { holder, glow, hit, worldIndex, claimId: claim.id, phase: k * 1.7 };
    }),
  );
  let active: Mesh[] = [];

  return {
    group,
    targets: () => active,
    update: (weights, now, aimedClaimId) => {
      active = [];
      points.forEach((p) => {
        // Points belong to the world in front: they fade out well before the halfway mark.
        const share = Math.min(1, Math.max(0, ((weights[p.worldIndex] ?? 0) - 0.5) * 2));
        p.holder.visible = share > 0.01;
        if (share > 0.5) active.push(p.hit);
        const aimed = p.claimId === aimedClaimId;
        const size = (aimed ? 0.75 : 0.45) + 0.06 * Math.sin(now * 0.003 + p.phase);
        p.glow.scale.setScalar(size);
        p.glow.material.opacity = share * (aimed ? 1 : 0.85);
      });
    },
  };
};
