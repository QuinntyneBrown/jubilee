# Edit a listing

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses. A *listing* is the public page of one business. The
*owner* manages it in the owner workspace under `/my-business`. This feature
covers the "Listing" tab at `/my-business/listing`, where the owner edits the
details and the photos of a listing.

There is no draft step for a live listing: changes publish when the owner saves.
The page says so ("Changes are published when you save") and shows a *live
preview* — card that renders the listing as members see it while the owner
types. A change to the business name or the category is also live at once, and
the verification team is notified to re-check it within two business days.

A listing carries up to 6 photos. The first photo is the *cover* — photo shown on
the business card and at the top of the listing page. The server verifies each
upload by its content, strips its metadata, and produces resized renditions.

Two owners, or one owner in two tabs, can open the editor at once. *Optimistic
concurrency* — refusal of a save that is based on an older version of the record
— prevents the second save from overwriting the first.

## Description

The feature is a vertical slice from the editor page in `Jubilee Web` to the
`Jubilee database` and `Media storage`.

- **`EditListingPage`** — Angular page at `/my-business/listing`. It shows
  Photos, "Business name", "One line on what you do" with a "{n} / 90" counter,
  "About", "Category", "Where", "Hours", "Website" (optional), "Highlight"
  (optional), "Discard changes" and "Save listing". Input stops at 1,500
  characters in "About" and at 30 characters in "Highlight". On success it shows
  "Listing updated. Your changes are live now." with "View public listing". On a
  load failure it shows "We couldn't load your listing" with `JB-LST-503` and
  "Back to overview".
- **`ListingPhotosEditor`** — Angular component for the Photos area. It shows
  "Up to 6 photos, JPG or PNG, 5 MB each. The first is your cover.", labels the
  first photo "Cover", reorders by drag and by move up and move down buttons, and
  takes alt text of at most 125 characters per photo.
- **`ListingPreviewCard`** — live preview built on the shared `BusinessCard`.
- **`ErrorSummary`** — shared component that shows "Fix {n} things to continue"
  with a link to each invalid field and receives focus (`L2-126`).
- **`ListingsApi`** — typed Angular HTTP client for
  `GET` and `PUT /api/owner/listings/{listingId}`,
  `POST /api/owner/listings/{listingId}/photos`,
  `PUT /api/owner/listings/{listingId}/photos/order`, and `PATCH` and `DELETE`
  on `/api/owner/listings/{listingId}/photos/{photoId}`.
- **`OwnerListingController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies `ListingOwnerPolicy` (HTTP `403` for a member who does
  not own the listing) and sends the commands through MediatR. The `PUT` reads
  the version from the `If-Match` header.
- **`UpdateListingCommand`** and **`UpdateListingCommandValidator`** — the edit
  request and its FluentValidation rules. Failures return `422` with per-field
  codes: `TAGLINE_TOO_LONG` ("Shorten this to 90 characters. It has {n}."),
  `HOURS_REQUIRED` ("Enter your hours, or “By appointment”."),
  `WEBSITE_INVALID` ("Enter a web address starting with https://" for a value
  that is not an `https://` or `http://` URL), `ABOUT_TOO_LONG` and
  `HIGHLIGHT_TOO_LONG`. The command type holds only editable fields, so a body
  that names `stage`, `verified` or `ownerId` is rejected with `400`.
- **`UpdateListingCommandHandler`** — loads the listing, calls
  `Listing.UpdateDetails`, and saves in one unit of work. EF Core compares
  `Listing.RowVersion` with the submitted version; a mismatch returns `409` with
  code `LISTING_CHANGED`, and the page shows "This listing changed since you
  opened it. Reload to see the latest." The handler writes a `ListingUpdated`
  outbox message for search indexing and, when the name or category changed on a
  live listing, a `ListingRecheckRequested` message.
- **`Listing`** — domain entity. `UpdateDetails` reports whether the name or
  category changed; `AddPhoto` refuses a seventh photo; `ReorderPhotos` makes
  the new first photo the cover.
- **`AddListingPhotoCommandHandler`** — handles an upload. `ImageInspector`
  checks the magic bytes, the 5 MB limit and the 8,000 × 8,000 pixel limit of
  `L2-138`. Refusals return `422` with `PHOTO_LIMIT_REACHED`, `PHOTO_TOO_LARGE`
  or `PHOTO_NOT_IMAGE`; the message text for each rule is `<TO SUPPLY>`. An
  accepted file is stored through `IMediaStore` under a random name with status
  `Processing`.
- **`ListingPhoto`** — entity with `SortOrder`, `AltText`, `Status` and the
  stored renditions. With no alt text entered, the alt text defaults to
  "{business} photo {n}".
