# One Stone, Many Worlds

An open WebXR framework for showing who interprets a heritage object, on what evidence, and how certain we are.

The visitor picks up a stone. Turning the stone moves through worlds. Each world is a period or a witness,
and fills the whole surroundings: sky, ground, light, colour, voice and the stone itself. Each world's visual
style shows how certain it is. Halfway between two worlds both are visible at once. The worlds form a ring, so the stone turns endlessly. Glowing
points open the claim behind a detail: who says it, how certain it is, its source, and whether an expert has
approved it. It runs in a desktop or mobile browser and in VR on Meta Quest 3.

- Live demo: https://thedigitalwizards.github.io/layered-past-xr/
- Editor for expert validation: https://thedigitalwizards.github.io/layered-past-xr/editor/
- A 20-second recording: still to be made (see [What is missing](#what-is-missing)).

> Demo content, procedural scenes and synthetic voices. This is not a reconstruction of any real site. The
> "Demo Stone" and "World A–C" are invented, and every text is a placeholder until a heritage expert validates it.
>
> Proposed pilot: the aniconic stone of the Paphian goddess, to be co-designed with a heritage expert.

## What exists, and what this adds

Extended Matrix and Heriverse document how certain each part of a 3D reconstruction is. Polyvocal heritage
research (for example Franke et al. 2024) works with several voices on the same heritage. This project puts
voice, certainty, evidence and expert approval together in one experience that runs in WebXR, and exports the
same paradata inside the 3D files (glTF `extras`) and as JSON-LD.

## The demo

| World   | Certainty    | Look                                     | Voice                                      |
| ------- | ------------ | ---------------------------------------- | ------------------------------------------ |
| World A | documented   | solid, lit, matte                        | archaeology                                |
| World B | imagined     | an engraving on sepia paper              | European imagination                       |
| World C | absent voice | near-dark, dashed outlines on the ground | ancient self-depiction, heard more quietly |

Controls, the on-screen UI and accessibility are described in [docs/interaction.md](docs/interaction.md); the
look of each certainty in [docs/certainty.md](docs/certainty.md).

Demo voices are synthetic. In the project they will be replaced by recorded voices of real people, with their consent.

## Run it

Node.js 22.18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. Add `?debug` to see frame rate, draw calls and triangles, and to copy a
performance report.

| Command            |                                                                                |
| ------------------ | ------------------------------------------------------------------------------ |
| `npm run validate` | Check `content/demo.json` against the schema                                   |
| `npm test`         | Unit tests for the dial, content validation, approvals, wrist twist and export |
| `npm run check`    | Formatting, lint, types and tests                                              |
| `npm run build`    | Validate the content, type-check and build into `dist/`                        |
| `npm run export`   | Write `export/<world>.glb` and `export/demo.jsonld`                            |

## Edit the content

Everything comes from [`content/demo.json`](content/demo.json); see [docs/content-model.md](docs/content-model.md).
The build fails if the file does not match the schema, so a broken file cannot be published. Experts review
and approve claims at `/editor/`. Approvals are saved in their browser and can be exported as JSON.

## Test on Meta Quest 3

WebXR needs HTTPS or `localhost`. Open the live demo in the Quest Browser and press the headset button.
For local development, connect the headset with USB (developer mode), forward the port and open
`http://localhost:5173/?debug` on the headset:

```bash
adb reverse tcp:5173 tcp:5173
```

To measure, open the page with `?debug`, enter VR and go through the worlds for a minute, then exit VR and
use _Copy performance report_. The report keeps VR and browser frame rates apart.

## Tested devices

| Device                   | OS       | Browser                                            | FPS                                    | Known issues        |
| ------------------------ | -------- | -------------------------------------------------- | -------------------------------------- | ------------------- |
| Meta Quest 3             |          | Meta Quest Browser                                 | not measured yet (target 72)           | VR not tested yet   |
| Android phone            |          | Chrome                                             | not measured yet (target 60)           |                     |
| Mac, Intel Iris Plus 640 | macOS 13 | Chromium 152 (embedded browser, development check) | 57.8 average, 59 at the 5th percentile | Not a target device |

Scene size: 2,900–8,200 triangles and 8–10 draw calls, depending on the world. Only the worlds being
blended are drawn.

## What is missing

- Not yet tested on a Quest 3 or an Android phone; the table above is waiting for those numbers.
- No recording of the demo yet.
- World styles exist for three certainties (documented, imagined, absent voice). Interpreted, hypothesis
  and unknown can label claims, but no world can use them yet.
- Hand tracking is not handled yet: turning the dial needs a controller's grip button.

## Licences

- Code: Apache License 2.0, see [LICENSE](LICENSE).
- Our content, docs and voices: CC BY 4.0, see [LICENSE-ASSETS](LICENSE-ASSETS).
- Demo voices: generated with Kokoro TTS (Kokoro-82M, voice af_nicole, Apache-2.0); see LICENSE-ASSETS.
- No third-party images, plans, engravings, photographs or models, and no AI-generated images. Every visual is
  made in code. In VR, three.js loads the controller models from the WebXR Input Profiles CDN at runtime.
