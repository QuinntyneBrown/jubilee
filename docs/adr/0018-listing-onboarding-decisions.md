# 0018. Listing onboarding decisions

Status: accepted. Amended by ADR 0041, 12 November 2026: the church reference is removed. Submit no longer takes a church or a pastor's e-mail, queues no e-mail to a pastor, sets no `REFERENCE_REUSED` flag and creates the listing at Ready to review, not `PendingReference`. The design `name-church-reference` is deleted. The rest stands. Amended again 12 November 2026 (see "Amendment: finishing the journey"): the deferrals of the last point are reversed. Superseded in part by ADR 0057, 12 November 2026: Jubilee ships without verification; a listing goes live when its owner publishes it, there is no Verified mark, and the verification team is the Jubilee team (`moderator` role).

## Context

"List your business" (L2-071 to L2-079) has four designs (describe-listing, name-church-reference, save-draft, submit-for-verification) with several open values. This record fixes them.

## Decision

- The form saves into a `ListingDraft` (with `DraftItem` rows) created by the first save, not by opening the page. `/list` loads the draft the member touched last; `/list?draft=new` starts a blank one; `/list?draft={id}` opens a specific one. A save is never validated, so a half-written form is kept as typed.
- A member holds at most 5 listings plus drafts. The sixth is refused with 409 `LISTING_LIMIT` and the text "You can list up to 5 businesses. Write to help@jubilee.example for more."
- Submit validates name, tagline (90 characters at most), category, church, pastor e-mail and agreement. A refused submit still saves the typed values to the draft. The pastor e-mail is refused as `OWN_EMAIL` when it equals the member's own e-mail (compared by `EmailAddress.Key`: trimmed, lower-cased); linking two accounts to one owner is deferred.
- A successful submit creates the `Listing` at stage `PendingReference` with its products or services, records a `ListingSubmission` (church, pastor e-mail and key, reference token, statement version `2026-11-02`, agreement time, idempotency key), queues the pastor's e-mail and deletes the draft. A repeat with the same idempotency key returns the first result. The pastor's e-mail links to `{base}/reference/{token}` and carries no listing details.
- A name or tagline containing a URL, an e-mail address, a phone number or a discount code is accepted and flagged `CONTACT_IN_TEXT` for the review screen; a bare domain is flagged in the tagline only, so a name such as "Luzandre.com" is not flagged. The same pastor named by five or more other owners in 30 days flags the submission `REFERENCE_REUSED`.
- Drafts idle for 180 days get a notice and are deleted 14 days later unless touched; `ListingDraftExpiryJob` runs every 24 hours. Autosave runs in the page after 10 idle seconds.
- Items are added through `ListingItemDialog` (a product: name and price; a service: name, short detail, pricing, price). The full product and service editors are journey 16.
- The statement of faith has a page at `/statement-of-faith`, version `2026-11-02`.
- Deferred: asking existing owners to agree again to a new statement version (L2-075 AC3), the reference answer page (journey 11), the "Members can" action of a service (services start as "Ask"), the My business switcher (journey 15), and the highlight field's UI.

## Consequences

Journey 11 reads the `ListingSubmission` token; journey 12 reads the flags; journey 16 replaces the item dialog with the full editors.

## Amendment: finishing the journey (12 November 2026)

Journey 10 stood at 87%. This amendment reverses the deferrals of the last point above and settles
what an audit of the code against L2-071 to L2-079 found without an implementation or a test. The
My business switcher and "List another business" were settled by ADR 0052 (journey 15) and are not
built twice.

- **The full editors work on the draft.** "Add a product" and "Add a service" on `/list` open
  `ProductEditorDialog` and `ServiceEditorDialog`, the editors of journey 16, with `draft: true` in
  their data. In that mode an editor checks its fields as it always does, calls no API and closes
  with a `DraftItem`; the page keeps it and saves it with the draft. No listing exists before
  submission, so there is nothing for the catalogue endpoints to save to, and creating a listing
  early only to hold items would put a half-written business in the workspace. `DraftItem` gains
  what the editors ask: `Description` and `Stock` for a product; `Action`, `DurationMinutes`,
  `OffersVideo`, `OffersInPerson` and `InPersonPlace` for a service. `ListingItemDialog` is
  removed. The editor says "Nothing is public until your listing is verified." in this mode,
  because "Changes show on your public listing as soon as you save." would be untrue.
