# 0065. Finish manage profile and settings

## Status

Accepted, 13 November 2026. Amends ADR 0028, whose deferrals of sign-out (built by journey 5,
ADR 0046), of the daily summary and of promotional e-mail (both built by journey 17, ADR 0053)
were settled by other journeys. Applies ADR 0046 (server-side sessions) and ADR 0057 (the
Jubilee team; no verification), which changes nothing here.

## Context

Journey 20 lets a member edit their profile, change their e-mail or password and choose which
e-mails arrive. An audit of 12 November 2026 left these gaps: the list of the member's sessions
(`L2-143` AC3) was not built; nothing tested that a password or e-mail change is written to the
security log (`L2-143` AC1), nor that a refused attempt on another member's object is logged
(`L2-133` AC2); pronouns were saved and used nowhere (`L2-013` AC8); nothing tested that no
other reader is given the home church and its address (`L2-196` AC7). The audit also listed the
daily summary (`L2-016` AC6, `L2-182`) and promotional e-mail (`L2-149` AC1) as unbuilt; journey
17 had built both, with their tests (`EmailNotificationTests.DailySummary`, `NewBusinessTests`,
`OwnerTipTests`), so this journey adds nothing there.

Jubilee has no geolocation service, so it cannot name a city for an address.

## Decision

### Where you're signed in (L2-143 AC3)

- A member session records, when it starts, the **device** (the browser and the system read
  from the `User-Agent`: "Chrome on Windows", "Safari on iPhone"; "Unknown browser" when neither
  is recognised) and the **network** it came from, with the last part of the address hidden
  (`203.0.113.x` for IPv4, the first three groups and `::` for IPv6). The full address is never
  stored with the session. The network is the approximate location `L2-143` AC3 asks for:
  `L2-143` AC3 now says so. A session that started before this change shows "Unknown browser"
  and no network.
- `GET /api/account/sessions` lists the member's live sessions (not ended, not expired, never a
  staff session), this device first and then the most recently active, each with `id`,
  `device`, `network`, `lastActiveAt` and `current`. Its error reference is `JB-ACC-526`.
- `DELETE /api/account/sessions/{id}` ends one session of the member at once (`MemberSession.End`),
  answers 204, and answers 204 again for one already ended. A session of another member, a staff
  session or an unknown id answers 404 `session_not_found`, changes nothing and is logged as a
  refused attempt with the actor, the address, the method and the path (`L2-133` AC2). Ending a
  session is a security event: `Security event: SessionEnded {SessionId} for member {MemberId}
  from {Address}`. Its error reference is `JB-ACC-527`.
- The account page shows the list under "Sign-in and security", headed "Where you're signed in".
  Each row names the device; its line reads "This device · Network 203.0.113.x" or "Last active
  {when} · Network 203.0.113.x". Every row but this device's has "Sign out", whose accessible
  name is "Sign out of {device}". It ends that session without a dialog (the member chose one
  named device, and signing in again undoes it), says "Signed out of {device}" in a toast, and
  removes the row; the count in "Sign out" updates. A failure leaves the row and says "We
  couldn't sign out {device}. Try again." The list has a loading state (skeleton rows), an error
  state ("We couldn't load where you're signed in." with "Try again" and `JB-ACC-526`) and, with
  no other session, says "No other devices are signed in."

### Credential changes in the security log (L2-143 AC1)

- A password change, an e-mail change request and the opening of the e-mail change link each
  log `Security event: {Event} {Outcome} for member {MemberId} from {Address}`, with the outcome
  `succeeded`, or `refused` when the current password was wrong. The password, the new address
  and the link token never reach the log. The commands carry the caller's address from the API.

### Pronouns (L2-013 AC8)

- Pronouns are shown to the Jubilee team only, in the Owner panel of a listing in the admin
  application ("Pronouns · she/her"), so the team words what it writes about the owner with
  them. The admin API gives `owner.pronouns`; no other answer (a business reading a request, a
  conversation, a public page) carries them. A member who set none shows no row. `L2-013` AC8
  now says so.

### The home church stays with the member (L2-196 AC7, L2-145 AC1)

- Tests prove that a business reading a member's request, the other side of a conversation, the
  Jubilee team reading a listing's owner and the public listing page are given neither the home
  church nor its address. No production code changed for this criterion.

### Test names

- The API tests of the home church named `L2_188_*` are renamed `L2_196_*`, the requirement's
  number since ADR 0041.

## Consequences

- A member sees every device signed in to their account and can sign one out without signing
  out the others, or this one.
- The location is a network, not a place. A geolocation database would let the line name a
  city; that is a later decision and needs no change to the list's shape.
- Sessions gain two columns in one migration, `AddSessionDevice`.
