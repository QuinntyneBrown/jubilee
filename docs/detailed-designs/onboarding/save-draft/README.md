# Save a draft

## Overview

Listing a business on Jubilee takes one form at `/list`: what the business
offers, its details, a church reference and the statement of faith agreement.
An owner may not have each answer to hand, so the form can be saved part-filled
and finished later. This feature covers saving, autosaving, reloading and
expiring that saved form.

The slice uses two local terms.

- **draft** — listing in the stage `Draft`, visible only to its owner
- **untouched draft** — draft with no save for 180 days

A draft is a `Listing` like any other; the stage sets it apart. `ListingStage`
has the values `Draft`, `WaitingOnReference`, `ReadyToReview`,
`NeedsADecision`, `ChangesRequested`, `Live`, `Paused` and `Declined`. Nothing
in a draft is public, and a draft save does not apply the required-field rules
that submission applies. An unconfirmed member may save a draft; only
submission is blocked (L2-005).

## Description

The feature is a vertical slice from the `/list` page to the `Jubilee database`,
with one scheduled job in `Jubilee Worker`.

- **`ListBusinessPage`** — Angular page at `/list`. It offers "Save draft"
  beside "Submit for verification". After a manual save it shows the success
  banner "Draft saved. Saved today at {time}. Come back any time from My
  business; nothing is public until you submit." While a draft loads it shows
  "Loading your draft…".
- **`DraftAutosaver`** — Angular service that listens to form changes. When the
  owner has typed and stops for `10 s`, it asks the `ListingDraftStore` to save.
  Each further keystroke restarts the timer. An autosave shows no banner.
- **`ListingDraftStore`** — signal store that holds the draft, the last
  `RowVersion` and the save status (`idle`, `saving`, `saved`, `failed`). It
  sends one save at a time and queues the latest values behind a save in flight.
- **`ListingsApi`** — typed HTTP client. `GET /api/listings/{listingId}/draft`
  loads a draft and `PUT /api/listings/{listingId}/draft` saves it.
- **`ListingsController`** — ASP.NET Core controller. It authenticates the
  session and checks that the caller owns the listing; another member receives
  HTTP 403 (L2-133).
- **`SaveListingDraftCommandHandler`** — MediatR handler. It loads the listing
  in stage `Draft`, calls `Listing.ApplyDraft`, and saves in one unit of work.
  It applies length limits and type checks and skips the required-field rules.
  A save against an older `RowVersion` returns HTTP 409.
- **`GetListingDraftQueryHandler`** — MediatR handler that returns the stored
  values, the items added during onboarding, and the reference fields, so that
  the form restores each value.
- **`Listing`** — domain entity. `ApplyDraft` stores the values and sets
  `LastTouchedAt` from `IClock`. A save clears `DraftExpiryNoticeSentAt`, which
  cancels a pending deletion.
- **`ListingDraftValues`** — value object with the form values of a draft,
  including the church name, the reference e-mail and the agreement tick.
- **`DraftRetentionJob`** — hosted job in `Jubilee Worker`. It selects each
  draft with `LastTouchedAt` older than `180 days`, marks the notice as sent and
  writes a `DraftExpiryNotice` message to the outbox. It deletes each draft
  whose notice was sent `14 days` earlier and that is still untouched. The job
  is idempotent, runs at most once per schedule across instances and records
  its last success (L2-182). The schedule interval is `<TO SUPPLY>`.
- **`OutboxDispatcherJob`** — hosted job that sends the queued notice through
  `IEmailSender` to the `E-mail provider`. The wording of the notice is
  `<TO SUPPLY>`.
- **Load error state** — when the draft fails to load, the API returns HTTP 503
  `ProblemDetails` with the error reference `JB-LST-503` and the correlation
  ID. The page shows "We couldn't load your draft" with the reference, "Try
  again" and "Back to browse" (L2-118).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-077` | `L1-011` | The system shall save a part-filled listing form as a draft without validation of required fields, on "Save draft" and after 10 seconds without typing, and shall restore each value when the owner returns. The system shall e-mail the owner about a draft untouched for 180 days and shall delete it 14 days later. |
| `L2-118` | `L1-016` | Each load-error state shall show a reference the user can quote to support; a draft that fails to load shall show `JB-LST-503`. |
| `L2-133` | `L1-019` | Each API endpoint shall check the caller's role and ownership of the specific object before doing anything. |
| `L2-182` | `L1-025` | Each scheduled job shall be idempotent, shall run at most once per schedule across instances, and shall record its last success. |

## Diagrams

### System context

The member saves and reopens a draft in Jubilee. Jubilee sends the expiry
notice for an untouched draft through the `E-mail provider`.

![C4 system context for saving a draft](diagrams/c4-context.png)

### Containers

`Jubilee Web` saves and loads the draft through `Jubilee API`. `Jubilee Worker`
finds untouched drafts in the `Jubilee database` and sends the notice.

![C4 container view for saving a draft](diagrams/c4-container.png)

### Components

`DraftAutosaver` and the page both save through the `ListingDraftStore`. The
controller sends a command or a query. `DraftRetentionJob` and
`OutboxDispatcherJob` work on the same database.

![C4 component view for saving a draft](diagrams/c4-component.png)

### Class structure

`SaveListingDraftCommand` carries `ListingDraftValues`, which `Listing` applies.
`DraftRetentionJob` reads `Listing.LastTouchedAt` and writes an `OutboxMessage`.

![Class diagram for saving a draft](diagrams/class-structure.png)

### Behaviour — save a draft by button or autosave

Both triggers reach the same endpoint. The handler applies the values without
the required-field rules; only the manual save shows "Draft saved."

![Sequence diagram for saving a draft](diagrams/sequence-save.png)

### Behaviour — load a saved draft

The page shows "Loading your draft…" and then restores each value. A failed
load shows the error state with `JB-LST-503`.

![Sequence diagram for loading a saved draft](diagrams/sequence-load.png)

### Behaviour — warn about and delete an untouched draft

`DraftRetentionJob` queues the notice at `180 days` and deletes the draft
`14 days` after the notice. `OutboxDispatcherJob` sends the notice.

![Sequence diagram for warning about and deleting an untouched draft](diagrams/sequence-retention.png)
