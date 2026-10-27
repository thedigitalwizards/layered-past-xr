# One Stone, Many Worlds

An open WebXR framework for showing who interprets a heritage object, on what evidence, and how certain we are.

- Live demo: https://thedigitalwizards.github.io/layered-past-xr/
- Editor for expert validation: https://thedigitalwizards.github.io/layered-past-xr/editor/
- Repository: https://github.com/thedigitalwizards/layered-past-xr
- Screenshot or short GIF: TODO, to be recorded on Chrome and Quest 3 and added as `docs/media/demo.gif`.

> Demo content, procedural scenes and synthetic voices. This is not a reconstruction of any real site. The
> "Demo Baetyl" and "Context A–C" are invented, every text is a placeholder until a heritage expert validates
> it, and the voices are generated.

## The pilot (planned)

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
interpretations change around it. The aim is evidence-aware edutainment. Each context is represented only to
the level its evidence supports (3D, archival, schematic, symbolic or audio), not as a full reconstruction.

## What this proof of concept demonstrates (TRL 4)

- **Context switching around a persistent object.** A fixed baetyl at the centre; the visitor moves through
  contexts and the surroundings change around it, with a blend on the way from one to the next.
- **360° exploration** in every context, in a browser or in VR.
- **Certainty-based visual states.** Each context's look follows its certainty, and the baetyl has its own
  certainty per context. Six states are defined (documented, interpreted, hypothesis, imagined, unknown,
  absent voice), each with a written label; three have their own surroundings so far.
- **A structured claim model.** Every claim has a voice, evidence, a certainty and an approval status
  (draft, reviewed or approved, with reviewer and date). Experts review claims in a small editor, and the
  paradata is exported with the 3D files.

The proof of concept uses three generic demo contexts (Context A–C) with placeholder content and synthetic
placeholder voices. The other six pilot contexts appear only as faint slots on the time dial, labelled
"Pending heritage co-design", with no content.

| Demo context | Certainty    | Surroundings                             | The baetyl here       | Voice                  |
| ------------ | ------------ | ---------------------------------------- | --------------------- | ---------------------- |
| Context A    | documented   | solid, lit, matte                        | solid, documented     | archaeology            |
| Context B    | imagined     | an engraving on sepia paper              | engraved, imagined    | European imagination   |
| Context C    | absent voice | near-dark, dashed outlines on the ground | outline only, unknown | ancient self-depiction |

The baetyl's scale is a placeholder, to be grounded in documented measurements with the heritage adviser.

## How heritage content will be produced

A heritage adviser and a research assistant prepare and validate the evidence records for each context:
claims, sources, voices and certainty. TDW implements the approved structures in WebXR. Decisions taken
jointly are recorded alongside the content. Nothing is published as validated until it has been approved
in the editor.

## What exists, and what this adds

Paradata tools such as Extended Matrix document how reliable each part of a 3D reconstruction is. Polyvocal
heritage research works with several perspectives on the same heritage. This project links voice, evidence,
certainty and expert approval at runtime, in WebXR, and carries the essential paradata inside the glTF files
(`extras`), with a JSON-LD description alongside.

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
- Seated VR: if the headset starts below 1.35 m, the scene is lowered to standing eye height.
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
| `npm run validate` | Check `content/demo.json` against the schema                         |
| `npm test`         | Unit tests for the journey, content validation, approvals and export |
| `npm run check`    | Formatting, lint, types and tests                                    |
| `npm run build`    | Validate the content, type-check and build into `dist/`              |
| `npm run export`   | Write `export/<context>.glb` and `export/demo.jsonld`                |

Content lives in [`content/demo.json`](content/demo.json); see [docs/content-model.md](docs/content-model.md).
The build fails if it does not match the schema.

To test on a Quest 3 during development, connect it with USB (developer mode), forward the port and open
`http://localhost:5173/?debug` in the Quest Browser:

```bash
adb reverse tcp:5173 tcp:5173
```

## Tested devices

| Device                   | OS       | Browser + version                                  | FPS                                    | Known issues                                      |
| ------------------------ | -------- | -------------------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Meta Quest 3             | TODO     | Meta Quest Browser TODO                            | TODO (target 72)                       | TODO                                              |
| Android phone            | TODO     | Chrome TODO                                        | TODO (target 60)                       | TODO                                              |
| Desktop                  | TODO     | Chrome TODO                                        | TODO                                   | TODO                                              |
| Mac, Intel Iris Plus 640 | macOS 13 | Chromium 152 (embedded browser, development check) | 57.8 average, 59 at the 5th percentile | Measured on an earlier build; not a target device |

## Roadmap

- **Now: TRL 4.** The interaction and data model work with generic demo content, in a browser and in WebXR.
- **Target: TRL 6.**
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
