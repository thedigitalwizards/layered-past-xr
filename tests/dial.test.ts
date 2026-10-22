import { describe, expect, it } from 'vitest';
import { clampDial, createDial, SETTLE_DELAY_MS, TRANSITION_MS, worldWeights } from '../src/dial.ts';

describe('world weights', () => {
  it('is one world at a whole number', () => {
    expect(worldWeights(0, 3)).toEqual([1, 0, 0]);
    expect(worldWeights(2, 3)).toEqual([0, 0, 1]);
  });

  it('blends the two neighbouring worlds in between, summing to 1', () => {
    expect(worldWeights(0.5, 3)).toEqual([0.5, 0.5, 0]);
    expect(worldWeights(1.25, 3)).toEqual([0, 0.75, 0.25]);
    for (let v = 0; v <= 2; v += 0.1) expect(worldWeights(v, 3).reduce((a, b) => a + b)).toBeCloseTo(1);
  });

  it('stops at the first and last world', () => {
    expect(clampDial(-1, 3)).toBe(0);
    expect(clampDial(7, 3)).toBe(2);
  });
});

describe('dial', () => {
  it('steps to the next world over the transition time', () => {
    const dial = createDial(3);
    dial.step(1, 0);
    expect(dial.update(TRANSITION_MS / 2)).toBeCloseTo(0.5);
    expect(dial.update(TRANSITION_MS)).toBe(1);
  });

  it('changes instantly with reduced motion', () => {
    const dial = createDial(3, { instant: () => true });
    dial.step(1, 0);
    expect(dial.update(0)).toBe(1);
  });

  it('keeps the blend while held, and settles on the nearest world after release', () => {
    const dial = createDial(3);
    dial.hold();
    dial.set(1.4);
    expect(dial.update(10_000)).toBe(1.4);
    dial.release(10_000);
    expect(dial.update(10_000 + SETTLE_DELAY_MS - 1)).toBe(1.4);
    dial.update(10_000 + SETTLE_DELAY_MS);
    expect(dial.update(10_000 + SETTLE_DELAY_MS + TRANSITION_MS)).toBe(1);
  });

  it('settles after the wheel stops', () => {
    const dial = createDial(3);
    dial.nudge(0.7, 0);
    expect(dial.update(SETTLE_DELAY_MS - 1)).toBeCloseTo(0.7);
    dial.update(SETTLE_DELAY_MS);
    expect(dial.update(SETTLE_DELAY_MS + TRANSITION_MS)).toBe(1);
  });
});
