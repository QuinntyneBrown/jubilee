# 04 · Journey 3: Search the directory

> **Runtime:** 2:51 (171.2 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 3

**Video:** [04-journey-03-search-directory.mp4](04-journey-03-search-directory.mp4) · **Audio:** [04-journey-03-search-directory.mp3](04-journey-03-search-directory.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/03-search-directory.md`, which took journey 3 from 85% to complete. A
member searches from the top bar in the app itself and reads the grouped results, the no-results
state and the empty search page, answered from the recorded API (ADR 0009). Two scenes show a
paused listing leaving the next search, with the answers stubbed as in `e2e/tests/search.spec.ts`.
Three cards say what the run settled behind the screen: the index over the database is the final
design with no indexing job (ADR 0011), the tests that prove it, and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 3 · Search the directory" |
| 02 | `search` | 0:15 | 0:27 | "plumber" typed in the top bar opens `/search?q=plumber`: 2 businesses · 0 services · 0 products |
| 03 | `explain` | 0:27 | 0:38 | "Matches plumbing in name" and "Matches plumb in name", the matched word highlighted |
| 04 | `tabs` | 0:38 | 0:53 | "bibles": 1 business · 0 services · 1 product; the "Products" tab lists the journaling Bible |
| 05 | `no-results` | 0:53 | 1:05 | "plumbre": "Nothing matches “plumbre”", "Did you mean plumber?", then "Search “plumber”" |
| 06 | `empty` | 1:05 | 1:17 | `/search` with no query: "Your recent searches", "Popular categories"; one recent search removed |
| 07 | `current-before` | 1:17 | 1:29 | Stubbed: "plumbing" finds two businesses |
| 08 | `current-after` | 1:29 | 1:40 | Stubbed: one is paused; the search made again finds one (L2-029 AC7) |
| 09 | `decision` | 1:41 | 1:58 | Card: `DatabaseSearchIndex`, ADR 0011 amended, no `SearchIndexingJob` |
| 10 | `tests` | 1:58 | 2:20 | Card: `SearchCurrencyTests.cs` and the three new specs of `search.spec.ts` |
| 11 | `error` | 2:20 | 2:31 | "We couldn’t load your results" with `JB-SRCH-503`; "Try again" loads the results |
| 12 | `close` | 2:31 | 2:50 | Card: journey 3 is complete; the sweeps are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/04-journey-03-search-directory --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/04-journey-03-search-directory           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
