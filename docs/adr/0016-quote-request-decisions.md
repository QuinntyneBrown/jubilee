# 0016. Quote request decisions

Status: accepted

## Context

A quote request is the second kind of request. It reuses the request lifecycle (ADR 0015) and needs its own fields, a rule for phone numbers and a wording that does not assume a pronoun.

## Decision

- A quote request is a `Request` of kind Quote. What the member describes is kept in `Note` (up to 2,000 characters); `NeededBy`, `Budget` (up to 60 characters) and `Phone` are columns of the same row. A booking's note stays at 1,000 characters, enforced by the booking handler.
- A phone is stored as ten digits however it was typed, and appears only in the e-mail to that business and on that request.
- Validation codes are `REQUIRED`, `TOO_LONG`, `INVALID_PHONE`, `INVALID` and `IN_THE_PAST`; "today" is Toronto's today, so the day itself is allowed.
- The dialog opens at `/b/{slug}/quote[?service=id]`, the same business route as messaging and booking, so no page reload or second view count.
- The success text says "{Owner}'s quote arrives in your messages" instead of a pronoun.
- Deferred: the phone prefill from the profile, the quote card in the conversation and the in-app notification, because their owners (profile, notifications, owner responses) are later journeys.

## Amendment, 12 November 2026: the deferrals that have landed

The phone prefill, the quote card in the conversation and the in-app notification, deferred above, are built and are now part of the requirement (L2-045 AC7, AC8).

- The prefill comes with the dialog's options: `GET /api/listings/{slug}/quote` answers `phone`, the caller's own profile phone written like `416-555-0142`, or null when the profile has none or the session has no member record. The dialog already asks for its options before it shows the form, so it makes no second request and never loads the account. The server formats the number, as it does on the account page.
- The dialog only reads the number. The member can change or clear it, what is sent is stored on the request, and the quote handler never loads the member for writing, so the profile's phone stays as it was. Changing the profile is done on the account page (L2-013).
- A draft kept for the form (ADR 0046) is restored over the prefill: what the member last typed, or cleared, wins.
- The owner's notification "New quote request from {member}" is stored in the same save as the request and opens Incoming requests; the member is told nothing until the owner confirms or declines, and that notification opens the request.
- The quote card is not stored. The conversation query reads the requests between the member and the business, so a card needs no write when a request is sent and cannot disagree with the request.
- Idempotency is kept by the handler: a request of the same member with the same key is returned unchanged, with no time limit, which satisfies the 24 hours L2-132 asks for. No middleware or cache takes part.

## Consequences

Order requests can add their own columns to the same table; owner views read the phone from the request only.
