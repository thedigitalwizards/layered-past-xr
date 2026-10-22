# Interaction: one stone, many worlds

The visitor holds one object and turns it. The stone works like the dial of a radio: each position is a
world, and in between two worlds the visitor hears and sees both.

## The sequence

1. **The dark and the stone.** The scene opens in darkness with only the stone on a plinth, and one line:
   _Pick up the stone_.
2. **Picking it up** lights the first world (World A) and starts its voice. A single hint appears once:
   _Turn the stone to travel_. It goes away after the first change of world.
3. **Turning the head or the view** looks around the current world, all 360°. Nothing moves the visitor.
4. **Turning the stone** moves to another world. The whole surroundings change: sky, ground, light,
   colour, voice, and the stone itself.
5. **Halfway between two worlds** both are shown at once, blended, and both voices are heard. There is no
   separate comparison mode: it happens while turning, and the visitor can stay there as long as they hold
   the stone. When they let go between two worlds, the stone settles on the nearest one after 1.5 s.
6. **The lens.** Glowing points mark details. Selecting one opens a card with the claim behind it: title,
   certainty, a short text, the voice that makes it, its source, and whether an expert has approved it.

## Controls

|                     | Desktop                                             | Mobile                        | Quest 3                       |
| ------------------- | --------------------------------------------------- | ----------------------------- | ----------------------------- |
| Start               | Click the stone (or Enter)                          | Tap the stone                 | Grab the stone (grip)         |
| Look around         | Drag                                                | Drag, or move the phone       | Turn your head                |
| Change world        | Scroll, ← →, or drag the stone sideways             | Swipe on the stone            | Hold grip and twist the wrist |
| Stay between worlds | Keep holding the stone while dragging               | Keep your finger on the stone | Keep holding grip             |
| Inspect a detail    | Click a glowing point (or Tab to _Inspect_ buttons) | Tap a glowing point           | Point and pull the trigger    |
| Close a card        | Click outside, or Esc                               | Swipe down                    | Trigger again                 |

The dial needs 160 px of drag or swipe, or 70° of wrist twist, per world. A key press or a settle animates
over 600 ms, or instantly with `prefers-reduced-motion`.

## What is on screen

Only four things: the world label (top left: `WORLD A · [PERIOD]` and an outlined certainty pill, fading
after 3 s without interaction), the caption of the voice (bottom centre), and two round buttons (sound,
and Enter VR when WebXR is available). Between two worlds the label lists both and the quieter voice's
caption sits above, smaller. In VR the label and captions sit on one panel that eases into place below the
line of sight, and the lens card floats 1 m in front of the visitor.

## Accessibility

- The full experience works without a headset.
- Every voice has captions; every certainty has a written label, not only a colour.
- Keyboard: Enter picks up the stone, ← → change world, Tab reaches the sound and VR buttons and the
  _Inspect_ buttons for the details of the world in front (hidden until focused), Esc closes the card.
- Seated mode in VR is automatic: if the headset starts below 1.35 m, the world is lowered so the visitor
  sees it from standing eye height.
- No forced movement: the visitor only turns. Transitions respect `prefers-reduced-motion`.
- VR text is at least 0.03 m tall per metre of viewing distance.

## Code

|                                                     |                                  |
| --------------------------------------------------- | -------------------------------- |
| Dial: position → world weights, step, settle (pure) | `src/dial.ts`                    |
| Worlds and how two are blended                      | `src/worlds/`                    |
| The stone's states                                  | `src/stone.ts`                   |
| Voices and crossfade                                | `src/audio.ts`                   |
| Desktop and mobile input                            | `src/controls.ts`, `src/look.ts` |
| VR: grab, wrist twist, lens, panels, seated height  | `src/xr.ts`                      |
| On-screen UI                                        | `src/ui/`                        |
