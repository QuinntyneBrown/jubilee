# 21 · Journey 29: Give feedback

> **Runtime:** 2:51 (171.4 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 29

**Video:** [21-journey-29-give-feedback.mp4](21-journey-29-give-feedback.mp4) · **Audio:** [21-journey-29-give-feedback.mp3](21-journey-29-give-feedback.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/29-give-feedback.md`, which closed the last tests of `L2-210` to `L2-214`.
The video is filmed in the app (`:4200`) with Joanna signed in, answered from the recorded API and
the `stubFeedback` and `stubBooking` stubs the behaviour specs use (ADR 0009). On Browse she opens
the Feedback launcher (`L2-210` AC1, AC2), rates Jubilee four stars, Good, with a note and is
thanked by name (AC3, AC6, AC7). "Report a bug" says what is attached: the screen, the browser and
device and the version (AC4). Kudos are chips that say whether they are pressed (AC5); on a touch
screen a chip is now pressed over 44 px and is still drawn 32 px tall (AC12, ADR 0059). After a
meeting request the confirmation asks how easy it was; a low score asks what got in the way
(`L2-211`). The feedback page rates each part of Jubilee (`L2-212` AC2), and "Your feedback"
beside it shows each item's date, status in words, reference and the team's reply (`L2-213`).
Cards say what the new API tests prove (`L2-214` AC6, AC8, AC10, in `FeedbackTests.Kinds.cs`),
what the new behaviour specs prove (reduced motion and touch targets, `feedback-panel.spec.ts`),
how the parity specs pick up the owner's captures by name (ADR 0059), and what is left for the
owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:20 | Card: "Journey 29 · Give feedback" |
| 02 | `launcher` | 0:20 | 0:37 | Browse, the "Feedback" launcher at the bottom right |
| 03 | `rate` | 0:37 | 0:53 | The panel: four stars, "Good", a note, "Send rating", "Thank you, Joanna." |
| 04 | `bug` | 0:53 | 1:02 | "Report a bug": what went wrong and "We'll attach: Browse · your browser and device · version 1.0.0" |
| 05 | `kudos` | 1:02 | 1:19 | "Kudos": two chips pressed, "Send kudos", the thanks |
| 06 | `check-in` | 1:19 | 1:35 | A meeting request to Legacy Financial; "How easy was it to send your request?", a 2 and "What got in the way?" |
| 07 | `page` | 1:36 | 1:47 | `/feedback/rate`: five stars and a score for two parts of Jubilee |
| 08 | `history` | 1:47 | 1:57 | "Your feedback": statuses in words, a reference and the team's reply |
| 09 | `api` | 1:58 | 2:13 | Card: "Proved by API tests" |
| 10 | `motion` | 2:13 | 2:25 | Card: "Proved by behaviour specs" |
| 11 | `parity` | 2:25 | 2:40 | Card: "Parity, ready for the reference" |
| 12 | `close` | 2:40 | 2:51 | Card: "Left to the owner" |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/21-journey-29-give-feedback --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/21-journey-29-give-feedback           # record and encode
```