- **`PhotoProcessingJob`** — hosted job in `Jubilee.Worker`. It submits the
  original to the `Malware scanner`, re-encodes the image, strips metadata
  including GPS EXIF, and writes renditions 320, 640 and 1280 px wide in WebP and
  JPEG. A photo becomes `Ready` only after every step succeeds; a failed file is
  marked `Rejected` and is never served.
- **`OutboxDispatcher`** — delivers `ListingUpdated` to `ISearchIndex` and
  `ListingRecheckRequested` to `INotificationPublisher` for the verification
  team.

A listing with no photos shows the category's tinted media tile on public pages;
the public page features render that tile.

### Spaces

For a space, the screen shows Photos, "Listing title", the line, "About" and
the space fields of `L2-198` with their stored values, the exact address
included, and not "Category", "Hours" or "Website". `GET
/api/my-business/listing` returns `ListingEditorDto` with `Space`
(`SpaceDraftDto`, with the address, for the owner only), and `PUT
/api/my-business/listing` takes `space` (`SpaceInput` on `SaveListingCommand`),
validated by `Drafts.ValidateSpace`; hours are not required for a space. A save
that moves a space out of "Rooms & rentals", or a business into it, is refused
with HTTP 422 and `category` `CATEGORY_LOCKED`. A change of
term is live immediately in the space's cards and page. Photos follow
`L2-088`; onboarding has none, so they are added here (ADR 0041; see
[Describe a space](../../onboarding/describe-space/README.md)).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-087` | `L1-013` | The system shall let the owner edit the live listing at `/my-business/listing`, and changes shall publish when saved. A change to the business name or category shall notify the verification team to re-check it within two business days, and a save over a newer version shall be refused. |
| `L2-088` | `L1-013` | The system shall accept up to 6 listing photos in JPG or PNG of at most 5 MB each, checked by content, with the first photo as the cover. Stored photos shall have metadata stripped, renditions at 320, 640 and 1280 px wide in WebP and JPEG, and alt text of at most 125 characters that defaults to "{business} photo {n}". |
| `L2-126` | `L1-018` | A page form submitted with errors shall show the summary "Fix {n} thing(s) to continue" with a link to each field, shall keep typed values, and the server shall enforce each browser rule with the same message code. |
| `L2-127` | `L1-018` | While a form submits, its fields shall be read-only, the primary button shall show a spinner with `aria-busy="true"`, and a second press shall send nothing. |
| `L2-133` | `L1-019` | The server shall check ownership of the listing before doing anything, shall return 403 to an owner API call for a listing the caller does not own, and shall reject an update that includes fields the caller may not set. |
| `L2-138` | `L1-019` | The server shall check each upload by its magic bytes, accept only JPEG and PNG up to 5 MB and 8,000 × 8,000 pixels, re-encode the image, strip metadata, scan it for malware and serve it from a separate cookieless domain. |
| `L2-208` | `L1-028` | `/my-business/listing` for a space shall show the space fields with their stored values and not "Category", "Hours" or "Website", validate them as on `/list`, and publish a change of term to the cards and page. |
| `L2-207` | `L1-028` | The exact address shall reach only the member whose space request is `confirmed` or `completed`, and the owner shall see and change it on Edit listing. |

## Diagrams

### System context

The owner edits the listing through Jubilee. Jubilee scans each uploaded photo
with the external `Malware scanner` and notifies a `Verification team member`
when the name or category changes.

![C4 system context for editing a listing](diagrams/c4-context.png)

### Containers

`Jubilee Web` sends edits and uploads to the `Jubilee API`. The API writes the
`Jubilee database` and `Media storage`; the `Jubilee Worker` processes photos
and dispatches the outbox to the `Search index`.

![C4 container view for editing a listing](diagrams/c4-container.png)

### Components

The page and the photos editor share `ListingsApi`. In the API, one controller
dispatches the detail and photo commands; in the worker, `PhotoProcessingJob`
and `OutboxDispatcher` complete the side effects.

![C4 component view for editing a listing](diagrams/c4-component.png)

### Class structure

`Listing` owns its `ListingPhoto` collection and the `RowVersion` used for
optimistic concurrency. `UpdateListingCommandValidator` holds the field rules.

![Class diagram for editing a listing](diagrams/class-structure.png)

### Behaviour — save listing changes

The validator returns `422` for invalid fields, the unit of work returns `409`
for a stale version, and a valid save commits the change with its outbox
messages so that it is live at once.

![Sequence diagram for saving listing changes](diagrams/sequence-save-listing.png)

### Behaviour — upload a photo

The API refuses a seventh photo, an oversized file and a file that is not a real
JPG or PNG. An accepted file is processed by `PhotoProcessingJob` before it is
served.

![Sequence diagram for uploading a listing photo](diagrams/sequence-upload-photo.png)
