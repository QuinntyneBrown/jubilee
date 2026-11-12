# 15 · Journey 19: Save listings for later

> **Runtime:** 2:34 (154.7 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 19

**Video:** [15-journey-19-save-listings.mp4](15-journey-19-save-listings.mp4) · **Audio:** [15-journey-19-save-listings.mp3](15-journey-19-save-listings.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/19-save-listings.md`, which took journey 19 from 90% to complete
(ADR 0054). The video walks what the run built, in the app itself. The session is the fake of
`e2e/fixtures/session.ts`, so Joanna signs out and in again without a reload, as in
`drafts.spec.ts`; the saved list is the fake of `e2e/fixtures/saved.ts`, as in `saved.spec.ts` and
`card-hearts.spec.ts` (ADR 0009). On Browse every featured, space and product card has a heart
(`jb-saveable`, `L2-041` AC7): Legacy Financial is saved, with the toast and Undo, and released
again (AC1, AC2); a space and a product are saved; a save that the server does not answer leaves
its heart busy, and a second press does nothing (AC8). A shop's product cards and a category's
cards have the heart, and WaterWorks Plumbing & Drains, already saved, shows it pressed. Joanna
signs out, goes back to Browse without reloading, and no heart is pressed (AC10); as a visitor she
presses Luzandre.com's heart, sees "Join to save Luzandre.com", signs in and is back on Browse with
Luzandre.com saved once (AC9, `L2-012` AC4). `/saved` lists the saved businesses, the space and the
product, newest first (`L2-042` AC1). Two cards say what the tests prove and what is left for the
owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 19 · Save listings for later" |
| 02 | `browse` | 0:14 | 0:29 | Browse: the hearts of the featured cards |
| 03 | `save` | 0:29 | 0:43 | Legacy Financial's heart pressed; "Saved Legacy Financial. Find it any time under Saved." |
| 04 | `undo` | 0:43 | 0:55 | Undo: the heart released |
| 05 | `more` | 0:55 | 1:01 | The hearts of the first space and the first product pressed |
| 06 | `busy` | 1:01 | 1:12 | "Gold cross stoneware mug" busy; a second press does nothing |
| 07 | `category` | 1:12 | 1:25 | `/b/luzandre`: the product cards; `/c/home-property`: WaterWorks saved |
| 08 | `signout` | 1:25 | 1:35 | Sign out, "Browse businesses": no heart pressed |
| 09 | `visitor` | 1:35 | 1:44 | "Join to save Luzandre.com" |
| 10 | `return` | 1:44 | 1:55 | Sign in; back on Browse with Luzandre.com saved |
| 11 | `saved` | 1:55 | 2:06 | `/saved`: "3 businesses · 1 product" |
| 12 | `proof` | 2:06 | 2:21 | Card: `card-hearts.spec.ts`, `SavedTests.cs`, `saveable.spec.ts` |
| 13 | `close` | 2:21 | 2:34 | Card: journey 19 is complete; what is left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/15-journey-19-save-listings --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/15-journey-19-save-listings           # record and encode
```
