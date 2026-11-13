# 26 · Journey 18: Recover a forgotten password

> **Runtime:** 1:30 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 18

**Video:** [26-journey-18-recover-password.mp4](26-journey-18-recover-password.mp4) · **Audio:** [26-journey-18-recover-password.mp3](26-journey-18-recover-password.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/18-recover-password.md`, which took journey 18 from 90% to 100%
(ADR 0064, amending ADR 0026). At `/forgot-password` the visitor enters their e-mail and presses
"Send reset link"; the page says "Check your e-mail. If {address} has an account, a reset link is on
its way. It works for 60 minutes." (`L2-008` AC1). Asked again after three requests in the hour, the
form stays with the address kept and the warning "You’re doing that a lot. Try again in 42
minutes." (`L2-008` AC4, `L2-137` AC1). The link opens "Choose a new password" with "For
{e-mail}", the token gone from the address bar (`L2-009` AC1, `L2-140` AC2); a password of five
characters is refused with "Use at least 10 characters. This one has 5." (`L2-009` AC2), and a
good one shows "Password changed" (`L2-009` AC4). Two cards say what the tests prove behind the
screen and close the journey.

## What the pictures prove, and what only the tests prove

The app is answered from the stand-in of the behaviour spec (`e2e/fixtures/password-reset.ts`,
ADR 0009); the 429 is the stand-in's, with `Retry-After: 2520`. The pictures prove what the browser
does: the neutral answer, the warning in place of the answer with the address kept, the reset form
and its field error, and the success.

Only the tests prove what the server does:

- that a fourth request for one address within an hour answers 429 with `Retry-After` and
  `rate_limited`, records nothing and sends nothing, the same for an address with an account and
  one without, and that the trip is logged with the IP address and never the e-mail
  (`PasswordResetTests`, `L2-008` AC4, `L2-137` AC1, `L2-141` AC1, `L2-143` AC1). Said on a card;
- that the median time of 100 requests each, with and without an account, differs by less than
  50 ms (`PasswordResetTests`, `L2-008` AC5). Said on a card;
- that no reset token reaches the API's log or the worker's, the e-mail sender's included
  (`TokenRedactionTests`, `PasswordResetJobTests`, `L2-140` AC3). Said on a card;
- that more than 100 reset requests in 5 minutes e-mail the on-call contact the count and no
  address, at most once in 5 minutes, falling back to the Jubilee team's address
  (`PasswordResetAlertTests`, `L2-143` AC4). Said on a card;
- that the change ends every other session and sends the security e-mail (`PasswordResetTests`,
  `L2-009` AC4, `L2-134` AC3). Said in the narration.

Owner step at the time of the video: set `Security__OnCallEmail` on `jubilee-to-app` (`eng/azure/README.md`). The owner set it on 13 November 2026.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:11 | Card: "Journey 18 · Recover a forgotten password", from 90% to 100% |
| 02 | `ask` | 0:11 | 0:24 | `/forgot-password`: the address sent, "Check your e-mail. If {address} has an account…" (L2-008 AC1) |
| 03 | `limit` | 0:24 | 0:37 | The same form after three requests: "You’re doing that a lot. Try again in 42 minutes.", the address kept (L2-008 AC4, L2-137 AC1) |
| 04 | `open` | 0:37 | 0:47 | `/reset-password`: "Choose a new password", "For joanna.adeyemi@example.com" (L2-009 AC1, L2-140 AC2) |
| 05 | `short` | 0:47 | 0:54 | "short" refused: "Use at least 10 characters. This one has 5." (L2-009 AC2) |
| 06 | `changed` | 0:54 | 1:04 | A good password: "Password changed" (L2-009 AC4) |
| 07 | `behind` | 1:04 | 1:20 | Card: the 429, the median time, no token in a log, the burst alert |
| 08 | `close` | 1:20 | 1:30 | Card: journey 18 complete; the owner step `Security__OnCallEmail` |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/26-journey-18-recover-password --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/26-journey-18-recover-password           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
