# 18 · Journey 23: Recover from errors

> **Runtime:** 2:31 (151.1 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 23

**Video:** [18-journey-23-recover-from-errors.mp4](18-journey-23-recover-from-errors.mp4) · **Audio:** [18-journey-23-recover-from-errors.mp3](18-journey-23-recover-from-errors.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/23-recover-from-errors.md`, which took journey 23 from 79% to complete
(ADR 0056). The video walks what the run built, in the app itself, answered from the recorded API
and the stubs of `error-pages.spec.ts` (ADR 0009). An old link, `/b/legacy-financial-group`, is
answered as the API answers a kept slug (`stubKeptSlug`: the 301 followed to the current listing),
and the app shows Legacy Financial at `/b/legacy-financial` (`L2-113` AC2); a card says how a new
business name gives a listing a new slug and keeps the old one. An address that is no page shows the
not-found page (AC1), and a card says how the app's host now gives every page load its status
before the app runs: 404, 403, 301, 503 and 500 (AC3, `L2-114` AC1, `L2-115` AC3, `L2-117` AC1).
The static copies of the maintenance and server error pages are opened as built: no script, Archivo
bundled, "Check again", "Try again", "Get help" and a reference. Joanna, signed in, opens the
owner's workspace without a listing, sees the forbidden page and presses "Ask for access"; the
toast says it was passed to the team (`L2-114` AC2), and a card says what the team's e-mail holds.
Two cards close it: what the tests prove and what is left for the owner.

The app's build copies Archivo to `/static/Archivo.woff2`; a dev server started before that change
does not serve it, so the demo answers that path with the same file
(`frontend/projects/components/src/lib/assets/fonts/Archivo.woff2`).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:16 | Card: "Journey 23 · Recover from errors" |
| 02 | `renamed` | 0:16 | 0:28 | `/b/legacy-financial-group` opens Legacy Financial at `/b/legacy-financial` |
| 03 | `address` | 0:28 | 0:41 | Card: "The address follows the name", with the address opened and the address shown |
| 04 | `not-found` | 0:41 | 0:49 | `/no-such-page`: "We can’t find that page" with "Back to browse" and "Search" |
| 05 | `statuses` | 0:49 | 1:08 | Card: "A page load gets its status first" |
| 06 | `maintenance` | 1:08 | 1:22 | `/static/maintenance.html`: "Jubilee is being updated", "Check again" |
| 07 | `server-error` | 1:22 | 1:35 | `/static/server-error.html`: "Try again", "Get help", the reference |
| 08 | `forbidden` | 1:35 | 1:44 | Joanna on `/my-business`: "You don’t have access to this page", "Ask for access" |
| 09 | `asked` | 1:44 | 1:51 | "Requested ✓" and the toast "We’ve passed your request to the team." |
| 10 | `email` | 1:51 | 2:02 | Card: "Access request: /my-business" |
| 11 | `proof` | 2:02 | 2:16 | Card: "Proved by tests" |
| 12 | `close` | 2:16 | 2:31 | Card: "Journey 23 is complete"; what is left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/18-journey-23-recover-from-errors --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/18-journey-23-recover-from-errors           # record and encode
```
