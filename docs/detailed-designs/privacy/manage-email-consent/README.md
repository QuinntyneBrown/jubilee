# Manage e-mail consent

## Overview

Jubilee sends two kinds of e-mail. Transactional and security e-mail (a
confirmation link, a request update, a meeting reminder) follows from
something the member did. Promotional e-mail advertises the marketplace
itself. Canada's Anti-Spam Legislation (CASL) allows promotional e-mail only
with the recipient's consent and sets rules for its content. This feature
holds the consent, proves it, and applies it at the moment each promotional
e-mail is queued.

The design uses five local terms.

- **promotional e-mail** — commercial message in one of two categories, "New
  businesses" (`new-businesses`) and "Tips for business owners" (`tips`)
- **consent** — a member's opt-in to one promotional category, given by
  turning its switch on
- **consent record** — append-only entry stating that consent was given or
  withdrawn, with the time and the method
- **one-click unsubscribe** — withdrawal sent by the mail client itself
  through the `List-Unsubscribe` headers of RFC 8058, with no sign-in
- **mailing address** — postal address of Jubilee printed in the footer of
  each promotional e-mail

`L2-149` sets three rules. Promotional e-mail goes only to members who opted
in, identifies Jubilee with a mailing address, and includes an unsubscribe.
An unsubscribe takes effect within 2 business days, with a target of
immediately. The time and method of each consent given or withdrawn are
recorded. Both promotional categories are off for a new account, so consent
is always an explicit act of the member.

## Description

The slice runs from the notification settings page to the e-mail provider. It
shares the switches on `Member` with the notification settings feature
(`L2-016`) and adds the consent history, the unsubscribe endpoint and page,
and the checks on outgoing promotional e-mail.

- **`NotificationSettingsPage`** — Angular page at `/account/notifications`.
  Each switch saves on its own through `ProfileApi`; the row shows "Saving…"
  and then "Saved at {time}". A failed save returns the switch to its previous
  position and shows an error toast with "Try again".
- **`EmailCategories`** — the category constants. `IsPromotional` holds for
  `new-businesses` and `tips`. `Member.EmailNewBusinesses` and
  `Member.EmailTips` are off for a new account.
- **`AccountController`** — exposes
  `PATCH /api/account/notification-preferences` for the signed-in member,
  with one setting per request. A storage failure returns 503 with the
  reference `JB-PREF-503`.
- **`Consent`** — static rule and the one place a category is switched.
  `TrySet(db, member, category, on, method, now)` sets the switch and, when
  the value of a promotional category changed, adds a `ConsentRecord`. The
  caller saves, so the switch and the record commit in one unit of work and
  no consent change exists without its record. `TrySet` returns `false` for
  an unknown category.
- **`UpdateNotificationPreferenceCommandHandler`** — calls `Consent.TrySet`
  with `ConsentMethod.SettingsSwitch` for a switch changed on the settings
  page.
- **`ConsentRecord`** — entity with `MemberId`, `Category`, `Given`,
  `Method` and `OccurredAt`, the time from `TimeProvider`. The application
  exposes no update for it. The records of a member are kept until the
  account is erased and are deleted with it.
- **`ConsentMethod`** — `SettingsSwitch`, `UnsubscribeLink`,
  `OneClickUnsubscribe` and `MarketingSiteForm`. Consent given on the
  marketing site is recorded with the sign-up itself (L2-218).
- **`UnsubscribeController`** — exposes `POST /api/email/unsubscribe/{token}`
  with `[AllowAnonymous]`, because the token is the credential.
  `CsrfMiddleware` passes a request without a session cookie. It accepts the
  RFC 8058 one-click POST from a mail client and the same call from
  `UnsubscribePage`, and answers `{ unsubscribed: true, category }`.
- **`UnsubscribeCommandHandler`** — verifies the token, loads the member and
  calls `Consent.TrySet` with `ConsentMethod.OneClickUnsubscribe` to turn off
  the one category the token names; for the category `summary` it turns off
  `messages` and `requests` (L2-016 AC8). Repeating the call leaves the
  category off and adds no second record. A token that does not verify
  returns 404 with the code `UNSUBSCRIBE_LINK_INVALID`.
- **`IUnsubscribeLinks`** and **`HmacUnsubscribeLinks`** — the token is the
  member ID and the category, signed with HMAC-SHA256 under the key
  `Email:UnsubscribeKey`, which production sets. No token is stored and a
  token has no expiry, so the unsubscribe of an old e-mail still works.
- **`UnsubscribePage`** — Angular page at `/unsubscribe/:token` in the `bare`
  shell, reached without sign-in from the link in the e-mail footer. It posts
  the token, removes it from the address bar and says "You're unsubscribed"
  with what stops, "Notification settings" and "Browse businesses". For the
  daily summary it says that "New messages" and "Request updates" are now
  off. A link that does not verify shows "This link doesn't work"; a failed
  request shows the reference `JB-PREF-503` with "Try again". Its states are
  mocked in `docs/mocks/pages/unsubscribe/` (`loading`, `success`, `summary`,
  `invalid`, `error`).
