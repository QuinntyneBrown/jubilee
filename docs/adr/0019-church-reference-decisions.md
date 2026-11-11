# 0019. Church reference decisions

Status: accepted

## Context

A listing waits on a church reference (L2-080 to L2-084). The reference has no account, so the link is the only proof of who they are. The designs left several values open. Journey 10 stored the raw token on the submission, which broke the rule that only a hash is kept (L2-140).

## Decision

- A `ReferenceLink` row holds the SHA-256 hash of a 256-bit token, the listing, the reference e-mail and church, the kind (initial, resend, reminder, change), its issue and expiry time and how it ended (answered, replaced, reported). The raw token exists only in the e-mail. `ListingSubmission.ReferenceToken` is dropped by the migration `AddChurchReference`; links issued before it stop working.
- A link works once for 14 days. An unknown token is 404 and a closed one 410, both with code `REFERENCE_LINK_CLOSED`, and neither carries listing data beyond the owner's first name in the 410 text. The three anonymous endpoints take the token in the body, never the address (`POST /api/reference-requests/open|answer|report`) and are limited to 30 a minute per client IP address.
- A form that cannot load answers 503 with `reference: JB-REF-502`, the status the other read endpoints use, not the 502 of the design. The page shows the reference.
- The page reads the token, replaces the address with `/reference`, sets `<meta name="referrer" content="no-referrer">` and keeps the token in memory. Serving the `Referrer-Policy` header and a 404 status on the HTML document is a hosting matter and is not part of this repository.
- The form is worded with the owner's first name ("Naomi", not "her"), because pronouns are chosen in the profile (journey 20). `OwnerWording` is the seam where pronouns will go.
- An answer is stored in `ReferenceAnswer` and the link closes. "Vouches" moves the listing to Ready to review; "can't vouch" and "doesn't know" move it to Needs a decision. A report closes the link, moves the listing to Needs a decision and flags the submission `REFERENCE_REPORTED`.
- The owner reads `GET /api/listings/{id}/reference`: a state (`waiting`, `answered`, `not-known`, `under-review`, `expired`), the church and e-mail they typed, whether a reminder is due (7 days) and allowed (one per 72 hours), and the resends left. It never carries the answer, name, role or note. The state `not-known` is the one fact L2-083 AC3 tells the owner; "can't vouch" and a report both read `under-review`.
- `POST .../resend` issues a new link and closes the old one, three times per 24 hours (429 `REFERENCE_RESEND_LIMIT`). `POST .../remind` always issues a new link, because only the hash is kept (429 `REFERENCE_REMINDER_LIMIT` within 72 hours). `POST .../change` takes a new church and e-mail, applies the onboarding rules, closes the old link and returns the listing to Pending reference.
- `ReferenceExpiryJob` runs every 24 hours and e-mails the owner once per link that expired unanswered.
- The `{reference}` label shown to the owner is the e-mail address they typed.
- Reference data leaves encrypted backups within 35 days, the life of a backup.
- Deferred: deleting the answer 90 days after a verification decision (there is no decision until journey 12), the in-app notification and My business banners (journeys 15 and 17), the verification team's alert about a report and their reading of answers (journey 12), and the rate-limit test of the anonymous endpoints (the policy is configured; tests run with it raised).

## Consequences

Journey 12 reads `ReferenceAnswer` and the `REFERENCE_REPORTED` flag, and records the decision that starts the 90-day deletion. Journey 15 builds the My business banners on the status endpoint.
