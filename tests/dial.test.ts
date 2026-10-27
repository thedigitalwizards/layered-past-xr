import { describe, expect, it } from 'vitest';
import { speakingContext } from '../src/core/audio.ts';
import { contextWeights, createDial, nearestContext, TRANSITION_MS } from '../src/core/dial.ts';

describe('context weights', () => {
  it('is one world at a whole number', () => {
    expect(contextWeights(0, 3)).toEqual([1, 0, 0]);
    expect(contextWeights(2, 3)).toEqual([0, 0, 1]);
  });

  it('blends the two neighbouring worlds in between, summing to 1', () => {
    expect(contextWeights(0.5, 3)).toEqual([0.5, 0.5, 0]);
    expect(contextWeights(1.25, 3)).toEqual([0, 0.75, 0.25]);
  });

  it('is a ring: after the last world comes the first, in both directions', () => {
    expect(contextWeights(2.5, 3)).toEqual([0.5, 0, 0.5]);
    expect(contextWeights(3, 3)).toEqual([1, 0, 0]);
    expect(contextWeights(-0.25, 3)).toEqual([0.75, 0, 0.25]);
    expect(nearestContext(-1, 3)).toBe(2);
    expect(nearestContext(7, 3)).toBe(1);
    for (let v = -4; v <= 4; v += 0.1) expect(contextWeights(v, 3).reduce((a, b) => a + b)).toBeCloseTo(1);
  });
});

describe('dial', () => {
  it('steps over the transition time, with no end in either direction', () => {
    const dial = createDial();
    dial.step(-1, 0);
    expect(dial.update(TRANSITION_MS / 2)).toBeCloseTo(-0.5);
    expect(dial.update(TRANSITION_MS)).toBe(-1);
    expect(nearestContext(dial.value(), 3)).toBe(2);
  });

  it('changes instantly with reduced motion', () => {
    const dial = createDial({ instant: () => true });
    dial.step(1, 0);
    expect(dial.update(0)).toBe(1);
  });

  it('goes to a context by index the short way round the ring', () => {
    const dial = createDial({ instant: () => true });
    dial.goTo(2, 3, 0);
    expect(dial.update(0)).toBe(-1);
    dial.goTo(0, 3, 0);
    expect(dial.update(0)).toBe(0);
  });
});

describe('speaking voice', () => {
  it('is the strongest world, and does not flip back and forth near the middle', () => {
    expect(speakingContext([1, 0, 0], -1)).toBe(0);
    expect(speakingContext([0.45, 0.55, 0], 0)).toBe(0);
    expect(speakingContext([0.3, 0.7, 0], 0)).toBe(1);
  });
});
