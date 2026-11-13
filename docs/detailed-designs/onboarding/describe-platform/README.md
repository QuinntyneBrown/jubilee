# Describe a platform

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses. A *listing* is the record of one business on
Jubilee, and onboarding at `/list` is the form where a member describes a
listing and publishes it (`onboarding/describe-listing`,
`onboarding/publish-listing`).

This feature adds a fourth answer to "What do you offer?": "A software
platform". A *software platform* (a *platform* for short) is a listing for a
product people use online: a web app or an online tool, with no shop, no area
served and no opening hours. Every platform sits in the category "Software
platforms" (`software-platforms`) and its kind is `platform`. The slice covers
choosing "A software platform", the platform fields and their validation, the
"How members see it" preview, saving the platform as a draft, and publishing
it.

The slice uses the following local terms.

- **founder**: what the copy calls the owner of a platform; the role is the
  owner of L1
- **web address**: where people use the platform; an absolute `https` address,
  required, and the target of the platform page's main action
  (`listings/view-platform`)
- **what it does**: a few plain lines on what someone can do with the
  platform, 600 characters at most
- **who it is for**: the people the platform was built for, 300 characters at
  most
- **pricing**: how the platform is priced, in the founder's own words, 120
  characters at most; free text, because Jubilee takes no payment and compares
  no prices

A platform has no services, no products, no store address, no area served, no
hours and no meeting hours. It keeps every other onboarding rule: when its
founder publishes it, it is live at once and public within 60 seconds
(`L2-078`); nobody verifies it first (ADR 0057), and no screen calls it
verified, approved or vetted.

## Description

The feature extends the onboarding slice from `ListBusinessPage` to the
`Jubilee database`. The model is fixed by
[ADR 0071](../../../adr/0071-software-platforms.md) and follows the space
(`onboarding/describe-space`).

- **`ListBusinessPage`**: Angular page at `/list` (`pages/list-business/`).
  "What do you offer?" gains a fourth `jb-choice-card` "A software platform"
  ("An app or tool people use online.") beside "Products", "Services" and "A
  space"; the four are one radio group, chosen with the arrow keys. Choosing
  it, or opening `/list?kind=platform`, sets the heading to "List a software
  platform", relabels "Business name" as "Platform name" (hint "The name
  people know it by.") and "One line on what you do" as "One line on what it
  does" (its hint and its 90 characters stay), hides "Category", the products,
  the services, the store address and the area served, keeps "Highlight", and
  shows the platform fields. Every value typed so far is kept when the member
  switches between the four cards.
- **`PlatformForm`** (`jubilee/src/app/services/platform-form.ts`): holds the
  four platform fields as signals beside the page's own, with their limits,
  the checks, the body sent to the API and the preview's view model. The
  listing editor uses the same class for a platform
  (`owner-workspace/edit-listing`), so both screens check with the same rules
  and the same messages. It mirrors `SpaceForm`.
- **Platform fields**: composed from library components, after the name and
  the line, with no new presentation in the page:
  - "Web address": `jb-input` of type `url`, required, held to 200
    characters, with the hint "Where people use it. It starts with https://."
  - "What it does": `jb-textarea`, required, held to 600 characters, with the
    hint "A few plain lines. What can someone do with it?" and the live
    counter "{n} / 600".
  - "Who it is for": `jb-input`, required, held to 300 characters, with the
    hint "Like “Families with children aged 4 to 12”." and the counter "{n} /
    300".
  - "Pricing": `jb-input`, required, held to 120 characters, with the hint
    "In your own words, like “Free for families. Schools pay per classroom.”"
    and the counter "{n} / 120".
  - The notes "Members go to your website to use it. Jubilee takes no
    payment." and "Add photos from My business once you publish. The first
    photo is your cover."
- **Preview**: the region headed "How members see it". It renders the
  business card (`jb-business-card`, `L2-027`) from the form's values with the
  "Software platforms" tile and label and the mark "Not published yet", and
  redraws without a server call (`L2-076`). The card shows no web address.
