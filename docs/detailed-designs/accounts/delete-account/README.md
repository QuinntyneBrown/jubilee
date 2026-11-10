# Delete account

## Overview

Jubilee is Toronto's Christian marketplace. A *member* is a signed-in account
holder who can save businesses, message them and send them requests; an *owner*
is a member who also owns a business listing. This feature lets a member
permanently delete the account from the account page at `/account`.

Deletion is consequential and cannot be undone, so it is guarded by a
confirmation dialog. The dialog names the account and states the consequences
with live counts: how many conversations are deleted and how many open requests
are cancelled. An *open request* is a booking, quote or order request in status
`new` or `confirmed`. The member confirms by typing the word DELETE in capital
letters.

Deletion happens in two stages. The first stage is immediate: the account is
closed, every session ends, open requests are cancelled and their businesses are
told, an owned listing is unpublished and removed from browse and search, and a
confirmation e-mail is sent. The second stage is *erasure* — permanent removal
of the account's personal data from primary storage — which runs 30 days after
deletion; backups no longer hold the data within 35 days of deletion. Messages
the member sent stay visible to the business, attributed to "Former member".

## Description

The feature is a vertical slice from a dialog in `Jubilee Web` through
`Jubilee API` to the `Jubilee database`, with follow-up work in
`Jubilee Worker`. Nothing is built yet; the names below are the names the design
introduces.

- **`AccountPage`** — Angular page at `/account`. Its "Delete account" section
  carries the action "Delete my account", which opens the dialog.
- **`DeleteAccountDialog`** — Angular dialog titled "Delete your account?". It
  shows the member's name and e-mail, the lines "Your profile, saved list and
  {n} conversations are deleted. Your {n} open requests are cancelled and the
  businesses are told. This can't be undone.", the field "Type DELETE to
  confirm", and the buttons "Keep my account" and "Delete account". "Keep my
  account" has the initial focus (L2-129). A value other than exactly `DELETE`
  shows "Type DELETE in capital letters to confirm." and sends nothing. A failed
  submission shows "We couldn't delete your account. Nothing was removed. Try
  again, or write to help@jubilee.example." and keeps the typed confirmation
  (L2-128).
- **`AccountApi`** — typed Angular HTTP client. `getDeletionImpact()` calls
  `GET /api/account/deletion-impact`; `deleteAccount(confirmation)` calls
  `POST /api/account/deletion`.
- **`SessionService`** — Angular service. After a successful deletion it clears
  the signed-in state, navigates to `/welcome`, and asks `ToastService` for the
  confirmation toast.
- **`AccountController`** — ASP.NET Core controller in `Jubilee.Api`. Both
  endpoints act on the member of the current session only.
- **`GetDeletionImpactQuery`** and its handler — count the member's
  conversations and open requests and return a `DeletionImpactDto` for the
  dialog copy.
- **`DeleteAccountCommand`** and **`DeleteAccountCommandValidator`** — carry the
  typed confirmation. The validator repeats the browser rule: any value other
  than exactly `DELETE` returns HTTP `422` with code `CONFIRMATION_MISMATCH`.
- **`DeleteAccountCommandHandler`** — MediatR handler. In one unit of work it
  calls `Member.Delete(now)`, cancels each open `Request`, calls
  `Listing.Unpublish()` on each listing the member owns, removes the member's
  saved list and conversation access, writes an `AuditEntry` (L2-180), and
  writes outbox messages for the business notifications, the search-index
  removal and the confirmation e-mail. After the commit it ends every session of
  the member through `ISessionStore.EndAll()`. Any failure rolls the whole unit
  of work back, so nothing is removed.
- **`Member`** — domain entity. `Delete(now)` sets `Status` to `Deleted`,
  records `DeletedAt` and sets `EraseAfter` to 30 days later. A deleted member
  cannot sign in. `Erase()` clears every personal field and sets `Status` to
  `Erased`.
- **`Request`** — domain entity. `CancelForAccountDeletion()` moves a `new` or
  `confirmed` request to `cancelled` and records the transition; the business
  is notified through the outbox.
- **`Listing`** — domain entity. `Unpublish()` takes the listing out of every
  public list in the same transaction; the outbox message removes it from the
  `Search index`.
- **`AccountErasureJob`** — hosted job in `Jubilee.Worker` that runs daily. It
  loads each `Member` whose `EraseAfter` has passed, calls `Erase()`, deletes
  the remaining personal rows, and keeps sent `Message` rows with the sender
  shown as "Former member". The job is idempotent and logs counts only.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee.Worker` that delivers the
  business notifications, the search-index removal and the confirmation e-mail.

The backup rotation that removes the data from backups within 35 days of
deletion is `<TO SUPPLY>`. The copy of the confirmation toast shown on
`/welcome` is `<TO SUPPLY>`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-017` | `L1-002` | The system shall let a member permanently delete their account after typing DELETE. |
| `L2-129` | `L1-018` | An action that deletes data or notifies another person shall be confirmed in a dialog that states the consequence with real counts and names, with the safe choice as the default focused button. The dialog for an irreversible action shall say "This can't be undone." |
| `L2-128` | `L1-018` | A failed dialog submission shall show an error alert at the top of the dialog that says what did not happen, and shall keep everything typed. |
| `L2-180` | `L1-025` | The system shall store an append-only audit record of actor, action, target, time, before and after values, and reason for each sensitive action, including account deletions. |
| `L2-143` | `L1-019` | The system shall log each account deletion with time, actor, IP and outcome. |

## Diagrams

### System context

A member deletes the account in Jubilee. Jubilee tells the owners of the
cancelled requests and sends the confirmation e-mail through the
`E-mail provider`.

![C4 system context for deleting an account](diagrams/c4-context.png)

### Containers

`Jubilee API` closes the account in the `Jubilee database` and ends sessions in
the `Cache`. `Jubilee Worker` dispatches the notifications, removes the listing
from the `Search index`, and later erases the personal data.

![C4 container view for deleting an account](diagrams/c4-container.png)

### Components

`DeleteAccountDialog` calls `AccountApi`. `AccountController` dispatches the
impact query and the delete command; the handler changes `Member`, `Request` and
`Listing` together. `AccountErasureJob` and `OutboxDispatcherJob` complete the
work in `Jubilee Worker`.

![C4 component view for deleting an account](diagrams/c4-component.png)

### Class structure

`DeleteAccountCommandHandler` mutates `Member`, its open `Request` rows and its
`Listing` rows, and writes an `AuditEntry`. `MemberStatus` records the two
stages `Deleted` and `Erased`.

![Class diagram for deleting an account](diagrams/class-structure.png)

### Behaviour — delete the account

The dialog loads live counts, checks the typed confirmation, and submits. The
handler commits every change in one unit of work; a failure removes nothing and
the dialog keeps the typed confirmation.

![Sequence diagram for deleting the account](diagrams/sequence-delete-account.png)

### Behaviour — erase personal data after 30 days

`AccountErasureJob` runs daily, erases each account deleted 30 days earlier, and
leaves the member's sent messages attributed to "Former member".

![Sequence diagram for erasing personal data](diagrams/sequence-erase-personal-data.png)
