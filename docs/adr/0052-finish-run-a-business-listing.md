# 0052. Finish running a business listing

Status: accepted. The re-check e-mail and notice are superseded by ADR 0057, 12 November 2026: Jubilee ships without verification; a listing goes live when its owner publishes it, there is no Verified mark, and the verification team is the Jubilee team (`moderator` role).

## Context

Journey 15 (an owner monitors the listing, edits its details, and pauses or resumes it) was
recorded at 90%. ADR 0023 deferred five things to later journeys: the weekly change of "Saved by
members" (the saved list of journey 19 has landed since), the notice of a re-check (the e-mail
outbox and the in-app notifications of journey 17 have landed since), drag to reorder photos, the
photos on the public listing page with `srcset`, and nothing proved that a pause reaches every
public read within the 60 seconds of `L2-028` AC2 and `L2-096` AC2. `L2-079` AC1 also asks for a
switcher between an owner's businesses, which no journey had built: the workspace always showed the
live listing, or the oldest.

## Decision

- **The weekly change of "Saved by members" counts first saves.** `MyBusinessStatsDto.Saved` is a
  `StatDto`: `Value` is the number of different members who hold the business or one of its
  products on their saved list, and `Change` is how many of them saved the first of those in the
  last 7 days (`SavedItem.SavedAt`). A removed save leaves no row, so a fall cannot be told from the
  data and is not shown: the change is zero or more, worded "↑ {n} this week" or "None new this
  week" (`L2-085` AC6). Keeping a history of removed saves only to draw a falling arrow would keep
  data about members that nothing else needs.
- **The owner's choice of business is kept on the server, on the listing.**
  `PUT /api/my-business/current` with `{ "listingId": … }` stamps `Listing.WorkspaceChosenAt`.
  `Workspace.Find`, which every owner endpoint already goes through, returns the owner's listing
  chosen last; with no choice it returns what it did before (the live listing, else the oldest).
  `IncomingRules.Owned` uses the same rule. The overview (`MyBusinessDto`) gains `Businesses`: each
  of the owner's listings with its stage and each draft not yet submitted. Naming a listing the
  caller does not own is 403 `FORBIDDEN` and changes nothing. The choice was not put in the URL or
  in a header of every request: that would add a parameter to some twenty endpoints and to every
  page of the workspace, for an owner who, in nearly every case, has one business. A consequence
  is accepted: with the workspace open in two tabs, a switch in one is followed by the other on its
  next request. The listing form guards the case that matters: `PUT /api/my-business/listing` may
  carry the `listingId` the editor opened, and a save that names another listing than the one being
  worked on is refused with 409 `LISTING_CHANGED`, the same answer as a stale version.
- **The switcher is a native select with a link, on the overview only.** `MyBusinessPage` shows a
  native `select` with `jb-select`, labelled "Business", when the owner has more than one entry, and "List another
  business" (`/list?draft=new`) for every owner with a listing. A draft in the select opens
  `/list?draft={id}`. A native select works by touch and by keyboard with nothing to build, so no
  new component and no menu was added; `jb-select` gains the `fit` input (`select--fit`), which
  sizes the select to its longest option so that it sits beside the link. The other workspace pages follow the choice without showing
  the select; their header names the business.
- **A re-check tells the owner and the team by e-mail.** When `Listing.Edit` reports a changed name
  or category on a live listing, `SaveListingCommandHandler` (besides the stamp and the audit record
  of ADR 0023) writes the owner an in-app notification and an e-mail "We’ll re-check {Business}",
  and e-mails the team at `Verification:TeamEmail`, or at `Launch:TeamEmail` when the first is not
  set, with the old and the new name and category and the address of the listing in the admin
  application (`StaffSignIn:PublicBaseUrl`). Both e-mails are outbox messages saved with the change, so
  they are sent once or the change is not saved. The e-mail to the owner is a service message about
  their own listing, like the e-mail of an approval, and is not subject to the notification
  settings. With neither address set nobody is e-mailed; the audit record remains. The admin
  application gains no "re-check" list and no way to mark a re-check done: the two-business-day
  promise is the team's, and the stamp `RecheckRequestedAt` stays until that screen exists.
