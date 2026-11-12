# 12 · Journey 8: Request a quote

> **Runtime:** 1:23 (83.1 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 8

**Video:** [12-journey-08-request-a-quote.mp4](12-journey-08-request-a-quote.mp4) · **Audio:** [12-journey-08-request-a-quote.mp3](12-journey-08-request-a-quote.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/08-request-a-quote.md`, which took journey 8 from 95% to 100%
(ADR 0016, amended). Joanna's account page holds the phone number 416-555-0142. On Luzandre.com,
"Ask" on a custom-work service opens "Ask Luzandre.com for a quote" with "Phone" already filled in
from her profile and the hint "Shared with Luzandre.com for this request only." She describes what
she needs, gives another number for this job and sends the request; the dialog says the request
was sent and that Naomi's quote arrives in her messages. Her account page still shows her own
number. Two cards say what the run did behind the screen and that nothing is left for the owner.

## What the pictures prove, and what only the tests prove

The app is answered from the recorded API and from the stand-ins of the behaviour specs
(`e2e/fixtures/quote.ts`, `e2e/fixtures/profile.ts`, ADR 0009), so the pictures prove what the
browser does with each answer: the dialog starts "Phone" with the number its options carry, the
member can replace it, and the request is sent.

Only the tests prove what the server does:

- that `GET /api/listings/{slug}/quote` answers the caller's own profile phone written like
  `416-555-0142`, none for a member without one, and never another member's (`QuoteTests`,
  L2-045 AC7). In the video the options and the account page are two stand-ins that hold the same
  number;
- that a number changed or cleared in the dialog is kept on the request and the profile stays as it
  was (`QuoteTests`). The account page shown after the request is the stand-in's answer: the
  picture proves only that the page still loads the profile, and `request-quote.spec.ts` proves
  that the app sends no write to the account;
- that a restored draft wins over the prefilled number (`request-quote.spec.ts`). Not shown;
- that the owner gets the in-app notification "New quote request from {member}", an e-mail and the
  request under "New" in Incoming requests, that the member is told when the owner confirms or
  declines, and that the request is a quote card in their conversation (`QuoteTests`, L2-045 AC8).
  Not shown: they are said on a card.

The dialog's other states (a missing description, a phone that is not ten digits, a past date, a
failed send) were built before this run and are not shown. Jubilee takes no payment: a quote is
answered in messages and the member pays the business directly.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:11 | Card: "Journey 8 · Request a quote" |
| 02 | `profile` | 0:11 | 0:17 | `/account`: the pointer on "Phone", 416-555-0142 |
| 03 | `dialog` | 0:17 | 0:31 | Luzandre.com: "Ask" on "Custom design consultation" opens the dialog; "Phone" holds 416-555-0142 under its hint (L2-045 AC1, AC7) |
| 04 | `change` | 0:31 | 0:39 | "What do you need?" is typed, the phone is replaced with 647-555-0199 and "Send request" is pressed (L2-045 AC7) |
| 05 | `sent` | 0:39 | 0:48 | "Quote request sent to Luzandre.com": "Naomi usually replies within a few hours. Naomi’s quote arrives in your messages." (L2-045 AC5) |
| 06 | `unchanged` | 0:48 | 0:56 | `/account` again: "Phone" still holds 416-555-0142 |
| 07 | `behind` | 0:56 | 1:16 | Card: where the number comes from, what is kept, who is told, the tests |
| 08 | `close` | 1:16 | 1:23 | Card: journey 8 at 100%; nothing left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/12-journey-08-request-a-quote --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/12-journey-08-request-a-quote           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
