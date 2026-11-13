# ADR 0030: Policy pages and help

Status: accepted

## Context

Journey 22 (L2-107 to L2-110) makes the statement of faith, terms of use, privacy notice and help page public, dated and versioned. The design left the body format, the cache time to live, the staff editing screen and the privacy contact as `<TO SUPPLY>`.

## Decisions

- **One table of immutable versions.** `ContentVersion` holds slug, number, title, lead, sections (JSON) and who published it when. The published version is the highest number of the slug; nothing updates or deletes a row, so every earlier text is kept. There is no separate document entity.
- **A built-in first version.** Until an admin publishes, `GET /api/content/{slug}` answers version 1 from `ContentDefaults`, the draft text of the mocks dated 2 November 2026. No seeding step is needed and the pages work on a new database.
- **Plain-text bodies.** A section body is paragraphs separated by a blank line, "- " bullets, and `[text](/path)` links to a page of Jubilee or a `mailto:`. The page parses it into blocks and never renders markup; any other link stays text.
- **Anonymous read, admin write.** `GET /api/content/{slug}` is anonymous; an unknown slug is 404. `POST` and `GET /api/admin/content/{slug}/versions` need the `admin` role (L2-133). A publish validates title and sections (422 with codes) and rejects unknown fields.
- **No cache.** The read is one indexed query; the cache and its time to live wait until a measurement asks for them. (Amended by ADR 0066: the published text is read through a cache the publish clears.)
- **No editing screen.** An admin publishes through the API. (Amended by ADR 0066: administrators edit, preview and publish from `/policies` of the admin application.)
- **Terms version at joining.** `Member.TermsVersionNumber` records the published terms version when the agreement is accepted, by e-mail join or by the Google agreement step. The agreement checkbox now reads "I am 18 or older and I agree to…", so one confirmation carries both (L2-108 AC2); it is not stored as a separate flag.
- **The date is shown in Toronto time** as "Last updated 2 November 2026".
- **Help is native `<details>`** (design system accordion) with `aria-expanded` mirrored on the summary, an element id equal to the anchor, and the fragment of the address opening and scrolling to its answer.
- **Privacy contact.** The notice names `privacy@jubilee.example` as a placeholder until the owner supplies the real contact.

## Deferred

- A staff editing screen and a cache for the published text (both built by journey 22, ADR 0066).
- The real privacy contact and final legal wording (the mocks' copy is a draft).
