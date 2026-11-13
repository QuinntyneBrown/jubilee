# Feature businesses

## Overview

Jubilee highlights a small set of businesses on its two entry pages. A moderator
chooses up to five live listings as "Featured this week" and gives the selection
a start date. From that date the chosen listings show on the welcome page and
the browse page for 7 days.

*Featured week* — selection of up to five listings with a start date and a fixed
length of 7 days. *Featured slot* — one position in a featured week, holding one
listing. A slot does not copy the listing; it refers to it, so the pages always
show the listing's current name, tagline and photo.

The public pages apply one rule at read time: a featured listing that is paused
or removed is skipped. The selection itself is not altered, so a listing that
becomes live again within the week reappears. Featured selections are sensitive
actions and are written to the audit log (`L2-180`).

## Description

The slice has an admin write path and a public read path.

- **`AdminFeaturedPage`** — page of the admin application
  (`admin/run-admin-application`) at `/featured`. It shows the current and coming
  weeks, lets a moderator search live listings, order up to five of them and pick
  the start date, and stops the selection at five. The mock is
  `pages/admin-featured` and the copy is in it (ADR 0033).
- **`WelcomePage`** and **`BrowsePage`** — pages of the app that render
  "Featured this week" with one business card per business returned, in slot
  order, and nothing when the list is empty.
- **`AdminApi`** (`ADMIN_API`) — `featuredWeeks`, `featuredCandidates` and
  `setFeaturedWeek`; the app reads the businesses with the welcome and browse
  reads of `DirectoryApi`.
- **`AdminFeaturedController`** — exposes `GET /api/admin/featured`,
  `GET /api/admin/featured/candidates?q=` and
  `PUT /api/admin/featured-weeks/{startDate}` under `RequiresModerator`, the staff
  policy (`security/authorize-staff-requests`). The PUT replaces the whole
  selection for that start date, so a repeated request has no further effect.
- **`SetFeaturedWeekCommandHandler`** — returns HTTP 422 when the list holds more
  than five entries (`TOO_MANY`), a duplicate (`DUPLICATE`) or a listing that is
  not public (`NOT_LIVE`), when the start date is before today in Toronto
  (`START_IN_PAST`), or when another week starts within six days of it
  (`WEEK_OVERLAPS`). It replaces the week's `FeaturedSlot` rows and appends the
  `featured.set` audit entry with the before and after selection, in one save.
- **`FeaturedSlot`** — domain entity with `ListingId`, `Position` and `StartsOn`;
  a slot is shown from `StartsOn` for `DurationDays` (7) days, counted in
  America/Toronto (ADR 0033). A week is the slots that share a start date.
- **`FeaturedSelector`** — used by `GetWelcomeQueryHandler` (four businesses) and
  `GetBrowseHomeQueryHandler` (five). It joins the current slots to public
  listings only (`WherePublic`), so a paused, held or removed listing is skipped
  and returns when it is public again within the week. With no current slot it
  returns the most recently published businesses.
- **`DirectoryController`** — exposes the public `GET /api/directory/welcome` and
  `GET /api/directory/home`, whose answers carry `featured`.
- **Cache** — the welcome and browse reads are kept in the directory read cache
  (`IDirectoryReadCache`) for at most 60 seconds. A save that changes a
  `FeaturedSlot` or a `Listing` drops it in
  `DirectoryCacheInvalidationInterceptor` (ADR 0003), so a week saved or saved
  again, and a featured listing paused, held or removed, shows on the next
  request (ADR 0058).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-106` | `L1-014` | The system shall let a moderator choose up to five live listings as "Featured this week" with a start date, and shall show those listings on the welcome and browse pages from that date for 7 days. The pages shall skip a featured listing that is paused, held or removed, and a week saved shall show on the next request. |
| `L2-133` | `L1-019` | The system shall check the caller's role and ownership of the specific object on every API endpoint before doing anything. |
| `L2-180` | `L1-025` | The system shall store an append-only audit record with actor, action, target, time, before and after values, and reason for each featured selection. |

## Diagrams

### System context

The Jubilee team member selects featured businesses in Jubilee. Visitors
and members see them on the welcome and browse pages.

![C4 system context for featuring businesses](diagrams/c4-context.png)

### Containers

The admin application writes the selection and the app reads the featured list
through `Jubilee API`, which stores slots in the `Jubilee database` and keeps the
welcome and browse reads in the `Cache`.

![C4 container view for featuring businesses](diagrams/c4-container.png)

### Components

`AdminFeaturedPage` saves through `AdminFeaturedController`; `WelcomePage` and
`BrowsePage` read through `DirectoryController`. The interceptor drops the cache
that the read handlers fill when the slots are saved.

![C4 component view for featuring businesses](diagrams/c4-component.png)

### Class structure

Up to five `FeaturedSlot` rows share a start date, each referring to one
`Listing`. `FeaturedSelector` returns the public listings of the current slots.

![Class diagram for featuring businesses](diagrams/class-structure.png)

### Behaviour — choose the featured businesses

The handler rejects more than five listings or a listing that is not live,
stores the slots with an audit entry, and the save drops the cache.

![Sequence diagram for choosing the featured businesses](diagrams/sequence-set-featured-week.png)

### Behaviour — show featured businesses

The read handlers return the week active on the current date and skip listings
that are paused, held or removed.

![Sequence diagram for showing featured businesses](diagrams/sequence-show-featured.png)
