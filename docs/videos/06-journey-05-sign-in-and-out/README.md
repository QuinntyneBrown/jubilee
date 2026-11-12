# 06 · Journey 5: Sign in and out

> **Runtime:** 3:13 (192.6 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 5

**Video:** [06-journey-05-sign-in-and-out.mp4](06-journey-05-sign-in-and-out.mp4) · **Audio:** [06-journey-05-sign-in-and-out.mp3](06-journey-05-sign-in-and-out.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/05-sign-in-and-out.md`, which took journey 5 from 76% to complete. In the
app itself, a visitor who pressed "Message" or the heart signs in and is brought back to what they
started; a member's message survives the end of the session and is restored after signing in; and
the account page signs the other devices out. The session endpoints are answered by the fake of
`e2e/fixtures/session.ts`, as in `return-to-origin.spec.ts`, `drafts.spec.ts` and
`sign-out-others.spec.ts` (ADR 0009). Four cards say what the run settled behind the screen: where
a draft is kept, the single session-expired redirect, the `__Host-` cookie with no cross-origin
caller (ADR 0046), and what is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:13 | Card: "Journey 5 · Sign in and out" |
| 02 | `prompt` | 0:13 | 0:23 | A visitor presses "Message" on Legacy Financial: "Join to message Legacy Financial" |
| 03 | `return` | 0:23 | 0:35 | "Sign in", the Log in screen, then the listing again with "Message Legacy Financial" open |
| 04 | `save` | 0:35 | 0:45 | A visitor presses the heart on Luzandre.com and signs in: "Saved Luzandre.com. Find it any time under Saved." |
| 05 | `typed` | 0:45 | 0:54 | A member writes a message to Trevor in the dialog |
| 06 | `expired` | 0:54 | 1:08 | "Send message" is refused with 401 `SESSION_EXPIRED`: "You’ve been signed out" |
| 07 | `restored` | 1:08 | 1:19 | After signing in the dialog holds the message; toast "We kept what you typed" |
| 08 | `drafts` | 1:20 | 1:41 | Card: `FormDraftDirective`, `DraftRegistry`, `DraftStore`; L2-116 AC3 and AC4; the two draft specs |
| 09 | `account` | 1:41 | 1:53 | `/account`: "Signed in on this phone and 1 other device"; "Sign out of your other devices?" |
| 10 | `others` | 1:53 | 2:05 | Confirmed: "Your other devices were signed out", "Signed in on this phone only" |
| 11 | `sign-out` | 2:05 | 2:17 | "Sign out of Jubilee?", then the welcome page |
| 12 | `once` | 2:18 | 2:31 | Card: several refused calls open the session-expired page once (L2-116 AC2) |
| 13 | `cookie` | 2:31 | 2:53 | Card: `__Host-jubilee.session` and no other origin (L2-135 AC1, AC3), `SessionCookieTests.cs` |
| 14 | `close` | 2:53 | 3:11 | Card: journey 5 is complete; the sweeps are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/06-journey-05-sign-in-and-out --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/06-journey-05-sign-in-and-out           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
