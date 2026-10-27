// Flat panels for VR, drawn on a canvas. Text is sized in metres so it stays readable:
// at least 0.03 m tall for every metre of viewing distance.
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

export const MIN_TEXT_M_PER_M = 0.03;

export const minFontPx = (pxPerMetre: number, distanceM: number): number =>
  Math.ceil(MIN_TEXT_M_PER_M * distanceM * pxPerMetre);

export const wrapText = (text: string, maxWidth: number, measure: (s: string) => number): string[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((lines, word) => {
      const last = lines[lines.length - 1];
      if (last !== undefined && measure(`${last} ${word}`) <= maxWidth) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
      return lines;
    }, []);

export const PANEL_COLOURS = { bg: '#FFFFFF', ink: '#111111', muted: '#6B6B6B', rule: '#E2E2E2' } as const;
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const DISPLAY_FONT = SANS;
export const LABEL_FONT = SANS;

/** One line or a wrapped paragraph to draw on a panel. */
export type Run = {
  readonly text: string;
  readonly px: number;
  readonly font?: 'display' | 'label';
  readonly weight?: number;
  readonly colour?: string;
  readonly gapAfter?: number;
  /** Draw with a dot in this colour before the text (certainty labels). */
  readonly pill?: string;
  readonly alpha?: number;
};

const fontOf = (run: Run) =>
  `${run.weight ?? (run.font === 'label' ? 500 : 400)} ${run.px}px ${run.font === 'label' ? LABEL_FONT : DISPLAY_FONT}`;
const textOf = (run: Run) => run.text;

export type Panel = {
  readonly mesh: Mesh;
  /** Lays out the runs, resizes the panel to fit, and draws them. */
  readonly draw: (runs: readonly Run[]) => void;
};

export const createPanel = (widthM: number, pxPerMetre: number, padPx = 48): Panel => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(widthM * pxPerMetre);
  const material = new MeshBasicMaterial({ transparent: true, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  let texture: CanvasTexture | null = null;
  const inner = canvas.width - padPx * 2;

  const layout = (ctx: CanvasRenderingContext2D, runs: readonly Run[]) =>
    runs.map((run) => {
      ctx.font = fontOf(run);
      const lines = run.pill ? [textOf(run)] : wrapText(textOf(run), inner, (s) => ctx.measureText(s).width);
      const height = run.pill ? run.px * 1.4 : lines.length * run.px * 1.32;
      return { run, lines, height };
    });

  return {
    mesh,
    draw: (runs) => {
      const measureCtx = canvas.getContext('2d')!;
      const laid = layout(measureCtx, runs);
      const heightPx = Math.ceil(padPx * 2 + laid.reduce((sum, l) => sum + l.height + (l.run.gapAfter ?? 0), 0));
      const resized = canvas.height !== heightPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = PANEL_COLOURS.bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, heightPx, 36);
      ctx.fill();
      let y = padPx;
      laid.forEach(({ run, lines, height }) => {
        ctx.globalAlpha = run.alpha ?? 1;
        ctx.font = fontOf(run);
        ctx.textBaseline = 'top';
        if (run.pill) {
          // A coloured dot and the written certainty, as in the 2D labels.
          const r = run.px * 0.3;
          ctx.fillStyle = run.pill;
          ctx.beginPath();
          ctx.arc(padPx + r, y + height / 2, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = PANEL_COLOURS.muted;
          ctx.textBaseline = 'middle';
          ctx.fillText(lines[0]!, padPx + r * 2 + run.px * 0.4, y + height / 2);
        } else {
          ctx.fillStyle = run.colour ?? PANEL_COLOURS.ink;
          lines.forEach((line, i) => ctx.fillText(line, padPx, y + i * run.px * 1.32));
        }
        y += height + (run.gapAfter ?? 0);
      });
      ctx.globalAlpha = 1;
      if (!texture || resized) {
        // A WebGL texture cannot change size in place.
        texture?.dispose();
        texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        material.map = texture;
        material.needsUpdate = true;
      } else {
        texture.needsUpdate = true;
      }
      mesh.scale.set(widthM, heightPx / pxPerMetre, 1);
    },
  };
};
