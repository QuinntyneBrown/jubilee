# Download data

## Overview

Jubilee is Toronto's Christian marketplace. Its privacy page states that a
member can download their data. This feature delivers that promise: a member
asks for a download on the account page at `/account`, and within 24 hours
receives an e-mail with a link to an archive.

A *data archive* is a machine-readable JSON file that holds what Jubilee stores
about one member: the profile, the notification settings, the saved list, the
requests the member sent, the conversations, the feedback, the reviews and
review reports, the sessions with their device and network, the
statement-of-faith agreements and the back-in-stock alerts. For an *owner* —
member who owns a business listing — the archive also holds the listings, their
products and services, the requests customers sent to the business and the
reviews of the listings. The profile part includes the home church and the home
church address. A photo is counted, not copied.

The archive is built in the background, not while the member waits. The
*download link* in the e-mail works for 7 days. It opens only for a visitor who
is signed in as the same account that asked for it. After 7 days the link stops
working and the archive is deleted from the *export store*, the private place
outside the database where archives are kept.

## Description

The feature is a vertical slice from the account page in `Jubilee Web` through
`Jubilee API` to a background job in `Jubilee Worker`. The names below are the
names of the code (ADR 0034, ADR 0069).

- **`AccountPage`** — Angular page at `/account`. The "Your data" card carries
  the button "Download my data". After a request it says "We’re preparing your
  data" with the member's e-mail address, and the button is disabled while the
  request waits (mock `pages/account`, state `data-requested`). A request that
  fails says "We couldn’t start your download" (`data-failed`). When the latest
  export could not be built it says "We couldn’t prepare your data" with
  "Something went wrong while we put your file together, and the Jubilee team
  has been told. Ask again, or write to help@jubilee.example."
  (`data-build-failed`), and the button asks again.
- **`DataDownloadPage`** — Angular page at `/account/data/:token`, the page the
  e-mailed link opens, behind `memberGuard`. A visitor signs in first and
  returns to the same link. The page asks for the archive, hands it to the
  browser as `jubilee-data.json` and replaces the address with `/account/data`
  so the token does not stay in history (mock `pages/data-download`).
- **`AccountDataApi`** (`ACCOUNT_DATA_API`) — typed Angular HTTP client.
  `requestDataExport()` calls `POST /api/account/data-exports`,
  `currentDataExport()` calls `GET /api/account/data-exports/current` and
  `downloadDataExport(token)` calls `GET /api/account/data-exports/{token}`.
