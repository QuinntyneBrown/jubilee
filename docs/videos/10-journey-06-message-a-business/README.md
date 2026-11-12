# 10 · Journey 6: Message a business

> **Runtime:** 1:33 (92.9 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 6

**Video:** [10-journey-06-message-a-business.mp4](10-journey-06-message-a-business.mp4) · **Audio:** [10-journey-06-message-a-business.mp3](10-journey-06-message-a-business.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/06-message-a-business.md`, which took journey 6 from 94% to 98%
(ADR 0050). Joanna writes to Legacy Financial from its listing: the dialog's hint names the owner
and counts down the last 200 of 4,000 characters. Sending opens the conversation, where a toast
and a line say that Trevor is away until Thursday. Her inbox of 64 conversations lists 50 and
"Show more conversations" adds the rest. A photo she sends cannot be checked at first, so the
message is not sent; "Try again" sends it once. Two cards say what the run did behind the screen
and what is left for the owner.

## What the pictures prove, and what only the tests prove

The app is answered from the recorded API and from the messaging stand-in of
`e2e/tests/messages.spec.ts` (`e2e/fixtures/messaging.ts`, ADR 0009), so the pictures prove what
the browser does with each answer: the hint and the counter, the toast and the line with their
day, the count of the whole inbox, the button that adds the next conversations, the words of a
photo that was not sent and the photo in its bubble after "Try again".

Only the tests prove what the server does:

- that the API answers 50 conversations at a time with the counts of the whole inbox, in one order
  across pages, for a search too (`MessagingTests`, L2-056 AC7). The 64 conversations on screen are
  the stand-in's;
- that a photo is checked, given to the scanner and only then stored under a random name; that an
  infected photo is refused with `FAILED_SCAN` and an unscanned one with `SCAN_UNAVAILABLE`, with
  nothing stored either way (`MessagingTests`, L2-060 AC9, L2-138 AC4 and AC5). In the video the
  refusal and the later success are the stand-in's answers: no scanner runs;
- that the ClamAV client speaks `INSTREAM` and never passes a photo on a missing, late or unclear
  answer (`MalwareScannerTests`, against a listener that plays the daemon);
- that a link to a photo is not signed with the published key outside Development
  (`AttachmentLinkTests`);
- that the 11th report of a day is refused, that an attempt on someone else's conversation is
  logged and that e-mails resume after unmute (`MessagingTests`, `EmailNotificationTests`). These
  are not shown.

The away period itself is set by the owner on My business; that was built before this run
(ADR 0039) and is not shown. Touch is proved by a behaviour spec on a 360 px screen; the video
uses the keyboard for the button.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:12 | Card: "Journey 6 · Message a business" |
| 02 | `dialog` | 0:12 | 0:25 | "Message" on Legacy Financial opens the dialog; the hint reads "Be specific and Trevor can answer in one reply."; a long message, then a few more words, and "199 characters left" appears (L2-055 AC1, AC5) |
| 03 | `away` | 0:25 | 0:36 | The message is sent and the conversation opens with the toast "Trevor is away until Thursday" and the line above the messages (L2-055 AC3, L2-062 AC1) |
| 04 | `inbox` | 0:36 | 0:48 | `/messages`: "64 conversations · 2 unread", 50 rows; "Show more conversations" pressed with Enter adds the other 14 and focus moves to the first of them (L2-056 AC7) |
| 05 | `photo` | 0:48 | 0:59 | A photo is attached and sent; the bubble says "Not sent. We couldn’t check this photo just now." with "Try again" and "Delete" (L2-060 AC9) |
| 06 | `retry` | 0:59 | 1:05 | "Try again": the photo is uploaded and the message shows in its bubble with its time |
| 07 | `behind` | 1:05 | 1:22 | Card: the check, the scan and the store; the two refusals; the signing key; the tests |
| 08 | `close` | 1:22 | 1:33 | Card: journey 6 at 98%; `clamd` and the media domain are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/10-journey-06-message-a-business --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/10-journey-06-message-a-business           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
