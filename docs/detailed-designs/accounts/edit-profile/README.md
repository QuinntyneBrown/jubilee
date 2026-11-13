# Edit profile

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses that members message, book and order from. A *member*
is a signed-in account holder. Each member has a *profile* — first name, last
name, phone, postal code, home church, home church address and optional pronouns
kept on the account.
This feature covers two things a member does with that profile: opening the
*account menu* from the top bar, and editing the profile at `/account`.

The account menu is the list of personal links behind the avatar in the top bar.
It shows the member's initials, full name and e-mail, and links to the account
page, requests, saved list, notifications, the business workspace, help and sign
out. The links vary with the member's role: an owner sees "My business" in place
of "List your business". No one, a member of the Jubilee team included, sees a
link to an admin screen; those screens are in the admin application
(`admin/run-admin-application`, `L2-194`).

The account page shows the profile fields with their current values and saves
them as one form. A saved phone number is shared with a business only when the
member sends a request, and each request keeps the phone it was sent with.
Pronouns word the messages Jubilee writes about the member, such as a message
from the Jubilee team; the team sees them beside the owner's name in the admin
application, and they have no other use. The hint on the field reads
"Used in messages we write about you, such as a message from the Jubilee
team."

The home church and the home church address are both optional and independent:
a member may give the name, the address, both or neither (`L2-196`). Both are
shown to no one and are used only for recommendations (`L2-145`).

The e-mail address, password, notification settings, data download and account
deletion that also appear on the account page belong to the features
`change-credentials`, `choose-notification-settings`, `download-data` and
`delete-account`.

## Description

The feature is a vertical slice from the account page in `Jubilee Web` to the
`Jubilee database`. It is built (ADR 0028, ADR 0041, ADR 0065); the names below
are the names the code uses.

