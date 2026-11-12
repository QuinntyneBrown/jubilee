# 17 · Journey 21: Share or report a listing

> **Runtime:** 2:47 (167.1 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 21

**Video:** [17-journey-21-share-or-report-listing.mp4](17-journey-21-share-or-report-listing.mp4) · **Audio:** [17-journey-21-share-or-report-listing.mp3](17-journey-21-share-or-report-listing.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/21-share-or-report-listing.md`, which took journey 21 from 78% to complete
(ADR 0055). The video walks what the run built, in the app itself. The listing is Luzandre.com from
the recorded API; the report endpoint is the fake of `e2e/fixtures/reports.ts`, held while the
report is on its way, and the device's share sheet is the stand-in `share-report.spec.ts` installs
(ADR 0009). A visitor presses Share and sees "Share Luzandre.com" with the link, Copy, E-mail,
WhatsApp and More… (`L2-038` AC1, AC3); Copy reads "Copied ✓" and the polite status says "Link
copied" (AC2); Done closes the dialog and focus goes back to Share (`L2-130` AC2). The app then
shows `og-image.png`, the image of every shared listing, and a card says how the app's host
answers a link-preview fetcher's `/b/{slug}` with the social preview (AC4). As a visitor, "Report
this listing" opens "Join to report Luzandre.com" (`L2-039` AC6); signed in, Joanna chooses a
reason, writes what happened, and sends it: the form is read-only and busy, and a second press and
Escape do nothing (`L2-127` AC1, `L2-130` AC1); the answer comes and the dialog thanks her (AC3). A
card says what the verification team's e-mail holds (`L2-105` AC1), and two more what the tests
prove and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 21 · Share or report a listing" |
| 02 | `share` | 0:14 | 0:26 | `/b/luzandre`: Share opens "Share Luzandre.com" |
| 03 | `copy` | 0:26 | 0:39 | "Copied ✓" |
| 04 | `more` | 0:39 | 0:49 | "More…" |
| 05 | `done` | 0:49 | 0:57 | Done: the dialog closed, back on the listing |
| 06 | `image` | 0:57 | 1:08 | `/og-image.png` |
| 07 | `preview` | 1:08 | 1:22 | Card: "Link previews" |
| 08 | `visitor` | 1:22 | 1:32 | "Join to report Luzandre.com" |
| 09 | `report` | 1:32 | 1:47 | "Report Luzandre.com": a reason, a description, the counter |
| 10 | `busy` | 1:47 | 1:55 | Fields read-only, "Send report" busy, "Cancel" disabled |
| 11 | `thanks` | 1:55 | 2:05 | "Thanks for telling us" |
| 12 | `email` | 2:05 | 2:18 | Card: "New report: Luzandre.com" |
| 13 | `proof` | 2:18 | 2:32 | Card: `share-report.spec.ts`, `ReportNoticeTests.cs`, `eng/azure/server.test.js` |
| 14 | `close` | 2:32 | 2:47 | Card: journey 21 is complete; what is left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/17-journey-21-share-or-report-listing --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/17-journey-21-share-or-report-listing           # record and encode
```
