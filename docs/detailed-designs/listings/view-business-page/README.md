# View a business page

## Overview

Jubilee is Toronto's Christian marketplace. Each verified business has one
public page at `/b/:slug`, called its listing page. The listing page is where a
visitor or member reads what the business offers and starts a booking, a quote
request, an order or a message. This feature covers the listing page in its two
layouts, the view an owner gets of their own listing, and the related businesses
at the foot of the page.

The layout follows the main offer of the business. A business whose main offer
is services gets the service business page: header, primary actions "Book a
meeting" and "Message", the services list, "About" and "Details". A business
whose main offer is products gets the shop page: header, "Shop products", the
product cards, "Custom work", "About" and "Details". Both end with "More in
{category}".

The feature uses the following local terms.

- **listing** — public record of one business, addressed by its slug
- **listing kind** — main offer of a listing, either `Services` or `Shop`
- **viewer relation** — relation of the person viewing to the listing: visitor, member, owner or verifier
- **listing status** — where a listing stands for the public: live, or the reason it is not public (draft, pending verification, changes requested, declined, paused, on hold)
- **preview** — the listing page of a listing that is not public, as its owner and the verification team see it
- **reply-time band** — text for the "Replies" detail, derived from the median first-reply time of the business over the last 90 days
- **listing view** — one counted visit to a listing page, used in the owner's statistics

The dialogs that the page opens (booking, quote, order, message, share, report)
and the save heart are separate features. This feature supplies the page and
the data that those actions start from.

## Description

The feature is a vertical slice from the Angular page to the database, with one
scheduled job.

- **`BusinessPage`** — Angular page for `/b/:slug`. It loads the listing page
  through `ListingsApi` and lays it out according to `kind`: the service
  business layout or the shop layout (the space layout is the feature
  [View a space](../view-space/README.md)). It is one page that composes `jb-*`
  components of the `components` library; it declares no component of its own
  (ADR 0035). It renders "Back to browse" and the line "Verified Christian
  business · {category}". On failure it shows "We couldn't load this business"
  or "We couldn't load this shop" with the reference `JB-BIZ-503`.
- **Service business layout** — the name, the owner's name with credentials,
  the tagline, credential tags, the highlight, and one `ServiceRow`
  (`li[jb-service-row]`) per service with name, short detail, price ("Free", an
  amount, or "Ask") and an action ("Book" or "Ask"). The action opens the
  booking or quote dialog for that service. Every service is listed; names and
  credential tags wrap and are not truncated. With no services the area reads
  "No services listed yet" with "Send a message", and "Send a message" takes
  the place of "Book a meeting".
- **Actions of other journeys** — "Book a meeting", "Book", "Ask", "Message",
  "Send a message", "Share", "Report this listing" and "Edit listing" are links
  to the routes of the features that own them (`/b/:slug/book`,
  `/b/:slug/quote`, `/b/:slug/message`, `/b/:slug/share`, `/b/:slug/report`,
  `/my-business/edit`), and the save heart belongs to
  [Save a listing](../save-listing/README.md).
- **Shop layout** — "Products" with the count and one `ProductCard`
  (`a[jb-product-card]`) per product, without the shop's name, and "Custom
  work" listing the shop's services with "Ask". A sold-out product's card
  carries the words "Sold out" on its tile: `ProductCardDto.SoldOut` is the
  product's `IsSoldOut`, and the card passes it to `jb-media-tile` as its tag
  (`pages/shop/sold-out.html`, `L2-034` AC3). With no products it reads "No
  products yet. {Name} is setting up shop." with "Send a message".
- **Details** — definition list of the details (`dl[jb-description-list]`). A services listing shows
  Where, Hours, Languages, On Jubilee since and Replies. A shop shows Where,
  Delivery, Made to order, On Jubilee since and Replies. "On Jubilee since" is
  the month the listing was created. A row whose value the owner has not given
  is omitted, and the Replies row is omitted when the API returns no reply
  text.
- **Related businesses** — section "More in {category}" with up to two
  `BusinessCard` components and a "See all" link to `/c/:category`. The section
  is omitted when the API returns no related listing.
- **Owner banner** — `jb-alert` shown when the viewer relation is owner and the
  listing is public: "This is how members see your listing. It's live and
  verified. Changes you make are published straight away." with "Go to My
  business". In this view the page replaces "Book a meeting" and "Message" with
  "Edit listing" and hides save and report (`L2-037`).
- **Preview banner** — `jb-alert` with the warning tone, shown in place of the
  owner banner when `status` is not `live` (`pages/business/preview.html`,
  `L2-219`). For the owner it is titled "Preview: members can't see this page
  yet" and reads "{status}. Only you and the Jubilee verification team can open
  it." with "Go to My business"; "Edit listing" stays. For the verification team
  it is titled "Preview: this listing is not public" and reads "{status}. Only
  its owner and the Jubilee verification team can open it."; the member
  actions, share and "Report this listing" are not shown. The status is said in
  the words of the owner workspace: "Draft · not submitted yet", "Pending
  verification", "Changes requested · not public yet", "Declined · not public",
  "Verified · paused, not public", "On hold while we look into a report · not
  public". The page records a listing view only for a public listing.
- **`ListingsApi`** — contract (`LISTINGS_API`) and typed Angular HTTP client
  (`HttpListingsApi`) for `GET /api/listings/{slug}` and
  `POST /api/listings/{slug}/views`.
- **`ListingsController`** — ASP.NET Core controller in `Jubilee.Api`. Both
  endpoints accept anonymous callers, read the session when one exists and are
  rate limited per client address. A load failure returns 503 `ProblemDetails`
  with `JB-BIZ-503`. A visitor's answer may be cached publicly for 60 seconds;
  a signed-in caller's answer is never stored. The page lists every service and
  at most 50 products, with the shop's product count (`L2-153`).