- **A draft is still never validated; submission makes its items safe.** A product is created with
  its description (cut to 1,000 characters) and its stock (0 to 9,999, else untracked). A service
  keeps "Book a time" only when its booking details are ones the service editor's own endpoint
  would accept (15 to 480 minutes, at least one way to meet, a place when in person); otherwise it
  is created as "Ask for a quote", as every onboarding service was before. The form has no field
  to show an item's error on, and the editor has already checked what it sent.
- **The highlight is the field of the listing editor.** `/list` shows "Highlight" with the words
  and the 30 characters of L2-087; `ListingDraft.Save` cuts it to 30 (it was 60); a space has
  none. `jb-business-card-preview` gains `highlight`, drawn as the card draws it.
- **The review screen counts the items and names the other listings.** `VerificationReviewDto`
  gains `ItemCount`, and the admin review page says "No products or services yet" above the
  checklist when it is zero and the listing is not a space. `ReviewOwner.OtherListings` is a list:
  each of the owner's other listings with its stage, worded by `Workspace.StageLabel` as the
  switcher words it, and each draft as "Draft".
- **Agreeing again to an updated statement of faith.** The version of the statement stays the
  constant `StatementOfFaith.Version`, the date of its last update: the statement is a page of the
  app, so a new version is a change to the code and ships with it. An owner's latest agreement is
  the greatest version among their `ListingSubmission` rows and their `StatementAgreement` rows (a
  new entity: owner, version, time). When it is earlier than the current version, `GET
  /api/session` carries `statementDue` (the version, its date, the date 30 days later, whether
  that date has passed, and the business it concerns), and the app opens `StatementAgreementDialog`
  once per load of the app; My business keeps a banner until the owner agrees. `POST
  /api/statement-of-faith/agreement` records the agreement; it names the version agreed to, and
  another version than the current one is refused with 409 `STATEMENT_VERSION`, so that nobody
  agrees to a text they were not shown. A member with no agreement on record is not asked: the
  listings the seed creates have no submission, and a member who lists nothing has agreed to
  nothing.
- **After the 30 days the listing is paused, not removed.** The criterion says the listing "stays
  live meanwhile for 30 days", so something has to end the 30 days. A daily job
  (`RunStatementAgreementJobCommand`, job `statement-agreement`, through `ScheduledJobs`) pauses
  each live listing of an owner whose agreement is overdue, stamps `Listing.StatementLapsedAt` and
  queues one e-mail to the owner. A pause is the mildest state that takes a listing out of the
  directory: requests and conversations continue, nothing is deleted, and the verified status is
  kept (L2-096). `ResumeListingCommand` refuses with 409 `STATEMENT_AGREEMENT_REQUIRED` while the
  agreement is overdue; agreeing resumes each listing the job paused, at once and without new
  verification. A listing the owner paused themselves stays paused. Declining the listing or
  returning it to the verification queue was rejected: the business has not changed, only the
  agreement is missing. No e-mail announces a new version: the criterion asks at sign-in, and an
  announcement to every owner is a message the team should write and send deliberately.
- **The draft expiry is scheduled work.** `ListingDraftExpiryJob` sends
  `RunListingDraftExpiryJobCommand`, which runs the existing sweep through
  `ScheduledJobs.RunOnceAsync` (job `listing-draft-expiry`, every 24 hours): once a day however
  many instances of the worker run, with its last success in `JobRun` (L2-182 AC1, ADR 0050). The
  worker ticks hourly so that an instance started late in a day still serves the next one.
- **A submission that takes longer than 10 seconds fails** with the page's failed alert (L2-127
  AC2), as the dialogs do; the idempotency key makes the retry safe.

Consequences of the amendment: two migrations (`DraftItems` gains seven columns; `Listings` gains
`StatementLapsedAt` and the table `StatementAgreements` is added). Publishing a new statement of
faith is now a change with an effect on live listings 30 days later: whoever changes
`StatementOfFaith.Version` and the page starts that clock, and should tell owners by e-mail first.