- **`AccountMenuDialog`** — CDK dialog opened by the avatar in the top bar,
  composed of `jb-menu`, `jb-menu-list` and `jb-menu-link`. It renders initials,
  full name and e-mail from `SessionService` and the links "Your account",
  "Your requests", "Saved", "Notifications", "List your business" (or "My
  business" for an owner), "Help" and "Sign out", and no link to an admin
  screen whatever the member's role. At a viewport of `640 px` or wider it is
  anchored under the avatar, arrow keys move between items, and Escape closes it
  and returns focus to the avatar. Below `640 px` it is a bottom sheet.
- **`SessionService`** — Angular service that holds the signed-in member from
  `GET /api/session` (name, initials, e-mail, the count of other sessions). The
  account page asks it to resolve again after a profile save, so the menu and
  the page header show the new name.
- **`AccountPage`** — Angular page at `/account`, behind `memberGuard`. It
  shows the member's name and "member since {Month YYYY}", the profile form,
  "Last saved {date}", and the actions "Discard changes" and "Save profile".
  After a save it shows "Profile saved" with "Saved today at {time}. Businesses
  see your new phone number on requests from now on." The form is a template
  form of `jb-field` and `jb-input`, one signal per field, with first name, last
  name, phone, postal code, home church, home church address and pronouns.
  Optional fields carry "(optional)". "Home church address" follows "Home
  church" directly; it is one free-text field with the placeholder "e.g. 2700
  Bristol Circle, Oakville" and the hint "Shown to no one.", and input stops at
  200 characters. There is no address lookup and no format check. Clearing
  either field and saving removes the value. The phone hint reads "Shared with
  a business only when you send a request." The pronouns hint reads "Used in
  messages we write about you, such as a message from the Jubilee team." The
  page applies the same rules as the server and shows failures in
  `jb-form-summary` and under each field (L2-126).
- **`unsavedChangesGuard`** — `CanDeactivate` guard on `/account`. When the
  form differs from what was saved it opens `LeaveUnsavedDialog`; a
  `beforeunload` handler covers closing the tab. "Discard changes" puts the
  saved values back.
- **`ProfileApi`** — the contract behind the `PROFILE_API` token, implemented by
  `HttpProfileApi`. `getAccount()` calls `GET /api/account`;
  `saveProfile(profile)` calls `PUT /api/account/profile`. Both carry
  `homeChurchAddress` (string or null) beside `homeChurch`.
- **`AccountController`** — ASP.NET Core controller in `Jubilee.Api`. Both
  endpoints act on the member of the current session only; no route takes a
  member identifier, so one member cannot address another member's profile
  (L2-133). A failure answers `ProblemDetails` with the error reference
  `JB-ACC-503` (L2-118). `ProfileBody` refuses any field it does not name with
  HTTP `400` (L2-136), so a `role` in a save changes nothing.
- **`GetAccountQuery`** and **`GetAccountQueryHandler`** — return an
  `AccountDto` with the profile, the e-mail and its confirmation state, the
  join date, `ProfileSavedAt`, whether the member has a password and when it
  changed.
- **`UpdateProfileCommand`** and **`UpdateProfileCommandHandler`** — carry the
  seven editable fields. The handler checks each rule and throws
  `ValidationFailedException` (HTTP `422`, one code per field):
  `PHONE_INVALID` ("Enter a 10-digit phone number, like 416-555-0142."),
  `POSTAL_CODE_INVALID` ("Enter a full postal code, like M4C 1A1."), `REQUIRED`
  or `TOO_LONG` for a name over 50 characters, and `TOO_LONG` for a home church
  over 100 characters, a home church address over 200 or pronouns over 40. It
  then calls `Member.UpdateProfile(...)` and saves in one unit of work.
- **`Profiles`** — the helpers the handler uses: a phone keeps its ten digits
  (`416-555-0142`, `(416) 555-0142` and `1 416 555 0142` all store
  `4165550142`) and a postal code is stored upper-case with its space
  (`M4C 1A1`).
- **`Member.HomeChurch`** and **`Member.HomeChurchAddress`** — optional text,
  100 and 200 characters at most. `Member.UpdateProfile` trims each value and
  stores a blank one as null. Neither is part of any answer that a business,
  another member, the Jubilee team or the public receives (`L2-145`, `L2-196`
  AC7, proven by `MemberPrivacyTests`); both are in the member's data download
  and are removed when the account is erased.
- **`Member.Pronouns`** — optional free text, 40 characters at most ("she/her",
  "he/him", "they/them"). Only the Jubilee team reads them: the Owner panel of a
  listing in the admin application gives them as `owner.pronouns`
  (`AdminListingOwner`) and shows "Pronouns" beside the owner's name when they
  are set, so the team words what it writes about the owner (`L2-013` AC8, ADR
  0065). No other answer carries them.
- **`Request.Phone`** — copy of the member's phone taken when a request is
  created. The profile save does not touch existing `Request` rows, so a
  request already sent keeps the phone it was sent with, and a request sent
  after the save carries the new phone.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-013` | `L1-002` | The system shall let a member edit first name, last name, phone, postal code, home church and home church address at `/account`. |
| `L2-196` | `L1-002` | A member may give a home church by name, by address, by both or by neither. "Home church address" shall be one optional free-text field of at most 200 characters with the hint "Shown to no one."; a longer value sent to the API shall be refused with the code `TOO_LONG`, and clearing the field and saving shall remove the value. |
| `L2-145` | `L1-020` | The system shall show a member's home church and home church address to no one and use them only for recommendations. |
| `L2-013` AC8 | `L1-002` | Pronouns shall word only copy about the member that others read; the Jubilee team sees them in the Owner panel of a listing, and no other reader is given them. |
| `L2-019` | `L1-002` | The avatar in the top bar shall open the account menu. |
| `L2-126` | `L1-018` | A page form submitted with errors shall show a summary that links to each invalid field, shall keep the typed values, and the server shall enforce each rule the browser enforces with the same message code. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on each API endpoint, and shall reject an update that carries a field the caller is not allowed to set. |
| `L2-118` | `L1-016` | Each load-error state shall show a reference that the user can quote to support. |

## Diagrams

### System context

A member opens the account menu and edits the profile in Jubilee. The slice
calls no external system; an owner later receives the saved phone only on a
request.

![C4 system context for editing a profile](diagrams/c4-context.png)

### Containers

`Jubilee Web` renders the menu and the account page and calls `Jubilee API`,
which reads the session and reads and writes the member in the `Jubilee
database` (sessions are rows of that database, ADR 0046).

![C4 container view for editing a profile](diagrams/c4-container.png)

### Components

In `Jubilee Web`, `AccountMenuDialog` and `AccountPage` read `SessionService`,
and `AccountPage` saves through `ProfileApi`; `unsavedChangesGuard` asks before
the member leaves. In `Jubilee API`, `AccountController` dispatches
`GetAccountQuery` and `UpdateProfileCommand`; the handler, the `Profiles`
helpers and the `Member` entity own the field rules. In the admin application,
`AdminListingOwner` is the only reader of `Pronouns`.

![C4 component view for editing a profile](diagrams/c4-component.png)

### Class structure

`UpdateProfileCommandHandler` handles `UpdateProfileCommand`, checks it with
`Profiles` and mutates `Member`, which holds the phone as ten digits, the postal
code, the home church and its address, and the pronouns. `Request` keeps its own
`Phone`, separate from the member's current phone.

![Class diagram for editing a profile](diagrams/class-structure.png)

### Behaviour — save the profile

`AccountPage` checks the form in the browser, and the server repeats the same
rules.
An invalid phone or postal code returns HTTP `422` and the page keeps the typed
values; a valid save updates `Member` and the page shows "Profile saved. Saved
today at {time}."

![Sequence diagram for saving the profile](diagrams/sequence-save-profile.png)

### Behaviour — open the account menu

`AccountMenuDialog` builds its links from the member that `SessionService`
holds, chooses the anchored menu or the bottom sheet from the viewport width,
and returns focus to the avatar when it closes.

![Sequence diagram for opening the account menu](diagrams/sequence-open-account-menu.png)
