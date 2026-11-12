# View welcome page

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses where members find a business, message it, book a
meeting, ask for a quote or request a product. A *visitor* is anyone who is not
signed in. This feature is the public landing page at `/welcome`, the first
page a visitor sees.

The page explains the marketplace and invites the visitor to join or to browse.
It shows the tagline "Toronto's Christian marketplace", the heading "Do business
with Toronto's Christian community.", and a *live count* — number of businesses
that are verified and currently public. Below that it lists the eleven categories
as links, three "How Jubilee works" steps, up to four *featured businesses*
under "Featured this week", and an "Own a business?" panel for owners who want
to list.

A featured business is a live listing that the verification team chose for the
week. The page shows only listings that are verified and live; a listing that
is paused, removed or not yet verified never appears and is never counted.

The page is for visitors. A signed-in member who opens `/welcome` is taken to
the browse home at `/`.

## Description

The feature is a read-only vertical slice from the welcome page in
`Jubilee Web` to the `Jubilee database`, with a short-lived read cache in
between. The names below are the names in the code.

- **`WelcomePage`** — Angular page at `/welcome`. It renders the hero with the
  line "{n} verified businesses — shops, advisors, trades and more. Free to
  join, free to list." and the actions "Join free" (to `/join`) and "Browse
  businesses" (to `/`); the category links; the three steps "Find someone you
  can trust", "Ask, book or order" and "Keep wealth working for the kingdom";
  "Featured this week" with "Browse all {n}"; and the "Own a business?" panel
  with "List your business".
- **`welcomeRedirectGuard`** — Angular `CanActivateFn` on `/welcome`. It
  waits for `SessionService` to resolve the session and returns a redirect to
  `/` for a signed-in member.
- **`ChipRow`** and **`Chip`** (`jb-chip-row`, `jb-chip`) — components that
  render the eleven categories of `CATEGORIES` as links to `/c/:category`, in
  the fixed order Shops, Rooms & rentals, Financial & insurance, Legal &
  immigration, Home & property, Real estate & living, Health & family,
  Business & tech, Learning, Media, Community.
- **`Hero`**, **`Steps`**, **`Section`**, **`CardGrid`** and **`Band`** —
  components of the `components` library that the page composes for the hero,
  "How Jubilee works", "Featured this week" and the "Own a business?" panel.
- **`BusinessCard`** — shared component (`jb-business-card`) for one featured business:
  category media tile or cover photo, short category label, name, tagline,
  optional highlight and the "Verified" mark (L2-027). The name wraps and the
  tagline is clamped to two lines.
- **`DirectoryApi`** — contract of the public directory, injected through the
  token `DIRECTORY_API`; `HttpDirectoryApi` implements it. `getWelcome()` calls
  `GET /api/directory/welcome`.
- **`DirectoryController`** — ASP.NET Core controller in `Jubilee.Api`. The
  welcome endpoint allows anonymous callers and returns a `WelcomeDto` with no
  personal data, so one response serves every visitor.
- **`GetWelcomeQuery`** and **`GetWelcomeQueryHandler`** — MediatR query and
  handler. The handler asks `IDirectoryReadCache` for the `WelcomeDto` and
  builds it from the database on a miss.
- **`WelcomeDto`** — response with `LiveBusinessCount`, the eleven
  `CategoryLinkDto` items and up to four `BusinessCardDto` items.
- **`PublicListingFilter`** — query filter that defines a public listing:
  stage live, not paused, not deleted and not under a moderation hold. Both the
  count and the featured list apply it (L2-028).
- **`FeaturedSelector`** — application service in `Jubilee.Application`, because it queries the database. `Select(now, limit)` returns the
  public listings of the `FeaturedSlot` rows whose 7-day window contains `now`,
  in slot order, skipping any listing that is no longer public. When no slot is
  current it returns the most recently verified public listings. The welcome
  page asks for 4.
- **`FeaturedSlot`** — entity written by the verification team: listing,
  position, start date and a 7-day duration.
