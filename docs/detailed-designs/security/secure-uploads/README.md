# Secure uploads

## Overview

Jubilee is Toronto's Christian marketplace. Owners upload listing photos, and
members and owners attach photos to messages. A file from an untrusted person
can be oversized, can be something other than the image it claims to be, can
carry malware, or can carry hidden data such as the location where a photo was
taken. This feature defines the path an uploaded photo takes before any browser
can fetch it.

The design uses five terms. *magic bytes* — first bytes of a file that identify
its real format, independent of its name and declared content type.
*re-encoding* — decoding an image to pixels and writing a new file from those
pixels, which discards everything that is not image data. *rendition* — one
stored size and format of a photo. *media store* — place outside the web root
and the database where the bytes of a photo are kept under a random name.
*signed link* — address, valid for `5 minutes`, that grants read access to one
message photo.

The path has one rule: a file that fails any check is rejected, is not stored
and is never served. The bytes of an upload are never published as they came;
only the checked image is, under a random name. The `Jubilee API` accepts JPEG
and PNG only, up to `5 MB` and 8,000 pixels.

Two paths are built, and they share the media store. A message photo is
checked, scanned for malware and then stored, and is reached only through a
signed link (ADR 0014, ADR 0039, ADR 0050). A listing photo is checked,
re-encoded into renditions and stored, and is served publicly under its random
name (journey 15). Listing photos are not scanned yet. Product photos have no
upload yet. The cookieless media domain is not registered yet. These three are
open and are named below.

## Description

The slice runs from the Angular upload control to the media store.

- **Device check** — the app checks a photo before it is sent, for feedback
  only; the server repeats every check. For a message, `jb-attach-photo` and
  `PhotoAttachmentService` read the first bytes, shrink a photo over `5 MB` on a
  canvas, and refuse anything else with "Photo couldn't be attached. Use a JPG
  or PNG under 5 MB." (ADR 0039). For a listing, `EditListingPage` shows the
  server's reason under the Photos area.
- **`MessagesApi`** and **`MyBusinessApi`** — service contracts of the `api`
  library. `MessagesApi.attach` posts one file as multipart form data to
  `POST /api/conversations/{id}/attachments`. `MyBusinessApi.addPhoto` posts one
  file to `POST /api/my-business/photos`. Both are state-changing requests and
  carry the anti-CSRF header that `CsrfMiddleware` checks (L2-135).
- **`ConversationsController.Attach`** and **`MyBusinessController.AddPhoto`** —
  the two upload routes. Each requires a signed-in member, caps the request body
  at `6 MB` (`[RequestSizeLimit]`: `5 MB` plus the multipart overhead) so a
  larger body is cut off, and sends its command through MediatR. `Attach`
  carries `[RequiresConfirmedEmail]` and is open to the participants of the
  conversation only (`404` for anyone else); `AddPhoto` changes only the
  caller's own listing (L2-133).
- **`UploadAttachmentCommandHandler`** — MediatR handler for a message photo.
  It runs the check, the malware scan and the store in that order, and stops at
  the first failure. Scanning before storing, in the request, makes the rule
  true in the simplest way: nothing is stored unscanned, so there is no
  quarantine area, no status on the stored photo and no background job
  (ADR 0050). It then stores a `MessageAttachment` row with the `Key` and the
  `ContentType`. Uploads are limited to 30 in 10 minutes per member (`429`).
- **`ImageSanitizer`** — the check of a message photo
  (`Jubilee.Application/Messaging/ImageSanitizer.cs`). `Sanitize` refuses more
  than `5 MB` (`MaxBytes`), reads the leading bytes and accepts only the JPEG
  signature (`FF D8`) and the PNG signature (`89 50 4E 47 0D 0A 1A 0A`). The
  declared content type and the file name are ignored. It reads the width and
  the height from the image header and refuses more than 8,000 pixels on either
  side (`MaxWidth`, `MaxHeight`). It then
  writes the image again without anything that is not picture data: EXIF, XMP,
  ICC and comment segments of a JPEG; text and time chunks of a PNG. It answers
  a `SanitizedImage` with the `ContentType`, the bytes and an `ImageProblem`
  (`None`, `NotAnImage`, `TooLarge`). It adds no imaging library (ADR 0014).
