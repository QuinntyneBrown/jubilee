# 0066. Finish read policies and get help

## Status

Accepted, 13 November 2026. Amends ADR 0030, whose deferrals of a staff editing screen and of a
cache for the published text this record settles. Applies ADR 0040 (the admin application) and
ADR 0057 (no verification), which journey 22 had already applied to the help answer and the
statement of faith's "How listings stay honest".

## Context

Journey 22 lets anyone read the statement of faith, the terms of use, the privacy notice and
help. Each page reads the published version of its text, and every version is kept (`L2-107`
AC2). An audit of 12 November 2026 left these gaps: an administrator could publish a version
only by calling the API, with no screen (`L2-107` AC2); the read cache the design names was not
built (ADR 0030 deferred it); the privacy contact is the placeholder `privacy@jubilee.example`
and the legal wording of the terms and the privacy notice is a draft. The help answer "How does
Jubilee keep listings honest?" and the statement of faith's section "How listings stay honest"
were already worded as ADR 0057 asks, with tests (`PolicyContentTests`, `policy-pages.spec.ts`),
so this journey changes neither.

## Decision

### The policies screens of the admin application (L2-226)

- **`/policies`** lists the four pages with the published version, when and by whom ("Version 2
  · published 13 Nov 2026 by Daniel Osei", "Version 1 · built in · 2 Nov 2026"), each with
  "Edit". **`/policies/{slug}`** is the editor: Title, Lead and each section's Heading and Text,
  "Add a section", "Remove" on each section, the "Edit" and "Preview" tabs, "Publish version
  {n}", and the kept versions newest first.
- **Administrators only.** The screens are for the `admin` role (`L2-133`): the route says
  `role: 'admin'`, and a staff member without it sees "Nothing here for your role. Policies are
  for Jubilee administrators. Ask a Jubilee administrator to add the admin role to your staff
  account." The admin bar shows "Listings", "Reports" and "Featured" to a moderator and
  "Policies" to an administrator (`L2-188` AC3 and AC4 now say so); a staff member with both
  sees all four.
- **The draft is not stored.** It lives in the editor until it is published; leaving the page
  drops it. A stored draft would need a second kind of version with its own rules (who sees it,
  when it expires) for four pages that change a few times a year.
- **The preview is the page.** `jb-policy-document`, a new component of `components`, renders a
  policy page (title, lead, sections, "Last updated {date}") in the app's statement of faith,
  terms and privacy pages and in the editor's preview, so the preview is exactly what members
  read. Its rules leave the global `.prose` and `.lead` of `ui.css`. Help keeps its accordion.
- **Section anchors are kept.** A section keeps its anchor when its heading changes, so links
  such as `/help#how-does-jubilee-keep-listings-honest` keep working; a new section takes its
  anchor from its heading. The editor does not show anchors.

### The publish

- `POST /api/admin/content/{slug}/versions` takes `basedOn`, the version the editor started
  from. When another version was published since, it answers 409 `VERSION_CHANGED` and publishes
  nothing. A publish repeated by a double press or a retry is refused the same way, so a version
  is never published twice from one draft. Without `basedOn` the API publishes as before.
- The publish writes `content.published` to the audit log (target `content`, the slug, "version
  {n}") in the same save as the version (`L2-180`).
- Two read endpoints serve the screens: `GET /api/admin/content` (the four pages with the
  published version, `publishedBy` and the count of kept versions) and `GET
  /api/admin/content/{slug}` (the published text with its kept versions). Both need the `admin`
  role, like the publish. Their references are `JB-ADM-521` and `JB-ADM-522`.
- No rate limit is added: the staff endpoints answer only a staff session from an allowed
  network (`L2-191`, `L2-192`), and `basedOn` makes a repeat harmless.

### The read cache (amends ADR 0030 "No cache")

- `IContentReadCache` keeps the published text of each page in the distributed cache (Redis in
  production, memory otherwise), keyed by slug, for at most 10 minutes. The publish removes the
  page's entry after it saves, so every instance reads the new version on its next request. A
  store that is down never fails a read: the text comes from the database.
- The terms version recorded at joining (`L2-108` AC2) is read through the same cache, so it is
  the version the visitor was shown.

### Owner steps

- The real privacy contact and the final legal wording of the terms and the privacy notice are
  the owner's. With this change they need no deployment: the owner, or an administrator, opens
  `/policies/privacy` and `/policies/terms` in the admin application and publishes them.
  Until then the privacy notice names `privacy@jubilee.example`.

## Consequences

- An administrator changes a policy page in a few minutes and members read it on their next
  request; every earlier version stays in `ContentVersions` and in the audit log.
- Two administrators editing one page at once cannot overwrite each other unseen: the second
  publish is refused and told to reload.
- A draft that is not published is lost when the editor is left; the editor is for short edits.
