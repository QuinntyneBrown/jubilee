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

## Consequences

Order requests can add their own columns to the same table; owner views read the phone from the request only.
