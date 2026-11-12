# 14 · Journey 17: Stay notified

> **Runtime:** 2:54 (173.6 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 17

**Video:** [14-journey-17-stay-notified.mp4](14-journey-17-stay-notified.mp4) · **Audio:** [14-journey-17-stay-notified.mp3](14-journey-17-stay-notified.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/17-stay-notified.md`, which took journey 17 from 89% to complete
(ADR 0053). The video walks what the run built, in the app itself. The notification centre and
the member's event stream are answered by the fake of `e2e/fixtures/notifications.ts`, as in
`notifications.spec.ts` and `toasts.spec.ts` (ADR 0009). The list holds "New in Shops: Flower
Creations", the notification of a business approved for the first time (`L2-222` AC1); a
notification that arrives rises as a toast and is held by the pointer (`L2-066` AC1); "Mark all as
read" fails, the error is an alert that stays, and with two more arrivals the oldest info toast is
pushed out, never the error (`L2-066` AC2 and AC3); the stream is then refused, and the app opens
it again by itself after 5 seconds from the last event it received (`L2-070` AC4). In
`/account/notifications`, answered by the fake of `e2e/fixtures/profile.ts` as in
`account.spec.ts`, "How often" is set to "One daily summary" (`L2-016`). The unsubscribe page,
answered by the fake of `e2e/fixtures/unsubscribe.ts` as in `unsubscribe.spec.ts`, is shown for
"New messages", for the daily summary and for a link that does not verify (`L2-224`). Four cards
say what the run built behind the screen: the daily summary job
(`EmailNotificationTests.DailySummary.cs`), the weekly note and the tips for business owners
(`NewBusinessTests.cs`, `OwnerTipTests.cs`, `EmailLayoutTests.cs`), the measurement of the stream
(`EventStreamTests.cs`), and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:14 | Card: "Journey 17 · Stay notified" |
| 02 | `centre` | 0:14 | 0:30 | `/notifications`: the list, then "New in Shops: Flower Creations" |
| 03 | `toast` | 0:30 | 0:43 | The toast "Faith heavyweight tee, charcoal is back in stock" arrives; the pointer rests on it |
| 04 | `three` | 0:43 | 0:56 | "Mark all as read" fails: "Couldn’t mark them as read"; two more toasts arrive and the error stays |
| 05 | `reopen` | 0:56 | 1:12 | The error is dismissed; the stream is refused, then "Flower Creations confirmed your order" arrives |
| 06 | `settings` | 1:12 | 1:22 | `/account/notifications`: "How often" becomes "One daily summary"; "Saved at 9:00 a.m." |
| 07 | `summary` | 1:22 | 1:39 | Card: `L2-016` AC6 to AC8, the job `daily-summary` |
| 08 | `notes` | 1:39 | 1:59 | Card: `L2-222`, `L2-223` and `L2-149` AC1 |
| 09 | `unsubscribe` | 1:59 | 2:15 | `/unsubscribe/…`: "You’re unsubscribed", new messages |
| 10 | `kinds` | 2:15 | 2:27 | The same page for the daily summary, then "This link doesn’t work" |
| 11 | `stream` | 2:27 | 2:41 | Card: `L2-070` AC1 and AC4 |
| 12 | `close` | 2:41 | 2:53 | Card: journey 17 is complete; what is left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/14-journey-17-stay-notified --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/14-journey-17-stay-notified           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