- **Browser checks**: on "Publish listing", `PlatformForm` applies the rules
  of the server and shows each message in the form summary and under its
  field (`L2-126`):
  - an empty web address: "Enter the web address where people use your
    platform.";
  - a web address that is not an absolute `https://` address with a dotted
    host, that names a user or a password, or that is longer than 200
    characters: "Enter a web address starting with https://";
  - an empty "What it does": "Say what your platform does in a few lines.";
  - an empty "Who it is for": "Say who your platform is for.";
  - an empty "Pricing": "Say how it is priced, like “Free” or “$8 a month”."
- **`ListingDraftsApi`**: typed HTTP client for the existing endpoints: `POST
  /api/listing-drafts` and `PUT /api/listing-drafts/{id}` save, `GET
  /api/listing-drafts/current` resumes and `POST
  /api/listing-drafts/{id}/publish` publishes. For a platform the body carries
  `kind` `platform` and a nested `platform` object with `website`, `does`,
  `for` and `pricing`. No `categorySlug` is needed for a platform. The models
  in `frontend/projects/api/src/lib/models/listing-drafts.ts` gain
  `PlatformDraft` and the `'platform'` value of `OfferKind`.
- **`ListingDraftsController`**: unchanged routes; it passes the `platform`
  object through as `DraftInput.Platform` (`PlatformInput(Website, Does, For,
  Pricing)`).
- **`Drafts.KindOf`** and **`ListingDraftDto.Wire`**: read and write the kind
  `platform`.
- **`SaveListingDraftCommandHandler`**: stores the platform fields on the
  draft without validation (`L2-250` AC8, `L2-077`): `ListingDraft.Platform`
  holds what it does, who it is for and the pricing, and the new
  `ListingDraft.Website` holds the web address, each as typed and cut to its
  limit. A draft of another kind keeps both null.
- **`GetCurrentDraftQueryHandler`**: returns `ListingDraftDto` with `kind`
  `platform` and `platform` (`PlatformDraftDto`: `website`, `does`, `for`,
  `pricing`), so the page restores "A software platform" and every field
  (`L2-249` AC4). A draft is read and published only by the member who started
  it (`L2-261` AC2).
- **`PublishListingCommandHandler`**: for a platform it checks the name and
  the line as for any listing, validates the fields with
  `Drafts.ValidatePlatform`, and checks the agreement (`agreed` `REQUIRED`),
  which is the checkbox of `L2-075` word for word. On a failure it keeps what
  was typed in the draft and answers HTTP 422 (`L2-250` AC6). Otherwise it
  creates the `Listing` in `Category.PlatformsSlug`, whatever category the
  body names, with `Kind` `Platform`; assigns the owner and the owner name;
  sets the highlight; calls `Listing.DescribePlatform` with the
  `PlatformDetails` and the web address; adds no service and no product; and
  follows `L2-078`: `Listing.Publish` makes the listing live. The flags of
  `L2-072` are raised from the name and the line only, so the web address
  raises none (`L2-250` AC7). `NewBusinessNotifier` tells the members who
  follow "Software platforms". The success page reads "{Platform name} is
  live. Members can find it in Software platforms now." with "View public
  listing" and "Go to My business".
- **`Drafts.ValidatePlatform`**: static rules in
  `Jubilee.Application/Onboarding/Onboarding.cs`. They write field errors with
  the keys and codes below, returned as HTTP 422 with `errors`.
  - `platform.website` `REQUIRED` (empty) or `INVALID` (refused by
    `PlatformRules.IsWebAddress`).
  - `platform.does` `REQUIRED`, `platform.for` `REQUIRED` and
    `platform.pricing` `REQUIRED`.
- **`PlatformRules`** (`Jubilee.Domain`): `IsWebAddress(string)` accepts an
  absolute `https` address with a host name that has a dot, no user or
  password, and at most 200 characters. It refuses
  `http://lanternread.example`, `lanternread.example`, `javascript:alert(1)`
  and `https://me:secret@lanternread.example`. `Host(string)` answers the host
  name without `www.`. Neither requests the address: the server never fetches
  a platform's website when it is saved or published (`L2-255` AC4).
