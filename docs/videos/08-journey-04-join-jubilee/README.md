# 08 · Journey 4: Join Jubilee

> **Runtime:** 1:32 (91.9 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 4

**Video:** [08-journey-04-join-jubilee.mp4](08-journey-04-join-jubilee.mp4) · **Audio:** [08-journey-04-join-jubilee.mp3](08-journey-04-join-jubilee.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/04-join-jubilee.md`, which took journey 4 from 89% to 98%. Joanna has
joined and has not confirmed her address. In the app itself she changes a mistyped address in the
dialog "Use another e-mail", meets an address another account uses, and reaches the resend limit
(ADR 0049). Two cards say what the run did behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The app is answered from the recorded API and from the stubs of `e2e/tests/join.spec.ts`
(ADR 0009), so the pictures prove what the browser does with each answer: the dialog, its words,
the banner naming the new address, the address in use, the limit.

Only the tests prove what the server does:

- that `PUT /api/account/unconfirmed-email` replaces the address, ends the earlier links and
  answers the same for an address in use (`AccountTests`, L2-004 AC5, L2-141 AC1);
- that the sixth resend of an hour is refused with 429 and `Retry-After` (`AccountTests`, L2-005 AC5,
  L2-137 AC1); the 42 minutes on screen is the stub's;
- that a token in a request path is logged as `[redacted]`, and that joining, confirming and
  signing in leave no token and no session cookie in the log (`TokenRedactionTests`, L2-140 AC3).

Joining by e-mail or Google and opening the confirmation link were built before this run and are
not shown. The `__Host-` prefix of the member cookie was built by journey 5 (ADR 0046, video 06).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:12 | Card: "Journey 4 · Join Jubilee" |
| 02 | `banner` | 0:12 | 0:23 | `/` as an unconfirmed member: "Confirm your e-mail to message businesses." with "Send it again" and "Change e-mail" (L2-005 AC1) |
| 03 | `dialog` | 0:23 | 0:35 | "Change e-mail" opens "Use another e-mail"; the new address is typed, no password is asked (L2-004 AC5) |
| 04 | `sent` | 0:35 | 0:46 | "Check your new inbox"; after "Done" the banner names the new address |
| 05 | `taken` | 0:46 | 0:56 | An address in use: "An account already uses this e-mail. Use another address." (L2-004 AC9) |
| 06 | `limit` | 0:56 | 1:06 | "Send it again" past the limit: "You’re doing that a lot. Try again in 42 minutes." (L2-005 AC5) |
| 07 | `behind` | 1:06 | 1:21 | Card: `LoggedPath` and `TokenRedactionTests` |
| 08 | `close` | 1:21 | 1:31 | Card: journey 4 at 98%; the bot challenge keys are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/08-journey-04-join-jubilee --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/08-journey-04-join-jubilee           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