- **`AccountController`** — ASP.NET Core controller in `Jubilee.Api`. The `POST`
  returns HTTP `202` with the export's status. The `GET` of a token answers the
  archive as `application/json` with `Content-Disposition: attachment`,
  `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- **`RequestDataExportCommand`** and its handler — create a `DataExport` in
  status `Requested` for the member of the session. A member whose export still
  waits gets that export back; a fourth request in 24 hours is refused with HTTP
  `429` `DATA_EXPORT_LIMIT` and `Retry-After`.
- **`GetDataExportStatusQuery`** — the latest export's status for the card:
  `none`, `requested`, `ready`, `expired` or `failed`.
- **`DataExport`** — domain entity that tracks one export: member, status,
  `RequestedAt`, `ReadyAt`, `ExpiresAt`, `Attempts`, `NextAttemptAt`, the
  `TokenHash` of the link and the `ArchiveKey` of the archive in the export
  store. `MarkReady(archiveKey, tokenHash, now)` sets `ExpiresAt` to 7 days
  later; `RecordFailedAttempt(now)` waits 1, 2, 4 and 8 minutes after each
  failure and marks the export `Failed` after 5; `IsDownloadableBy(memberId,
  now)` holds the access rule.
- **`DataExportStatus`** — enumeration `Requested`, `Ready`, `Expired`,
  `Failed`.
- **`DataExportJob`** — hosted job in `Jubilee.Worker`. Every 10 seconds it asks
  `DataExportBuilder` to build the exports that are due, and once an hour to
  expire the old ones.
- **`DataExportBuilder`** — application service. `BuildDueAsync` builds each
  due archive with `DataArchive`, saves it in `IExportStore` under a random key,
  marks the export ready with a 256-bit token whose SHA-256 hash is stored
  (L2-140), and queues the e-mail "Your Jubilee data is ready to download" with
  the link. The e-mail is sent whatever the notification settings say and
  carries no unsubscribe link: it answers the member's own request (L2-068 AC6).
  A build that fails is tried again with back-off; the fifth failure is the
  export's dead letter: it is marked `Failed`, logged as "Dead letter:
  DataExport {id}", and the on-call contact (`SecuritySettings`, ADR 0064) is
  e-mailed "Job alert: a data export failed" with the export's id and the number
  of attempts and no personal data (L2-182 AC2). `ExpireAsync` deletes the
  archive of each export whose link has expired and marks it `Expired`.
- **`DataArchive`** — assembles the JSON document from the member's own rows,
  section by section: `profile`, `notificationSettings`, `savedList`,
  `requests`, `conversations` (without messages hidden from the member, a photo
  marked as such), `feedback`, `reviews`, `reviewReports`, `sessions`,
  `statementAgreements` and `stockAlerts`; for an owner also `listings` (each
  with its address and the number of its photos), `products` (with the number of
  their photos), `services`, `incomingRequests` and `reviewsOfMyListings`.
- **`IExportStore`** — the export store: `Save`, `Read` and `Delete` of an
  archive by key. `FileExportStore` keeps each archive as a file in
  `Exports:Root`, a private folder of the app's persistent storage that no
  address serves; Azure encrypts it at rest. Only the download reads it. A
  blob-storage store can take its place behind the same contract.
- **`DownloadDataExportQuery`** and its handler — hash the presented token, load
  the `DataExport` by its hash, and apply `IsDownloadableBy()`. A token that is
  unknown, expired or issued to a different member than the session returns HTTP
  `404` `DATA_LINK_UNAVAILABLE`, and the attempt is logged as a security event
  (L2-133).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-018` | `L1-002` | The system shall let a member download their data, as stated on the privacy page, keep the archive in the export store for the 7 days the link works, and tell the member when it could not be built. |
| `L2-068` | `L1-010` | A transactional e-mail, such as the data download link, shall be sent whatever the notification settings say and carry no unsubscribe link. |
| `L2-140` | `L1-019` | Each e-mailed link token shall have at least 128 bits of randomness, shall be stored only as a SHA-256 hash, shall have a single purpose, and shall expire as specified (7 days for a data download). |
| `L2-196` | `L1-002` | A member's data download shall contain the home church and the home church address. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on each API endpoint, and shall return 404 and log the attempt when a member requests another member's object. |
| `L2-182` | `L1-025` | Each background job shall be idempotent, and a failed job shall be retried up to 5 times with back-off and then moved to a dead-letter queue that alerts on-call. |

## Diagrams

### System context

A member asks Jubilee for a data archive. Jubilee e-mails the download link
through the `E-mail provider`, and the member opens it while signed in. The
on-call contact hears of an archive that could not be built.

![C4 system context for downloading data](diagrams/c4-context.png)

### Containers

`Jubilee API` records the export in the `Jubilee database`. `Jubilee Worker`
builds the archive, keeps it in the `Export store`, and sends the link.
`Jubilee API` later reads the archive for the signed-in member.

![C4 container view for downloading data](diagrams/c4-container.png)

### Components

`AccountPage` and `DataDownloadPage` call `AccountDataApi`. `AccountController`
sends the request command, the status query and the download query. In
`Jubilee Worker`, `DataExportJob` runs `DataExportBuilder`, which uses
`DataArchive` and `IExportStore`.

![C4 component view for downloading data](diagrams/c4-component.png)

### Class structure

A `DataExport` belongs to one `Member`, is found by the hash of its token and
points to its archive in `IExportStore` by key.

![Class diagram for downloading data](diagrams/class-structure.png)

### Behaviour — request and build the archive

The request returns HTTP `202` at once. `DataExportBuilder` builds the JSON
archive, stores it, and e-mails a link within 24 hours. A build that fails five
times alerts on-call.

![Sequence diagram for requesting and building the archive](diagrams/sequence-request-archive.png)

### Behaviour — open the download link

The link works for 7 days and only for the same signed-in account. Any other
case returns HTTP `404`.

![Sequence diagram for opening the download link](diagrams/sequence-open-download-link.png)