- **`IMalwareScanner`** — application service
  (`Jubilee.Application/Abstractions/Media.cs`) with
  `Scan(byte[] content, CancellationToken)`. It answers a `ScanVerdict`:
  `Clean`, `Infected` or `Unavailable`. Only a clean photo is stored.
- **`ClamAvMalwareScanner`** — implementation in `Jubilee.Infrastructure/Media`,
  chosen by `Malware:Scanner` set to `clamav`. It sends the bytes to a `clamd`
  daemon with `INSTREAM` over TCP (`Malware:ClamAv:Host`, `Port` `3310`,
  `TimeoutSeconds` `10`). ClamAV is free, runs on Jubilee's own network and
  needs no package: the protocol is a length prefix and one line of answer. No
  answer in time is `Unavailable`.
- **`NoMalwareScanner`** and **`UnavailableMalwareScanner`** — the other two
  implementations. `NoMalwareScanner` (`Malware:Scanner` set to `none`) passes
  every photo; it is for a development machine and the e2e API only, and the
  API logs a warning when it starts with it. `UnavailableMalwareScanner` is used
  when nothing is configured: every verdict is `Unavailable`. The path fails
  closed, so a production deployment without `clamd` accepts no message photos.
- **`AddPhotoCommandHandler`** — MediatR handler for a listing photo. It refuses
  a seventh photo (`409`, code `TOO_MANY_PHOTOS`), has `IImageProcessor` check
  and re-encode the upload, saves every rendition through `IMediaStore` under
  one random key, and stores a `ListingPhoto` row with the key and the
  dimensions. It does not call `IMalwareScanner`.
- **`IImageProcessor`** — application service implemented by
  `SkiaImageProcessor` (SkiaSharp). `Process` refuses more than `5 MB`, accepts
  only the JPEG signature (`FF D8 FF`) and the PNG signature, and refuses more
  than 8,000 pixels on either side before the pixels are decoded. It decodes the
  image and encodes it again at `320`, `640` and `1280` pixels wide in WebP and
  JPEG, which drops every piece of metadata, GPS included. It answers a
  `ProcessedImage` of `Rendition` items. A failure throws
  `InvalidPhotoException`.
- **`IMediaStore`** — application service with `Save(key, width, format, data)`,
  `Read(key, width, format)` and `Delete(key)`. `FileMediaStore` keeps the files
  in one folder outside the web root (`Media:Root`), one sub-folder per key. The
  key is 128 random bits written as 32 hexadecimal characters; it holds nothing
  of the file's own name, and a key that is not hexadecimal is refused, so it
  cannot climb out of the folder. A listing photo is saved once per rendition. A
  message photo is saved once, as width `0` in its own format, `jpeg` or `png`.
  The backend tests use `InMemoryMediaStore` (ADR 0009).
- **Rejections** — a refused upload is answered with ProblemDetails and a
  `code`, and nothing is stored. A message photo: `422` with `INVALID_IMAGE` or
  `TOO_LARGE` (`InvalidImageException`), `422` with `FAILED_SCAN` for an
  infected photo, and `503` with `SCAN_UNAVAILABLE` when the scan cannot be
  done. A listing photo: `422` with `NOT_AN_IMAGE`, `TOO_LARGE` or
  `TOO_BIG_IN_PIXELS` (`InvalidPhotoException`).
- **Serving a message photo** — `AttachmentsController` answers
  `/api/attachments/{id}?expires=…&sig=…`. `GetAttachmentQueryHandler` checks the
  HMAC-SHA256 signature and the expiry through `IAttachmentLinks`, then reads
  the bytes with `IMediaStore.Read(key, 0, format)`. The response carries the
  stored `Content-Type`, `X-Content-Type-Options: nosniff` and
  `Cache-Control: private, no-store`. The link is given to the participants of
  the conversation only and is renewed through
  `GET /api/conversations/{id}/attachments/{attachmentId}`. A row stored before
  ADR 0050 has no key and is read from its nullable `Content` column; no new row
  writes it.
- **Serving a listing photo** — `MediaController` answers
  `/media/{key}/{width}.{jpg|webp}` to anyone. It accepts a key of 32
  hexadecimal characters and the widths `320`, `640` and `1280` only, fixes
  `Content-Type` to `image/jpeg` or `image/webp`, and sends
  `X-Content-Type-Options: nosniff` and
  `Cache-Control: public, max-age=31536000, immutable`, because the name is
  random and never reused.
