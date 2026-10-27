# One Stone, Many Worlds

An open WebXR framework for showing who interprets a heritage object, on what evidence, and how certain we are.

This repository is an early proof of concept of that open framework (TRL 4): a reusable core, and one generic
demo built on it.

- Live demo: https://thedigitalwizards.github.io/layered-past-xr/
- Editor for expert validation: https://thedigitalwizards.github.io/layered-past-xr/editor/
- Repository: https://github.com/thedigitalwizards/layered-past-xr

> Demo content, procedural scenes and synthetic voices. This is not a reconstruction of any real site. The
> "Demo Baetyl" and "Context A–C" are invented, every text is a placeholder until a heritage expert validates
> it, and the voices are generated.

## The framework

A visitor stands before one central object that never moves, and travels through the contexts it has been seen
in: historical periods, or later receptions of it. The surroundings, the voices and the evidence change around
the object. Each context is drawn in a style that follows how certain it is. Glowing points open the claims
behind what is shown: who makes each claim, on what evidence, how certain it is, and whether an expert has
approved it. It runs in a desktop or mobile browser, and is built for VR on Meta Quest 3 through WebXR, with no install.

The framework knows nothing about any particular object, place or period. Each example supplies its own
content, voices, scenery and object shape.

### Structure

```
src/core/          the framework: content model and schema, certainty styles, navigation through contexts,
                   the central object, blending, the lens and claim card, the validation editor,
                   glTF and JSON-LD paradata export, VR
examples/demo/     the generic demo: content.json, synthetic voices (public/audio/), scenery.ts and the
                   shape of its central object (baetyl.ts)
src/main.ts        the app: loads the demo example into the core
```

It is one repository and one build. The core will be split out and versioned only once it is stable.

## What this proof of concept demonstrates (TRL 4)

- **Context switching around a persistent object.** A fixed central object; the visitor moves through
  contexts and the surroundings change around it, with a blend on the way from one to the next.
- **360° exploration** in every context, in a browser or in VR.
- **Certainty-based visual states.** Visual treatments communicate the certainty of individual claims,
  elements and interpretive layers. The generic demo exaggerates this principle by giving each demo context
  one dominant certainty state. Six states are defined (documented, interpreted, hypothesis, imagined, unknown,
  absent voice), each with a written label; three have their own surroundings so far.
- **A structured claim model.** Every claim has a voice, evidence, a certainty and an approval status
  (draft, reviewed or approved, with reviewer and date). Experts review claims in a small editor, and the
  paradata is exported with the 3D files.

The demo example (`examples/demo/`) has three generic contexts (Context A–C) around a demo baetyl, with
placeholder content and synthetic placeholder voices. Six more slots appear only as faint outlines on the time
dial, labelled "Pending heritage co-design", with no content: they stand for the rest of the planned pilot.

| Demo context | Certainty    | Surroundings                             | The object here       | Voice                  |
| ------------ | ------------ | ---------------------------------------- | --------------------- | ---------------------- |
| Context A    | documented   | solid, lit, matte                        | solid, documented     | archaeology            |
| Context B    | imagined     | an engraving on sepia paper              | engraved, imagined    | European imagination   |
| Context C    | absent voice | near-dark, dashed outlines on the ground | outline only, unknown | ancient self-depiction |

## What this proof of concept does not demonstrate

The demo is not an archaeological reconstruction and contains no final heritage interpretation. Its scenes,
voices and central object are placeholders, designed only to validate the interaction, web and WebXR delivery,
the evidence model and the expert-validation workflow. Historical content, periodisation, representation and
the final interaction design will be developed through heritage co-design during the proposed project.
Immersive use on a headset has not yet been validated.

## What exists, and what this adds

Approaches such as Extended Matrix use paradata to document the sources, interpretive decisions and
reconstruction processes behind digital heritage representations. Polyvocal heritage research works with
several perspectives on the same heritage. One Stone, Many Worlds builds on these principles by connecting
voice, evidence, certainty and validation directly to the visitor experience at runtime, in WebXR, and carries the essential paradata inside the glTF files
(`extras`), with a JSON-LD description alongside.

## Planned pilot

The pilot follows the monumental aniconic baetyl associated with the Paphian goddess at Palaepaphos (Kouklia,
Cyprus) across nine historical and reception contexts:

1. Late Bronze Age
2. City-Kingdom period (Cypro-Geometric to Classical)
3. Hellenistic
4. Roman
5. Late Antiquity
6. Medieval
7. Ottoman
8. British Rule
9. Republic of Cyprus and contemporary receptions

The baetyl acts as a temporal anchor: it stays in place while the surroundings, the evidence and the
interpretations change around it. The aim is evidence-aware edutainment. The pilot will be built on the
framework as its own example, with content prepared and validated as described below. Each context is represented only to
the level its evidence supports (3D, archival, schematic, symbolic or audio), not as a full reconstruction.

