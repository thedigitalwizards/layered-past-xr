import { describe, expect, it } from 'vitest';
import { minFontPx, wrapText } from '../src/core/canvas-text.ts';
import { stickStep } from '../src/core/xr.ts';

describe('thumbstick', () => {
  it('steps once per push, and needs to come back to centre before the next step', () => {
    let armed = true;
    const push = (x: number) => {
      const r = stickStep(x, armed);
      armed = r.armed;
      return r.step;
    };
    expect(push(0.9)).toBe(1);
    expect(push(0.95)).toBe(0);
    expect(push(0.1)).toBe(0);
    expect(push(-0.8)).toBe(-1);
  });
});

describe('VR text', () => {
  it('is at least 0.03 m tall per metre of distance', () => {
    expect(minFontPx(1500, 1) / 1500).toBeGreaterThanOrEqual(0.03);
    expect(minFontPx(1000, 1.4) / 1000).toBeGreaterThanOrEqual(0.042);
  });

  it('wraps words to the panel width', () => {
    expect(wrapText('one two three four', 9, (s) => s.length)).toEqual(['one two', 'three', 'four']);
  });
});
