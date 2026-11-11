# 0015. Booking decisions

Status: accepted

## Context

Book a meeting needs a storage model for business hours, a slot rule and a way to make a retry safe.

## Decision

- Business hours are `Listing.MeetingDays`, a weekday bitmask defaulting to Monday to Friday, with `MeetingArea` for in-person meetings. Slots are fixed: 09:00, 10:00, 13:30, 16:00 and 19:00 Toronto time, 180 days ahead; today's slots only while still ahead.
- Every request is one `Request` with one lifecycle (New, Confirmed, Declined, Cancelled, Completed) and a recorded transition list; later requests (quote, product) reuse it.
- A booking carries an idempotency key: the same key returns the same request, never a second one.
- The calendar file is generated on demand (ICS, Toronto time zone).
- Nothing is charged; members pay the business directly.

## Consequences

Owner-editable hours and slot lengths are later work; the model can grow without changing the request.
