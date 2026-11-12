# 16 · Journey 10: List a business

> **Runtime:** 1:38 (98.3 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 10

**Video:** [16-journey-10-list-a-business.mp4](16-journey-10-list-a-business.mp4) · **Audio:** [16-journey-10-list-a-business.mp3](16-journey-10-list-a-business.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/10-list-a-business.md`, which took journey 10 from 87% to 100% (ADR 0018,
amended 12 November 2026). A member fills in `/list` for a services business: the highlight "Free
first meeting" becomes the green line of the preview card, before "Pending verification". "Add a
service" opens the full service editor, which says "Nothing is public until your listing is
verified." and asks what "Members can" do; the service is kept with the draft. The verification
team's review of a listing with nothing to offer says "No products or services yet" above the
checklist, and the Owner panel names "Laurent Photography · Pending verification, Laurent Studio ·
Draft". Then Naomi, who agreed to an earlier statement of faith, opens My business: the dialog "The
statement of faith has been updated" asks her to agree by 2 December 2026; "Not now" leaves "Read and
agree" on My business, and "I agree" records it with the toast "Thank you". Last, the same owner after
the 30 days: Luzandre.com is paused until she agrees, "Read and agree" stands where "Resume listing"
was, and agreeing makes it "Verified · live since June 2026" again. Two cards say what the run did
behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The app is answered from the recorded API and from the stand-ins of the behaviour specs
(`e2e/fixtures/listing-drafts.ts`, `e2e/fixtures/admin.ts`, `e2e/fixtures/my-business.ts`,
`e2e/fixtures/statement-of-faith.ts`, ADR 0009), so the pictures prove what the browser does with
each answer: the highlight and the preview, the editor and what it keeps, the review's words, the
dialog once per opening of the app, the banner and its "Read and agree", and the reload that shows the
listing live again.

Only the tests prove what the server does:

- that the session carries `statementDue` only for an owner whose latest agreement is to an earlier
  version, never for a member who agreed to nothing, and that `POST /api/statement-of-faith/agreement`
  records one agreement per version, refuses another version with 409 `STATEMENT_VERSION` and turns
  a visitor away (`StatementAgreementTests`, L2-075 AC3, AC4). In the video the session is a
  stand-in that names the agreement due;
- that the daily job pauses each live listing of an owner who has not agreed once the 30 days have
  passed, e-mails "{Business} is paused until you agree to the statement of faith" once per listing,
  leaves a listing the owner paused alone, and runs once a day across instances with its last
  success recorded; that "Resume listing" is refused with 409 `STATEMENT_AGREEMENT_REQUIRED`
  meanwhile; and that agreeing makes each listing the job paused live again without new verification
  (`StatementAgreementTests`, L2-075 AC6, L2-096 AC6, L2-182 AC1). The paused listing in the video is
  the stand-in's;
- that the draft expiry runs once a day across instances and records its last success
  (`ListingOnboardingTests`, L2-077 AC5, L2-182 AC1). Not shown: it is said on a card;
- that a submission still unanswered after 10 seconds fails with "We couldn't save that. Try again."
  (`list-business.spec.ts`, L2-127 AC2), that submission creates each product and service with what
  its editor asked (`ListingOnboardingTests`, L2-073 AC5), and that the highlight is cut to 30
  characters (L2-072 AC7). Not shown.

Jubilee takes no payment: a listing offers what members can ask for, and they pay the business
directly.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:12 | Card: "Journey 10 · List a business" |
| 02 | `highlight` | 0:12 | 0:21 | `/list`: the name, the tagline and "Free first meeting" are typed; the preview draws the green line (L2-072 AC1, L2-076 AC1) |
| 03 | `service` | 0:21 | 0:35 | "Add a service" opens the service editor with "Members can"; "Engagement session" is added to the list (L2-073 AC2) |
| 04 | `review` | 0:35 | 0:45 | Admin review: "No products or services yet" and "Other listings" with their stages (L2-073 AC3, L2-079 AC3) |
| 05 | `statement` | 0:45 | 0:56 | My business opens with "The statement of faith has been updated"; "Not now" leaves the banner with "Read and agree" (L2-075 AC3, AC5) |
| 06 | `agree` | 0:56 | 1:02 | "Read and agree", then "I agree": the toast "Thank you" (L2-075 AC4) |
| 07 | `lapsed` | 1:02 | 1:15 | After 30 days: the dialog and the banner say Luzandre.com is paused; "Read and agree" in place of "Resume listing"; agreeing makes it live (L2-075 AC6, L2-096 AC6) |
| 08 | `behind` | 1:15 | 1:30 | Card: the two daily jobs, the endpoints and their refusals, the 10-second limit, the tests |
| 09 | `close` | 1:30 | 1:38 | Card: journey 10 at 100%; the visual comparison with the mocks is left to the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/16-journey-10-list-a-business --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/16-journey-10-list-a-business           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