The demo's baetyl (`examples/demo/baetyl.ts`) is generic and its scale is a placeholder, to be grounded in
documented measurements with the heritage adviser.

## How heritage content will be produced

Heritage content is co-developed through a documented heritage-technology workflow. The research assistant
compiles sources, evidence records and metadata under the heritage adviser's supervision. The heritage adviser
leads the historical and interpretive methodology and reviews heritage claims, while TDW translates the agreed
structures into WebXR. Joint interpretive and technical decisions are recorded alongside the content.

## Controls

|                   | Desktop                                | Mobile                                    | Quest 3                                                                                      |
| ----------------- | -------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Start             | Click **Begin** (or Enter)             | Tap **Begin**                             | Pull the trigger                                                                             |
| Look around       | Drag                                   | Drag, or move the phone                   | Turn your head                                                                               |
| Move through time | Scroll, or ← →, or click the time dial | Swipe left or right, or tap the time dial | Thumbstick left or right (one step per push), or point at the time dial and pull the trigger |
| Inspect a detail  | Click a glowing point                  | Tap a glowing point                       | Point and pull the trigger                                                                   |
| Close a card      | Click outside, or Esc                  | Swipe down                                | Pull the trigger again                                                                       |

More detail in [docs/interaction.md](docs/interaction.md); the visual states in [docs/certainty.md](docs/certainty.md).

## Accessibility

- A complete non-immersive mode: everything works in a desktop or mobile browser without a headset.
- Captions for every voice, marked "Synthetic placeholder voice" while the voices are generated.
- Every certainty state has a written label, never colour alone.
- Keyboard: Enter begins, ← → move through time, Tab reaches the buttons and an _Inspect_ button for each
  detail of the current context, Esc closes a card.
- Seated VR: the experience can be used seated, with no physical movement required; when the headset starts at
  seated height, the viewpoint is raised to the scene's eye level.
- No forced movement: the visitor only looks around. Transitions respect `prefers-reduced-motion`.

## Run it

Node.js 22.18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. Add `?debug` to see the frame rate, draw calls and triangles, and to copy a
performance report.

| Command            |                                                                      |
| ------------------ | -------------------------------------------------------------------- |
| `npm run validate` | Check the demo's `content.json` against the schema                   |
| `npm test`         | Unit tests for the journey, content validation, approvals and export |
| `npm run check`    | Formatting, lint, types and tests                                    |
| `npm run build`    | Validate the content, type-check and build into `dist/`              |
| `npm run export`   | Write `export/<context>.glb` and `export/demo.jsonld`                |

The demo's content lives in [`examples/demo/content.json`](examples/demo/content.json); see
[docs/content-model.md](docs/content-model.md).
The build fails if it does not match the schema.

To test on a Quest 3 during development, connect it with USB (developer mode), forward the port and open
`http://localhost:5173/?debug` in the Quest Browser:

```bash
adb reverse tcp:5173 tcp:5173
```

## Tested devices

| Device  | OS         | Browser            | Mode          | Result |
| ------- | ---------- | ------------------ | ------------- | ------ |
| Desktop | [OS]       | Chromium [version] | Non-immersive | Works  |
| Desktop | [OS]       | Firefox [version]  | Non-immersive | Works  |
| iPhone  | iOS 26.7.2 | Safari             | Non-immersive | Works  |

iOS Safari has no WebXR, so the iPhone runs the non-immersive mode. Immersive validation on Meta Quest 3
(target 72 FPS) and Android is planned for the first months of the funded project; headsets are budgeted.

## Roadmap

- **Now: TRL 4.** The interaction and data model work with generic demo content in the browser. Immersive
  WebXR is implemented but not yet validated on a headset.
- **Framework.** During the funded project the core will be stabilised, documented and versioned as a
  reusable framework, and the Palaepaphos pilot will be built on top of it.
- **Target: TRL 6.**
  - Validate immersive use on Meta Quest 3 and Android (target 72 FPS in standalone VR).
  - Co-design the content with the heritage adviser.
  - Write and validate the final content for the nine contexts.
  - Work further on accessibility.
  - Evaluate the experience with users at a partner university.

## Licences

- Code: Apache License 2.0, see [LICENSE](LICENSE).
- Assets created for the project (content, docs, scenes, voices): CC BY 4.0, see [LICENSE-ASSETS](LICENSE-ASSETS).
- The demo voices are synthetic; [LICENSE-ASSETS](LICENSE-ASSETS) names the speech model, voice and licence.
  In the project they will be replaced by recorded voices of real people, with their consent.
- No third-party images, plans, engravings, photographs or models, and no AI-generated images. In VR, three.js
  loads the controller models from the WebXR Input Profiles CDN at runtime.

## Disclaimer

Demo content, procedural scenes and synthetic voices. This is not a reconstruction of any real site.
