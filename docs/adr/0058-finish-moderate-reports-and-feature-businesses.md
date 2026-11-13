# 0058. Finish moderate reports and feature businesses

Status: accepted

## Context

Journey 25 (the Jubilee team handles reports and chooses the businesses "Featured this week") was
recorded at 82%. ADR 0033 deferred the notification of the team and a real-time `report.created`
event when a report arrives, the count of reports in the admin bar, and "outbox and search-index
handling of holds and removals". Journey 21 has since e-mailed the team of a report of a listing
(ADR 0055), through what ADR 0057 renamed `JubileeTeam.Tell`; a report of a conversation still told
nobody. The designs `handle-reports` and `feature-businesses` described an `OutboxDispatcherJob`
that would create a notification for each member of the team, publish `report.created` through a
SignalR `EventsHub`, take a held listing out of a search index and drop cached lists. None of
those was built: ADR 0053 records that `EventsHub` never existed, ADR 0003 (as amended) drops the
directory read cache in `DirectoryCacheInvalidationInterceptor` when a save changes a listing or a
featured slot, and ADR 0011 (as amended) has search read the database with no separate index.

## Decision

- **A report of a conversation e-mails the team as a report of a listing does.**
  `ReportConversationCommandHandler` calls `ConversationReportSubmitted.Tell`, which goes through
  `JubileeTeam.Tell`, the one place that decides who on the team is told. The e-mail is
  "New report: a conversation with {business}", with what the reporter wrote and the link to
  `/reports/{id}` in the admin application. It names neither the reporter nor which side reported,
  and carries no message of the conversation: staff read those only in the admin application while
  the report is open, and that read is audited (`L2-063` AC3, `L2-150` AC1). A repeat while the
  participant's report is open files nothing and e-mails nobody (`L2-063` AC8). The e-mail is added
  to the outbox in the same save as the report, so a report the server refuses tells nobody.
- **No `report.created` event and no notification per moderator.** Staff are not members: the
  member event stream reads member notifications (ADR 0025, ADR 0053) and a staff session never
  counts as a member session (`L2-191` AC4). A stream for staff would add a second channel and keep
  the 30-minute idle timeout of `L2-190` from ending an unattended session (an open stream is not
  activity). The team's address is the notice; it reaches whoever is on duty, signed in or not.
- **The admin bar counts the unresolved reports, read with the staff session.**
  `GET /api/staff/session` answers `reportCount`, the listing and conversation reports that are not
  resolved; it is 0 without the `moderator` role. `AdminBar` shows it on "Reports" as a count badge
  named "{n} unresolved", hidden at 0. `StaffSessionService.refresh()` reads the session again
  after each navigation between screens and after each action on a report; a refresh that fails
  keeps what was shown (an ended session is still handled by `sessionExpiredInterceptor`). The
  admin application does not poll: a poll would keep an idle staff session alive.
- **Holds and removals reach the public pages through the save, not the outbox.** Placing a
  listing on hold, removing it or lifting a hold changes the `Listing`, so the interceptor drops
  the directory read cache when the save commits and search reads the change at once. A held or
  removed listing leaves the welcome page, Browse, its category, search, the related businesses of
  other listings and its own address on the next request, well inside the 60 seconds of `L2-105`
  AC3. The same holds for a featured week saved or saved again (`FeaturedSlot` is watched) and for a
  featured listing that is held (`FeaturedSelector` reads public listings only).
  `ModerationBoundTests` proves each with every public read cached first.

## Consequences

- No migration. `StaffSessionView` gains `ReportCount`; `StaffSessionDto` and `StaffChromeMember`
  gain `reportCount`.
- A moderator learns of a new report by e-mail at once, and from the bar the next time they move
  between screens.
- ADR 0033's deferrals of the team's notification, the real-time event, the count in the top bar
  and the outbox handling of holds and removals are closed by this record.
