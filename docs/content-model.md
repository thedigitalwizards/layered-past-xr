# Content model

Everything the visitor reads and hears comes from [`content/demo.json`](../content/demo.json), checked against
[`schema/demo.schema.json`](../schema/demo.schema.json). Experts and editors change texts, voices,
certainty and sources there, without touching code. Editors that understand JSON Schema (VS Code, for
example) autocomplete fields and underline mistakes.

```jsonc
{
  "object": { "id": "demo-stone", "title": "Demo Stone" },
  "worlds": [
    // in dial order: turning the stone goes A → B → C
    {
      "id": "world-a",
      "title": "World A",
      "period": "[Placeholder period]",
      "voice": "archaeology",
      "certainty": "documented", // must have a world style: documented, imagined, absent-voice
      "audio": { "src": "audio/world-a.m4a", "caption": "…", "synthetic": true },
      "stone": { "style": "solid" }, // solid | engraving | outline
      "claims": [
        {
          "id": "a-1",
          "title": "Measured position", // shown on the lens card, up to 60 characters
          "anchor": [-1.54, 1.0, -4.23], // metres; the visitor stands at the origin, y is up
          "text": "… [Placeholder — pending heritage expert validation]",
          "voice": "archaeology",
          "certainty": "documented",
          "evidence": [{ "citation": "…", "url": null, "licence": null }],
          "approval": { "status": "draft", "by": null, "date": null },
        },
      ],
    },
  ],
}
```

- **voice**: `archaeology`, `ancient-self-depiction`, `european-imagination`, `excavators`,
  `community-gc`, `community-tc`, `institution`, `tourism`.
- **certainty**: `documented`, `interpreted`, `hypothesis`, `imagined`, `unknown`, `absent-voice`
  (see [certainty.md](certainty.md)).
- **audio.src** is a path under `public/` (`.m4a` or `.mp3`). The build checks the file exists.
  `synthetic: true` adds _Synthetic placeholder voice_ under the caption.
- **anchor**: to place a point `d` metres away at a direction `yaw` degrees clockwise from straight ahead,
  use `x = d·sin(yaw)`, `z = −d·cos(yaw)`. It must be 2–20 m from the visitor.
- **approval**: `draft`, `reviewed` or `approved`; `reviewed` and `approved` need `by` and `date`
  (`YYYY-MM-DD`). Experts normally set this in the editor.
- Each world has 1–6 claims; the demo has 2–3.

Until a text has been validated by a heritage expert it ends with
`[Placeholder — pending heritage expert validation]`. Demo content names no real site.

## Check your changes

```bash
npm run validate
```

The build fails on invalid content, with messages such as:

```
/worlds/0/voice must be equal to one of the allowed values (archaeology,…)
world "world-b": there is no world style for certainty "hypothesis" yet
world "world-a": audio file public/audio/world-a.mp3 not found
```

## Expert validation

Open `/editor/`. Every claim is listed with its text, voice, certainty, sources and status. **Mark
reviewed** and **Approve** ask for the reviewer's name and record today's date. Changes are kept in the
browser (localStorage) and appear in the experience at once: claims that are not approved keep their _Draft_
note. **Export JSON** downloads the whole content with the approvals, ready to replace `content/demo.json`.

## Voices

Recorded voices go in `public/audio/` as AAC (`.m4a`) or MP3, about 48 kbps mono. For example, with ffmpeg:

```bash
ffmpeg -i recording.wav -af loudnorm=I=-18:TP=-1.5 -ac 1 -c:a aac -b:a 48k public/audio/world-a.m4a
```
