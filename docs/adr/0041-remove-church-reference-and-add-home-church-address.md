# 0041. Remove the church reference; add an optional home church address

## Status

Accepted, 12 November 2026. Supersedes ADR 0019 (church reference decisions). Supersedes the
church-reference parts of ADR 0018, 0020, 0023, 0028, 0031, 0034 and both records numbered 0038;
each carries a note. Applies ADR 0036 (component parity) to the changed copy.

## Context

Until now an owner who listed a business named a church and a pastor's e-mail. Jubilee e-mailed
that person a link, the person answered on `/reference/:token`, and the answer decided whether
the listing reached the verification team (ADR 0018, 0019, 0020). The owner has decided that
Jubilee no longer asks anyone outside Jubilee about an owner: the verification team verifies a
listing from the listing and the owner alone.

Separately, a member can already name a home church (optional, shown to no one). The owner wants
its address beside it, also optional.

## Decision

### The church reference is removed entirely

- **No owner names a church or a pastor's e-mail.** `/list` has no "Church reference" section and
  nothing is e-mailed to a pastor. The page `/reference/:token`, its API
  (`POST /api/reference-requests/open|answer|report`, `GET /api/listings/{id}/reference` and its
  `resend`, `remind` and `change`), its e-mails (the reference request, and the unanswered,
  reminder and expired notices), its background jobs (`ReferenceExpiryJob`,
  `ReferenceRetentionJob`), its rate limit and its use of the bot challenge are deleted.
- **Two stages are removed.** "Waiting on reference" (`pending-reference`,
  `waiting-on-reference`) and "Needs a decision" (`needs-decision`, `needs-a-decision`) existed
  only because of the reference. The listing stages are now Draft, Ready to review, Changes
  requested, Live and Declined.
- **Submitting goes straight to "Ready to review".** A submitted listing enters the verification
  queue at once. The verification team approves, requests changes or declines.
- **"Decline listing" is available from "Ready to review".** It used to need "Needs a decision".
  The dialog says "{Owner} is e-mailed your reason. Use this when the listing cannot be
  verified." After a decline the owner may submit again.
- **The verification queue** (`/admin/verifications`) summarises "N listings · N ready to review ·
  oldest waiting N days", has the filter tabs "Ready to review N" and "Changes requested N" only,
  and the columns Business, Category, Owner, Submitted and Stage. The "Church reference" column is
  gone.
- **The review page** (`/admin/verifications/:id`) has the panels Owner, the flags, the checklist
  and the preview "How members see you". It has no "Church reference" panel and never says
  "Waiting for the church reference." The checklist is reduced from five items to three: "Tagline
  and description are honest and clear", "At least one photo of the products or work" and
  "Category fits what they offer". The only flag left is contact details in text (L2-072); the
  "reference reused" flag is gone.
- **"Request changes"** offers the areas "Tagline or description", "Photos" and "Category". A
  resubmitted listing always returns to "Ready to review".
- **Nothing is kept about a reference, so nothing is protected or purged.** The 90-day deletion
  of reference answers, the audit record `reference.viewed` and the rule that the owner's data
  download leaves the answer out all go: there is no answer.
- **Maintenance mode extends e-mail confirmation links** and the other links that remain. There
  are no reference links to extend.
- **`/privacy`** has the sections "What we keep", "Your choices" and "Last updated {date}". The
  section "Church references" is removed.

### The data migration

- **One new EF migration; old migrations are never edited.** In this order it moves every listing
  in a removed stage to "Ready to review", drops the tables `ReferenceLinks` and
  `ReferenceAnswers`, and drops the church and pastor's e-mail columns of drafts and submissions.
- `Listing.ReferenceConfirmedOn` and `ListingDecision.ReferenceDeletedAt` are dropped. My business
  shows "Verified Jun 2026" from `Listing.ApprovedAt`, which already holds when the listing was
  approved.
- `Member.HomeChurchAddress` is added by the same migration,
  `RemoveChurchReferenceAddHomeChurchAddress`.

### Requirement numbers

