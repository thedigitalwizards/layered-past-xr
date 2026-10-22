# Certainty

Each world's whole look follows its certainty. The less evidence stands behind a world, the less it looks
like a solid place: a lit, matte site becomes an engraving, and then almost nothing. The certainty is
always written out as well, never shown by colour alone.

| Certainty    | World style                                                | Label colour | Status                         |
| ------------ | ---------------------------------------------------------- | ------------ | ------------------------------ |
| documented   | Solid, lit, matte materials                                | `#2E6B4F`    | in the demo (World A)          |
| interpreted  | Painted look                                               | `#2F5D8A`    | label only; no world style yet |
| hypothesis   | Line drawing                                               | `#9A5413`    | label only; no world style yet |
| imagined     | Engraving: hatching on sepia paper                         | `#6B5A86`    | in the demo (World B)          |
| unknown      | Faint dashed outlines, no volume                           | `#5E6762`    | label only; no world style yet |
| absent voice | Near-dark, faint dashed outlines on the ground, no volumes | `#5E6762`    | in the demo (World C)          |

Claims can use any certainty (it is shown as a pill on the lens card). A _world_ can only use a certainty
that has a world style: the build fails otherwise, with a message saying which style is missing.

## The stone follows the worlds

| `stone.style` | Look                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| `solid`       | Upright, matte gabbro with a fine speckle                                 |
| `engraving`   | Drawn in the engraving style, smoother, with a faint gold rim (idealised) |
| `outline`     | An outline only, barely visible                                           |

## How two worlds are blended

Two complete worlds overlap halfway through a turn. Instead of transparency, each world draws a share of
the pixels in an ordered dither pattern, and neighbouring worlds use complementary patterns. Together they
cover every pixel exactly once, so there are no sorting problems and no flicker between two skies, and
it costs no more than drawing one world. A world with no share is not drawn at all. The stone's states
share their world's pattern, so the stone blends in step with its surroundings.

The shaders are in `src/worlds/blend.ts` (shared), `src/worlds/solid.ts`, `src/worlds/engraving.ts`,
`src/worlds/absent.ts` and `src/stone.ts`.