- **`PlatformDetails`**: owned record on `ListingDraft` and `Listing` with
  `Does`, `For` and `Pricing`, and the limits `MaxDoesLength` (600),
  `MaxForLength` (300) and `MaxPricingLength` (120). A longer value sent to
  the API is trimmed and cut to its limit, not refused. EF maps it with
  `OwnsOne(...).ToJson("Platform")` into one nullable JSON column `Platform`
  on each table, as `SpaceDetails` is mapped. A business, a shop and a space
  have none.
- **`Listing.DescribePlatform`**: refuses a listing whose kind is not
  `Platform`, then sets `Listing.Platform` and `Listing.Website`. The web
  address is the existing `Listing.Website`, not a second field inside the
  details.
- **`ListingKind.Platform`**: the fourth listing kind. A listing is a platform
  exactly when its category is `software-platforms`
  (`Category.PlatformsSlug`, `Category.KindOf`), and its wire value is
  `platform` (`WireValues.Of`).
- **`Category.All`**: "Software platforms" (`software-platforms`) becomes the
  twelfth of twelve, after Community (`L2-248` AC2). The "Category" select of
  a business does not offer it.
- **Migration `AddSoftwarePlatforms`**: one migration in
  `Jubilee.Infrastructure/Migrations` adds the `Platform` JSON column to
  `Listings` and `ListingDrafts`, `Website` to `ListingDrafts` and
  `StatedUseAt` to `Reviews` (`reviews/review-a-platform`). `jubilee migrate`
  applies it; the API never migrates. SQLite and InMemory take the schema from
  the model.
- **Limits that already hold** (`L2-251` AC4): a visitor is sent to sign in,
  an unconfirmed member cannot publish (`L2-005` AC2, `L2-071` AC4), and an
  owner with 5 listings is refused (`L2-079` AC2), as for any listing.
- **Tests**: API integration tests on the InMemory provider (ADR 0009) in
  `backend/tests/Jubilee.Api.Tests/` (`PlatformOnboardingTests`, beside
  `SpaceOnboardingTests`), named for their criterion (`L2_249_AC4_...`,
  `L2_250_AC4_...`, `L2_251_AC2_...`). The Playwright behaviour spec
  `e2e/tests/list-a-platform.spec.ts` drives the form through the page object
  `e2e/pages/list-business.page.ts`; `e2e/fixtures/routes.ts` gains the
  platform states of the form (default, invalid, busy, success).

The Jubilee team's listing screen shows a platform's fields in its preview
(`L2-257`, `moderation/take-down-listing`). Editing a platform after it is
published is `owner-workspace/edit-listing` (`L2-256`).

### Open questions

The choices below are recorded where the design reference and the rules
differ or leave a gap.

- **No drawing in the design reference**: the Magic Patterns reference draws
  no platform. The form is drawn in
  `docs/mocks/pages/list-business/platform*.html` from the form of a business
  (ADR 0071).
- **Pricing**: free text on purpose. A table of plans is deferred (ADR 0071).
- **`https` only**: a platform's web address is stricter than a business's
  optional website (`L2-087` AC3), because it is the page's main action.
- **No check of the website**: Jubilee does not open the address to see that
  it answers. A check would be a claim Jubilee cannot stand behind, and a
  request to an address an owner typed is a request-forgery risk (ADR 0071).
- **Setting the web address at publishing**: `Listing.Website` is set today
  only by `Listing.Edit`. `Listing.DescribePlatform` therefore takes the web
  address with the details, so that publishing and editing set both in one
  place and a platform never has details without an address.
- **A business that names "Software platforms"**: `L2-248` AC1 says a listing
  in another category is never a platform and a business never moves into
  this one. Publishing a business, a shop or a space whose body names
  `software-platforms` is treated as naming no category a business may
  choose, and answers `categorySlug` `REQUIRED`.
- **Photos**: onboarding has no photo upload; photos are added from Edit
  listing after publishing (`L2-088`).
