// The stone is the dial of history. Its position is a number along the worlds: 0 is the first
// world, 1 the second, and 0.5 is halfway between them, where both are blended.

export const TRANSITION_MS = 600;
export const SETTLE_DELAY_MS = 1500;

/** Wrist twist in VR for one world. Comfortable: about two worlds in each direction from neutral. */
export const TWIST_DEG_PER_WORLD = 70;
/** Horizontal swipe or drag on the stone, in CSS pixels, for one world. */
export const SWIPE_PX_PER_WORLD = 160;
/** Mouse-wheel delta for one world (one notch is usually 100). */
export const SCROLL_PER_WORLD = 300;

export const clampDial = (value: number, worldCount: number): number => Math.min(worldCount - 1, Math.max(0, value));

/** Blend weight of every world at a dial position. At most two are non-zero, and they sum to 1. */
export const worldWeights = (value: number, worldCount: number): number[] => {
  const v = clampDial(value, worldCount);
  const lower = Math.floor(v);
  const t = v - lower;
  return Array.from({ length: worldCount }, (_, i) => (i === lower ? 1 - t : i === lower + 1 ? t : 0));
};

export const nearestWorld = (value: number): number => Math.round(value);

export const isBetweenWorlds = (value: number): boolean => Math.abs(value - Math.round(value)) > 0.001;

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export type Dial = {
  readonly value: () => number;
  /** The visitor takes hold of the stone: the dial stays wherever they leave it. */
  readonly hold: () => void;
  /** Sets the position directly (dragging, twisting). */
  readonly set: (value: number) => void;
  /** Lets go. Between two worlds, the stone settles on the nearest one after SETTLE_DELAY_MS. */
  readonly release: (now: number) => void;
  /** Wheel: moves the dial and counts as a brief touch, so it settles too. */
  readonly nudge: (delta: number, now: number) => void;
  /** Animated move to the next or previous world. */
  readonly step: (direction: 1 | -1, now: number) => void;
  readonly update: (now: number) => number;
};

export const createDial = (worldCount: number, options: { readonly instant?: () => boolean } = {}): Dial => {
  let value = 0;
  let held = false;
  let releasedAt: number | null = null;
  let animation: { readonly from: number; readonly to: number; readonly start: number } | null = null;

  const animateTo = (to: number, now: number) => {
    releasedAt = null;
    if (options.instant?.()) {
      value = to;
      animation = null;
    } else {
      animation = { from: value, to, start: now };
    }
  };

  return {
    value: () => value,
    hold: () => {
      held = true;
      animation = null;
      releasedAt = null;
    },
    set: (next) => {
      value = clampDial(next, worldCount);
    },
    release: (now) => {
      held = false;
      releasedAt = now;
    },
    nudge: (delta, now) => {
      animation = null;
      value = clampDial(value + delta, worldCount);
      releasedAt = now;
    },
    step: (direction, now) => {
      const from = animation ? animation.to : nearestWorld(value);
      animateTo(clampDial(from + direction, worldCount), now);
    },
    update: (now) => {
      if (animation) {
        const t = Math.min(1, (now - animation.start) / TRANSITION_MS);
        value = animation.from + (animation.to - animation.from) * easeInOut(t);
        if (t >= 1) animation = null;
      } else if (!held && releasedAt !== null && now - releasedAt >= SETTLE_DELAY_MS) {
        if (isBetweenWorlds(value)) animateTo(nearestWorld(value), now);
        releasedAt = null;
      }
      return value;
    },
  };
};
