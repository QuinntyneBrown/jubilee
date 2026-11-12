# View the business overview

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses. An *owner* is a member who owns one or more business
listings. The *owner workspace* is the set of pages under `/my-business` where an
owner monitors and manages a listing. This feature covers the workspace's first
page, the overview at `/my-business`, and the access rule that protects every
workspace route.

The overview changes with the *listing stage* — position of a listing in the path
from draft to public. A member with no listing sees an invitation to list a
business. A submitted listing shows that the verification team is reviewing it. A
listing with changes the verification team requested shows what the owner can
do next. A live listing shows four statistics, the new requests that wait for a
reply, and a summary of products, services and the verification status.

A *listing view* is one counted opening of the public listing page. The count
excludes repeat views by the same visitor within 30 minutes, the owner's own
views and known bots, so that the statistic reflects distinct interest.

The workspace header and its five tabs ("Overview", "Listing", "Products",
"Services", "Requests {n}") belong to this feature because every other
owner-workspace feature renders inside them.

## Description

The feature is a vertical slice from the workspace shell in `Jubilee Web` to the
read models in the `Jubilee database`.

- **`OwnerWorkspaceShell`** — Angular layout component for every `/my-business/*`
  route. It renders the header (business name, "Verified · live since {Month YYYY}"
  and "View public listing") and the tabs "Overview", "Listing", "Products",
  "Services" and "Requests {n}". Each tab is a router link; the active tab carries
  `aria-current="page"` and the URL changes on each switch. For a listing that is
  not live, the header shows the listing stage in place of "Verified · live since".
- **`MyBusinessOverviewPage`** — Angular page at `/my-business`. It renders one
  of five views chosen from `OwnerWorkspace.Stage`: the invitation, the pending
  view, the changes-requested view, the live overview, and the load-error state
  with reference `JB-BIZ-503`.
- **`OwnerGuard`** — route guard on `/my-business/*`. It lets a member with no
  listing reach `/my-business` only, and routes a `403` answer from the API to
  the forbidden page.
- **`OwnerWorkspaceApi`** — typed Angular HTTP client for
  `GET /api/owner/workspace`, `GET /api/owner/listings/{listingId}/overview` and
  `POST /api/owner/listings/{listingId}/live-banner/acknowledge`.
- **`OwnerWorkspaceStore`** — signal store that holds the `OwnerWorkspace`
  summary shared by the shell and all workspace pages, and the `BusinessOverview`
  of the current listing. `RealtimeClient` updates the "Requests {n}" badge.
- **`VerificationBanner`** — shared banner component. On this page it shows the
  one-time success banner "{Business} is verified and live. Members can find you
  in {category}." with "View listing", and the persistent paused banner owned by
  the `pause-listing` feature.
- **`OwnerWorkspaceController`** — ASP.NET Core controller in `Jubilee.Api`. It
  authenticates the session cookie, applies `ListingOwnerPolicy` and sends the
  queries through MediatR.
- **`ListingOwnerPolicy`** — authorization policy that compares
  `Listing.OwnerId` with the caller's member ID before any state is read. A
  member who does not own the listing receives HTTP `403`.
- **`GetOwnerWorkspaceQuery`** and **`GetOwnerWorkspaceQueryHandler`** — return
  the caller's listing (or none), its `ListingStage`, the "live since" month, the
  count of `new` requests for the tab badge, and the stage detail: the
  submission time for the pending view; each requested change, the
  reviewer's first name and the date for the changes-requested view.
- **`GetBusinessOverviewQuery`** and **`GetBusinessOverviewQueryHandler`** —
  build the `BusinessOverview`: the four statistics, up to 3 `new` requests for
  "Needs your reply", and the "Your listing" summary (for example "4 products ·
  1 sold out", the service count, and the verification status "Verified Jun 2026", read from
  `Listing.VerifiedOn`).
- **`OverviewStats`** — value object with `ListingViews7Days` and its change on
  the previous 7 days, `OpenRequests` and `NewSinceYesterday`,
  `UnansweredMessages`, and `SavedByMembers` with its weekly change.
