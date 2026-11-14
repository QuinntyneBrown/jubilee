# Describe a non-profit

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses. A *listing* is the record of one business on
Jubilee, and onboarding at `/list` is the form where a member describes a
listing and publishes it (`onboarding/describe-listing`,
`onboarding/publish-listing`).

This feature adds a fifth answer to "What do you offer?": "A non-profit". A
*non-profit* is a listing for a Christian ministry, charity or other
organisation at work in Toronto that sells nothing to the people it serves.
Every non-profit sits in the category "Non-profits" (`non-profits`) and its
kind is `nonprofit`. The slice covers choosing "A non-profit", the non-profit
fields and their validation, the "How members see it" preview, saving the
non-profit as a draft, and publishing it.

The slice uses the following local terms.

- **leader**: what the copy calls the owner of a non-profit, whether they
  lead it or represent it; the role is the owner of L1
- **website**: the non-profit's own website; an absolute `https` address,
  required
- **page for giving**: the non-profit's own page where people give to it, on
  its own website or the giving service it chose; an absolute `https`
  address, optional, and when given the target of the page's main action
  (`listings/view-nonprofit`)
- **mission**: what work the non-profit does and why, in its own words, 600
  characters at most
- **who it serves**: the people the non-profit serves, 300 characters at most
- **where it works**: where in Toronto it works, 120 characters at most

A non-profit has no services, no products, no store address, no area served,
no hours and no meeting hours. It keeps every other onboarding rule: when its
leader publishes it, it is live at once and public within 60 seconds
(`L2-078`); nobody checks it first (ADR 0057), and no screen calls it
verified, approved, registered, vetted or endorsed. Nothing asks for a charity
registration number, a tax receipt or a donation amount, and none is stored
(`L2-285` AC5).

## Description

The feature extends the onboarding slice from `ListBusinessPage` to the
`Jubilee database`. The model is fixed by
[ADR 0074](../../../adr/0074-non-profits.md) and follows the platform
(`onboarding/describe-platform`).

- **`ListBusinessPage`**: Angular page at `/list` (`pages/list-business/`).
  "What do you offer?" gains a fifth `jb-choice-card` "A non-profit" ("A
  ministry or charity at work in Toronto.") after "Products", "Services", "A
  space" and "A software platform"; the five are one radio group, chosen with
  the arrow keys (`L2-286` AC1, AC5). Choosing it, or opening
  `/list?kind=nonprofit`, sets the heading to "List a non-profit" with "For
  someone who leads or represents it." under it, relabels "Business name" as
  "Non-profit name" (hint "The name people know it by.") and "One line on
  what you do" as "One line on what it does" (its hint and its 90 characters
  stay), hides "Category", the products, the services, the store address and
  the area served, keeps "Highlight", and shows the non-profit fields. Every
  value typed so far is kept when the member switches between the five cards
  (`L2-286` AC2). The `categories` the page offers a business leave out
  `non-profits` as they leave out `software-platforms`.
- **`NonprofitForm`** (`jubilee/src/app/services/nonprofit-form.ts`): holds
  the five non-profit fields as signals beside the page's own, with their
  limits, the checks, the body sent to the API and the preview's view model.
  The listing editor uses the same class for a non-profit
  (`owner-workspace/edit-listing`), so both screens check with the same rules
  and the same messages. It mirrors `PlatformForm`.
- **Non-profit fields** (`L2-287` AC1, AC2): composed from library
  components, after the name and the line, with no new presentation in the
  page:
  - "Website": `jb-input` of type `url`, required, held to 200 characters,
    with the hint "Its own website. It starts with https://."
  - "Its mission": `jb-textarea`, required, held to 600 characters, with the
    hint "In its own words. What work does it do, and why?" and the live
    counter "{n} / 600".
  - "Who it serves": `jb-input`, required, held to 300 characters, with the
    hint "Like “Young people aged 12 to 18 in Scarborough”." and the counter
    "{n} / 300".
  - "Where in Toronto it works": `jb-input`, required, held to 120
    characters, with the hint "Like “Regent Park and Moss Park” or “Across
    Toronto”." and the counter "{n} / 120".
  - "Page for giving": `jb-input` of type `url`, optional, held to 200
    characters, with the hint "Its own page where people give, if it has
    one. It starts with https://."
  - The notes "Gifts go straight to the non-profit, on its own website.
    Jubilee takes no gift and no payment." and "Add photos from My business
    once you publish. The first photo is your cover."
- **Preview** (`L2-286` AC3): the region headed "How members see it". It
  renders the business card (`jb-business-card`, `L2-027`) from the form's
  values with the "Non-profits" tile and the label "Non-profit" and the mark
  "Not published yet", and redraws without a server call (`L2-076`). The card
  shows no address and no rating.
