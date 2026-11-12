# 11 · Journey 15: Run a business listing

> **Runtime:** 2:46 (166.1 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 15

**Video:** [11-journey-15-run-a-business-listing.mp4](11-journey-15-run-a-business-listing.mp4) · **Audio:** [11-journey-15-run-a-business-listing.mp3](11-journey-15-run-a-business-listing.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/15-run-a-business-listing.md`, which took journey 15 from 90% to
complete (ADR 0051). The video walks what the run built, in the app itself. Naomi's workspace of
Luzandre.com is answered by the fake of `e2e/fixtures/my-business.ts`, as in
`my-business.spec.ts` (ADR 0009), with her other business and a draft, and three photos whose
files are pictures of the design reference (`docs/assets/photos/`). "Saved by members" carries
its weekly change (`L2-085` AC6); the select "Business" moves the workspace to Laurent Photography
and back, beside "List another business" (`L2-079` AC4 and AC5); in the listing editor the third
photo is dragged by its handle to the front and becomes the cover, and "Move photo 2 earlier" does
the same from the keyboard (`L2-088` AC3); a new name is live at once and the page says the
verification team will take another look (`L2-087` AC6). The public page with photos is Legacy
Financial in the stubbed state `business.photos` of `listing-photos.spec.ts`: no seeded business
has photos (`L2-221`). The pause dialog and the paused banner close the walk (`L2-096`). Four
cards say what the run proved behind the screen: the re-check e-mails (`RecheckNoticeTests.cs`),
the `picture` with `srcset`, the 60-second bound of a pause (`PauseBoundTests.cs`), and what is
left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 15 · Run a business listing" |
| 02 | `saved` | 0:14 | 0:30 | `/my-business` of Luzandre.com: "Saved by members", 28, "↑ 4 this week" |
| 03 | `switcher` | 0:30 | 0:45 | The select "Business"; "Laurent Photography · Pending verification" is chosen: "We’re reviewing Laurent Photography" |
| 04 | `another` | 0:45 | 0:59 | Back to "Luzandre.com · Live"; "List another business" |
| 05 | `drag` | 0:59 | 1:09 | `/my-business/listing`: the third photo is dragged by its handle to the front and is the cover |
| 06 | `keyboard` | 1:09 | 1:18 | Focus on "Move photo 2 earlier", then Enter |
| 07 | `recheck` | 1:18 | 1:29 | The name becomes "Luzandre Print Co."; "Listing updated", with the promise of another look within two business days |
| 08 | `email` | 1:29 | 1:43 | Card: `L2-087` AC6, the e-mail to the verification team and the e-mail and notification to the owner |
| 09 | `public` | 1:43 | 1:54 | Legacy Financial: the cover photo in place of the tile, then "Photos" |
| 10 | `srcset` | 1:54 | 2:07 | Card: `L2-221`, a `picture` with a WebP source, a JPEG `img` and `srcset` |
| 11 | `pause` | 2:07 | 2:17 | "Pause Luzandre.com?", "Pause listing", then the banner "Your listing is paused." with "Resume listing" |
| 12 | `bound` | 2:17 | 2:32 | Card: `L2-096` AC2 and AC3, `L2-028` AC2 in `PauseBoundTests.cs` |
| 13 | `close` | 2:32 | 2:45 | Card: journey 15 is complete; the sweeps and `jubilee migrate` are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/11-journey-15-run-a-business-listing --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/11-journey-15-run-a-business-listing           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
