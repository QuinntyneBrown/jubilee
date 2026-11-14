# 20 · Journey 27: Meet Jubilee on the marketing site

> **Runtime:** 2:47 (166.7 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 27

**Video:** [20-journey-27-meet-jubilee-on-the-marketing-site.mp4](20-journey-27-meet-jubilee-on-the-marketing-site.mp4) · **Audio:** [20-journey-27-meet-jubilee-on-the-marketing-site.mp3](20-journey-27-meet-jubilee-on-the-marketing-site.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/27-meet-jubilee-on-the-marketing-site.md` before launch. The owner has not
decided to open Jubilee, so ADR 0044's launching-soon state holds and the run did only the part that
does not wait on launch: a behaviour spec for every criterion of `L2-183`, `L2-184` and `L2-186`.
The video is filmed on the marketing site (`:4201`, route key `marketing-home`), answered from the
recorded API (ADR 0009). The visitor reads the opening, then reaches the film's play button by Tab
and plays it with Enter; the film takes the focus (`L2-184` AC6). With the sound off the narration
is read from the captions in the picture (AC5). Space pauses the film through the browser's own
controls, and Enter on a chapter plays it from 0:21. The mission follows the film, word for word
(`L2-183` AC8), and every heading's second part is in the accent colour (AC7). Tab reaches the
fields of "Be listed on launch day." with a focus ring (`L2-186` AC4). Under reduced motion "Watch
the film" jumps and play gives way without a zoom (AC5); on a device set to dark the page stays
light (AC3). Cards open it, say what the specs prove and close with what waits on the owner:
`L2-185`, the links to the app, on launch day.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:21 | Card: "Journey 27 · Meet Jubilee on the marketing site" |
| 02 | `page` | 0:21 | 0:31 | The opening: "Launching soon", the heading and the preview of the app |
| 03 | `keyboard` | 0:31 | 0:44 | Tab through the top bar and the opening to the play button; Enter plays the film |
| 04 | `captions` | 0:44 | 1:00 | The film without sound, its captions under the picture |
| 05 | `controls` | 1:00 | 1:16 | Space pauses; Tab to "0:21 Finding someone you can trust", Enter plays from it |
| 06 | `mission` | 1:16 | 1:32 | "Our mission." and the mission word for word |
| 07 | `headings` | 1:32 | 1:44 | "Trust, built in." and "From need to handshake.", the accent parts |
| 08 | `tab-order` | 1:44 | 1:55 | "Be listed on launch day.": Tab through the fields with a focus ring |
| 09 | `reduced` | 1:55 | 2:07 | Reduced motion: "Watch the film" jumps; play gives way at once |
| 10 | `dark` | 2:07 | 2:20 | A device set to dark: the page in its light theme |
| 11 | `proof` | 2:20 | 2:30 | Card: "Proved by tests" |
| 12 | `close` | 2:30 | 2:47 | Card: "Waiting on the owner's launch decision" |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/20-journey-27-meet-jubilee-on-the-marketing-site --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/20-journey-27-meet-jubilee-on-the-marketing-site           # record and encode
```
