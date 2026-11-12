# ADR 0034: Download your data and delete your account

Status: accepted. Amended by ADR 0041, 12 November 2026: the church reference is removed, so the archive has no reference or answer to leave out (L2-146 is retired); the profile section gains the home church address, and erasure removes it with the home church.

## Context

Journey 26 (L2-017, L2-018) lets a member take a copy of their data and delete their account for good. The designs left the label of the download action, the route of the download page, the storage of archives, the request limit, the backup rotation and the toast copy as `<TO SUPPLY>`.

## Decisions

- **The action is "Download my data"** in a "Your data" card on `/account`, above the "Delete account" danger zone. After a request the card says "We're preparing your data" with the member's e-mail address; the button is disabled while a request waits.
- **The link opens `/account/data/:token`,** behind the member guard (a visitor signs in first and returns). The page asks `GET /api/account/data-exports/{token}`, hands the file to the browser as `jubilee-data.json` and replaces the address with `/account/data` so the token does not stay in history.
- **Archives are built by the worker** (`DataExportJob`, every 10 seconds) from `DataArchive`: profile, notification settings, saved list, requests, conversations (without messages hidden from the member), and for an owner their listings, products, services and incoming requests. No section reads the church reference or its answer (L2-146); a test proves a private note and the reference's address never appear.
- **The archive is kept in a private column** (`DataExport.ArchiveJson`) read only by the download endpoint, not in object storage; `IExportStore` is deferred until a bucket exists. It is deleted when the link expires (`DataExportBuilder.ExpireAsync`, hourly).
- **The token is 256 bits and stored as a SHA-256 hash.** The link works for 7 days and may be opened more than once; it opens only for the member who asked (anyone else, an expired or an unknown token is the same 404, logged as a security event). No `LinkToken` row is used: the hash lives on the export.
- **A member may request 3 exports in 24 hours** (429 `DATA_EXPORT_LIMIT` with Retry-After); a request while one waits returns that export. A build that fails is retried every pass and marked `Failed` after 5 attempts (L2-182).
- **Deletion needs exactly `DELETE`.** `DELETE /api/account` with `{confirmation}`; anything else is 422 `CONFIRMATION_MISMATCH`. The dialog loads `GET /api/account/deletion-summary` for the name, e-mail and counts, and checks the word before asking, too.
- **One unit of work deletes:** open requests are cancelled (the businesses are told through the existing request notification and e-mail), the member's listings are unpublished, saved items, recent searches, notifications and link tokens go, export archives are deleted, the password and Google link are cleared (so nothing can sign in), an `account.deleted` audit record is written without personal data, and a confirmation e-mail is queued. The session cookie is signed out, and a cookie of a deleted member is rejected on its next request.
- **Erasure 30 days later** (`AccountErasure`, hourly): the member row keeps its id but its e-mail becomes `deleted-{id}@deleted.invalid` and the name, church, phone, postal code and pronouns are removed; the member's conversations, messages and requests show "Former member" to the business, whose content is kept; consents, password-reset requests and queued e-mails of the member are removed.
- **A deleted account keeps its address for 30 days:** joining with it is refused as taken, and signing in with Google for it is refused.
- **Toast on `/welcome`:** "Your account was deleted" - "We sent you an e-mail to confirm. Your personal data is erased within 30 days."

## Deferred

- Object storage for archives and encryption at rest beyond the database's.
- Removing the data from backups within 35 days (an operations task).
- The retention schedule for data unrelated to account deletion (L2-148 beyond this journey).
- Removing deleted listings from the search index through the outbox (the database index is read live, so they leave search at once).
- The reporter name on listing reports is not yet anonymised at erasure.
