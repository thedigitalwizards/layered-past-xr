// A small dial floating beside the central object: the journey through time as a row of slots. The demo
// contexts can be pressed (pointed at and triggered in VR, clicked or tapped elsewhere); the
// contexts that are planned but have no content yet appear only as faint outlines.
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { minFontPx, PANEL_COLOURS, SANS } from './canvas-text.ts';
import type { Content } from './content.ts';
import { VISITOR_DISTANCE_M } from './geometry.ts';

const PX_PER_M = 1000;
const WIDTH_M = 1.1;
/** Beside the central object and a little in front of it, at hand height, in site coordinates. */
const POSITION = [0.95, 1.15, 2.1] as const;
const VIEW_DISTANCE_M = Math.hypot(POSITION[0], VISITOR_DISTANCE_M - POSITION[2]);
const PX = minFontPx(PX_PER_M, VIEW_DISTANCE_M);
const PAD = 24;
const STEP_W = 64;
const SLOT_H = 96;

export type TimeDial = {
  readonly group: Group;
  /** Invisible pressable areas; `userData.press` runs the action. */
  readonly targets: () => readonly Mesh[];
  readonly render: (currentIndex: number) => void;
  readonly setVisible: (visible: boolean) => void;
};

export type DialActions = {
  readonly step: (direction: 1 | -1) => void;
  readonly goTo: (index: number) => void;
};

export const createTimeDial = (content: Content, actions: DialActions): TimeDial => {
  const active = content.contexts;
  const pending = content.pendingContexts ?? [];
  const slots = active.length + pending.length;
  const width = Math.round(WIDTH_M * PX_PER_M);
  const slotW = (width - PAD * 2 - STEP_W * 2) / slots;
  const height = PAD * 2 + SLOT_H + 16 + Math.round(PX * 1.25) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const panel = new Mesh(
    new PlaneGeometry(WIDTH_M, height / PX_PER_M),
    new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );

  const group = new Group();
  group.name = 'time-dial';
  group.position.set(...POSITION);
  group.add(panel);
  group.lookAt(0, 1.6, VISITOR_DISTANCE_M);
  group.visible = false;

  // Pressable areas sit just in front of the panel, in canvas pixel coordinates.
  const area = (x: number, w: number, press: () => void): Mesh => {
    const mesh = new Mesh(
      new PlaneGeometry(w / PX_PER_M, SLOT_H / PX_PER_M),
      new MeshBasicMaterial({ visible: false }),
    );
    mesh.position.set((x + w / 2 - width / 2) / PX_PER_M, (height / 2 - PAD - SLOT_H / 2) / PX_PER_M, 0.005);
    mesh.userData.press = press;
    group.add(mesh);
    return mesh;
  };
  const slotX = (i: number) => PAD + STEP_W + i * slotW;
  const targets = [
    area(PAD, STEP_W, () => actions.step(-1)),
    ...active.map((_, i) => area(slotX(i), slotW, () => actions.goTo(i))),
    area(width - PAD - STEP_W, STEP_W, () => actions.step(1)),
  ];

  const render = (current: number) => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 28);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const midY = PAD + SLOT_H / 2;

    ctx.fillStyle = PANEL_COLOURS.ink;
    ctx.font = `600 ${Math.round(PX * 1.3)}px ${SANS}`;
    ctx.fillText('‹', PAD + STEP_W / 2, midY);
    ctx.fillText('›', width - PAD - STEP_W / 2, midY);

    active.forEach((context, i) => {
      const x = slotX(i) + 6;
      const w = slotW - 12;
      ctx.beginPath();
      ctx.roundRect(x, PAD, w, SLOT_H, 12);
      if (i === current) {
        ctx.fillStyle = PANEL_COLOURS.ink;
        ctx.fill();
      }
      ctx.strokeStyle = PANEL_COLOURS.ink;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = i === current ? '#FFFFFF' : PANEL_COLOURS.ink;
      ctx.font = `600 ${PX}px ${SANS}`;
      ctx.fillText(context.title.split(' ').pop() ?? '', x + w / 2, midY);
    });
    pending.forEach((_, k) => {
      const x = slotX(active.length + k) + 6;
      ctx.beginPath();
      ctx.roundRect(x, PAD, slotW - 12, SLOT_H, 12);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = '#B5B5B5';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    const textY = PAD + SLOT_H + 16 + PX * 0.6;
    ctx.font = `500 ${PX}px ${SANS}`;
    ctx.fillStyle = PANEL_COLOURS.ink;
    ctx.fillText(active[current]?.title ?? '', slotX(0) + (slotW * active.length) / 2, textY);
    if (pending.length) {
      const centre = slotX(active.length) + (slotW * pending.length) / 2;
      ctx.fillStyle = PANEL_COLOURS.muted;
      ctx.fillText('Pending heritage', centre, textY);
      ctx.fillText('co-design', centre, textY + PX * 1.25);
    }
    texture.needsUpdate = true;
  };

  let last = -1;
  return {
    group,
    targets: () => (group.visible ? targets : []),
    render: (current) => {
      if (current === last) return;
      last = current;
      render(current);
    },
    setVisible: (visible) => {
      group.visible = visible;
    },
  };
};
