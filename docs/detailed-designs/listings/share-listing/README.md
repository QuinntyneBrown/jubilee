# Share a listing

## Overview

Jubilee is Toronto's Christian marketplace. Members often pass a business on to
a friend or a small group. This feature covers the share action on a listing
page: a dialog that offers the listing's link and four ways to send it, and the
link preview that social and chat apps show when the link arrives.

The share action is available to visitors and members alike. Pressing it opens
the dialog "Share {business}", which shows the canonical link with "Copy",
"E-mail", "WhatsApp", "More…" and "Done". Sharing happens on the person's own
device; Jubilee sends nothing on the person's behalf and stores no record of
who shared a listing.

The feature uses the following local terms.

- **canonical link** — one public address of a listing, of the form `https://{host}/b/{slug}`
- **Web Share API** — browser interface that opens the share sheet of the device
- **link preview** — card with title, description and image that a social or chat app builds from a shared link
- **Open Graph tags** — `<meta>` elements in the head of a page that supply the title, description and image of its link preview

The dialog runs entirely in `Jubilee Web`. The link preview is the only part
with a backend: an app that fetches a link does not run the Angular
application, so the tags are present in the HTML document that the server
returns for `/b/{slug}`.

## Description

- **`ShareListingDialog`** — Angular dialog opened from the share action of
  `BusinessPage`. It is titled "Share {business}", carries the line "Send this
  listing to a friend or your small group.", shows the canonical link in a
  read-only "Link" field, and offers "Copy", "E-mail", "WhatsApp", "More…" and
  "Done". It follows the shared dialog behaviour of `DialogShell`: focus moves
  into the dialog, and on close focus returns to the share action.
- **`ShareLinkBuilder`** — Angular service that builds the three addresses. The
  canonical link is `https://{host}/b/{slug}` with the public host of the
  deployment and no query string. The e-mail address is a `mailto:` URL with
  the link in the body. The WhatsApp address is `https://wa.me/?text=` followed
  by the URL-encoded link. The subject and message text that accompany the link
  are `<TO SUPPLY>`.
- **`ClipboardService`** — wrapper over `navigator.clipboard.writeText`. After
  a successful write the dialog sets the "Copy" button label to "Copied ✓" for
  2 seconds and then restores "Copy".
- **`LiveAnnouncer`** — service that writes to an `aria-live="polite"` region.
  The dialog announces the copy through it, so a screen reader reports the
  change without moving focus.
- **`WebShareService`** — wrapper over `navigator.share`. `isSupported`
  decides whether "More…" is rendered: the button is hidden on a device without
  the Web Share API. `share` passes the business name and the canonical link to
  the native share sheet.
- **`ListingDocumentController`** — ASP.NET Core controller in `Jubilee.Api`
  that answers `GET /b/{slug}` with the HTML document of the Angular
  application. It injects the Open Graph tags into the head for every
  requester and does not inspect the user agent, so a preview fetcher and a
  browser receive the same document. The routing of `/b/{slug}` document
  requests to `Jubilee API` at the hosting edge is `<TO SUPPLY>`.
- **`GetListingPreviewQuery`** and **`GetListingPreviewQueryHandler`** —
  MediatR query and handler. The handler loads the name, tagline, category and
  cover photo of a live listing and returns a `ListingPreview`. It keeps the
  preview in `Cache` for at most 60 seconds. For a listing that is not public
  it returns not found, and the controller answers 404 without listing tags.
- **`ListingPreview`** — result type with `CanonicalUrl`, `Title`,
  `Description` and `ImageUrl`. The title is the business name and the
  description is the tagline; the exact title and description templates are
  `<TO SUPPLY>`. The image is the listing's cover photo in `Media storage`;
  the image for a listing without a cover photo is `<TO SUPPLY>`.
- **`OpenGraphTagBuilder`** — application service that renders `og:title`,
  `og:description`, `og:image`, `og:url` and `og:type` from a `ListingPreview`.
  It HTML-encodes every value, so owner-entered text cannot add markup to the
  document.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-038` | `L1-005` | The share action shall open a dialog "Share {business}" with the listing's canonical link, "Copy", "E-mail", "WhatsApp", "More…" and "Done". "Copy" shall confirm for 2 seconds with a polite announcement, "More…" shall appear only where the Web Share API exists, and the listing page shall provide Open Graph title, description and image. |
| `L2-028` | `L1-003` | A non-public listing opened by its URL shall produce the not-found page with HTTP 404, except for the owner and the verification team. |
| `L2-130` | `L1-018` | A dialog shall take focus when it opens, keep Tab within it, close on Escape or the close button, and return focus to the control that opened it. |

## Diagrams

### System context

A visitor or member shares the canonical link through a social or chat app,
which then fetches the listing URL from Jubilee to build its link preview.

![C4 system context for sharing a listing](diagrams/c4-context.png)

### Containers

The dialog lives in `Jubilee Web`. `Jubilee API` serves the `/b/{slug}`
document with Open Graph tags, and the preview image comes from
`Media storage`.

![C4 container view for sharing a listing](diagrams/c4-container.png)

### Components

`ShareListingDialog` composes four browser-facing services. On the server,
`ListingDocumentController` combines `GetListingPreviewQueryHandler` and
`OpenGraphTagBuilder`.

![C4 component view for sharing a listing](diagrams/c4-component.png)

### Class structure

The dialog depends on `ShareLinkBuilder`, `ClipboardService` and
`WebShareService`. `ListingPreview` is the value that `OpenGraphTagBuilder`
encodes.

![Class diagram for sharing a listing](diagrams/class-structure.png)

### Behaviour — share a listing from the dialog

The dialog builds the canonical link, checks for the Web Share API, and then
performs the chosen action on the device. No request reaches `Jubilee API`.

![Sequence diagram for sharing a listing from the dialog](diagrams/sequence-share-listing.png)

### Behaviour — serve the link preview of a shared listing

A social or chat app requests the shared link. The controller returns the
application document with Open Graph tags for a live listing and a 404 document
without listing tags otherwise.

![Sequence diagram for serving the link preview](diagrams/sequence-link-preview.png)
