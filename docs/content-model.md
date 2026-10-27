# Content model

Everything the visitor reads and hears comes from [`content/demo.json`](../content/demo.json), checked against
[`schema/demo.schema.json`](../schema/demo.schema.json). Experts and editors change texts, voices,
certainty and sources there, without touching code. Editors that understand JSON Schema (VS Code, for
example) autocomplete fields and underline mistakes.

```jsonc
{
  "object": { "id": "demo-stone", "title": "Demo Baetyl" },
  "contexts": [
    // in travel order: A → B → C, then A again
    {
      "id": "context-a",
      "title": "Context A",
      "period": "[Placeholder period]",
      "voice": "archaeology",
      "certainty": "documented", // must have surroundings: documented, imagined, absent-voice
      "audio": { "src": "audio/context-a.m4a", "caption": "…", "synthetic": true },
      "baetyl": { "style": "solid", "certainty": "documented" }, // the baetyl's own look and certainty here
      "claims": [
        {
          "id": "a-1",
          "title": "Measured position", // shown on the lens card, up to 60 characters
          "anchor": [-1.54, 1.0, -4.23], // metres from the baetyl; y is up; the visitor stands at +z
          "text": "… [Placeholder — pending heritage expert validation]",
          "voice": "archaeology",
          "certainty": "documented",
          "evidence": [{ "citation": "…", "url": null, "licence": null }],
          "approval": { "status": "draft", "by": null, "date": null },
        },
      ],
    },
  ],
  // planned contexts not yet co-designed: shown only as faint slots on the time dial
  "pendingContexts": [{ "id": "context-d", "title": "Context D" }],
}
```

- **contexts**: the historical and reception contexts the visitor moves through, around the baetyl.
- **voice**: `archaeology`, `ancient-self-depiction`, `european-imagination`, `excavators`,
  `community-gc`, `community-tc`, `institution`, `tourism`.
- **certainty**: `documented`, `interpreted`, `hypothesis`, `imagined`, `unknown`, `absent-voice`
  (see [certainty.md](certainty.md)).
- **baetyl**: how the baetyl looks in this context (`solid`, `engraving`, `outline`) and how certain its
  presence and form are here. It can differ from the context's certainty.
- **audio.src** is a path under `public/` (`.m4a` or `.mp3`). The build checks the file exists.
  `synthetic: true` adds _Synthetic placeholder voice_ under the caption.
- **anchor**: the baetyl stands at the origin and the visitor 4 m in front of it, at `+z`. To place a point
  `d` metres from the baetyl at a direction `yaw` degrees clockwise from the far side (`-z`), use
  `x = d·sin(yaw)`, `z = −d·cos(yaw)`. It must be 2–20 m from the baetyl.
- **approval**: `draft`, `reviewed` or `approved`; `reviewed` and `approved` need `by` and `date`
  (`YYYY-MM-DD`). Experts normally set this in the editor.
- **pendingContexts**: up to 8 slots with only an `id` and a `title`. They carry no claims, voices or
  periods: they mark contexts still to be co-designed with the heritage adviser.
- Each context has 1–6 claims; the demo has 2–3.

Until a text has been validated by a heritage expert it ends with
`[Placeholder — pending heritage expert validation]`. Demo content names no real site or period.

## Check your changes

```bash
npm run validate
```

The build fails on invalid content, with messages such as:

```
/contexts/0/voice must be equal to one of the allowed values (archaeology,…)
context "context-b": there is no context style for certainty "hypothesis" yet
context "context-a": audio file public/audio/context-a.mp3 not found
```

## Expert validation

Open `/editor/`. Every claim is listed with its text, voice, certainty, sources and status, under its
context and the baetyl's certainty there. **Mark reviewed** and **Approve** ask for the reviewer's name and
record today's date. Changes are kept in the browser (localStorage) and appear in the experience at once:
claims that are not approved keep their _Draft_ note. **Export JSON** downloads the whole content with the
approvals, ready to replace `content/demo.json`.

## Voices

Recorded voices go in `public/audio/` as AAC (`.m4a`) or MP3, about 48 kbps mono. For example, with ffmpeg:

```bash
ffmpeg -i recording.wav -af loudnorm=I=-18:TP=-1.5 -ac 1 -c:a aac -b:a 48k public/audio/context-a.m4a
```
