# 22 · Journey 14: Track and cancel requests

> **Runtime:** 1:29 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 14

**Video:** [22-journey-14-track-and-cancel-requests.mp4](22-journey-14-track-and-cancel-requests.mp4) · **Audio:** [22-journey-14-track-and-cancel-requests.mp3](22-journey-14-track-and-cancel-requests.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/14-track-and-cancel-requests.md`, which took journey 14 from 89% to 100%
(ADR 0060). Joanna's "Your requests" reads "3 open · 1 awaiting reply"; when WaterWorks Plumbing &
Drains confirms her quote, the row reads "Confirmed" about a second later, with the one toast
"WaterWorks Plumbing & Drains confirmed your quote request", because the page now listens to the
event stream (`L2-070` AC6). Naomi's Incoming requests, on "Confirmed", offers "Mark fulfilled" on
Grace's order and not on Joanna's booking; the dialog asks "Mark Grace’s order fulfilled?" with the
customer, the order and the total and "Not yet" first, and marking it says "Order fulfilled. Grace has
been told." (`L2-225`). Joanna's open order from Christian Bookstores reads "Completed" as soon as the
shop marks it, with the toast "Your order with Christian Bookstores is complete". A quote nobody
answered for a week says "WaterWorks Plumbing & Drains has not replied yet" with "Ask again" and
"Cancel request" (`L2-043` AC8); cancelling asks first, says "Request cancelled. WaterWorks Plumbing &
Drains has been told." with "Undo", and "Undo" opens it again ("Cancellation withdrawn"). Two cards
say what the run did behind the screen and close the journey.

## What the pictures prove, and what only the tests prove

The app is answered from the stand-ins of the behaviour specs (`e2e/fixtures/member-requests.ts` and
`e2e/fixtures/incoming-requests.ts`, ADR 0009), and the stand-in's event stream carries the
notification an owner's answer gives, so the pictures prove what the browser does with each answer
and each event: the row and the callout change without a reload and with one toast, the "Mark
fulfilled" control and its dialog, the unanswered callout and the cancel with its Undo. The three
personas are separate stand-ins: Grace's order is not Joanna's.

Only the tests prove what the server does:

- that marking an order fulfilled completes it with the owner as the actor, tells the customer in the
  app ("Luzandre.com marked your order fulfilled", linking to the request) and by e-mail, and that
  the customer's request then reads "Luzandre.com marked this order as fulfilled." with "Completed"
  in its progress; and that a cancelled order is refused with 409 `INVALID_TRANSITION` and the
  server's sentence, as is a quote (`IncomingRequestTests`, `L2-225`). Not shown: it is said in the
  narration and on a card;
- that a cancel and its withdrawal reach the owner as in-app notifications, linking to their
  requests, and nobody else (`MemberRequestTests`, `L2-049` AC2, AC3). Not shown: it is said on a card;
- that the booking-completion and unanswered-request jobs claim each occurrence once in `JobRun`
  across instances, record their success and change nothing twice (`RequestJobTests`, `L2-182` AC1).
  Not shown: it is said on a card;
- that the pages do not ask on a timer while the stream is connected, ask every 5 seconds while it
  cannot connect, and read again when an owner takes back a confirmation
  (`member-requests.spec.ts`, `L2-070` AC6). The video shows the stream only.

Jubilee takes no payment: members pay the business directly.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:10 | Card: "Journey 14 · Track and cancel requests", from 89% to 100% |
| 02 | `list` | 0:10 | 0:18 | Your requests: "3 open · 1 awaiting reply", the type tabs and the WaterWorks quote |
| 03 | `live` | 0:18 | 0:28 | WaterWorks confirms: the row reads "Confirmed" over the event stream, with one toast (L2-070 AC6) |
| 04 | `owner` | 0:28 | 0:38 | Naomi's Incoming requests on "Confirmed": "Mark fulfilled" on Grace's order, the dialog with "Not yet" first (L2-225 AC1, AC2) |
| 05 | `fulfilled` | 0:38 | 0:48 | "Order fulfilled. Grace has been told." and the order leaves "Confirmed" (L2-225 AC3) |
| 06 | `completed` | 0:48 | 0:55 | Joanna's Christian Bookstores order reads "Completed" without a reload, with its toast (L2-043 AC5, L2-070 AC6) |
| 07 | `unanswered` | 0:55 | 1:01 | "WaterWorks Plumbing & Drains has not replied yet" with "Ask again" and "Cancel request" (L2-043 AC8) |
| 08 | `cancel` | 1:01 | 1:10 | "Cancel request" asks first; "Request cancelled" with Undo; "Cancellation withdrawn" (L2-049) |
| 09 | `behind` | 1:10 | 1:20 | Card: the owner's in-app notices, Mark fulfilled on the server, the two jobs in `JobRun`, the tests |
| 10 | `close` | 1:20 | 1:29 | Card: journey 14 complete; Jubilee takes no payment |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/22-journey-14-track-and-cancel-requests --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/22-journey-14-track-and-cancel-requests           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
