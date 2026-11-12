# 0048. Finish book a meeting: meeting hours the owner sets, stored on the listing

## Status

Accepted, 12 November 2026. Completes ADR 0015 (booking decisions), which left owner-editable hours
and slot lengths as later work. Applies ADR 0009 (tests without a backend or database) and ADR 0035
(presentation in the components library).

## Context

Journey 7 was recorded at 95%. A business met Monday to Friday at five fixed times (09:00, 10:00,
13:30, 16:00 and 19:00) and its owner could not change them; no requirement covered it. `L2-044`
AC6 (the note stops at 1,000 characters) had an API test and no Playwright spec, and no test of a
booking asserted the owner's in-app notification. The design named an `AvailabilityPicker`, an
`IAvailabilityService`, an `IdempotencyMiddleware`, a `BookMeetingCommandValidator` and a
`BookingDetails` value object that were never built.

## Decision

- **Meeting hours are one window a day, the same on every day met.** `L2-220`: the owner ticks the
  days and gives "From", "Until" and a slot length of 15, 30, 45, 60, 90 or 120 minutes. A time is
  offered every slot length from "From" while a meeting of the chosen service's length ends by
  "Until". Different hours per day, breaks and dates off are not built; the away period (`L2-062`)
  and declining a request cover the exceptions.
- **They are stored on the listing.** `Listing.MeetingDays` (as before), `MeetingOpensAt`,
  `MeetingClosesAt` and `MeetingSlotMinutes`, nullable and written together by `SetMeetingHours`;
  the migration `AddMeetingHours` adds three nullable columns. No new table: one window needs none.
- **A listing whose owner never saved hours keeps the default times of ADR 0015.** Null hours mean
  the five fixed times, so nothing changes for a business until its owner saves; the dialog then
  proposes Monday to Friday, 9:00 a.m. to 5:00 p.m., every 30 minutes.
- **Times of day are Toronto times.** They are stored as times of day without a zone and turned
  into instants with `TorontoClock.At` for the day asked about, so a clock change moves nothing.
- **Saving hours touches the listing only.** Requests already sent keep their day, time and status
  and the owner confirms or declines them as before; nobody is told. Only the availability answered
  afterwards and the bookings sent afterwards follow the new hours.
- **One endpoint, on the owner's catalogue.** `PUT /api/my-business/meeting-hours` on
  `CatalogueController` replaces the hours (a replace is idempotent by itself, so it carries no
  idempotency key); `GET /api/my-business/services` returns the hours in force as `meetingHours`,
  so the dialog opens without a request of its own. The handler validates again whatever the dialog
  checked.
- **The editor is a dialog from My services.** `MeetingHoursDialog` composes `jb-dialog`,
  `jb-checkbox`, `jb-field`, `jb-input` and `jb-select`; no new component was needed. Its form
  carries `jbDraft` (ADR 0046).
- **The design follows the code.** The booking design now names `BookingAvailability`,
  `ListingBookingController`, `[RequiresConfirmedEmail]`, the idempotency key kept on the `Request`
  and the notification written by the handler, in place of the names that were never built.

## Consequences

An owner who meets at different hours on different days sets the widest window and declines what
does not fit, until a requirement asks for more. Slots are not held: two members may still ask for
the same time, and the owner confirms one (ADR 0015; calendars and double booking stay out of
scope). The default times stay in the code for as long as a listing has no saved hours.
