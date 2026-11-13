# 28 · Journey 22: Read policies and get help

> **Runtime:** 1:32 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 22

**Video:** [28-journey-22-read-policies-and-get-help.mp4](28-journey-22-read-policies-and-get-help.mp4) · **Audio:** [28-journey-22-read-policies-and-get-help.mp3](28-journey-22-read-policies-and-get-help.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/22-read-policies-and-get-help.md`, which took journey 22 from 85% to
98% (`L2-226`). In the admin application, "Policies" lists "Statement of faith", "Terms of use",
"Privacy" and "Help", each with its published version: "Version 2 · published 9 Nov 2026 by
Daniel Osei" or "Version 1 · built in · 2 Nov 2026" (AC1). "Edit" opens the privacy notice in
fields. The lead is retyped, and the preview beside the fields, under "Preview of version 3. Not
published yet.", follows each letter, dated today (AC2, AC3). "Publish version 3" asks "Publish
version 3 of Privacy?" with "Members read it at once at /privacy. Version 2 is kept, and the
publish is recorded in the audit log." (AC5). Once it is confirmed, the toast "Version 3
published" says "Members read it now.", and the kept versions list version 3 as published above
versions 2 and 1 (AC6). A visitor opening `/privacy` reads the new lead, "Last updated 10
November 2026". Two cards say what the tests prove behind the screen and what is left for the
owner.

## What the pictures prove, and what only the tests prove

The admin application is answered by the stand-in of the behaviour specs
(`e2e/fixtures/policies.ts`, ADR 0009). The visitor's read of `/api/content/privacy` is answered
by the spec from the version that stand-in has just published. The pictures prove what the
browser does: the list, the fields and the live preview, the confirmation, the toast, the kept
versions, and the public page rendering the published text.

Only the tests prove what the server does:

- that a publish started from an older version answers 409 `VERSION_CHANGED` and publishes
  nothing (`PolicyEditorTests`, `L2-226` AC7). Said on a card; the dialog's answer to it is
  proved by `admin-policies.spec.ts`;
- that a publish is stored with the administrator's name and the time, and is audited as
  `content.published` with the page and both version numbers (`PolicyEditorTests`, AC6). Said on
  a card;
- that an incomplete draft is refused with 422 and nothing is published or audited (AC4);
- that a moderator and a member get 403 and a visitor 401 from every policy endpoint (AC10). Said
  on a card;
- that members read the pages through a read cache: it still answers while the database is down,
  the next read after a publish is the new version, and a change made behind the app shows within
  10 minutes. A cache store that is down never fails a read or a publish (`PolicyEditorTests`,
  `ContentReadCacheTests`, AC11). Said on a card.

What remains is the owner's, and it needs no deployment: publish the real privacy contact and the
final legal wording of the terms and the privacy notice from "Policies" (ADR 0066).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:18 | Card: "Journey 22 · Read policies and get help" |
| 02 | `list` | 0:18 | 0:26 | `/policies`: the four pages with their published version (AC1) |
| 03 | `editor` | 0:26 | 0:39 | The privacy editor: the lead retyped, and the preview follows it (AC2, AC3) |
| 04 | `confirm` | 0:39 | 0:48 | "Publish version 3 of Privacy?" (AC5) |
| 05 | `published` | 0:48 | 0:56 | The toast "Version 3 published" and the kept versions (AC6) |
| 06 | `member` | 0:57 | 1:02 | `/privacy` with the new lead, "Last updated 10 November 2026" |
| 07 | `behind` | 1:03 | 1:23 | Card: a stale publish refused, the publish audited, administrators only, the read cache |
| 08 | `close` | 1:23 | 1:32 | Card: the owner's step, with no deployment |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/28-journey-22-read-policies-and-get-help --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/28-journey-22-read-policies-and-get-help           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
