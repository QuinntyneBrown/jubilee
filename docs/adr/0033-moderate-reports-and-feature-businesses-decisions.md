# ADR 0033: Moderate reports and feature businesses

Status: accepted

## Context

Journey 25 (L2-105, L2-106) gives the verification team the reports members send and the choice of the businesses "Featured this week". The designs left the routes, the length limits, the action that lifts a hold, the start date rules, the day boundary and the cache lifetime as `<TO SUPPLY>`.

## Decisions

- **Routes:** `/admin/reports`, `/admin/reports/:id` and `/admin/featured`, behind the verifier guard, under one tab group (Verifications, Reports, Featured) shown by `jb-team-nav`. The API is `GET /api/admin/reports?status=`, `POST /api/admin/reports/{id}/open`, `POST /api/admin/reports/{id}/actions`, `GET /api/admin/featured`, `GET /api/admin/featured/candidates?q=` and `PUT /api/admin/featured-weeks/{startDate}`.
- **Reports** are listing reports and conversation reports in one list, oldest first. A report is overdue when it is unresolved after 2 business days. Opening a report moves it from Open to In review; a conversation report also returns the messages, only while unresolved, and records `conversation.viewed` in the audit log.
- **Six actions,** each with a required resolution note of at most 1000 characters: Dismiss and Remove listing resolve the report; Place on hold and the two messages keep it in review; **Lift hold** (added by this ADR) makes the listing public again and resolves the report. The messages (at most 2000 characters) are sent in the name of the verification team. The owner is never told who reported; the reporter is told only what the team writes.
- **Featured weeks:** a week is 7 days from its start date, with up to five live listings in order. The start date is a Toronto calendar day and cannot be before today; a week that starts within six days of another is refused (`WEEK_OVERLAPS`); saving a start date replaces that week. Listings that are not live are refused (`NOT_LIVE`). With no week chosen, the newest verified businesses are shown.
- **No cache** yet: the featured list is read on each request, so nothing needs invalidating.
- **Audit:** every action and every save of a week writes an audit entry (`report.*`, `listing.held`, `listing.removed`, `listing.hold-lifted`, `featured.set`).

## Deferred

- The verifier notification and realtime `report.created` event when a report arrives, and the report count in the top bar.
- Outbox and search-index handling of holds and removals.
- L2-098 AC2 and AC4.
