// The journey through time. Its position is a number along the contexts: 0 is the first context,
// 1 the second, and 0.5 is halfway between them, where both are blended. The contexts form a ring:
// after the last comes the first again, so the visitor can travel endlessly either way.

// Long enough to see the two contexts blend on the way from one to the next.
export const TRANSITION_MS = 900;

/** Index of a context on the ring, for any position (also negative ones). */
export const contextIndex = (position: number, contextCount: number): number =>
  ((Math.round(position) % contextCount) + contextCount) % contextCount;

/** Blend weight of every context at a dial position. At most two are non-zero, and they sum to 1. */
export const contextWeights = (value: number, contextCount: number): number[] => {
  const lower = Math.floor(value);
  const t = value - lower;
  const a = contextIndex(lower, contextCount);
  const b = contextIndex(lower + 1, contextCount);
  return Array.from({ length: contextCount }, (_, i) => (i === a ? 1 - t : 0) + (i === b ? t : 0));
};

/** The context the dial is closest to. */
export const nearestContext = (value: number, contextCount: number): number => contextIndex(value, contextCount);

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export type Dial = {
  readonly value: () => number;
  /** Animated move to the next or previous context. */
  readonly step: (direction: 1 | -1, now: number) => void;
  /** Animated move to a context by index, the short way round the ring. */
  readonly goTo: (index: number, contextCount: number, now: number) => void;
  readonly update: (now: number) => number;
};

export const createDial = (options: { readonly instant?: () => boolean } = {}): Dial => {
  let value = 0;
  let animation: { readonly from: number; readonly to: number; readonly start: number } | null = null;

  const animateTo = (to: number, now: number) => {
    if (options.instant?.() || to === value) {
      value = to;
      animation = null;
    } else {
      animation = { from: value, to, start: now };
    }
  };
  const target = () => (animation ? animation.to : Math.round(value));

  return {
    value: () => value,
    step: (direction, now) => animateTo(target() + direction, now),
    goTo: (index, contextCount, now) => {
      const from = target();
      const ahead = (((index - from) % contextCount) + contextCount) % contextCount;
      animateTo(from + (ahead > contextCount / 2 ? ahead - contextCount : ahead), now);
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
