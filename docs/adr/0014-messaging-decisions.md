# 0014. Messaging: one conversation per business, read marks, photos and limits

## Status

Accepted, 10 November 2026. Completed by ADR 0038, which builds the screens this record left without a mock.

## Context

The messaging designs (`docs/detailed-designs/messaging/*`) left several decisions as `<TO SUPPLY>`:
where the reply-time hint comes from, the opener texts, how the inbox is searched and paged, how a
photo is stored and shown, what the report and block dialogs say, and how an owner is away. ADR 0009
forbids a real database, storage service or scanner in a test.

## Decision

- **One conversation per member and business.** `Conversations` has a unique index on
  `(ListingId, MemberSubject)`. Starting a conversation with a business the member already talks to
  adds a message to it and answers the same `conversationId`. The business side is the listing's
  `OwnerId`; an owner sees the conversations addressed to their listings, titled with the member's
  name and labelled with the business. An owner cannot message their own listing (`409 OWN_LISTING`).
- **Messages keep their order.** A message is stamped never earlier than the conversation's last
  message (one tick later if two arrive in the same instant), so ordering by time is total.
- **Read marks are per side.** `MemberReadAt` and `OwnerReadAt` hold the time up to which a side has
  read. A conversation is unread for a side when the other side wrote after that time. Opening the
  newest page of a conversation marks it read; loading older pages does not. The navigation summary
  counts unread conversations.
- **Retries are safe.** Every send carries an idempotency key; `(SenderSubject, IdempotencyKey)` is
  unique, and a repeat answers the original message and writes nothing.
- **Limits (L2-137).** 30 messages in 10 minutes and 10 new conversations in 24 hours per member,
  counted from stored rows, answered with `429` and `Retry-After`. A message is 1 to 4,000 characters
  after trimming (`REQUIRED`, `TOO_LONG`).
- **Inbox.** Newest conversation first, at most 200 rows, one preview per row ("You: …" or
  "{first name}: …", cut at 120 characters). Search matches the business name, the owner's name, the
  member's name and the text of messages the person may see, case-insensitively, always inside the
  person's own conversations. Paging is deferred until a member has more than 200 conversations.
- **Reply-time hint.** The conversation and the new-message dialog take it from the listing's stored
  median first-reply band (`ReplyTimeBand`), as the listing page does; with too few replies the hint
  is left out.
- **Photos.** JPEG and PNG only, decided from the bytes, never from the name or the declared type; at
  most 5 MB and 8,000 pixels wide. The server removes everything that is not picture data (EXIF, XMP,
  ICC and comment segments of a JPEG; text and time chunks of a PNG) and stores the result in
  `MessageAttachments`. A photo is reached only through a signed link, `/api/attachments/{id}?expires=…&sig=…`,
  an HMAC-SHA256 of the id and expiry with `Attachments:SigningKey`, valid for five minutes and
  served with `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. The malware
  scanner and object storage stay behind a later `IMediaStore`.
- **Report and block.** A participant files a report with a reason (1 to 1,000 characters). A member
  may also block the business: later messages from the business are stored but never shown to the
  member or counted as unread, and nobody is told (the business still gets `201`).
- **Away.** `Listing.AwayUntil` holds the date an owner is back. The member's conversation shows the
  notice only while that date is in the future. Setting it belongs to the owner workspace journey.
- **The message dialog is a route.** `/b/:slug/message` is the listing page with the dialog open, served
  by the same route as `/b/:slug` so that opening it neither reloads the page nor counts another view.
  A visitor gets the sign-in-required dialog and comes back to this address.
- **Test doubles.** The e2e suite answers the messaging endpoints with a stand-in
  (`e2e/fixtures/messaging.ts`) because the seeded API has no conversations; the backend suite runs on
  the EF Core InMemory provider.

## Consequences

- A member who messages a business twice talks in one thread, which is what the inbox shows.
- Hidden messages after a block cost a flag on the message, not a separate table.
- The signed-link key must be set in production (`Attachments:SigningKey`); the development default
  is public.
- Photo upload, mute, report and block have their API and tests but no screen yet; their dialogs need
  mocks first and are listed as deferred in `docs/estimates/messaging.md`.
