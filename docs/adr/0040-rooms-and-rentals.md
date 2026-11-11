# 0040. Rooms and rentals: a space is a listing kind, a space request is a request kind

## Status

Accepted, 11 November 2026. Implements L1-027 (L2-188 to L2-200); applies ADR 0009 (tests without
a database), ADR 0018 (listing onboarding), ADR 0021 (responding to requests), ADR 0035
(presentation in the components library) and ADR 0036 (component parity).

## Context

Jubilee listed two kinds of listing: a business whose main offer is services and a shop. The
Magic Patterns design (OS `vjQEdxvHPvuznVPfxRXYfe`, frames Sell, Browse, Listing and the shared
`SpaceCard` and `businesses.ts`) adds a third: a **space**, a room, suite, apartment, house or
hall an owner rents out, always in the category "Rooms & rentals", under one of four **terms**
(Short stay, Long term, Room, Roommate). A member sends the space request that fits the term, the
owner confirms or declines it like any request, and the exact address is shared only once the
owner accepts.

`Listing.Kind` is derived from the category slug (Shops → `Shop`, otherwise `Services`), a request
is one of `Booking`, `Quote` and `Order`, and every public list projects listings through DTOs
built in the application layer. We had to decide how a space fits those three models and where its
address lives.

## Decision

- **`ListingKind.Space` is derived from the category, as `Shop` is.** "Rooms & rentals"
  (`rooms-rentals`) is the second of eleven fixed categories (`Category.All`). A listing created in
  it is a `Space`; `Edit` does not let a space leave the category nor a business enter it (the
  space editor has no category field and the server refuses the change with
  `CATEGORY_LOCKED`). The kind stays derived so that no listing can be a space in the wrong
  category.
- **The rental fields are an owned type, `SpaceDetails`, on `Listing` and on `ListingDraft`.** It
  holds the term, the rent in whole dollars, the availability text, the minimum stay as a count,
  the neighbourhood, the place ("The space"), up to four key facts, what's included, the household
  text, up to eight house rules and the exact address. EF maps it with `OwnsOne` into the listing's
  table (nullable columns, `Space_` prefix), the lists as JSON columns like `Credentials`. A
  services listing or shop has no `SpaceDetails`.
- **The term is an enum, `SpaceTerm`** (`ShortStay`, `LongTerm`, `Room`, `Roommate`), stored as an
  int and sent as the wire values `short-stay`, `long-term`, `room` and `roommate`
  (`WireValues`). The term decides the price unit (night for a Short stay, month otherwise), the
  minimum-stay choices (nights 1, 2, 3, 7; months 1, 4, 6, 12) and their labels, whether the
  household is asked, and the call to action. These rules live in one domain type,
  `SpaceTerms`, that the handlers, the DTOs and the validators read.
- **A space request is a fourth request kind, `RequestKind.Space`.** Its dates do not fit a
  booking (a meeting with a start and a length) and its total does not fit an order (a product
  and a quantity). It has its own factory, `Request.AskForSpace`, and its own nullable fields
  (`CheckIn`, `CheckOut`, `MoveIn`, `StayMonths`, `SpaceTerm`), reuses `UnitPriceCents` and
  `TotalCents` for the server-computed short-stay total and `Note` for the note. It follows the
  one lifecycle of L2-043 and the existing confirm, decline, cancel, notification and
  conversation-card paths, which switch on the kind for their words only.
- **The exact address is stored once, on the listing, and released by a rule, never copied.**
  `SpaceDetails.Address` is read in two places only: the owner's own edit-listing and draft
  endpoints, and the member's request detail, which includes it when the request is a space
  request of that member and its status is `Confirmed` or `Completed`
  (`SpaceAddressRelease.IsReleased`). Every public DTO (`SpaceCardDto`, `ListingPageDto`, search
  hits, saved items) is built without it, and the verification team's review leaves it out. The
  release is computed on each read, so a later change of address reaches the accepted renter and
  nobody else, and a cancelled request stops showing it.
- **The request's dates and total are in a dialog, not on the page.** The design draws the dates
  in the booking card on the page. AGENTS.md forbids inline forms in pages (button-triggered
  editing opens a CDK Dialog), so the card keeps the rent, minimum stay, call to action, "Message
  host", save and the "You won't pay anything until the host accepts." line, and the call to
  action opens `dialogs/request-space`, a CDK dialog with the term's dates, the short-stay total
  and the note. After sending, the card shows the sent confirmation the design draws. We record
  this as a departure from the frame, in favour of the repository's rule; the mocks show it.
- **The browse shelf is cacheable and filters on the client.** The browse home DTO gains a
  `rooms` shelf: the live space count and the union of the four newest spaces overall and the four
  newest of each term. The term filter picks from it without another request, so the shelf stays
  in the directory read cache (ADR 0003). The category page filters on the server with
  `term=`.
- **Photos reuse listing photos.** A space's photos are the listing photos of L2-088, added from
  Edit listing after submitting; onboarding has no photo upload today and does not gain one here.
- **Not in this decision.** Hourly rent (the design's hall "/ hour"), a structured household list,
  calendars and double-booking checks, payment, deposits and leases, reviews and maps. The
  design's sign-up intents ("Find a place", "Rent out a space") are left out: the app's sign-up
  has no intent step to add them to, and nothing reads an intent yet.

## Consequences

- One migration adds the `Space_*` columns to `Listings` and `ListingDrafts` and the space request
  columns to `Requests`. SQLite and InMemory take the schema from the model.
- Code that switched on two listing kinds or three request kinds must handle the new value; the
  compiler finds the switch expressions, and the words come from `SpaceTerms`.
- An address leak would be a privacy breach (L1-020), so the API tests assert its absence from
  every public endpoint, for a visitor, another member and the verification team, and its
  presence only for the accepted renter.
- The design's inline dates become a dialog; if the rule against inline forms is relaxed later,
  the dialog's fields can move into the card without changing the API.
