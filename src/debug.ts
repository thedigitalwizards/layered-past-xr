// ?debug: frame rate, draw calls and triangles, and a JSON performance report for the README table.
import type { WebGLRenderer } from 'three';
import { h } from './ui/dom.ts';

export type Summary = { readonly samples: number; readonly avg: number; readonly min: number; readonly p5: number };

export const summarize = (fps: readonly number[]): Summary | null => {
  if (fps.length === 0) return null;
  const sorted = [...fps].sort((a, b) => a - b);
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    samples: sorted.length,
    avg: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    min: round(sorted[0]!),
    p5: round(sorted[Math.floor((sorted.length - 1) * 0.05)]!),
  };
};

/** Counts frames in one-second windows, separately in and out of VR. */
export const createFpsMeter = () => {
  const samples = { browser: [] as number[], vr: [] as number[] };
  let windowStart = -1;
  let frames = 0;
  let mode: keyof typeof samples = 'browser';
  let current = 0;
  return {
    tick: (now: number, inVr: boolean) => {
      const next = inVr ? 'vr' : 'browser';
      if (next !== mode || windowStart < 0) {
        mode = next;
        windowStart = now;
        frames = 0;
        return;
      }
      frames += 1;
      if (now - windowStart >= 1000) {
        current = (frames * 1000) / (now - windowStart);
        samples[mode].push(current);
        windowStart = now;
        frames = 0;
      }
    },
    current: () => Math.round(current),
    summaries: () => ({ browser: summarize(samples.browser), vr: summarize(samples.vr) }),
  };
};

const gpu = (renderer: WebGLRenderer): string | null => {
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : null;
};

export const mountDebug = (renderer: WebGLRenderer) => {
  const meter = createFpsMeter();
  const readout = h('output', {});
  const status = h('span', {});
  const report = () => ({
    url: location.href,
    time: new Date().toISOString(),
    userAgent: navigator.userAgent,
    cores: navigator.hardwareConcurrency ?? null,
    screen: { width: screen.width, height: screen.height, pixelRatio: devicePixelRatio },
    gpu: gpu(renderer),
    xr: { presenting: renderer.xr.isPresenting, frameRate: renderer.xr.getSession()?.frameRate ?? null },
    fps: meter.summaries(),
    lastFrame: { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
  });
  const copy = h(
    'button',
    {
      type: 'button',
      onclick: async () => {
        const json = JSON.stringify(report(), null, 2);
        try {
          await navigator.clipboard.writeText(json);
          status.textContent = 'Copied.';
        } catch {
          // Some embedded browsers block the clipboard: log it so it can still be copied.
          console.log(json);
          status.textContent = 'Clipboard blocked; report logged to the console.';
        }
      },
    },
    'Copy performance report',
  );
  document.body.append(h('div', { className: 'debug' }, readout, copy, status));
  let lastText = 0;
  return {
    update: (now: number, inVr: boolean) => {
      meter.tick(now, inVr);
      if (now - lastText < 500) return;
      lastText = now;
      readout.textContent = `${meter.current() || '–'} fps · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles} tris`;
    },
  };
};