- **Browser checks**: on "Publish listing", `NonprofitForm` applies the rules
  of the server and shows each message in the form summary and under its
  field (`L2-126`, `L2-287` AC3 to AC6):
  - an empty name: "Enter the name people know it by." (summary "Enter the
    non-profit’s name");
  - an empty line: "Say in one line what it does." (summary "Say in one line
    what it does");
  - an empty website: "Enter the non-profit’s website." (summary "Enter its
    website");
  - a website or a page for giving that is not an absolute `https://`
    address with a dotted host, that names a user or a password, or that is
    longer than 200 characters: "Enter a web address starting with https://"
    (summary "Enter its website" or "Check the page for giving");
  - an empty page for giving: accepted;
  - an empty "Its mission": "Say what work it does, in its own words."
    (summary "Say what work it does");
  - an empty "Who it serves": "Say who it serves." (summary "Say who it
    serves");
  - an empty "Where in Toronto it works": "Say where in Toronto it works."
    (summary "Say where in Toronto it works").
- **`ListingDraftsApi`**: typed HTTP client for the existing endpoints: `POST
  /api/listing-drafts` and `PUT /api/listing-drafts/{id}` save, `GET
  /api/listing-drafts/current` resumes and `POST
  /api/listing-drafts/{id}/publish` publishes. For a non-profit the body
  carries `kind` `nonprofit` and a nested `nonprofit` object with `website`,
  `mission`, `serves`, `area` and `giveUrl`. No `categorySlug` is needed. The
  models in `frontend/projects/api/src/lib/models/listing-drafts.ts` gain
  `NonprofitDraft` and the `'nonprofit'` value of `OfferKind`.
- **`ListingDraftsController`**: unchanged routes; it passes the `nonprofit`
  object through as `DraftInput.Nonprofit` (`NonprofitInput(Website, Mission,
  Serves, Area, GiveUrl)`).
- **`Drafts.KindOf`** and **`ListingDraftDto.Wire`**: read and write the kind
  `nonprofit`.
- **`SaveListingDraftCommandHandler`**: stores the non-profit fields on the
  draft without validation (`L2-287` AC9, `L2-077`): `ListingDraft.Nonprofit`
  holds the mission, who it serves, where it works and the page for giving,
  and `ListingDraft.Website` holds the website, each as typed and cut to its
  limit. A draft of another kind keeps `Nonprofit` null.
- **`GetCurrentDraftQueryHandler`**: returns `ListingDraftDto` with `kind`
  `nonprofit` and `nonprofit` (`NonprofitDraftDto`: `website`, `mission`,
  `serves`, `area`, `giveUrl`), so the page restores "A non-profit" and every
  field (`L2-286` AC4). A draft is read and published only by the member who
  started it (`L2-297` AC2).
- **`PublishListingCommandHandler`**: for a non-profit it checks the name and
  the line as for any listing (`L2-072`), validates the fields with
  `Drafts.ValidateNonprofit`, and checks the agreement (`agreed`
  `REQUIRED`), which is the checkbox of `L2-075` word for word; nothing else
  is asked of the leader (`L2-288` AC1). On a failure it keeps what was typed
  in the draft and answers HTTP 422 (`L2-287` AC7). Otherwise it creates the
  `Listing` in `Category.NonprofitsSlug`, whatever category the body names,
  with `Kind` `Nonprofit`; assigns the owner and the owner name; sets the
  highlight; calls `Listing.DescribeNonprofit` with the `NonprofitDetails`
  and the website; adds no service and no product; and follows `L2-078`:
  `Listing.Publish` makes the listing live. The flags of `L2-072` are raised
  from the name and the line only, so neither address raises one (`L2-287`
  AC8). `NewBusinessNotifier` tells the members who follow "Non-profits". The
  success page reads "{Non-profit name} is live. Members can find it in
  Non-profits now." with "View public listing" and "Go to My business"
  (`L2-288` AC2).
- **`Drafts.ValidateNonprofit`**: static rules in
  `Jubilee.Application/Onboarding/Onboarding.cs`, beside
  `Drafts.ValidatePlatform`. They write field errors with the keys and codes
  below, returned as HTTP 422 with `errors` (`L2-287` AC7):
  - `nonprofit.website` `REQUIRED` (empty) or `INVALID` (refused by
    `WebAddressRules.IsWebAddress`);
  - `nonprofit.giveUrl` `INVALID` (given and refused by
    `WebAddressRules.IsWebAddress`); an empty one is accepted;
  - `nonprofit.mission` `REQUIRED`, `nonprofit.serves` `REQUIRED` and
    `nonprofit.area` `REQUIRED`.
- **`WebAddressRules`** (`Jubilee.Domain`): the web-address rule ADR 0072 set
  for a platform, moved out of `PlatformRules` so the two kinds share it
  (ADR 0074, `security/validate-input`). `IsWebAddress(string)` accepts an
  absolute `https` address with a host name that has a dot, no user or
  password, and at most `MaxWebsiteLength` (200) characters. It refuses
  `http://hopehouse.example`, `hopehouse.example`, `javascript:alert(1)` and
  `https://me:secret@hopehouse.example/give` (`L2-287` AC4). `Host(string)`
  answers the host name without `www.`. Neither requests the address: the
  server never fetches a non-profit's website or page for giving when it is
  saved or published (`L2-292` AC4). `PlatformRules.IsWebAddress`,
  `PlatformRules.Host` and `PlatformRules.MaxWebsiteLength` forward to it.
- **`NonprofitDetails`** (`Jubilee.Domain`): owned record on `ListingDraft`
  and `Listing` with `Mission`, `Serves`, `Area` and `GiveUrl` (nullable),
  and the limits `MaxMissionLength` (600), `MaxServesLength` (300),
  `MaxAreaLength` (120) and `MaxGiveUrlLength` (200). `Create` trims each
  value and cuts it to its limit, not refused (`L2-287` AC2); an empty
  `GiveUrl` is stored as null. EF maps it with `OwnsOne(...).ToJson("Nonprofit")`
  into one nullable JSON column `Nonprofit` on each table, as `SpaceDetails`
  and `PlatformDetails` are mapped. Every other listing leaves it null.
- **`Listing.DescribeNonprofit(NonprofitDetails, string? website)`**: refuses
  a listing whose kind is not `Nonprofit`, then sets `Listing.Nonprofit` and
  `Listing.Website`. The website is the existing `Listing.Website`, not a
  second field inside the details; the page for giving lives in the details.
- **`ListingKind.Nonprofit = 4`**: the fifth listing kind. A listing is a
  non-profit exactly when its category is `non-profits`
  (`Category.NonprofitsSlug`, `Category.KindOf`), and its wire value is
  `nonprofit` (`WireValues.Of`) (`L2-285` AC1).
- **`Category.All`**: "Non-profits" (`non-profits`) becomes the thirteenth of
  thirteen, after "Software platforms" (`L2-285` AC2). The "Category" select
  of a business does not offer it.
- **Migration `AddNonprofits`**: one migration in
  `Jubilee.Infrastructure/Migrations` adds the `Nonprofit` JSON column to
  `Listings` and `ListingDrafts`. `jubilee migrate` applies it; the API never
  migrates. SQLite and InMemory take the schema from the model.
- **Limits that already hold** (`L2-288` AC4, `L2-297` AC5): a visitor is
  sent to sign in, an unconfirmed member cannot publish (`L2-005` AC2,
  `L2-071` AC4), and an owner with 5 listings is refused (`L2-079` AC2); a
  non-profit counts among the owner's 5 listings.
- **Tests**: API integration tests on the InMemory provider (ADR 0009) in
  `backend/tests/Jubilee.Api.Tests/` (`NonprofitOnboardingTests`, beside
  `PlatformOnboardingTests`), named for their criterion (`L2_286_AC4_...`,
  `L2_287_AC4_...`, `L2_287_AC7_...`, `L2_288_AC2_...`). The tests of
  `PlatformRules` keep passing through the forwarding. The Playwright
  behaviour spec `e2e/tests/list-a-nonprofit.spec.ts` drives the form through
  the page object `e2e/pages/list-business.page.ts`; `e2e/fixtures/routes.ts`
  gains the non-profit states of the form (default, invalid, busy, success).

The Jubilee team's listing screen shows a non-profit's fields in the panel
"The non-profit" (`L2-295`, `moderation/take-down-listing`). Editing a
non-profit after it is published is `owner-workspace/edit-listing`
(`L2-294`).

### Open questions

The choices below are recorded where the design reference and the rules
differ or leave a gap.

- **No drawing in the design reference**: the Magic Patterns reference draws
  no non-profit. The form is drawn in
  `docs/mocks/pages/list-business/nonprofit*.html` from the form of a
  platform (ADR 0074).
- **No proof of leadership**: Jubilee could not check a proof that the member
  leads or represents the non-profit; the agreement is the checkbox of
  `L2-075` (ADR 0074).
- **No registration number**: not asked, stored or shown (ADR 0074).
- **No check of either address**: Jubilee does not open the website or the
  page for giving to see that it answers. A check would be a claim Jubilee
  cannot stand behind, and a request to an address a member typed is a
  request-forgery risk.
- **A page for giving at another host**: the rule does not require the page
  for giving to share the website's host, because a non-profit may use a
  giving service of its choice (`L2-285`).
- **A business that names "Non-profits"**: publishing a business, a shop or a
  space whose body names `non-profits` is treated as naming no category a
  business may choose and answers `categorySlug` `REQUIRED`, as the platform
  does for `software-platforms`.
- **Summary wording for an invalid website**: `L2-287` AC6 gives "Enter its
  website" as the short form of the website's message; the design uses it for
  both an empty and an invalid website, and "Check the page for giving" for an
  invalid page for giving.
- **Photos**: onboarding has no photo upload; photos are added from Edit
  listing after publishing (`L2-088`).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-285` | `L1-035` | A non-profit shall be in the category "Non-profits", the thirteenth of thirteen, with a name, one line, a website, its mission, who it serves, where in Toronto it works, an optional page for giving, an optional highlight and optional photos, and no services, products, store address, area served or hours; it shall never move category, shall be live from the moment its leader publishes it, shall never be called verified, approved, registered, vetted or endorsed, and nothing shall ask for a charity registration number, a tax receipt or a donation amount. |
| `L2-286` | `L1-035` | `/list` shall offer "A non-profit" as a fifth card, relabel the form for a non-profit on choosing it or on `/list?kind=nonprofit`, keep every value typed, preview the business card under "How members see it" marked "Not published yet", restore a non-profit saved as a draft, and let the fifth card be chosen with the arrow keys. |
| `L2-287` | `L1-035` | The non-profit form shall ask the website, its mission, who it serves, where in Toronto it works and the page for giving with their hints, limits and counters, refuse an empty or non-`https` website, a non-`https` page for giving and an empty field with the stated messages, answer HTTP 422 with `nonprofit.website` `REQUIRED` or `INVALID`, `nonprofit.giveUrl` `INVALID` and `nonprofit.mission`, `nonprofit.serves` and `nonprofit.area` `REQUIRED`, raise no flag for either address, and save a draft without validation. |
| `L2-288` | `L1-035` | A non-profit shall be published with the agreement checkbox of `L2-075` and nothing else, follow `L2-078` so that it is live at once with "{Non-profit name} is live. Members can find it in Non-profits now.", appear in "Non-profits", on the browse home's shelf and in search within 60 seconds, and keep the limits of any listing. |
| `L2-297` | `L1-035` | Every field of a non-profit shall be stored as text; a draft of a non-profit shall be read and published only by the member who started it; a non-profit shall count among the owner's 5 listings. |
| `L2-298` | `L1-035` | The non-profit form shall fit from 360 px, work by keyboard and touch with 44 px targets, follow `L2-126` and `L2-127` when invalid or busy, and use the tokens in both themes. |
| `L2-076` | `L1-011` | The preview shall update within 100 ms as the owner types and shall show the card marked "Not published yet". |
| `L2-077` | `L1-011` | The owner shall be able to save the form as a draft without validation and resume it later. |
| `L2-126` | `L1-018` | A page form submitted with errors shall show the summary "Fix {n} thing(s) to continue", mark each invalid field, keep typed values, and apply the same rules and message codes on the server. |
| `L2-133` | `L1-019` | Each API endpoint shall check the caller's role and ownership of the specific object before doing anything. |
| `L2-136` | `L1-019` | Every input shall be validated on the server and text shall never be rendered as markup. |

## Diagrams

### System context

A member lists a non-profit they lead or represent in Jubilee; the Jubilee
team sees it as any listing. Jubilee never calls the non-profit's website or
page for giving.

![C4 system context for describing a non-profit](diagrams/c4-context.png)

### Containers

`Jubilee Web` renders the non-profit form and preview. `Jubilee API` stores
the draft and the published listing, each with its `Nonprofit` JSON column,
in the `Jubilee database`.

![C4 container view for describing a non-profit](diagrams/c4-container.png)

### Components

`ListBusinessPage` composes the non-profit fields and the preview, and holds
them in `NonprofitForm`. `ListingDraftsController` sends the save and publish
commands, which use `Drafts.ValidateNonprofit` and `WebAddressRules`.

![C4 component view for describing a non-profit](diagrams/c4-component.png)

### Class structure

`ListingDraft` and `Listing` each own an optional `NonprofitDetails` and hold
the website in `Website`. `NonprofitInput` carries the five fields from the
form, and `WebAddressRules`, shared with `PlatformRules`, decides whether an
address is accepted.

![Class diagram for describing a non-profit](diagrams/class-structure.png)

### Behaviour: choose a non-profit, fill it in and save a draft

Choosing "A non-profit" relabels the form and shows the five fields. "Save
draft" stores every non-profit field without validation.

![Sequence diagram for choosing a non-profit and saving a draft](diagrams/sequence-describe-nonprofit.png)

### Behaviour: publish a non-profit

Publishing validates the non-profit fields and the agreement on the server,
answers HTTP 422 with field codes when they fail, and otherwise creates the
listing in "Non-profits" with kind `Nonprofit`, live at once.

![Sequence diagram for publishing a non-profit](diagrams/sequence-publish-nonprofit.png)
