import { describe, expect, it } from 'vitest';
import { speakingWorld } from '../src/audio.ts';
import { createDial, nearestWorld, snapTarget, TRANSITION_MS, worldWeights } from '../src/dial.ts';

describe('world weights', () => {
  it('is one world at a whole number', () => {
    expect(worldWeights(0, 3)).toEqual([1, 0, 0]);
    expect(worldWeights(2, 3)).toEqual([0, 0, 1]);
  });

  it('blends the two neighbouring worlds in between, summing to 1', () => {
    expect(worldWeights(0.5, 3)).toEqual([0.5, 0.5, 0]);
    expect(worldWeights(1.25, 3)).toEqual([0, 0.75, 0.25]);
  });

  it('is a ring: after the last world comes the first, in both directions', () => {
    expect(worldWeights(2.5, 3)).toEqual([0.5, 0, 0.5]);
    expect(worldWeights(3, 3)).toEqual([1, 0, 0]);
    expect(worldWeights(-0.25, 3)).toEqual([0.75, 0, 0.25]);
    expect(nearestWorld(-1, 3)).toBe(2);
    expect(nearestWorld(7, 3)).toBe(1);
    for (let v = -4; v <= 4; v += 0.1) expect(worldWeights(v, 3).reduce((a, b) => a + b)).toBeCloseTo(1);
  });
});

describe('dial', () => {
  it('steps over the transition time, with no end in either direction', () => {
    const dial = createDial();
    dial.step(-1, 0);
    expect(dial.update(TRANSITION_MS / 2)).toBeCloseTo(-0.5);
    expect(dial.update(TRANSITION_MS)).toBe(-1);
    expect(nearestWorld(dial.value(), 3)).toBe(2);
  });

  it('changes instantly with reduced motion', () => {
    const dial = createDial({ instant: () => true });
    dial.step(1, 0);
    expect(dial.update(0)).toBe(1);
  });

  it('keeps the blend while held', () => {
    const dial = createDial();
    dial.hold();
    dial.set(1.4);
    expect(dial.update(10_000)).toBe(1.4);
  });

  it('glides to the next world after a small push, like a carousel', () => {
    const dial = createDial();
    dial.hold();
    dial.set(0.25);
    dial.release(0);
    expect(dial.update(TRANSITION_MS)).toBe(1);
  });

  it('springs back when pushed less than the threshold', () => {
    expect(snapTarget(1, 1.1)).toBe(1);
    expect(snapTarget(1, 0.75)).toBe(0);
    expect(snapTarget(0, -0.3)).toBe(-1);
  });
});

describe('speaking voice', () => {
  it('is the strongest world, and does not flip back and forth near the middle', () => {
    expect(speakingWorld([1, 0, 0], -1)).toBe(0);
    expect(speakingWorld([0.45, 0.55, 0], 0)).toBe(0);
    expect(speakingWorld([0.3, 0.7, 0], 0)).toBe(1);
  });
});
