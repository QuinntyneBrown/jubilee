# 0007. Listing pages before accounts, requests and messaging exist

## Status

Accepted, 10 November 2026.

## Context

Journey 2 builds the business, shop and product pages. They show actions that belong to later
journeys (booking, quotes, order requests, messages, save, share, report, editing the listing),
an owner's view that depends on knowing who owns a listing, a reply-time band that depends on
messaging, and back-in-stock notices that depend on product management and notifications. None of
those exist yet. ADR 0006 already supplies a member session in tests without a sign-in.

## Decision

- **Owner and verifier.** `Listing.OwnerId` holds the subject (`sub` claim) of the member who owns
  the listing. The verification team is recognised by the `verifier` role claim. The listing
  query compares them with the session; the client never says who it is. The demo seed gives
  Legacy Financial and Luzandre.com fixed owner subjects (Trevor Chew and Naomi Laurent).
- **Tests.** The backend test scheme reads an optional subject and role besides the name. The
  Playwright suite shows the owner view by answering the listing request with the viewer relation
  `owner`, as ADR 0006 does for the session.
- **Actions of later journeys** are links to the routes those journeys own: `/b/:slug/book`,
  `/b/:slug/quote`, `/b/:slug/message`, `/b/:slug/share`, `/b/:slug/report`,
  `/b/:slug/p/:product/request` and `/my-business/edit`. Each journey opens its dialog or screen on
  its route; until then the link reaches the not-found page. The save heart is shown with
  `aria-pressed="false"` and has no effect until saving exists (journey 19).
- **Reply-time band.** `ReplyTimeBand` is derived from the stored `Listing.MedianResponseMinutes`.
  The hourly `ResponseTimeBadgeJob` that measures it is built with messaging (journey 6).
- **Stock.** `Product.SetStock` and `StockChange` and the `StockAlert` a member asks for are built
  now. The owner's stock change, the `ProductBackInStock` outbox message and the notice it
  triggers arrive with product management (journey 16) and notifications (journey 17).
- **"On Jubilee since"** is the month the listing was created.

## Consequences

- An owner view exists in a running stack only for the subjects the seed names, until sign-in.
- Later journeys replace a link with their dialog without changing the pages' layout.
- Back-in-stock alerts are recorded but no one is told yet; L2-036 criteria 2 and 3 stay open
  until journeys 16 and 17.
  Closed by ADR 0045: the notice is written with the stock change, and there is no
  `ProductBackInStock` outbox message.