- **`SendNewBusinessNotesCommandHandler`** and **`NewBusinessNoteJob`** — the
  weekly note "New on Jubilee this week", job `new-business-note`, Monday
  7:00 a.m. in Toronto (L2-222).
- **`SendOwnerTipsCommandHandler`** and **`OwnerTipJob`** — the monthly tip
  from `OwnerTips.Series`, job `owner-tips`, the first day of the month,
  7:00 a.m. in Toronto (L2-223).
- **Audience** — both handlers select members whose switch for the category
  is on and whose e-mail address is confirmed, and queue through `EmailPolicy.Queue`, which adds no row when
  `Member.WantsEmail(category)` is false: the category is off or the address
  bounced. No other source feeds the audience.
- **`EmailSettings`** — `MailingAddress`, read from `Email:MailingAddress`.
  The footer of the weekly note and the tips prints it. While it is empty
  `CanSendPromotional` is false and neither is sent: the jobs run, record their success and queue nothing.
  Production sets the address before any promotional e-mail goes out.
- **Unsubscribe in each promotional e-mail** — `OutboxDispatcher` signs the
  token for the row's member and category; `EmailLayout` puts the link
  `{PublicBaseUrl}/unsubscribe/{token}` in the footer and
  `AzureCommunicationEmailSender` adds the headers `List-Unsubscribe` and
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- **When a withdrawal takes effect** — the switch is off as soon as the
  unsubscribe is saved, and each later mailing reads it. A promotional row
  already queued is sent at the next pass of `OutboxDispatcherJob`, within
  `10 seconds` of being queued, which is inside the limit of 2 business days.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-149` | `L1-020` | The system shall send promotional e-mails ("New businesses", "Tips for business owners") only to members who opted in, and each shall identify Jubilee with a mailing address and include an unsubscribe, as Canada's Anti-Spam Legislation (CASL) requires. While no mailing address is configured (`Email:MailingAddress`), no promotional e-mail shall be sent. An unsubscribe shall take effect within 2 business days (target: immediately), and the system shall record the time and method each time consent is given or withdrawn. |
| `L2-224` | `L1-010` | The link in the footer of a notification e-mail shall open `/unsubscribe/{token}`, which turns the e-mail's category off and says so. It shall need no sign-in: the signed token is the credential. |
| `L2-016` | `L1-002` | The system shall let a member choose at `/account/notifications` which e-mails they get and how often, shall save each switch on its own as soon as it changes, and shall create new accounts with "New businesses" and "Tips for business owners" off. |
| `L2-068` | `L1-010` | Every non-security e-mail shall carry a one-click unsubscribe link (RFC 8058 `List-Unsubscribe` headers) that turns off that category without signing in, and the link in its footer shall open the unsubscribe page. |

## Diagrams

### System context

A member gives or withdraws consent in Jubilee, and may withdraw it straight
from an e-mail. Jubilee sends promotional e-mail through the e-mail provider
to opted-in members only.

![C4 system context for managing e-mail consent](diagrams/c4-context.png)

### Containers

`Jubilee API` stores the switches and the consent records in the
`Jubilee database`. `Jubilee Worker` reads the opted-in audience, queues the
promotional e-mail and sends it through the `E-mail provider`. `Jubilee Web`
serves the settings page and the unsubscribe page.

![C4 container view for managing e-mail consent](diagrams/c4-container.png)

### Components

`UpdateNotificationPreferenceCommandHandler` and `UnsubscribeCommandHandler`
both switch a category through `Consent`, so each change of consent passes
through one rule. In the worker, the two promotional handlers queue through
`EmailPolicy` and need the mailing address of `EmailSettings`.

![C4 component view for managing e-mail consent](diagrams/c4-component.png)

### Class structure

`Consent` sets a switch of `Member` and appends a `ConsentRecord` carrying a
`ConsentMethod`. `HmacUnsubscribeLinks` scopes an unsubscribe token to one
member and one category.

![Class diagram for managing e-mail consent](diagrams/class-structure.png)

### Behaviour — give or withdraw consent in notification settings

The switch saves on its own. `Consent` sets the switch and adds the consent
record, and the handler saves both together; a failure returns the switch to
its previous position.

![Sequence diagram for changing consent in notification settings](diagrams/sequence-change-consent-in-settings.png)

### Behaviour — unsubscribe from an e-mail

The mail client or the unsubscribe page posts the token. The handler verifies
its signature, reads the member and the category from it and records the
withdrawal.

![Sequence diagram for unsubscribing from an e-mail](diagrams/sequence-unsubscribe-from-email.png)

### Behaviour — send a promotional e-mail to opted-in members

The weekly note runs once per Monday. Without a mailing address it queues
nothing. Otherwise it queues one e-mail per opted-in member with something to
hear of, and the dispatcher adds the unsubscribe link and headers.

![Sequence diagram for sending a promotional e-mail](diagrams/sequence-send-promotional-email.png)
