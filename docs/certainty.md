# Certainty

Each context is represented only to the level its evidence supports. Its whole look follows its certainty:
the less evidence stands behind a context, the less it looks like a solid place. A lit, matte site becomes
an engraving, and then almost nothing. The certainty is always written out as well, never shown by colour
alone.

| Certainty    | Look of the surroundings                                   | Label colour | Status                          |
| ------------ | ---------------------------------------------------------- | ------------ | ------------------------------- |
| documented   | Solid, lit, matte materials                                | `#2E6B4F`    | in the demo (Context A)         |
| interpreted  | Painted look                                               | `#2F5D8A`    | label only; no surroundings yet |
| hypothesis   | Line drawing                                               | `#9A5413`    | label only; no surroundings yet |
| imagined     | Engraving: hatching on sepia paper                         | `#6B5A86`    | in the demo (Context B)         |
| unknown      | Faint dashed outlines, no volume                           | `#5E6762`    | label only; no surroundings yet |
| absent voice | Near-dark, faint dashed outlines on the ground, no volumes | `#5E6762`    | in the demo (Context C)         |

Claims can use any certainty (it is shown on the lens card). A _context_ can only use a certainty whose
surroundings exist: the build fails otherwise, with a message saying which style is missing.

## The central object has its own certainty

The central object stays at the centre in every context, but how certain its presence and form are can differ from
the context's certainty. For example, it can be _unknown_ in a context where it is not attested. Its look
and its certainty are set per context in `objectState` (see [content-model.md](content-model.md)), and the
label always shows both: the context's certainty and the object's.

| `objectState.style` | Look                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `solid`             | Matte, dark green-grey stone with a fine speckle, on a low base           |
| `engraving`         | Drawn in the engraving style, smoother, with a faint gold rim (idealised) |
| `outline`           | An outline only, barely visible                                           |

In the demo the central object, a baetyl, is _documented_ in Context A, _imagined_ in Context B and _unknown_ in Context C.

## How two contexts are blended

On the way from one context to the next, both are visible at once. Instead of transparency, each context
draws a share of the pixels in an ordered dither pattern, and neighbouring contexts use complementary
patterns. Together they cover every pixel exactly once, so there are no sorting problems and no flicker
between two skies, and it costs no more than drawing one context. A context with no share is not drawn at
all. The object's looks share their context's pattern, so the object blends in step with its surroundings.

The shaders are in `src/core/blend.ts` (shared), `src/core/styles/` and `src/core/central-object.ts`. In the code, a "world" is the rendered surroundings of one
context.
