# 03 · Journey 1: Discover businesses

> **Runtime:** 2:39 (159.3 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 1

**Video:** [03-journey-01-discover-businesses.mp4](03-journey-01-discover-businesses.mp4) · **Audio:** [03-journey-01-discover-businesses.mp3](03-journey-01-discover-businesses.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/01-discover-businesses.md`, which took journey 1 from 93% to complete. A
visitor goes from the welcome page to the browse home and a filtered, sorted category in the app
itself, answered from the recorded API (ADR 0009). Three cards say what the run settled behind the
screen: how the directory read cache is cleared (ADR 0003), the tests that prove it, and what is
left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 1 · Discover businesses" |
| 02 | `welcome` | 0:15 | 0:29 | `/welcome` as a visitor: the heading and the live count, 47 verified businesses |
| 03 | `welcome-more` | 0:29 | 0:37 | The eleven category links, "How Jubilee works", "Featured this week" |
| 04 | `browse` | 0:37 | 0:48 | "Browse businesses" opens `/`; the "New here?" panel with "Join free" |
| 05 | `groups` | 0:48 | 0:59 | "All 47 businesses" by category; "See all 10" under Home & property |
| 06 | `empty-group` | 0:59 | 1:14 | The directory stubbed with no Learning group: Business & tech, then Media (L2-021 AC4) |
| 07 | `category` | 1:14 | 1:24 | The chip "Home & property" opens `/c/home-property`: 10 verified businesses, 3 take emergency calls |
| 08 | `filter` | 1:24 | 1:35 | The chip "Emergency calls": 3 of 10 businesses match |
| 09 | `sort` | 1:35 | 1:43 | The filter removed, "Sort" set to "Name A–Z" |
| 10 | `cache` | 1:43 | 2:02 | Card: the 60-second cache and `DirectoryCacheInvalidationInterceptor` (ADR 0003, L2-156) |
| 11 | `tests` | 2:02 | 2:19 | Card: `DirectoryCacheTests.cs`, `browse.spec.ts`, `welcome.spec.ts` |
| 12 | `close` | 2:19 | 2:38 | Card: journey 1 is complete; the sweeps are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/03-journey-01-discover-businesses --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/03-journey-01-discover-businesses           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
