# Interaction: one baetyl, many contexts

A monumental baetyl stands at the centre of the scene and never moves. It is a persistent temporal anchor:
the visitor guides it through time, and the surroundings change around it. Each historical or reception
context brings its own sky, ground, light, colour, voice and evidence, and its own certainty, about the
place and about the baetyl itself.

## The sequence

1. **The dark and the baetyl.** The scene opens in darkness with only the baetyl, on its low base, and one
   control: **Begin**.
2. **Begin** lights the first context and starts its voice. A single hint says how to move through time; it
   goes away after the first change of context.
3. **Looking around** explores the current context in 360°. Nothing moves the visitor.
4. **Moving through time** changes the context around the baetyl. On the way from one context to the next
   both are shown at once, blended. The contexts form a ring: after the last comes the first again.
5. **Voices.** Only one voice speaks at a time: entering a context fades out the previous voice, then the
   new one speaks once, from the start.
6. **The lens.** Glowing points mark details. Selecting one opens a card with the claim behind it: title,
   certainty, a short text, the voice that makes it, its source, and whether an expert has approved it.
7. **The time dial**, a small panel beside the baetyl, shows the journey as a row of slots: the three demo
   contexts, and the six contexts still pending heritage co-design as faint outlines. Pressing a demo slot
   or ‹ › moves through time.

## Controls

|                   | Desktop                                     | Mobile                                    | Quest 3                                                                                      |
| ----------------- | ------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Start             | Click **Begin** (or Enter)                  | Tap **Begin**                             | Pull the trigger                                                                             |
| Look around       | Drag                                        | Drag, or move the phone                   | Turn your head                                                                               |
| Move through time | Scroll, or ← →; or click the time dial      | Swipe left or right; or tap the time dial | Thumbstick left or right (one step per push); or point at the time dial and pull the trigger |
| Inspect a detail  | Click a glowing point (or Tab to _Inspect_) | Tap a glowing point                       | Point and pull the trigger                                                                   |
| Close a card      | Click outside, or Esc                       | Swipe down                                | Trigger again                                                                                |

One scroll gesture, key press, swipe or thumbstick push moves one context. The move takes 900 ms, so the
blend between the two contexts is visible, or is instant with `prefers-reduced-motion`.

## What is on screen

Only four things: the context label (top left: `Context A · [period]` with its certainty, and the baetyl's
certainty below; it fades after 3 s without interaction), the caption of the voice (bottom centre), and
two round buttons (sound, and Enter VR when WebXR is available). The time dial is part of the scene, not of
the screen. In VR the label and captions sit on one panel that eases into place below the line of sight,
and the lens card floats 1 m in front of the visitor.

## Accessibility

- The full experience works without a headset.
- Every voice has captions; every certainty has a written label, not only a colour.
- Keyboard: Enter begins, ← → move through time, Tab reaches the sound and VR buttons and the _Inspect_
  buttons for the details of the current context (hidden until focused), Esc closes the card.
- Seated mode in VR is automatic: if the headset starts below 1.35 m, the scene is lowered so the visitor
  sees it from standing eye height. On entering VR the scene turns so the baetyl is in front.
- No forced movement: the visitor only looks around. Transitions respect `prefers-reduced-motion`.
- VR text is at least 0.03 m tall per metre of viewing distance.

## Code

|                                                         |                                  |
| ------------------------------------------------------- | -------------------------------- |
| Journey through time: position → context weights (pure) | `src/dial.ts`                    |
| The baetyl and its looks                                | `src/baetyl.ts`                  |
| The time dial beside the baetyl                         | `src/time-dial.ts`               |
| Surroundings of each context, and how two are blended   | `src/worlds/`                    |
| Voices                                                  | `src/audio.ts`                   |
| Desktop and mobile input                                | `src/controls.ts`, `src/look.ts` |
| VR: Begin, thumbstick, lens, panels, seated height      | `src/xr.ts`                      |
| On-screen UI                                            | `src/ui/`                        |
