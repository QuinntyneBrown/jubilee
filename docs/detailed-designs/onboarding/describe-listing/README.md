# Describe a listing

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses. A *listing* is the record of one business on Jubilee.
Before a listing is public it passes through onboarding, the form at `/list`
where a member describes the business, names a church reference and submits the
listing for verification. This feature covers the first part of that form: the
choice between products and services, the listing details, the first items, and
the live preview.

The slice uses four local terms.

- **listing kind** — main offer of a business, either `Shop` (products) or `Services`
- **tagline** — one line on what the business does, 90 characters at most, shown under the business name everywhere on Jubilee
- **slug** — unique URL segment generated from the business name, such as `luzandre-com`
- **listing flag** — marker on a listing that draws the verification team's attention on the review screen

A listing on `/list` holds the stage `Draft`. `ListingStage` has ten values:
`Draft`, `WaitingOnReference`, `ReadyToReview`, `NeedsDecision`,
`ChangesRequested`, `Live`, `Paused`, `OnHold`, `Removed` and `Declined`. Nothing entered here is
public until the verification team approves the listing. Naming the church
reference, saving the draft and submitting are separate features of the
`onboarding` subsystem.

## Description

The feature is a vertical slice from the `/list` page to the `Jubilee database`.

- **`ListBusinessPage`** — Angular page at `/list`. It shows "List your
  business", the line "Free for Christian-owned businesses in Toronto. Every
  listing is verified with a church reference.", and "What do you offer?". From
  `1024 px` the preview sits to the right of the form; under `1024 px` it moves
  below the form.
- **`AuthGuard`** — route guard on `/list`. A `Visitor` is sent to sign in or
  join with `returnUrl=/list` and returns to `/list` afterwards. An unconfirmed
  member passes the guard and may fill in the form; "Submit for verification"
  stays disabled with "Confirm your e-mail to submit." (L2-005).
- **`OfferKindPicker`** — the "Products" and "Services" cards with the note
  "Offer both? Pick the main one now and add the other after you're verified."
  "Products" shows "Store address" and the "Products" section. "Services" shows
  "Area you serve" and the "Services" section in their place. Switching keeps
  the value of each other field.
- **`ListingDetailsForm`** — Angular reactive form with "Business name"
  (required), "One line on what you do" (required) and "Category" (one of the
  ten). Input in the name stops at 120 characters. The tagline shows a live
  counter "{n} / 90".
- **`OnboardingItemsSection`** — the "Products" section ("Add a few to start.
  You can add the rest later.") or the "Services" section ("Add a few to start.
  A price is optional; “Ask” is fine."). "Add a product" opens the
  `ProductEditorDialog` (L2-091) and "Add a service" opens the
  `ServiceEditorDialog` (L2-094). A saved product appears with name and price; a
  saved service appears with name, detail and price.
- **`ListingPreviewCard`** — the "How members see you" card. It reuses
  `BusinessCard`, reads the name, tagline, category and highlight signals of the
  `ListingDraftStore`, and redraws within `100 ms` of a keystroke without a
  server call. It carries the mark "Pending verification".
- **`ListingDraftStore`** — signal store holding the draft for the page. The
  form components write to it and the preview reads from it.
- **`ListingsApi`** — typed HTTP client. `POST /api/listings` starts a draft,
  `POST /api/listings/{listingId}/products` and
  `POST /api/listings/{listingId}/services` add items.
- **`ListingsController`** — ASP.NET Core controller. It authenticates the
  session, checks that the caller owns the listing, and sends the commands. A
  member who does not own the listing receives HTTP 403.
- **`StartListingDraftCommandHandler`** — creates a `Listing` in stage `Draft`
  with the chosen `ListingKind` and the caller as owner.
- **`ListingDetailsValidator`** — FluentValidation rules shared by the browser
  form and the server. Code `BUSINESS_NAME_REQUIRED` maps to "Enter your
  business name as customers know it." Code `TAGLINE_TOO_LONG` maps to "Shorten
  this to 90 characters. It has {n}." The rules run in full at submission; a
  draft save skips the required-field rules.
- **`Listing`** — domain entity. `ChangeKind` swaps the kind and keeps the
  details, `Describe` applies the details, and `AssignSlug` sets the slug.
  Items of a listing that is not `Live` are excluded from each public query.
- **`SlugGenerator`** — builds a `ListingSlug` from the business name when the
  listing is submitted and appends a numeric suffix when the slug is taken.
- **`ContentFlagScanner`** — domain service run at submission. A name or
  tagline that contains a URL, an e-mail address, a phone number or a discount
  code is accepted, and a `ListingFlag` is stored for the review screen. The
  matching patterns are fixed in ADR 0018.

A listing with zero products or services may be submitted; the review checklist
then shows "No products or services yet".

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-071` | `L1-011` | `/list` shall start with whether the business mainly offers products or services. The form shall show the sections for the chosen kind and keep the value of each other field when the kind changes. |
| `L2-072` | `L1-011` | The form shall collect a required business name of at most 120 characters, a required tagline of at most 90 characters and one of the ten categories. The system shall generate a unique URL slug from the name at submission and shall flag a name or tagline that contains a URL, e-mail address, phone number or discount code. |
| `L2-073` | `L1-011` | The owner may add products or services during onboarding through the product editor and the service editor. Submission shall be allowed with zero items, and items shall not be public while the listing is not live. |
| `L2-076` | `L1-011` | "How members see you" shall update within 100 ms as the owner types and shall show the card marked "Pending verification". The preview shall sit to the right of the form from 1024 px and below it under 1024 px. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member shall be able to browse, search and save but shall not message, book, request or list a business. |
| `L2-126` | `L1-018` | A page form submitted with errors shall show the summary "Fix {n} thing(s) to continue", mark each invalid field, keep typed values, and apply the same rules and message codes on the server. |
| `L2-133` | `L1-019` | Each API endpoint shall check the caller's role and ownership of the specific object before doing anything. |

## Diagrams

### System context

A visitor who opens `/list` is asked to sign in or join, optionally through
`Google Identity`. A member describes the business in Jubilee.

![C4 system context for describing a listing](diagrams/c4-context.png)

### Containers

`Jubilee Web` renders the form and the preview. `Jubilee API` stores the draft
and its items in the `Jubilee database` and reads the session and the category
list from the `Cache`.

![C4 container view for describing a listing](diagrams/c4-container.png)

### Components

The form components write to the `ListingDraftStore` and the
`ListingPreviewCard` reads from it. `ListingsApi` calls `ListingsController`,
which sends `StartListingDraftCommand` to its handler.

![C4 component view for describing a listing](diagrams/c4-component.png)

### Class structure

`Listing` holds a `ListingKind`, a `ListingStage`, an optional `ListingSlug`,
its flags and its items. `ListingDetailsValidator`, `SlugGenerator` and
`ContentFlagScanner` work on the details.

![Class diagram for describing a listing](diagrams/class-structure.png)

### Behaviour — choose what to offer and describe the business

`AuthGuard` returns a visitor to `/list` after sign-in. Choosing a kind starts
the draft, and each keystroke updates the preview from the store within
`100 ms`.

![Sequence diagram for choosing what to offer and describing the business](diagrams/sequence-describe.png)

### Behaviour — add a product or service during onboarding

The editor dialog saves the item against the draft after the ownership check.
The item stays private while the listing is not live.

![Sequence diagram for adding a product or service during onboarding](diagrams/sequence-add-item.png)
