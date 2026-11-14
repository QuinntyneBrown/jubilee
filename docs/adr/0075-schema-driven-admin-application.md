# 0075. A schema-driven admin application

## Status

Accepted, 14 November 2026. Builds `L2-188` and `L2-272` to `L2-284` as the mocks generated from
the Magic Patterns design "Jubilee Admin" draw them (`tools/admin-mocks/build.mjs`). Keeps ADR 0040
(a separate admin application), ADR 0057 (no verification; the `moderator` role), ADR 0058 (no
polling), ADR 0059 (staff role changes audited) and ADR 0067 (the administrators' policies).
Replaces the per-screen admin of ADR 0070 (Listings, Reports, Featured, Policies) and the
`jb-admin-bar` of the design system's release 1.2.

## Context

The admin application had one hand-built screen per task: the listings, one listing, the
reports, one report, the featured week and the policies, each with its own endpoint. The
redrawn design is schema-driven: an overview of what is waiting on staff, and one table screen
and one record screen that draw any of Jubilee's tables from a description of it. The design
describes 51 tables with sample fields and rows (`tools/admin-mocks/entities.mjs`), and
`docs/mocks/README.md` lists eight things it adds that Jubilee had not decided.

Every table of the design has an entity in `IAppDbContext` except none: Listing submissions,
Access requests and Link tokens exist too. Their fields, however, are the design's, not
Jubilee's: a member has no "role" or "neighbourhood", a listing's stages are `draft` and `live`,
not "in review" or "published". Entities keep their state behind private setters and change only
through their own methods, so a generic "set this column" would bypass the rules each feature
enforces.

## Decision

### The catalog is in the Application layer and the API serves it

- **Each table is described once**, in `Jubilee.Application/Admin/Tables/`, as an
  `AdminTable<TEntity>`: its key (kebab case, the route: `members`, `listing-reports`), label,
  singular, group, sentence, the query it reads, its fields, the fields shown by default, its
  status field, its name fields, and which roles read, change and delete it. A field is a key, a
  label, a type (`id`, `text`, `email`, `mono`, `json`, `long`, `status`, `bool`, `number`,
  `money`, `date`, `datetime`, `ref`, `url`) and a selector expression on the entity, so the
  database applies search, filter and sort.
- **The fields are Jubilee's, not the design's.** A table shows what its entity holds, under the
  design's label where the meaning is the same. Values the design invents (a member's "role",
  "neighbourhood" or "bio", a listing's "rating" columns that Jubilee does not store) are not
  shown. Statuses carry Jubilee's own words (`draft`, `live`, `paused`, `on hold`, `taken down`).
- **The Angular application reads the catalog** (`GET /api/admin/tables`) and hard-codes no table.
  The endpoints are:

  | Endpoint | Does |
  |---|---|
  | `GET /api/admin/tables` | The groups and the tables the role may read, with their fields, defaults, rights and counts |
  | `GET /api/admin/tables/{table}` | A page of rows: `q`, `status`, `sort`, `dir`, `page`, `size` (25, 50, 100, 250) |
  | `GET /api/admin/tables/{table}/{id}` | One record, its name, status, rights, "Points here" and "History" |
  | `PATCH /api/admin/tables/{table}/{id}` | Change the fields the role may change |
  | `POST /api/admin/tables/{table}` | Create a record |
  | `POST /api/admin/tables/{table}/status` | Set the status of the selected records |
  | `POST /api/admin/tables/{table}/delete`, `/restore` | Delete the selected records, and undo it |
  | `GET /api/admin/tables/{table}/export` | CSV or JSON of every row, the matching rows or the selected rows |
  | `PUT`, `DELETE /api/admin/tables/{table}/weekly-export` | Turn the weekly export on and off |
  | `GET /api/admin/overview` | The work queue, System and Recent changes |
  | `GET /api/admin/jump?q=` | Tables and records for the jump palette |

- Rows and records are sent as values keyed by field, already in their wire form (an enum is its
  wire word, a date is ISO 8601, a reference is `{ id, name }` or `{ id, name: null, deleted:
  true }`). Errors are ProblemDetails: `FORBIDDEN` (403), `NOT_FOUND` (404), `JB-ADM-503` (a
  table or the overview could not be read), `JB-ADM-504` (a record could not be read),
  `VALIDATION` with the owning feature's field codes, `READ_ONLY` (409, a table or field nobody may
  change), `REASON_REQUIRED` (a private table's export).

### Rights

- Rights are set per group and checked in the handlers, for every endpoint and for the jump
  search (`L2-284` AC1):

  | Role | Reads | Changes and deletes |
  |---|---|---|
  | `admin` | every table | every table but System and Staff |
  | `moderator` | every table but Staff | Listings, Reviews, Moderation and Feedback |

- **System** (Audit records, Outbox messages, Job runs) and **Staff** are read-only to everyone.
  Staff accounts change only through `jubilee staff` (`L2-193`), with the roles `admin` and
  `moderator`; the design's five roles are not adopted.
- **Messages and Message attachments** open only while their conversation has an open report;
  opening one writes `messages.read` (or `message-attachments.read`) with the report as its reason
  in the same transaction. Their rows list who wrote and when, never the text. Exporting them, or
  Consent records, needs a reason (`REASON_REQUIRED`), written to the export's audit record.
- **A moderator who owns a listing** reads it but cannot change it, act on its reports or take it
  down (`L2-098` AC5), as today.

### Changes go through the owning feature

- **A field is changeable only when the catalog binds it to an entity method**, with the owning
  feature's validation, messages and codes (`L2-283` AC2). A field with no binding is shown, never
  edited; a table with no bound field has no "Edit", and no "New" unless it binds a creation. The
  bindings of this change are listed in the detailed design (`work-in-the-tables`); a binding is
  added only with the rule that guards it. This is narrower than "an administrator changes every
  table": `L2-283` AC1 and `L2-284` AC1 say "every field the catalog binds" (amended with this ADR).
- **A change that has its own requirement keeps its own command and dialog** and is offered on the
  record as an action, not as a field: take a listing down (`L2-101`, `take-down-listing`), act on
  a report (`L2-105`, `L2-237`, `report-action`), and publish a policy (`L2-247`,
  `publish-policy`). The featured slots are created and removed through the featured week's rules
  (`L2-106`): at most the week's limit, live listings only.
- Every change, creation, deletion, restore and status change writes an audit record
  (`{table}.update`, `.create`, `.delete`, `.restore`, with the values before and after) in the same
  `SaveChanges` as the change; a change that cannot be audited is not made (`L2-284` AC5).

### Deletion

- **A table is deletable only when it declares it.** The deletable tables keep the entity's row
  with `AdminDeletedAt` set; an EF Core query filter hides it from every screen and every query of
  the app. "Undo" clears it. The worker's `AdminDeletionPurgeJob` erases rows deleted more than 30
  days ago, once a day (`L2-281` AC4).
- **Deletable in this change:** Saved items, Recent searches, Notifications, Feedback, Feedback
  screenshots, Stock alerts, Featured slots, Listing photos, Product photos, Launch subscribers,
  Business pre-registrations and Maintenance windows: records no law keeps (`L2-148`) and no other
  flow owns.
- **Not deletable:** Consent records, Statement agreements and Audit records (the law keeps them,
  `L2-281` AC5), Staff and System, Members and Listings (a member deletes their own account,
  `L2-017`; a listing is taken down, `L2-101`), and every table not listed above. Their record and
  row menu offer no "Delete".
- A reference to a deleted record reads "deleted".

### Exports

- The server builds the CSV (the table's fields as columns, the wire values) and the JSON (every
  field) from the records the staff member may read, applying the same search, filter or
  selection; the file is `{table}-{yyyy-MM-dd}.csv` or `.json`, and the export writes
  `{table}.export` with the format and the number of rows.
- **"Email me this weekly"** stores an `AdminExportSubscription` (staff member, table). The worker's
  `WeeklyExportJob` sends, every Monday at 08:00 Toronto time, an e-mail with **a link** to the
  table's CSV in the admin application, not the file: the outbox holds plain text only, and a link
  keeps the data behind the staff session, the allowed networks and the role the staff member
  holds when they open it. A subscription whose role no longer reads the table is not sent. This
  amends `L2-279` AC3.

### What the design adds that Jubilee has not decided (`docs/mocks/README.md`)

1. *Listing submissions*: the table exists (journey 3's history); it is read-only and its queue
   line "Listings to review" is not shown, because no review is waiting since ADR 0057.
2. *Access requests*: Jubilee has `AccessRequest` (a member asking for a screen they may not open, "Ask for access" of `L2-114`);
   the table shows those, not an invite-only beta. They carry no decision, so "Waiting on us" has no line for them (`L2-274` AC2 amended).
3. *Staff*: read-only, roles `admin` and `moderator` (above).
4. *Consent records*: read-only, never deleted.
5. *Messages*: only with an open report (above).
6. *Link tokens*: Jubilee's `LinkToken` (e-mail confirmation and e-mail change); the token hash is
   never shown.
7. *Members*: the home church and its address are not fields of the table (`L1-020`).
8. *Delete*: only the tables listed above.

### The old screens and links

- The pages `admin-listings`, `admin-listing`, `admin-reports`, `admin-report`, `admin-featured`,
  `admin-policies` and `admin-policy`, their endpoints that no screen uses any more, and
  `jb-admin-bar` are removed.
- The old paths lead to their tables: `/listings` and `/listings/{id}` are the table and record
  already; `/featured` opens `/featured-slots`; `/policies` and `/policies/{slug}` open
  `/content-versions`; `/reports` opens `/listing-reports`, and `/reports/{id}` (linked from the
  team's e-mails) opens the report's record in whichever report table holds it.

### Per-viewer preferences

- The columns shown and the rows per page are kept per table in `localStorage`
  (`jubilee.admin.table.{table}`), read and written in `try`/`catch`; nothing about them reaches
  the server (`L2-278` AC5).

## Consequences

- One table screen and one record screen serve every table; adding a table is one catalog entry,
  with its rights, and its tests.
- The admin application changes less than the design shows: only bound fields are edited and
  only the listed tables are deleted. Each new binding or deletable table is a small change with
  its own rule and test.
- Twelve entities gain `AdminDeletedAt` and a query filter, with a migration; the admin reads
  them with `IgnoreQueryFilters` only to restore and purge.
- The weekly export never puts records in a mailbox.
- The team's e-mails keep working: their `/reports/{id}` links resolve to the new records.