- **`GetListingPageQuery`** and **`GetListingPageQueryHandler`** — MediatR
  query and handler. The handler loads the `Listing` with its `Service` and
  `Product` rows, evaluates `ListingVisibilityPolicy`, selects the related
  listings, and returns a `ListingPageDto` that carries the `ViewerRelation`,
  the `Stage` and the `Status`. Public responses are kept by
  `IDirectoryReadCache` for at most 60 seconds; owner and verifier responses
  bypass the cache.
- **Visibility** — decided in the handler with `PublicListingFilter`, the one
  definition of a public listing (verified and live, not paused, not deleted,
  not under a moderation hold). A listing that is not public resolves to not
  found, except for its owner and the verification team, who receive the
  preview. A deleted listing is not found for everyone. The server decides the
  viewer relation from the session, never from the client: the owner is the
  member whose subject is `Listing.OwnerId`, and the verification team holds
  the `verifier` role (ADR 0007).
- **`ListingStatus`** — the wire value of `ListingPageDto.Status`: `live` for a
  public listing, otherwise the first that applies of `on-hold`, `paused`,
  `draft`, `ready-to-review`, `changes-requested`, `declined`. The browser
  turns it into words.
- **Related listings selection** — query for up to two other live listings in
  the same category, excluding the current listing. The two are the first in
  the category's Recommended order (`ListingSortPolicy`, ADR 0004), so the
  section agrees with the category page that "See all" opens.
- **`ReplyTimeBand`** and **`ResponseTimeBadgeJob`** — enumeration on `Listing`
  and the hosted job in `Jubilee.Worker` that maintains it. The job computes
  the median first-reply time of each business over the last 90 days: under
  6 hours gives "Usually within a few hours", under 24 hours gives "Usually
  within a day", otherwise "Usually within a few days". With fewer than
  3 replies the band is `None`. The job runs hourly. Until messaging records
  replies (journey 6), the band is derived from the stored
  `Listing.MedianResponseMinutes`, which is null for every listing without
  enough replies, and the job itself is built with messaging (ADR 0007).
- **`RecordListingViewCommand`** and **`ListingView`** — command sent after the
  page renders, and the row that it inserts. The handler skips the insert when
  the viewer owns the listing, so the owner's visits do not appear in the
  owner's statistics. It counts views of public listings only, and skips a
  repeat view by the same visitor within 30 minutes (looked up in
  `ListingViews`) and views by known bots. A visitor is the member's subject, or a
  one-way hash of the client address and user agent for a caller without a
  session; no address is stored.

### Spaces

When `ListingPageDto.Kind` is `space`, `BusinessPage` renders the space layout
on the same route, with the same load states and not-found rule.
`ListingPageDto` gains `Space` (`SpacePageDto?`, without the exact address
for every caller, with the call to action), `RelatedSpaces` (the four newest
other live spaces as `SpaceCardDto`) and `OpenRequestId` (the signed-in member's
open space request, added after the public cache read). The
layout is the feature [View a space](../view-space/README.md) (ADR 0042).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-033` | `L1-005` | The page `/b/:slug` shall present a business whose main offer is services, with its header, actions, services list, About, Details and related businesses. |
| `L2-034` | `L1-005` | The page `/b/:slug` shall present a business whose main offer is products, with its header, product cards, Custom work, About, Details and related businesses. |
| `L2-037` | `L1-005` | An owner who opens their own live listing shall see an owner banner and "Edit listing" in place of the member actions, with save and report hidden, and the visit shall not count as a listing view. |
| `L2-040` | `L1-005` | A listing page shall show up to two other live businesses of the same category, never the current one, and shall omit the section when the category has no other live business. |
| `L2-219` | `L1-005` | The owner and the verification team shall see a listing that is not public as a preview that gives its status. |
| `L2-028` | `L1-003` | Browse, category, search, featured and related lists shall show only listings that are verified and not paused, deleted or under a moderation hold. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference that the user can quote to support. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API endpoint; no check shall rely on the client hiding a control. |
| `L2-205` | `L1-028` | `/b/:slug` for a space shall show the space page and never send the exact address to anyone but the owner. |

## Diagrams

### System context

Visitors, members and owners open a listing page. The feature involves no
external system.

![C4 system context for viewing a business page](diagrams/c4-context.png)

### Containers

`Jubilee Web` loads the listing page from `Jubilee API` and photos from
`Media storage`. `Jubilee Worker` computes the reply-time band that the page
shows under "Replies".

![C4 container view for viewing a business page](diagrams/c4-container.png)

### Components

`BusinessPage` picks the layout. In `Jubilee API`, the query handler applies
`PublicListingFilter`, and a separate command handler records the listing
view.

![C4 component view for viewing a business page](diagrams/c4-component.png)

### Class structure

A `Listing` owns its `Service` and `Product` rows and holds a `ListingKind` and
a `ReplyTimeBand`. `ListingPageDto` carries the `ViewerRelation` that selects
the owner view.

![Class diagram for viewing a business page](diagrams/class-structure.png)

### Behaviour — view a business or shop page

The handler resolves the listing, returns 404 for a listing that is not public
for the viewer, adds up to two related listings, and the page then records one
listing view.

![Sequence diagram for viewing a business or shop page](diagrams/sequence-view-listing.png)

### Behaviour — owner views their own listing

The handler recognises the owner from the session. The page shows the owner
banner, or the preview banner with the status when the listing is not public,
and "Edit listing"; the view command handler counts no view.

![Sequence diagram for an owner viewing their own listing](diagrams/sequence-owner-view.png)
