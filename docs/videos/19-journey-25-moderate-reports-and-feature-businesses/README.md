# 19 · Journey 25: Moderate reports and feature businesses

> **Runtime:** 2:41 (160.9 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 25

**Video:** [19-journey-25-moderate-reports-and-feature-businesses.mp4](19-journey-25-moderate-reports-and-feature-businesses.mp4) · **Audio:** [19-journey-25-moderate-reports-and-feature-businesses.mp3](19-journey-25-moderate-reports-and-feature-businesses.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/25-moderate-reports-and-feature-businesses.md`, which took journey 25 from
82% to complete (ADR 0058). The video is filmed in the admin application, answered by the stubs of
`moderation.spec.ts` (`stubModeration` with its staff session from `stubStaff`, ADR 0009). A card
says what the team's e-mail of a report of a conversation holds (`L2-105` AC1). Miriam of the
Jubilee team opens the reports: the admin bar now counts the unresolved reports beside
"Reports", named "2 unresolved" (`L2-188` AC3). She opens the report about Luzandre.com, which moves
it into review, and places the listing on hold with a resolution note (`L2-105` AC2, AC3); the
history shows the actor the stub answers. A card says how a held or removed listing leaves every
public page on the next request. The staff session then answers three unresolved reports, as if a
report had arrived: the bar shows it after Miriam moves to the featured businesses, where she
chooses this week's businesses and saves the week (`L2-106` AC1). Cards close it: the featured
businesses on the next request, what the tests prove, and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:16 | Card: "Journey 25 · Moderate reports and feature businesses" |
| 02 | `email` | 0:16 | 0:37 | Card: "A report reaches the team at once" |
| 03 | `list` | 0:37 | 0:51 | `/reports`: "Reports 2" in the admin bar, the two unresolved reports |
| 04 | `open` | 0:51 | 1:00 | "Report about Luzandre.com", In review |
| 05 | `hold` | 1:00 | 1:12 | "Place on hold" with its note; the listing shows On hold |
| 06 | `public` | 1:12 | 1:29 | Card: "Gone from every public page" |
| 07 | `arrives` | 1:29 | 1:45 | The report page; the bar still reads 2 |
| 08 | `featured` | 1:45 | 1:50 | `/featured`: the bar reads 3 |
| 09 | `choose` | 1:50 | 1:58 | Legacy Financial and Flower Creations chosen; "Featured businesses saved" |
| 10 | `featured-public` | 1:58 | 2:12 | Card: "Featured this week, on the next request" |
| 11 | `proof` | 2:12 | 2:24 | Card: "Proved by tests" |
| 12 | `close` | 2:24 | 2:41 | Card: "Journey 25 is complete"; what is left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/19-journey-25-moderate-reports-and-feature-businesses --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/19-journey-25-moderate-reports-and-feature-businesses           # record and encode
```