- **Retired numbers stay as stubs.** L1-012 and L2-074, L2-080, L2-081, L2-082, L2-083, L2-084 and
  L2-146 remain in the specifications as "Removed" stubs that point here. A retired number is not
  reused. The glossary term "Church reference" is removed, and journey 11 ("Answer a church
  reference") is removed from `docs/journey.md`.
- L2-196 "Home church name and address" is new and traces to L1-002. L2-001, L2-013 and L2-145
  are amended.

### Replacement copy

Nothing in Jubilee claims that a church, a pastor or an elder confirmed or vouched for a
business. Where the copy said so it now says the business is "verified", or "verified by the
Jubilee verification team".

- **`/list` intro:** "Free for Christian-owned businesses in Toronto. Every listing is verified
  before it goes live."
- **`/list` after submitting:** "{Business} is in for verification. Nothing more to do right now.
  We'll e-mail you the moment you're live." with "Go to My business" and "Add more products" or
  "Add more services". "What happens next" has three steps: "You submitted {Business}"
  (complete); "We review your listing", "Within two business days" (current); "You're live", "We
  e-mail you the moment members can find you" (upcoming).
- **`/list` invalid state:** the error summary no longer lists the church or the pastor's e-mail,
  and its count ("Fix N things to continue") covers the fields that remain.
- **My business, no listing:** "List your business free. Tell members what you offer, submit it
  for verification, and you're live once we approve it. It takes about ten minutes." with "List
  your business" and "How verification works".
- **My business, submitted and waiting:** an info alert headed "We're reviewing {Business}" with
  "You submitted it {when}. We review and publish within two business days." It has no action:
  no "Send the request again", no "Change reference", no reminder banner.
- **My business, "Your listing":** the row "Church reference — Confirmed Jun 2026 · Verified"
  becomes "Verification — Verified Jun 2026".
- **Browse empty state:** "...once your pastor confirms you." becomes "...once we verify you."
- **Pronouns hint on `/account`:** "Used in messages we write about you, such as a change request
  from the verification team."
- **Marketing site:** the lead says "Every business is verified before it appears"; the meta
  description ends "Every business is verified before it appears."; the note is "Free for members
  · Every business verified"; the floating note is "Verified by the Jubilee team" (it was
  "Vouched for by Grace Toronto Church"); the benefit "Trust, built in." says "Every business is
  verified by the Jubilee team before it appears."; "For businesses" says "The Verified mark
  travels with your listing, so first conversations start warm." The lines about asking your
  church for recommendations and sharing with friends from church stay: they describe members,
  not verification.

### Home church: name and address, both optional

- **The name is unchanged.** "Home church" stays optional on `/join` and `/account`: 100
  characters at most, the placeholder "e.g. The Meeting House" and the hint "Shown to no one.
  Helps us recommend businesses near you."
- **"Home church address" is one free-text field**, marked "(optional)", directly after "Home
  church" on both pages. It takes 200 characters at most (input stops at 200), has the
  placeholder "e.g. 2700 Bristol Circle, Oakville" and the hint "Shown to no one." There is no
  lookup and no format validation.
- **The two fields are independent.** Either may be filled without the other. Clearing a field
  and saving removes its value.
- **API.** `homeChurchAddress` (string or null) sits beside `homeChurch` in the join request, the
  profile read and the profile update. It is stored as `Member.HomeChurchAddress` (200
  characters). A longer value answers the same validation error as `homeChurch`, with the code
  `TOO_LONG` for `homeChurchAddress`.
- **Privacy (L2-145).** The home church name and address are shown to no one: not businesses, not
  other members, not the verification team. They are used only for recommendations. Both are in
  the member's data download, and deleting the account removes both.
- **Nothing ever requires a home church**, listing a business included.

### Design reference, parity and the pitch film

- **The Magic Patterns captures are not edited.** They are captures of the published design
  (`docs/design-reference/magic-patterns/`) and still show the old marketing copy and the "Church
  reference" part of "List your business". The mocks and the design system carry the new copy.
- **Parity follows ADR 0036 as written.** A parity spec compares how a component looks, not what
  the page says, and ADR 0036 forbids raising a threshold or masking a region. So the 3 %
  threshold against the reference stays. Where a region's text changed and its crop now differs
  from the capture by more than 3 %, the crop carries `knownDifference` in its spec and a row in
  the "Known differences" table of `docs/design-reference/magic-patterns/README.md`, and is
  reported as a known failure until the owner captures the frame again. A component that the
  reference no longer shows is compared with the mock only. The comparison with the mocks (1 %)
  is unaffected, because the mocks change with the app.
- **The pitch film's text is updated** (`docs/videos/01-jubilee-pitch/`): its script, slides and
  captions no longer mention a church reference. The rendered audio and video are rendered again
  only if the tools are available where the change is made; otherwise the committed media is
  stale until the owner renders it.

## Consequences

- A listing reaches the verification team as soon as it is submitted, so the queue grows faster
  and the "overdue after 2 business days" rule starts at submission.
- The Verified mark now means "verified by the Jubilee verification team" and nothing more. No
  third party stands behind it until a replacement is decided.
- Listings that waited on a reference or on a decision are in "Ready to review" after the
  migration, with their original submitted date.
- Reference links already e-mailed stop working: the page and its API are gone.
- The designs `church-reference/*`, `onboarding/name-church-reference` and
  `privacy/protect-reference-answers` are deleted, with their estimates.
- A parity crop whose text changed is a known failure, not a pass, until new captures exist.

## Deferred

- A replacement way to verify businesses.
- Using the home church address for maps or for recommendation distance.
- Address autocomplete.
- Showing the home church to anyone.
