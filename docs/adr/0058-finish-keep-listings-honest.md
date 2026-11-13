# 0058. Finish keeping listings honest

Status: accepted

## Context

Journey 12 became "Keep listings honest" when Jubilee shipped without verification (ADR 0057): the
Jubilee team looks through published listings in the admin application and takes down one that
misrepresents a business. ADR 0057 built the listings list, one listing and the takedown, and left
two audit records the requirements ask for. ADR 0040 moved roles to `jubilee staff grant|revoke`
and said that a role change still wrote no audit record (`L2-098` AC4, `L2-180` AC1). Opening a
listing in the admin application shows the owner's name, e-mail and other listings, and wrote no
record of that access (`L2-150` AC1), although opening a report does (`report.opened`, ADR 0033).

## Decision

- **A role change is audited by the CLI that makes it.** `GrantStaffRoleCommand` and
  `RevokeStaffRoleCommand` carry the operator. `jubilee staff` passes the operating-system account
  that runs it (`Environment.UserName`), so the actor is `cli|{user}` and the actor name
  "{user} (jubilee CLI)". A command that changes the account's roles adds an `AuditRecord`
  `staff.role-granted` or `staff.role-revoked` with the target type `staff`, the target the
  account's address, the roles before and after (for example `moderator` and
  `moderator, admin`) and the reason "jubilee staff". A command that changes nothing (a grant of a
  role already held) writes nothing, as it saves nothing; a refused command writes nothing. No
  screen grants a role and none is added: the CLI runs against the production database, which only
  administrators reach, and that is what "only an `admin` role holder" means. The CLI's account is
  recorded rather than a staff address typed on the command line, because a typed address proves
  nothing.
- **Opening a listing is a recorded access to personal data.** `GetAdminListingQueryHandler` adds
  an `AuditRecord` `owner.viewed` each time it answers for a listing with an owner: the target type
  `member`, the target the owner's subject and the reason "Listing {id}", like `report.opened`. Each
  opening is recorded, including the reload after a takedown, because the Owner card is read each
  time.

## Consequences

- `L2-098` AC4 and `L2-150` AC1 were sharpened to say what is recorded.
- The audit log grows by one record per opening of a listing. It is kept for two years like every
  other record (`L2-180` AC2).
- An administrator searching the audit log by target finds every staff member who read an
  owner's details, and every change to a staff account's roles with who made it.
