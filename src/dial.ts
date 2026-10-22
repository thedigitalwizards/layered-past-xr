// The stone is the dial of history. Its position is a number along the worlds: 0 is the first
// world, 1 the second, and 0.5 is halfway between them, where both are blended. The worlds form a
// ring: after the last comes the first again, so the stone can be turned endlessly either way.

export const TRANSITION_MS = 600;
/** Fraction of a world the stone must be pushed to go there by itself on release. */
export const SNAP_THRESHOLD = 0.2;

/** Wrist twist in VR for one world. Comfortable: about two worlds in each direction from neutral. */
export const TWIST_DEG_PER_WORLD = 70;
/** Horizontal swipe or drag on the stone, in CSS pixels, for one world. */
export const SWIPE_PX_PER_WORLD = 160;

/** Index of a world on the ring, for any position (also negative ones). */
export const worldIndex = (position: number, worldCount: number): number =>
  ((Math.round(position) % worldCount) + worldCount) % worldCount;

/** Blend weight of every world at a dial position. At most two are non-zero, and they sum to 1. */
export const worldWeights = (value: number, worldCount: number): number[] => {
  const lower = Math.floor(value);
  const t = value - lower;
  const a = worldIndex(lower, worldCount);
  const b = worldIndex(lower + 1, worldCount);
  return Array.from({ length: worldCount }, (_, i) => (i === a ? 1 - t : 0) + (i === b ? t : 0));
};

/** The world the dial is closest to. */
export const nearestWorld = (value: number, worldCount: number): number => worldIndex(value, worldCount);

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export type Dial = {
  readonly value: () => number;
  /** The visitor takes hold of the stone: it follows their hand until they let go. */
  readonly hold: () => void;
  /** Sets the position directly (dragging, twisting). */
  readonly set: (value: number) => void;
  /** Lets go: like a carousel with fixed stops, the stone glides to the world it was pushed towards. */
  readonly release: (now: number) => void;
  /** Animated move to the next or previous world (keys, wheel). */
  readonly step: (direction: 1 | -1, now: number) => void;
  readonly update: (now: number) => number;
};

/** Where the dial goes when let go: a small push in either direction is enough to change world. */
export const snapTarget = (from: number, value: number): number => {
  const moved = value - from;
  return moved >= SNAP_THRESHOLD
    ? Math.ceil(value - 1e-9)
    : moved <= -SNAP_THRESHOLD
      ? Math.floor(value + 1e-9)
      : Math.round(from);
};

export const createDial = (options: { readonly instant?: () => boolean } = {}): Dial => {
  let value = 0;
  let heldFrom: number | null = null;
  let animation: { readonly from: number; readonly to: number; readonly start: number } | null = null;

  const animateTo = (to: number, now: number) => {
    if (options.instant?.() || to === value) {
      value = to;
      animation = null;
    } else {
      animation = { from: value, to, start: now };
    }
  };

  return {
    value: () => value,
    hold: () => {
      animation = null;
      heldFrom = value;
    },
    set: (next) => {
      value = next;
    },
    release: (now) => {
      if (heldFrom === null) return;
      animateTo(snapTarget(heldFrom, value), now);
      heldFrom = null;
    },
    step: (direction, now) => {
      const from = animation ? animation.to : Math.round(value);
      animateTo(from + direction, now);
    },
    update: (now) => {
      if (animation) {
        const t = Math.min(1, (now - animation.start) / TRANSITION_MS);
        value = animation.from + (animation.to - animation.from) * easeInOut(t);
        if (t >= 1) animation = null;
      }
      return value;
    },
  };
};