- **Photos are reordered by drag with the CDK, and the move buttons stay.** `EditListingPage` puts
  `cdkDropList` (mixed orientation, because the photos wrap) on the list and `cdkDrag` on each
  photo, with a handle (`cdkDragHandle`) so that a touch elsewhere on the photo still scrolls the
  page. A drop sends the same `PUT /api/my-business/photos/{id}/position` the buttons send; a drop
  in the same place sends nothing. The handle is a pointer affordance only (`aria-hidden`, out of
  the tab order): the keyboard equivalent is "Move photo {n} earlier" and "Move photo {n} later",
  which were already there. A move the API refuses puts the photos back in the order they had and
  says so. The CDK is the platform's drag and drop (ADR 0035); no component or stylesheet was
  added.
- **Public photos are a `picture` with `srcset`, drawn by `jb-media-tile`.** `ListingPageDto` gains
  `Photos` (`ListingPagePhotoDto`: key, alt, width, height), in the owner's order; `CoverPhoto`
  stays null and is no longer read. `jb-media-tile` takes `photoKey` and `photoWidth`: it renders a
  WebP `source` and a JPEG `img`, each with the three renditions at their true widths (a rendition
  is never wider than the original, so a 500 pixel photo offers 320w and 500w), a `sizes` hint,
  explicit `width` and `height`, and `fetchpriority="high"` or `loading="lazy"` as its `priority`
  input says. The listing page shows the cover in place of the tinted tile and the other photos
  under "Photos"; the editor's own thumbnails use the same input. The listing page is read through
  the directory cache, so `DirectoryCacheInvalidationInterceptor` now also clears it when a
  `ListingPhoto` is added, moved or removed: a photo is public on the next request. The business card in lists still
  shows the tile: `BusinessCardDto` is part of the 60-second directory cache and of every recorded
  list, and the card's photo belongs with the CDN work of `L2-155` AC3.
- **The pause bound is proved where it was not.** `DirectoryCacheTests` already proved the welcome
  page, the browse home and the category lists. `PauseBoundTests` proves `L2-096` AC2 and AC3 and
  `L2-028` AC2 across every public read, through the owner's own endpoints: after
  `POST /api/my-business/pause` the next request of the welcome page, the browse home, the category
  list and its count, search and the related businesses on a neighbour's page no longer holds the
  listing, and its own address is 404 to others while the owner still opens it;
  `POST /api/my-business/resume` brings all of it back on the next request. A pause the API is not
  told of (written behind the application) is gone from the same reads once 60 seconds have
  passed, and no public answer may be kept by a browser or a CDN for longer than 60 seconds
  (`Cache-Control`), search not at all. The tests fail when `IDirectoryReadCache.TimeToLive` or
  `PublicDirectoryCacheAttribute.MaxAgeSeconds` is lengthened. No production code changed.

- **Three faults of the overview found while aligning the designs are corrected.** The API quoted
  `JB-BUS-503` for My business where `L2-118`, the mock and the page say `JB-BIZ-503`; the banner of
  a listing just approved said "in the directory" for every category but Shops, where `L2-086` AC4
  names the category (`MyBusinessDto.CategoryName`); and the requested changes were headed "Changes
  needed" without their number and without the date (`L2-086` AC3).

## Consequences

- ADR 0023's deferrals of "Saved by members", the re-check notice, drag to reorder and the photos on
  the public page are closed. Its deferral of the photo on the business card stands.
- The table `Listings` gains `WorkspaceChosenAt` (migration `AddWorkspaceChoice`, `jubilee migrate`).
- Production needs no new setting: the team's re-check e-mail goes to `Launch:TeamEmail` until
  `Verification:TeamEmail` is set.
- The recorded API answers gain `photos` on every listing page and `businesses` and the new shape of
  `saved` on the overview, so the recording was refreshed in the same change.
- A later journey of the admin application can list the listings whose `RecheckRequestedAt` is set
  and clear it.
