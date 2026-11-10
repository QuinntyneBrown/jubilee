# Pause and resume a listing

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses. A *live* listing is one that the verification team
approved and that members can find in browse, category pages and search. This
feature lets the owner take a live listing out of public view for a while and
bring it back.

*Pausing* — hiding of a live listing from all public lists at the owner's request
— is not a deletion and not a loss of verification. Open requests and
conversations continue while the listing is paused, and the owner keeps the
verified status. While paused, the listing's URL returns 404 to everyone except
the owner and the verification team.

*Resuming* makes the listing public again. A listing paused for under 12 months
returns without new verification. A listing paused for 12 months or more goes
back to the verification queue and is reviewed again before it is public.

Both changes reach public lists within 60 seconds. The owner starts a pause from
"Pause listing" on the overview at `/my-business` and resumes from the persistent
banner that the workspace shows while the listing is paused.

## Description

The feature is a vertical slice from the pause dialog in `Jubilee Web` to the
`Jubilee database`, the `Cache` and the `Search index`.

- **`PauseListingDialog`** — confirmation titled "Pause {business}?" with "Your
  listing is hidden from browse and search until you resume it. Your {n} open
  requests and your messages stay. You keep your verified status.", "Keep it
  live" (focused by default) and "Pause listing". While the request is in flight
  the button is busy and "Keep it live" is disabled. A failure shows "We couldn't
  pause it. Your listing is still live. Try again."
- **`VerificationBanner`** — shared banner component. For a paused listing it
  shows the persistent banner "Your listing is paused. It's hidden from browse
  and search until you resume it." with "Resume listing" and no dismiss button,
  on every owner workspace page.
- **`MyBusinessOverviewPage`** — hosts "Pause listing" in the "Your listing"
  panel and passes the open request count to the dialog.
- **`ListingsApi`** — typed Angular HTTP client for
  `POST /api/owner/listings/{listingId}/pause` and
  `POST /api/owner/listings/{listingId}/resume`.
- **`OwnerWorkspaceStore`** — signal store that holds the listing stage. It
  updates the stage from each response, which shows or clears the banner.
- **`OwnerListingController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies `ListingOwnerPolicy` (HTTP `403` for a member who does
  not own the listing) and sends the commands through MediatR.
- **`PauseListingCommand`** and **`PauseListingCommandHandler`** — load the
  listing, call `Listing.Pause(now)`, and save the listing with a
  `ListingVisibilityChanged` outbox message in one unit of work. The handler
  then removes the listing's entries from the `Cache`. A pause of a listing that
  is not live returns `409` with code `LISTING_NOT_LIVE`.
- **`ResumeListingCommand`** and **`ResumeListingCommandHandler`** — call
  `Listing.Resume(now)` and return the resulting stage. A resume of a listing
  that is not paused returns `409` with code `LISTING_NOT_PAUSED`.
- **`Listing`** — domain entity that owns the stage rules. `Pause` moves `Live`
  to `Paused` and records `PausedAt`; it does not change `ApprovedAt`. `Resume`
  compares `PausedAt` with the current time from `IClock`: under 12 months the
  stage returns to `Live`; at 12 months or more it becomes `ReadyToReview`, which
  places the listing in the verification queue.
- **`ListingStage`** — enumeration of listing stages. Public queries return only
  `Live` listings (`L2-028`), so a paused listing is absent from every list and
  its URL returns 404 to others without any change to requests or conversations.
- **`OutboxDispatcher`** — hosted job in `Jubilee.Worker`. For
  `ListingVisibilityChanged` it removes the listing and its products and
  services from the `Search index` on a pause and adds them on a resume to
  `Live`.
- **Public read caches** — short-lived entries in the `Cache` for public lists.
  Their time to live shall not exceed 60 seconds, so a list cached before a
  pause expires inside the `L2-096` window even if an invalidation is missed.

The audit of verification decisions belongs to the verification features; a
re-queued listing follows the normal review path from `ReadyToReview`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-096` | `L1-013` | The system shall let the owner pause a live listing after a confirmation; the listing shall leave all public lists within 60 seconds and its URL shall return 404 to others, while open requests and conversations continue. A resumed listing shall be public again within 60 seconds without new verification if it was paused for under 12 months, and shall go back to the verification queue if it was paused for 12 months or more. |
| `L2-028` | `L1-003` | Browse, category, search, featured and related lists shall show only listings that are verified and not paused, deleted or under a moderation hold; a listing paused by its owner shall be absent within 60 seconds. |
| `L2-067` | `L1-010` | A condition that lasts until the user acts, such as a paused listing, shall show a persistent banner with no dismiss button on the relevant pages until it clears. |
| `L2-129` | `L1-018` | An action that unpublishes shall be confirmed in a dialog that states the consequence with real counts and names and focuses the safe choice by default. |
| `L2-133` | `L1-019` | The server shall check ownership of the listing before doing anything and shall return 403 to an owner API call for a listing the caller does not own. |

## Diagrams

### System context

The owner pauses and resumes through Jubilee. Members and visitors stop finding
the listing, and a `Verification team member` reviews a listing that is resumed
after 12 months or more.

![C4 system context for pausing and resuming a listing](diagrams/c4-context.png)

### Containers

The `Jubilee API` changes the stage in the `Jubilee database` and clears the
`Cache`. The `Jubilee Worker` updates the `Search index` from the outbox.

![C4 container view for pausing and resuming a listing](diagrams/c4-container.png)

### Components

The dialog and the banner call `ListingsApi`. In the API, the two handlers
delegate the stage rules to `Listing`; `OutboxDispatcher` completes the removal
from search.

![C4 component view for pausing and resuming a listing](diagrams/c4-component.png)

### Class structure

`Listing` holds `Stage`, `PausedAt` and `ApprovedAt`, and its `Pause` and
`Resume` methods own the transitions among `ListingStage` values.

![Class diagram for pausing and resuming a listing](diagrams/class-structure.png)

### Behaviour — pause a listing

The owner confirms in the dialog, the handler commits the stage change with its
outbox message, and the cache and search index drop the listing within 60
seconds.

![Sequence diagram for pausing a listing](diagrams/sequence-pause-listing.png)

### Behaviour — resume a listing

`Listing.Resume` chooses between `Live` and `ReadyToReview` from the length of
the pause.

![Sequence diagram for resuming a listing](diagrams/sequence-resume-listing.png)