- **`IDirectoryReadCache`** — read cache for directory responses, declared in
  `Jubilee.Application`. `DistributedDirectoryReadCache` in
  `Jubilee.Infrastructure` implements it on `IDistributedCache`: in memory by
  default, Redis when `ConnectionStrings:Redis` is set. The welcome entry has a
  time to live of `60 s`, measured with the injected `TimeProvider`, so the
  count and the featured list match the directory well inside the 5-minute
  limit.
- **`DirectoryCacheInvalidationInterceptor`** — EF Core `SaveChangesInterceptor`
  in `Jubilee.Infrastructure`. After `AppDbContext` saves an added, changed or
  deleted `Listing`, `Product`, `Service` or `FeaturedSlot`, it calls
  `IDirectoryReadCache.InvalidateAsync`, which replaces the cache version and
  so orphans every directory entry at once. A listing that is approved, paused,
  resumed, removed or featured therefore shows on the next request the API
  builds. A save that fails removes nothing.

"List your business" takes a visitor to `/join?returnUrl=/list`, so that they
arrive at the listing form once they have an account. The page text does not
wait for the welcome data: until it arrives, and when the load fails, the hero
line reads "Shops, advisors, trades and more. Free to join, free to list."
without the count and "Featured this week" is left out. The page therefore has
no loading, empty or error state of its own.

`DirectoryCacheInvalidationInterceptor` is registered on `AppDbContext` in every
process that uses it (`Jubilee API`, `Jubilee Worker` and the `jubilee` CLI).
With the in-memory store each process holds its own entries, so a change saved
by another process is seen when the entry expires, at most 60 seconds later;
with Redis the removal reaches every process at once. The API also marks the
responses `Cache-Control: public, max-age=60`
(`docs/adr/0003-directory-read-cache.md`).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-020` | `L1-003` | The system shall serve `/welcome` as the public landing page for visitors. |
| `L2-028` | `L1-003` | Browse, category, search, featured and related lists shall show only listings that are verified and not paused, deleted or under a moderation hold. |
| `L2-027` | `L1-003` | Business cards, product cards and directory rows shall follow fixed display rules. |
| `L2-106` | `L1-014` | The listings a verifier chooses as "Featured this week" shall show on the welcome and browse pages from the start date for 7 days, and a featured listing that is paused or removed shall be skipped. |

## Diagrams

### System context

A visitor opens the welcome page in Jubilee and is invited to join or browse. A
signed-in member who opens it is sent to the browse home. The slice calls no
external system.

![C4 system context for viewing the welcome page](diagrams/c4-context.png)

### Containers

`Jubilee Web` requests the welcome data from `Jubilee API`, which answers from
the `Cache` or the `Jubilee database`. `Jubilee API` removes the cached entries
when it saves a change to a listing.

![C4 container view for viewing the welcome page](diagrams/c4-container.png)

### Components

`welcomeRedirectGuard` decides whether `WelcomePage` renders. The page loads
through `DirectoryApi`; `GetWelcomeQueryHandler` uses `IDirectoryReadCache`,
`PublicListingFilter` and `FeaturedSelector`.

![C4 component view for viewing the welcome page](diagrams/c4-component.png)

### Class structure

`GetWelcomeQueryHandler` returns a `WelcomeDto` made of a count, eleven
`CategoryLinkDto` items and up to four `BusinessCardDto` items.
`FeaturedSelector` reads `FeaturedSlot` and `Listing`.

![Class diagram for viewing the welcome page](diagrams/class-structure.png)

### Behaviour — open the welcome page

A member is redirected to `/` before any data is requested. For a visitor, the
handler answers from the cache when the entry is younger than `60 s` and
otherwise counts public listings and selects the featured four.

![Sequence diagram for opening the welcome page](diagrams/sequence-open-welcome-page.png)

### Behaviour — keep the count current

Saving a listing state change removes the cached directory entries in the same
request, through `DirectoryCacheInvalidationInterceptor`, so the next request
rebuilds the count. The `60 s` expiry bounds staleness for a change that
another process saved.

![Sequence diagram for keeping the count current](diagrams/sequence-keep-count-current.png)
