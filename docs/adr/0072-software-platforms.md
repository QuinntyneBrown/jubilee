# 0072. Software platforms: a platform is a listing kind with its own category, its page links out, and a review of one rests on the member's statement of use

## Status

Accepted, 13 November 2026. Implements L1-033 (L2-248 to L2-262); journey 33. Follows ADR 0042
(a space is a listing kind) and amends ADR 0066 (reviews) for this kind only. Applies ADR 0009
(tests without a database), ADR 0011 (search over the database), ADR 0035 (presentation in the
components library), ADR 0036 (component parity), ADR 0044 (launching soon) and ADR 0057 (ship
without verification).

## Context

Christians in Toronto build software as well as shops and trades: a web app a family signs in to,
an online tool a small church or a sole trader uses. Such a product has no shop, no area served
and no opening hours, sells nothing through a request, and is used on its own website. Jubilee
listed three kinds of listing (`Services`, `Shop`, `Space`), each derived from its category by
`Category.KindOf`, and none of them fits: the service page offers "Book a meeting", the shop page
products, the space page a space request.

`Listing.Website` was stored and edited (L2-087) but no public page showed it. Reviews (ADR 0066)
are open only to a member with a confirmed or completed request, and a platform can never have
one. The Magic Patterns design reference draws no platform. We had to decide how a platform fits
the listing model, what its page offers in place of a request, and on what a review of it rests
when Jubilee can check nothing.

The words are fixed in the requirements: a **software platform** (a **platform**), kind
`platform`, in the category **"Software platforms"** (`software-platforms`); the owner of a
platform is called its **founder** in copy and is the Owner of L1; a member's **statement of
use** is their own word that they have used a platform.

## Decision

- **`ListingKind.Platform` is derived from the category, as `Shop` and `Space` are.** "Software
  platforms" is the twelfth and last of twelve fixed categories (`Category.All`,
  `Category.PlatformsSlug`). A listing created in it is a `Platform`; `Edit` refuses to move a
  platform out or a business in with `CATEGORY_LOCKED`, as it does for a space. Its wire value is
  `platform` (`WireValues.Of`), and a draft's kind on the wire is `platform` too.
- **The platform's own fields are an owned type, `PlatformDetails`, on `Listing` and on
  `ListingDraft`.** It holds what it does (600 characters), who it is for (300) and the pricing in
  the founder's words (120). EF maps it with `OwnsOne(...).ToJson("Platform")` into one nullable
  JSON column, exactly as `SpaceDetails` is mapped, so a business leaves it null. The pricing is
  free text on purpose: Jubilee takes no payment and compares no prices, and a table of plans is
  deferred.
- **The web address is `Listing.Website`, the field that already exists**, not a second one
  inside the details. A draft has no website today, so `ListingDraft` gains a `Website` column.
  For a platform the address is required and stricter than L2-087 AC3: an absolute `https` URL
  with a dotted host, no user or password, 200 characters at most (`PlatformRules.IsWebAddress`).
  It is `https` only because it is the page's main action; a business's optional website keeps
  the rule it had.
- **The page's main action is a plain link out.** `ListingPageDto` gains `Platform`
  (`PlatformPageDto`: `website`, `host`, `does`, `for`, `pricing`), null for every other kind. The
  app renders the address as an `<a>` with `target="_blank"` and
  `rel="noopener noreferrer nofollow"` and the text "Visit {host}". There is no redirect endpoint
  and no click is counted: the address carries nothing of the member, and Jubilee learns nothing
  of who followed it. The server never requests the address (no preview, no screenshot, no
  reachability check): a check would be a claim Jubilee cannot stand behind (Proverbs 11:1), and
  a fetch of an address an owner typed is a request-forgery risk for no gain. An address that no
  longer passes the rule is left out of the answer instead of being linked.
- **A platform is shown on the business card, not a card of its own.** A platform has a name, a
  line, an optional highlight and a category tile like any business; nothing on a card is
  particular to it. It therefore joins every list of businesses without new code: the browse
  groups, featured, related, saved, new businesses. The space card existed because a space shows
  a rent and a term; a platform card would repeat the business card. The category tile gains a
  twelfth icon and tint.
