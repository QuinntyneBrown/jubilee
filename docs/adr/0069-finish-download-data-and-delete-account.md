# 0069. Finish download data and delete account

## Status

Accepted, 13 November 2026. Amends ADR 0034, whose deferrals of object storage for archives,
the removal from backups, the reporter name at erasure and the search-index removal this record
settles. Keeps ADR 0057 (no verification), ADR 0064 (the on-call contact), ADR 0065 (sessions
with device and network) and ADR 0068 (signing out clears the device).

## Context

Journey 26 lets a member download their data and delete their account (`L2-017`, `L2-018`).
ADR 0034 built both and deferred the rest. An audit of 12 November 2026 listed what was left: no
dead-letter alert after an export fails 5 times (`L2-182` AC2); nothing said how a deleted
account leaves the backups (`L2-017` AC6); a deleted member's listings not removed from search
through the outbox; the delete dialog's lost-connection copy untested (`L2-128` AC2); no
security-log test for a deletion (`L2-143` AC1); archives kept in a database column, not in a
store; and the data-export e-mail's unsubscribe wording.

Checked against the code, one of these is not work: search has no index to remove a listing from.
It reads the listings themselves (`L2-182`, ADR 0011), so a listing deleted with its owner's
account leaves search in the same transaction. The outbox removal is not built; a test now
proves the listing leaves search at once (`L2-017` AC4).

The journeys built since ADR 0034 store more about a member: sessions with their device and
network (journey 20), statement-of-faith agreements (journey 10), back-in-stock alerts, product
and listing photos in the media store (journeys 6 and 16), reviews (ADR 0066) and the offline
copies on the device (journey 24). The archive and the erasure did not all cover them.

## Decision

### A restore re-applies recorded deletions

- **Every deletion is written to a deletion ledger outside the database** (`IDeletionLedger`).
  An entry holds the account's id and the time of deletion, nothing else. The file-backed
  ledger (`FileDeletionLedger`) appends one JSON line per deletion to `Deletions:LedgerPath`, a
  file on the app's persistent storage, which a database restore does not touch. The API writes
  the entry once the deletion is committed; a deletion whose entry could not be written is
  logged, and the worker writes it on its next pass.
- **The worker re-applies the ledger** (`DeletionLedgerReplay`, run by `AccountErasureJob` when
  the worker starts and every hour, before the erasure). A ledger entry whose account the
  database holds and does not show as deleted is deleted again with its original time:
  sessions end, the password and Google link go, open requests are cancelled without telling
  the businesses again (they were told the first time), listings are unpublished, and the
  saved list, searches, notifications, link tokens, drafts, alerts, feedback and reviews go, as
  for a deletion. An audit record `account.deletion-reapplied` is written. The erasure then
  follows 30 days after the original deletion, at once when that is past. A deleted account the
  ledger is missing is written to it in the same pass, so the ledger stays complete.
- **Backups are kept 35 days or less.** Azure SQL keeps its point-in-time restore backups 7 days
  on the Basic tier, and no long-term retention is configured; the owner keeps it so
  (`eng/azure/README.md`). With erasure at 30 days and the ledger re-applied after any restore,
  no backup holds a deleted account's data later than 35 days after deletion. The backup
  schedule is the owner's; the re-application is code and is tested.

### Archives live in the export store

- **`IExportStore` keeps the archives**, outside the database. `FileExportStore` writes each
  archive under a random 32-hex-character key in `Exports:Root`, a private folder of the app's
  persistent storage that is neither the media folder nor served by any address; only the
  download endpoint reads it. Azure encrypts that storage at rest (AES-256, managed keys). The
  `DataExport.ArchiveJson` column is replaced by `ArchiveKey`; the archive is deleted from the
  store when the link expires, when the account is deleted and at erasure. A blob-storage store
  can replace the file store behind the same contract; tests use the file store in a temporary
  folder.

### A failed export is noticed

- **A build that fails is tried again with back-off**: 1, 2, 4 and 8 minutes after each failure
  (`DataExport.NextAttemptAt`), 5 attempts in all.
- **The export that still fails is its dead letter.** It is marked `Failed`, logged as
  "Dead letter: DataExport {id}", and the on-call contact of ADR 0064 (`Security:OnCallEmail`,
  else the Jubilee team) is e-mailed "Job alert: a data export failed" with the export's id and
  the number of attempts and no personal data.
- **The member is told on the account page.** While the latest export is failed, the "Your data"
  card says "We couldn’t prepare your data" with "Something went wrong while we put your file
  together, and the Jubilee team has been told. Ask again, or write to help@jubilee.example."
  (mock `pages/account/data-build-failed`), and "Download my data" asks again.

### The archive and the erasure cover what Jubilee stores now

- **The archive adds** the sessions (device, network, started, last active, ended), the
  statement-of-faith agreements and the back-in-stock alerts, next to the feedback and reviews
  already there. A photo of a message, listing or product is counted, not copied.
- **The deletion also removes** the member's listing drafts and back-in-stock alerts, and the
  archives in the export store.
- **The erasure also removes** the member's sessions (their device and network), their
  statement-of-faith agreements, the phone and delivery address of their requests, their name on
  the listing reports they sent ("Former member"), and the photos of their listings and
  products from the media store. A photo the member sent in a message stays with the message for
  the business, as the words do.

### Deletion is logged and clears the device

- **The security log records each deletion** (`L2-143` AC1): "Security event: AccountDeletion
  succeeded for member {id} from {address}", and "refused" when the typed word was not DELETE.
- **Deleting the account clears the device** like signing out (ADR 0068): the saved pages, the
  outgoing queue and, because the account is gone, the member's drafts.
- **The delete dialog tells a dropped connection apart** (`L2-128` AC2): "Your connection
  dropped before it reached us. Nothing was sent and what you typed is still here. Try again."
  (mock `dialogs/delete-account/offline`).

### The two e-mails carry no unsubscribe

- "Your Jubilee data is ready to download" and "Your Jubilee account was deleted" answer the
  member's own action and belong to no category of the notification settings. They are sent
  whatever the settings say and carry no unsubscribe link. `L2-068` AC3 now says "every
  notification e-mail" and AC6 lists them among the transactional e-mails.

## Consequences

- A deleted account stays deleted after a restore, and its erasure keeps its date.
- The ledger is a file that must live on persistent storage: `deploy.sh` sets
  `Deletions__LedgerPath` and `Exports__Root` under `/home/data`. Its entries hold ids only.
- On-call hears of an export that could not be built, and the member is not left waiting.
- Owner steps: keep the database's backup retention at 35 days or less with no long-term
  retention; a blob container for archives, should the file store be replaced.
- Deferred, as before: the retention schedule of data unrelated to account deletion
  (`L2-148` beyond this journey).