- **Open: listing photos are not scanned** — `AddPhotoCommandHandler` does not
  give a listing photo to `IMalwareScanner`. The seam is there; the change
  belongs to journeys 15 and 16 (ADR 0050). Until then the scan of L2-138 holds
  for message photos only.
- **Open: media domain and object storage** — L2-138 asks for object storage
  and a separate cookieless domain. Today the store is the API's persistent
  folder, and both kinds of photo are delivered by the API on the application's
  own origin. Moving to Azure Blob Storage and registering the media domain are
  owner steps (ADR 0050, `eng/azure/README.md`).
- **Open: orphans** — a message photo that is uploaded and never put in a
  message stays in the media store. Removing it is retention work (L2-148) and
  is not built.
- **Tests** — `MessagingTests` uploads a PNG with text chunks, a JPEG with an
  EXIF segment, a file that is not an image under an image's name, a photo over
  `5 MB` and one over 8,000 pixels wide, and asserts each outcome, with the
  signed link's expiry and forgery (`L2_060_…`, `L2_138_AC1_…`). No test runs a
  real scanner or a real store (ADR 0009).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-138` | `L1-019` | The server shall check each upload's content type by its magic bytes, accept only JPEG and PNG up to 5 MB and 8,000 × 8,000 pixels, re-encode the image and strip metadata. Uploads shall be kept in object storage outside the web root with random names, scanned for malware, and served from a separate cookieless domain with `Content-Type` fixed and `X-Content-Type-Options: nosniff`; a file that fails any check shall be rejected and never served. A message photo that passed the checks shall be given to the malware scanner before it is stored: an infected photo shall be refused with 422 `FAILED_SCAN`, and with no scanner configured or no answer in time the photo shall be refused with 503 `SCAN_UNAVAILABLE`; in both cases nothing shall be stored. Only a development machine and the e2e API shall run without a scanner. The bytes of a message photo shall be kept by the media store, outside the web root and the database, under a random name of 128 bits, and reached only through the signed link. |
| `L2-060` | `L1-009` | A photo shall be scanned for malware before it is stored, and only a stored photo shall be put in a message or opened: the other participant shall never receive a photo that was not scanned. A stored attachment shall be retrievable only by the conversation's participants through signed URLs valid for 5 minutes. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API endpoint before doing anything. |
| `L2-135` | `L1-019` | The system shall reject a state-changing request without a valid anti-CSRF token bound to the session with 403. |

## Diagrams

### System context

Owners upload listing photos and members and owners upload message photos to
Jubilee. Jubilee has each message photo scanned by the malware scanner, and
visitors later fetch listing photos.

![C4 system context for securing uploads](diagrams/c4-context.png)

### Containers

`Jubilee Web` posts the file to the `Jubilee API`, which has a message photo
scanned by `clamd`, writes the bytes to the `Media store` and records a row in
the `Jubilee database`. Browsers fetch every photo through the API: a listing
photo by its random name, a message photo by its signed link.

![C4 container view for securing uploads](diagrams/c4-container.png)

### Components

`UploadAttachmentCommandHandler` calls `ImageSanitizer`, `IMalwareScanner` and
`IMediaStore` in order. `AddPhotoCommandHandler` calls `IImageProcessor` and
`IMediaStore`, without the scanner. `AttachmentsController` and
`MediaController` read from the same store.

![C4 component view for securing uploads](diagrams/c4-component.png)

### Class structure

`UploadAttachmentCommandHandler` produces a `MessageAttachment` only after a
`ScanVerdict` of `Clean`. `AddPhotoCommandHandler` produces a `ListingPhoto`
from the `ProcessedImage` of `IImageProcessor`. Both name their bytes in
`IMediaStore` by a random key.

![Class diagram for securing uploads](diagrams/class-structure.png)

### Behaviour — upload a message photo

The handler checks magic bytes, size and width and removes metadata, has the
result scanned, and stores it only when every step passes. A failed check or an
infected photo is refused with `422`, and a scan that cannot be done with
`503`; in each case nothing is stored.

![Sequence diagram for uploading a message photo](diagrams/sequence-upload-photo.png)

### Behaviour — serve a photo

A message photo is served to the holder of a fresh signed link, with `nosniff`
and `private, no-store`. A listing photo is served by its random name with a
fixed `Content-Type`, `nosniff` and a long cache life.

![Sequence diagram for serving a photo](diagrams/sequence-serve-photo.png)
