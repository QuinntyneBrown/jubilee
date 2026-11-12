# 10 · Journey 13: Respond to customer requests

> **Runtime:** 2:32 (151.7 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 13

**Video:** [10-journey-13-respond-to-customer-requests.mp4](10-journey-13-respond-to-customer-requests.mp4) · **Audio:** [10-journey-13-respond-to-customer-requests.mp3](10-journey-13-respond-to-customer-requests.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/13-respond-to-customer-requests.md`, which took journey 13 from 90% to
complete (ADR 0050). The video walks what the run built, in the app itself. Naomi's Incoming
requests of Luzandre.com is answered by the fake of `e2e/fixtures/incoming-requests.ts`, as in
`incoming-requests.spec.ts` (ADR 0009): a booking request arrives over the event stream and is
announced in one toast (`L2-051` AC5); a confirmation that fails after its dialog was closed with
Escape is said in a danger toast, and "Try again" confirms it (`L2-052` AC5); the decline dialog
opens on "Keep request" (`L2-129` AC1), and a decline of a request the customer had cancelled
closes the dialog and says "Request not declined" (`L2-053` AC6). The "Replies fast" badge
(`L2-054`) is shown on the listing page of Legacy Financial and on the card of Deeks Insurance,
the stubbed state `business.replies-fast` of `business.spec.ts`: no seeded business has earned
the badge. Three cards say what the run proved behind the screen: the event stream and its
fallback (`L2-051` AC7), the response-time job and the customer's notification
(`ResponseTimeJobTests.cs`, `IncomingRequestTests.cs`), and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:15 | Card: "Journey 13 · Respond to customer requests" |
| 02 | `list` | 0:15 | 0:26 | `/my-business/requests` of Luzandre.com: three new requests, "Decline" and "Confirm" |
| 03 | `stream` | 0:26 | 0:40 | Grace Adeyemi's booking request arrives over the stream; one toast, "New booking request" |
| 04 | `confirm` | 0:40 | 0:50 | "Confirm order" for Samuel Park, then Escape before the answer |
| 05 | `danger` | 0:50 | 1:04 | Danger toast "Couldn’t confirm the order", "Samuel’s request is still new. Try again." |
| 06 | `again` | 1:04 | 1:14 | "Try again": "Order confirmed", "Samuel has been told.", "Undo" |
| 07 | `decline` | 1:14 | 1:25 | The decline dialog for David Chen, focus on "Keep request"; a message is typed |
| 08 | `conflict` | 1:25 | 1:35 | The dialog closes; danger toast "Request not declined", "David Chen cancelled this request." |
| 09 | `badge` | 1:35 | 1:47 | Legacy Financial with "Replies fast" beside the credentials, and on the card of Deeks Insurance |
| 10 | `fallback` | 1:47 | 2:01 | Card: `L2-051` AC5 and AC7, `RealtimeService.connected` |
| 11 | `job` | 2:01 | 2:15 | Card: `L2-182` AC1 in `ResponseTimeJobTests.cs`; `L2-052` AC2, `L2-053` AC3 in `IncomingRequestTests.cs` |
| 12 | `close` | 2:15 | 2:31 | Card: journey 13 is complete; the sweeps and `jubilee migrate` are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/10-journey-13-respond-to-customer-requests --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/10-journey-13-respond-to-customer-requests           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
