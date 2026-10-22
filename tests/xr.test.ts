import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { minFontPx, wrapText } from '../src/canvas-text.ts';
import { twistDegrees } from '../src/xr.ts';

const about = (axis: [number, number, number], deg: number) =>
  new Quaternion().setFromAxisAngle(new Vector3(...axis).normalize(), (deg * Math.PI) / 180);

describe('wrist twist', () => {
  it('measures clockwise twist (seen by the visitor) as positive', () => {
    expect(twistDegrees(new Quaternion(), about([0, 0, -1], 30))).toBeCloseTo(30);
    expect(twistDegrees(new Quaternion(), about([0, 0, -1], -45))).toBeCloseTo(-45);
  });

  it('ignores pointing the hand elsewhere without twisting', () => {
    expect(twistDegrees(new Quaternion(), about([0, 1, 0], 40))).toBeCloseTo(0);
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
