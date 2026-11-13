# 0070. Finish work in the admin application

## Status

Accepted, 13 November 2026. Keeps ADR 0040 (the admin application) and applies ADR 0057 (no
verification; the `moderator` role), ADR 0058 (the count of the admin bar) and ADR 0067 (the
administrators' policies). Changes no behaviour of the code.

## Context

Journey 30 lets staff sign in to the admin application through single sign-on from an allowed
network, work in its shell and sign out (`L2-188` to `L2-195`). An audit of 12 November 2026 put
it at 92% and listed what was left: the hosting, the identity provider and the network
restrictions of the host, all owner steps; the sweeps of the admin screens, not run; no audit
record for a role change by `jubilee staff`; and the rename of ADR 0057.

Checked against the code on 13 November 2026, two of these were already done by other journeys
and are not built twice. Journey 12 (ADR 0059) writes `staff.role-granted` and
`staff.role-revoked` for every role change, with the operator as the actor and the roles before
and after, and writes nothing for a command that changes nothing or is refused (`L2-098` AC4,
`StaffCommandTests`). ADR 0057 is done everywhere it reaches the admin application: the role is
`moderator` ("Moderator") on the wire, in the admin bar and in `jubilee staff grant --role
moderator|admin`, the navigation reads "Listings", "Reports", "Featured", `/` opens `/listings`,
the app's old `/admin/verifications` links lead to `/listings`, and `GET /api/staff/session`
counts the unresolved reports (ADR 0058), not a queue.

Reading every criterion of `L2-188` to `L2-195` for a test found five that no test proved:
`L2-191` AC5 (the take-down and the administrators' policy pages were missing from the list of
admin-only endpoints refused to a member session), `L2-190` AC5 (no test held a member session
and a staff session in one browser), `L2-193` AC6 (the own-listing rule was proved with a test
session that already carried the member, never through sign-in by the confirmed address),
`L2-188` AC4 (proved for `/listings` only, and not that the navigation offers only "Policies"),
and `L2-194` AC1 (the account menu was never opened, and the top bar was searched for a link
named "Verif…" only). The behaviour of each was already right.

The owner steps were written as nine numbered paragraphs with one check at the end, and two of
them, the host's access restrictions and the first administrator, were commands typed by hand.

## Decision

- **The missing tests are added, each seen failing first** against a deliberately wrong build:
  an open take-down endpoint, sign-outs that end both sessions, a sign-in that links no member, a
  featured route that asks for no role, and an account menu with a link to `/admin/verifications`.
  The links of the app's chrome are checked by their address (`/admin`, `admin.`), not only by
  their names.
- **One ordered checklist** in `eng/azure/README.md` under "The admin application": register the
  application with Entra ID, require a second factor, the App Service and its host name, the
  staff sign-in settings, the allowed networks, deploy, the first administrator and the team, sign
  in once against production, and run the sweeps. Each step has its command and a check of what
  it should print, and a table records the date each was done.
- **`create-admin.sh` sets the allowed networks** when `STAFF_NETWORKS` names them: an Allow rule
  per network on `jubilee-to-admin` with every other network denied (`L2-192` AC5), and the same
  list as `StaffAccess__AllowedNetworks` on `jubilee-to-app` (AC1). It keeps the rules already
  there and runs again safely.
- **`eng/azure/staff.sh` runs `jubilee staff`** against the production database, opening the SQL
  firewall to the machine for the command and closing it again, as `check-launch.sh` does. It is
  how the first administrator and the Jubilee team are granted, and the grant is audited like any
  other.
- **The designs name what the code built**: `StaffMember.TryBindTo`, the challenge and forbid
  events set by `StaffSession.Configure`, `StaffNetworks.From` reading `StaffAccess:*`, and the
  `StaffSessionDto` held by `StaffSessionService`.

## Consequences

- Every criterion of `L2-188` to `L2-195` that code can meet has a passing test. What is left is
  the owner's: the identity provider's registration and its conditional access (`L2-189`), the
  staff sign-in settings, the allowed networks on the host and the API (`L2-192` AC5), the first
  administrator, the sign-in against production (`L2-188` AC1, `L2-195` AC3) and the sweeps
  (`L2-188` AC6). Until the allowed networks are set, production refuses every staff request.
- The real identity provider is exercised by no automated test; `StaffIdentityClientTests` and the
  sign-in tests use a stand-in, and step 8 of the checklist is the check against the real one.
- No agent changed production: the scripts are written and checked against a stand-in `az`, not
  run against Azure.
