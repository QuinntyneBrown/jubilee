# Publish policy pages

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses. Trust in the directory rests on four public pages
that say what Jubilee stands for and how it works. This feature covers those
pages: the statement of faith at `/statement-of-faith`, the terms of use at
`/terms`, the privacy notice at `/privacy` and the help page at `/help`.

A *policy page* is one of these four pages. Anyone can read them without an
account. Each page ends with "Last updated {date}", except Help, which ends with
a way to reach a person: "Still stuck? Write to us and a person answers within
one business day." with "E-mail help@jubilee.example".

The text of a policy page is *versioned content* — text stored as numbered,
immutable versions, of which one is published. Jubilee staff change the text
without a code deployment, and every earlier version is kept. The version number
matters beyond display: when a visitor creates an account, Jubilee records which
version of the terms the visitor agreed to, together with the confirmation that
the visitor is 18 or older.

The Help page presents each question as a *disclosure* — button that shows or
hides its answer — and gives each question an anchor, so that other pages can
link to one answer directly.

## Description

The feature is a vertical slice from the four pages in `Jubilee Web` to the
content tables in the `Jubilee database`.

- **`StatementOfFaithPage`** — Angular page at `/statement-of-faith`. It shows
  the introduction ("Jubilee is open to everyone as a customer…"), "What we
  believe", "How we do business" with four commitments, "How listings stay
  honest" with a link to Help, and "Last updated {date}".
- **`TermsPage`** — Angular page at `/terms`. It shows "Your account" (18 or
  older, real name), "Listings", "Requests and payment" ("Jubilee does not take
  payment or hold funds; you pay the business directly."), "Conduct" and "Last
  updated {date}".
- **`PrivacyPage`** — Angular page at `/privacy`. It shows "What we keep",
  "Your choices" with links to notification settings and
  the account page, and "Last updated {date}". The published text names the
  privacy contact and explains how to request access or correction, as PIPEDA
  requires; the contact is the placeholder address `privacy@jubilee.example` until the owner supplies the real one (ADR 0030).
- **`HelpPage`** — Angular page at `/help`. It shows the questions "How does
  Jubilee keep listings honest?", "Does Jubilee take payment?", "Is it free?",
  "Who can see my messages?" and "How do I report a listing?" with their
  answers. The first answers "Every owner agrees to Jubilee's statement of faith
  and to deal honestly with every customer when they list. If a listing isn't
  honest about its business, report it from the listing page: the Jubilee team
  reads every report and takes down listings that misrepresent a business."
  (ADR 0057).
- **`HelpDisclosure`** — Angular component for one question. It renders a
  `button` with `aria-expanded` that opens by Enter and Space, and an element ID
  equal to the section's anchor (for example
  `/help#how-does-jubilee-keep-listings-honest`). `HelpPage` opens and scrolls to the
  disclosure whose anchor matches the URL fragment.
- **`PolicyPageLayout`** — shared Angular layout for the four pages: heading,
  section list and the "Last updated {date}" line, formatted from
  `PolicyDocumentDto.PublishedAt`.
- **`ContentApi`** — typed Angular HTTP client for
  `GET /api/content/{slug}`, where `slug` is `statement-of-faith`, `terms`,
  `privacy` or `help`.
- **`ContentController`** — ASP.NET Core controller. `GET /api/content/{slug}`
  is anonymous. `POST /api/admin/content/{slug}/versions` and
  `GET /api/admin/content/{slug}/versions` apply the `Admin` role policy. An
  unknown slug returns `404`.
- **`GetPublishedContentQuery`** and **`GetPublishedContentQueryHandler`** —
  return the published version of one document. The handler reads the `Cache`
  first and falls back to the `Jubilee database`; there is no cache in this slice, so no time to live (ADR 0030).
- **`PublishContentVersionCommand`** and
  **`PublishContentVersionCommandHandler`** — append a new `ContentVersion`
  with the next number, mark it published, and remove the cached entry in one
  unit of work. No command updates or deletes a version, so previous versions are
  kept. There is no staff editing screen; an admin publishes through the API (ADR 0030).
- **`ContentDocument`** — domain entity, one per `ContentSlug`. `Publish`
  assigns the next version number and sets `PublishedVersionNumber`.
- **`ContentVersion`** and **`ContentSection`** — a version holds an ordered
  list of sections; each section has a heading, an anchor and a body. The body
  format is plain text: blank-line paragraphs, "- " bullets and `[text](/path)` links to Jubilee pages or `mailto:`; the page never renders markup (ADR 0030).
- **`TermsAcceptance`** — entity that records `MemberId`, `TermsVersionNumber`,
  `ConfirmedAdult` and `AcceptedAt`. The account creation handler of the
  accounts feature writes it in the same unit of work as the `Member`, using the
  version that `ITermsVersionProvider` returns. A join request without the
  18-or-older confirmation fails validation with `422` and code
  `ADULT_CONFIRMATION_REQUIRED`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-107` | `L1-015` | The system shall show the statement of faith at `/statement-of-faith` with its introduction, "What we believe", "How we do business", "How listings stay honest" with a link to Help, and "Last updated {date}". The statement's text shall be managed as versioned content without a code deployment, and previous versions shall be kept. |
| `L2-108` | `L1-015` | The system shall show the terms of use at `/terms` with the sections "Your account", "Listings", "Requests and payment", "Conduct" and "Last updated {date}". A visitor who creates an account shall confirm being 18 or older as part of agreeing to the terms, and the terms version shall be recorded. |
| `L2-109` | `L1-015` | The system shall show the privacy notice at `/privacy` with "What we keep", "Your choices" and "Last updated {date}". The notice shall name the privacy contact and explain how to request access or correction, as PIPEDA requires. |
| `L2-110` | `L1-015` | The system shall show the help page at `/help` with its five questions and answers and the contact line with "E-mail help@jubilee.example". Each question shall be a disclosure button with `aria-expanded` that opens by keyboard and has an anchor for direct links. |
| `L2-133` | `L1-019` | The server shall check the caller's role on every API endpoint before doing anything; only an admin shall publish a content version. |

## Diagrams

### System context

Visitors and members read the policy pages. A Jubilee administrator, a staff
account with the `Admin` role, publishes new versions of the text.

![C4 system context for publishing policy pages](diagrams/c4-context.png)

### Containers

`Jubilee Web` reads published content from the `Jubilee API`, which serves it
from the `Cache` and the `Jubilee database`.

![C4 container view for publishing policy pages](diagrams/c4-container.png)

### Components

The four pages share `PolicyPageLayout` and `ContentApi`. In the API, one
controller serves the anonymous read and the admin publish, each through its own
handler.

![C4 component view for publishing policy pages](diagrams/c4-component.png)

### Class structure

`ContentDocument` owns its immutable `ContentVersion` history, and each version
owns ordered `ContentSection` values. `TermsAcceptance` references the terms
version a member agreed to.

![Class diagram for publishing policy pages](diagrams/class-structure.png)

### Behaviour — open a policy page

The page loads the published version, renders its sections and, on `/help`,
opens the disclosure that the URL fragment names.

![Sequence diagram for opening a policy page](diagrams/sequence-open-policy-page.png)

### Behaviour — publish a new version

An admin publishes new text as a new version. The earlier versions stay in the
database and the cached copy is removed.

![Sequence diagram for publishing a new content version](diagrams/sequence-publish-version.png)

### Behaviour — record terms acceptance at joining

The account creation handler records the published terms version and the
18-or-older confirmation with the new member.

![Sequence diagram for recording terms acceptance](diagrams/sequence-record-terms-acceptance.png)
