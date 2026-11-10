# Choose notification settings

## Overview

Jubilee is Toronto's Christian marketplace. It tells members and owners about
events such as a new message, a confirmed request or an upcoming meeting, in the
application and by e-mail. *Notification settings* are the member's choices
about which of those e-mails Jubilee sends and how often. This feature covers
the page at `/account/notifications` where a member makes those choices, and the
rules the e-mail pipeline applies when it reads them.

The page has five switches, one per *e-mail category*: "New messages", "Request
updates", "Meeting reminders", "New businesses" and "Tips for business owners".
Below them, "How often" offers two frequencies: "As it happens" and "One daily
summary". There is no save button. Each switch saves on its own as soon as it
changes, and the rest of the page stays usable while it does.

Two rules hold whatever the member chooses. Security e-mails about sign-in and
the account are always sent. A *daily summary* — single e-mail that gathers the
e-mail-worthy events of one day — is sent at most once per day, at 7:00 a.m.
Toronto time the next morning; meeting reminders and security e-mails are never
held back for it.

The settings govern e-mail only. An event whose e-mail is turned off still
creates its in-app notification.

## Description

The feature is a vertical slice from the settings page in `Jubilee Web` to the
`Jubilee database`, and on to the e-mail pipeline in `Jubilee Worker`. Nothing
is built yet; the names below are the names the design introduces.

- **`NotificationSettingsPage`** — Angular page at `/account/notifications`,
  behind `AuthGuard`. It renders the five switches with their descriptions, the
  "How often" choice, and the statement "We always e-mail you about sign-in and
  security, whatever you choose here." A failed load shows the error state with
  the reference `JB-PREF-503` and "Try again" (L2-118).
- **`PreferenceSwitchRow`** — Angular component for one switch. While its save
  is in flight the row shows "Saving…"; on success it shows "Saved at {time}".
  Only the changed row is busy.
- **`PreferencesStore`** — signal store that holds the settings and applies each
  change optimistically. When the save fails it returns the switch to its
  previous position and asks `ToastService` for an error toast with "Try again",
  which repeats the same change.
- **`AccountApi`** — typed Angular HTTP client. `getNotificationPreferences()`
  calls `GET /api/account/notification-preferences`;
  `setNotificationPreference(setting, value)` calls
  `PATCH /api/account/notification-preferences` with one setting per request.
- **`NotificationPreferencesController`** — ASP.NET Core controller in
  `Jubilee.Api`. Both endpoints act on the member of the current session only
  (L2-133).
- **`GetNotificationPreferencesQuery`** and its handler — return the five
  switch values and the frequency.
- **`UpdateNotificationPreferenceCommand`** and its handler — carry one
  `EmailCategory` with a boolean, or the `EmailFrequency`. The handler calls
  `NotificationPreferences.Set()` or `SetFrequency()` and saves in one unit of
  work. The command names a single setting, so two switches changed in quick
  succession do not overwrite each other.
- **`NotificationPreferences`** — domain entity, one per member, created with
  the account. Its defaults are `NewMessages`, `RequestUpdates` and
  `MeetingReminders` on, `NewBusinesses` and `TipsForOwners` off, and frequency
  `AsItHappens`. Each change of `NewBusinesses` or `TipsForOwners` records the
  time and method of the consent.
- **`EmailCategory`** — enumeration `NewMessages`, `RequestUpdates`,
  `MeetingReminders`, `NewBusinesses`, `TipsForOwners`, `Security`. `Security`
  has no switch.
- **`EmailFrequency`** — enumeration `AsItHappens`, `DailySummary`.
- **`EmailDeliveryPolicy`** — domain service that the e-mail pipeline calls for
  each e-mail-worthy event. `Decide(preferences, category)` returns an
  `EmailDelivery`: `Immediate` for `Security` in every case; `Suppressed` for a
  category that is off; `Immediate` for `MeetingReminders` that is on;
  otherwise `Immediate` under `AsItHappens` and `Summary` under `DailySummary`.
- **`SummaryItem`** — row that holds one event waiting for the member's next
  daily summary.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee.Worker`. For each e-mail
  event in the outbox it applies `EmailDeliveryPolicy`, then sends through
  `IEmailSender`, stores a `SummaryItem`, or drops the e-mail.
- **`DailySummaryJob`** — hosted job in `Jubilee.Worker` scheduled at 07:00
  `America/Toronto`, correct across daylight saving changes. For each member
  with `SummaryItem` rows from the previous day it sends one summary e-mail and
  deletes the rows. The job is idempotent and runs at most once per schedule
  across instances (L2-182).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-016` | `L1-002` | The system shall let a member choose at `/account/notifications` which e-mails they get and how often. Each switch shall save on its own as soon as it changes. |
| `L2-068` | `L1-010` | The system shall send an e-mail within 2 minutes for an event the member has e-mail turned on for, or include it in the next daily summary if chosen, and shall send no e-mail for an event the member has turned off while still creating the in-app notification. |
| `L2-182` | `L1-025` | Each scheduled job shall be idempotent, shall run at most once per schedule across instances, and shall compute reminder and summary times in America/Toronto. |
| `L2-149` | `L1-020` | Promotional e-mails ("New businesses", "Tips for business owners") shall go only to members who opted in, and the system shall record the time and method when consent is given or withdrawn. |
| `L2-118` | `L1-016` | Each load-error state shall show a reference that the user can quote to support. |

## Diagrams

### System context

A member chooses notification settings in Jubilee. Jubilee applies them to each
e-mail it sends to that member through the `E-mail provider`.

![C4 system context for choosing notification settings](diagrams/c4-context.png)

### Containers

`Jubilee Web` reads and patches the settings through `Jubilee API`, which stores
them in the `Jubilee database`. `Jubilee Worker` reads the settings when it
dispatches e-mail and when it builds the daily summary.

![C4 container view for choosing notification settings](diagrams/c4-container.png)

### Components

`PreferenceSwitchRow` reports a change to `PreferencesStore`, which saves through
`AccountApi`. `NotificationPreferencesController` dispatches the query and the
command. In `Jubilee Worker`, `OutboxDispatcherJob` and `DailySummaryJob` apply
`EmailDeliveryPolicy`.

![C4 component view for choosing notification settings](diagrams/c4-component.png)

### Class structure

`NotificationPreferences` holds five switch values and an `EmailFrequency`.
`EmailDeliveryPolicy` maps the preferences and an `EmailCategory` to an
`EmailDelivery`, and a `SummaryItem` holds an event deferred to the daily
summary.

![Class diagram for choosing notification settings](diagrams/class-structure.png)

### Behaviour — change one switch

The row shows "Saving…" while the `PATCH` is in flight. On success it shows
"Saved at {time}"; on failure the switch returns to its previous position and
an error toast offers "Try again".

![Sequence diagram for changing one switch](diagrams/sequence-change-switch.png)

### Behaviour — deliver e-mail by the settings

`OutboxDispatcherJob` sends, defers or drops each e-mail according to
`EmailDeliveryPolicy`. `DailySummaryJob` sends at most one summary per member at
7:00 a.m. Toronto time.

![Sequence diagram for delivering e-mail by the settings](diagrams/sequence-deliver-by-settings.png)