- **`ListingViewRecorder`** — application service that the public listing query
  calls. It skips the owner's own views and requests from known bots, then sets
  the `Cache` key `view:{listingId}:{visitorKey}` with a 30 minute expiry; only a
  newly set key increments the day's `ListingViewDaily` row. The source of the
  bot list is `<TO SUPPLY>`.
- **`ListingViewDaily`** — entity holding one view count per listing per
  calendar day in America/Toronto. The 7 day statistic sums 7 rows.
- **`AcknowledgeLiveBannerCommand`** and its handler — set
  `Listing.LiveBannerSeenAt` after the success banner is shown, so the banner
  appears once.

The invitation reads "List your business free. Tell members what you offer,
submit it for verification, and you're live once we approve it. It takes about
ten minutes." with "List your business" and "How verification works". The
pending view is an info alert headed "We're reviewing {Business}" with the text
"You submitted it {when}. We review and publish within two business days." and
no action. The changes-requested view offers "Edit listing", which belongs to
the onboarding features. "Decline" and "Confirm" in "Needs your
reply" open the dialogs of the business request handling features.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-085` | `L1-013` | The system shall provide `/my-business` as the owner's workspace for a live listing, with a header, five tabs, four statistics, up to 3 new requests under "Needs your reply" and a "Your listing" summary. Listing view counts shall exclude repeat views by the same visitor within 30 minutes, the owner's own views and known bots. |
| `L2-086` | `L1-013` | Before a listing is live, `/my-business` shall show the invitation to list a business, the pending state "We're reviewing {Business}" with no action, or the requested changes, according to the listing's stage. After approval it shall show the success banner "{Business} is verified and live. Members can find you in {category}." |
| `L2-097` | `L1-013` | The system shall return HTTP 403 and show the forbidden page for any `/my-business/*` route or owner API requested by a member who does not own the listing. The active workspace tab shall be marked `aria-current="page"`, and a listing that is not live shall show its stage in the header while Products and Services stay manageable. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API endpoint before doing anything, and shall return 403 when an owner API is called for a listing the caller does not own. |
| `L2-065` | `L1-010` | The "Requests" tab of the owner workspace shall carry the number of `new` requests, shown as "99+" above 99 and updated within 5 seconds while the page is open. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference the user can quote to support; the overview uses `JB-BIZ-503`. |

## Diagrams

### System context

The owner works with Jubilee alone for this feature. Visitors and members appear
because their openings of the public listing page feed the view statistic.

![C4 system context for viewing the business overview](diagrams/c4-context.png)

### Containers

`Jubilee Web` reads the workspace summary and the overview from the
`Jubilee API`, which reads the `Jubilee database` and uses the `Cache` to
suppress repeat views within 30 minutes.

![C4 container view for viewing the business overview](diagrams/c4-container.png)

### Components

The shell and the page share one store and one client. In the API, the
controller applies `ListingOwnerPolicy` before either query handler runs;
`ListingViewRecorder` is the only writer of view counts.

![C4 component view for viewing the business overview](diagrams/c4-component.png)

### Class structure

`OwnerWorkspace` carries the stage that selects the view, and `BusinessOverview`
aggregates `OverviewStats`, the request cards and the listing summary.
`ListingViewDaily` holds the counts that `ListingViewRecorder` writes.

![Class diagram for viewing the business overview](diagrams/class-structure.png)

### Behaviour — load the overview

The shell loads the workspace summary first. A member without a listing sees the
invitation; a caller who does not own the listing receives `403`; the stage of
an owned listing selects the view, and only a live listing loads the statistics.

![Sequence diagram for loading the business overview](diagrams/sequence-load-overview.png)

### Behaviour — count a listing view

The public listing query hands each opening to `ListingViewRecorder`, which
applies the three exclusions of `L2-085` before it increments the daily count.

![Sequence diagram for counting a listing view](diagrams/sequence-count-listing-view.png)