- **A founder's proof**: verifying that a founder is Christian or in Toronto
  is deferred (ADR 0071); the agreement is the checkbox of `L2-075`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-248` | `L1-033` | A platform shall be in the category "Software platforms", the twelfth of twelve, with a name, one line, a web address, what it does, who it is for, its pricing, an optional highlight and optional photos, and no services, products, store address, area served or hours; it shall be live from the moment its founder publishes it and shall never be called verified, approved or vetted. |
| `L2-249` | `L1-033` | `/list` shall offer "A software platform" as a fourth card, relabel the form for a platform on choosing it or on `/list?kind=platform`, keep every value typed, preview the business card under "How members see it" marked "Not published yet", and restore a platform saved as a draft. |
| `L2-250` | `L1-033` | The platform form shall ask the web address, what it does, who it is for and the pricing with their hints, limits and counters, refuse an empty or non-`https` web address and an empty field with the stated messages, answer HTTP 422 with `platform.website` `REQUIRED` or `INVALID` and `platform.does`, `platform.for` and `platform.pricing` `REQUIRED`, raise no flag for the web address, and save a draft without validation. |
| `L2-251` | `L1-033` | A platform shall be published with the agreement checkbox of `L2-075`, follow `L2-078` so that it is live at once with "{Platform name} is live. Members can find it in Software platforms now.", appear in "Software platforms", on the browse home and in search within 60 seconds, and keep the limits of any listing. |
| `L2-261` | `L1-033` | Every field of a platform shall be stored as text; a draft of a platform shall be read and published only by the member who started it. |
| `L2-262` | `L1-033` | The platform form shall fit from 360 px, work by keyboard and touch with the fourth card chosen by the arrow keys, follow `L2-126` and `L2-127` when invalid or busy, and use the tokens in both themes. |
| `L2-076` | `L1-011` | The preview shall update within 100 ms as the owner types and shall show the card marked "Not published yet". |
| `L2-077` | `L1-011` | The owner shall be able to save the form as a draft without validation and resume it later. |
| `L2-126` | `L1-018` | A page form submitted with errors shall show the summary "Fix {n} thing(s) to continue", mark each invalid field, keep typed values, and apply the same rules and message codes on the server. |
| `L2-133` | `L1-019` | Each API endpoint shall check the caller's role and ownership of the specific object before doing anything. |
| `L2-136` | `L1-019` | Every input shall be validated on the server and text shall never be rendered as markup. |

## Diagrams

### System context

A member lists a platform they founded in Jubilee; the Jubilee team takes it
from there as for any listing. Jubilee never calls the platform's website.

![C4 system context for describing a platform](diagrams/c4-context.png)

### Containers

`Jubilee Web` renders the platform form and preview. `Jubilee API` stores the
draft and the published listing, each with its `Platform` JSON column, in the
`Jubilee database`.

![C4 container view for describing a platform](diagrams/c4-container.png)

### Components

`ListBusinessPage` composes the platform fields and the preview, and holds
them in `PlatformForm`. `ListingDraftsController` sends the save and publish
commands, which use `Drafts.ValidatePlatform` and `PlatformRules`.

![C4 component view for describing a platform](diagrams/c4-component.png)

### Class structure

`ListingDraft` and `Listing` each own an optional `PlatformDetails` and hold
the web address in `Website`. `PlatformInput` carries the four fields from the
form, and `PlatformRules` decides whether the address is accepted.

![Class diagram for describing a platform](diagrams/class-structure.png)

### Behaviour: choose a platform, fill it in and save a draft

Choosing "A software platform" relabels the form and shows the four fields.
"Save draft" stores every platform field without validation.

![Sequence diagram for choosing a platform and saving a draft](diagrams/sequence-describe-platform.png)

### Behaviour: publish a platform

Publishing validates the platform fields and the agreement on the server,
answers HTTP 422 with field codes when they fail, and otherwise creates the
listing in "Software platforms" with kind `Platform`, live at once.

![Sequence diagram for publishing a platform](diagrams/sequence-publish-platform.png)