- **The category page reuses the business branch without the filters.** Offers and areas served
  (L2-024) describe a trade that visits a customer; a platform has neither. The handler ignores
  `offers` and `areas` for `software-platforms` and answers no category fact; the page hides the
  chips and "Filters" and keeps "Sort" and the paging. The count reads "{n} platforms".
- **Search reads the platform's words.** `DatabaseSearchIndex` matches a platform by name, line,
  "What it does" and "Who it is for", in memory over the public listings as it does for spaces
  (ADR 0011). The web address and the pricing are not searched.
- **A platform takes no requests.** It has no services and no products, so a booking and an order
  request already find nothing to name. A quote request needs no service, so the handler refuses
  one for a platform with 409 `NOT_OFFERED`. Messaging is per listing and works unchanged; the
  page calls it "Message founder".
- **A review of a platform rests on the member's statement of use** (this amends ADR 0066 for
  platforms only). `ReviewRules.WritingAsync` branches on the kind: for a business, shop or space
  the rule is the confirmed or completed request, unchanged; for a platform every signed-in
  member who is not its owner and has no review shown is `eligible`. The Write a review screen
  then asks for the statement, a checkbox "I have used {name} myself.", and the API refuses a
  platform review without `usedIt: true` (422 `usedIt: STATEMENT_REQUIRED`). The statement is
  stored on the review as its time, `Review.StatedUseAt`, null for every other kind. We chose
  this over leaving platforms without reviews (the feature's purpose) and over a proof of use
  (a receipt or a screenshot nobody at Jubilee could judge). The measure is kept honest by
  saying what it is: the reviews section of a platform always carries "Reviews here are from
  members who say they have used {name}. That is their own word. Jubilee does not check it.",
  the screen says "This is your own word. Jubilee does not check it.", and nothing calls a review
  verified. A statement of use never makes a member eligible to review a business, shop or space.
- **The item of a platform review is "Their platform".** There is nothing to choose, as for a
  space; the name is kept on the review like every item name.
- **Everything else about reviews is ADR 0066 unchanged**: one per member and listing, edit and
  remove, the one public reply, reports and take-down in the reports queue, notifications,
  privacy, the stored star counts and the rating on cards from three reviews. Because no request
  bounds who may review a platform, the daily limit of 5 new reviews a member (L2-238 AC6) and
  the report reason "It isn’t about a real dealing with them" are what answer abuse; both exist.
- **Onboarding and editing follow the space.** `/list` gains a fourth card, "A software
  platform", and `?kind=platform`; the form shows the platform fields in place of the category,
  the items and the place. Edit listing shows the same fields in place of About, Category, Where,
  Hours and Website. The agreement is the checkbox of L2-075, unchanged.
- **The admin application shows the kind through what it already shows**: the category column of
  `/listings`, and on a listing's screen the web address, what it does, who it is for and the
  pricing in the preview.
- **Marketing copy** names software platforms among what Jubilee lists, in the launching-soon
  page's own words (ADR 0044); it adds no link.
- **Seed and mocks use invented platforms** (Lanternread, Gatherboard, Ledgerleaf), on `.example`
  addresses. Shelfie was the model for the shape of a platform; no real product is seeded,
  mocked or reviewed.

## Consequences

- One migration adds the `Platform` JSON column to `Listings` and `ListingDrafts`, `Website` to
  `ListingDrafts` and `StatedUseAt` to `Reviews`; `jubilee migrate` applies it. SQLite and
  InMemory take the schema from the model.
- Code that switched on three listing kinds must handle a fourth; the compiler finds the switch
  expressions. Every copy of the category list gains the twelfth entry.
- A review of a platform is weaker evidence than a review of a business, and the page says so
  each time. If abuse shows the statement is not enough, the remedy is a later decision (for
  example an account age, or a founder-issued code), not a silent mark.
- Platforms count among the businesses on the browse home ("All {n} businesses"); their own
  category page counts them as platforms.
- Deferred, each its own later change: verifying that a founder is Christian or in Toronto, or
  that a reviewer used the platform; booking, quotes, product requests or payment for platforms;
  app store links, screenshot galleries, pricing tables, integrations or an API for platforms;
  platforms founded outside Toronto; a platform card of its own; filters on the category page; a
  persona for a founder (`docs/personas/` has one folder per invented person, not one per kind,
  so none is required); a narrated video for journey 33; and what ADR 0066 already deferred
  (photos on reviews, Helpful, the Top rated shelf).
