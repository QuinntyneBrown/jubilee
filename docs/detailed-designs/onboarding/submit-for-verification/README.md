# Submit for verification

## Overview

A business appears on Jubilee only after the verification team approves it.
Submission is the step at which the owner hands a finished draft over: the form
at `/list` is validated in full, the listing draft becomes a listing in the
stage `ReadyToReview`, and the verification queue shows it. With the submission
the owner agrees to Jubilee's statement of faith. This feature covers that
step, the agreement and its renewal when the statement changes, and the rule
that lets one owner hold more than one listing.

The slice uses five local terms.

- **submission** — creation of a `Listing` in the stage `ReadyToReview` from a listing draft, requested by its owner and recorded as a `ListingSubmission`
- **listing stage** — position of a listing in its lifecycle, one value of `ListingStage`
- **statement version** — date on which the statement of faith was last updated, `StatementOfFaith.Version`
- **re-agreement** — agreement of an owner to a statement version newer than the one the owner last agreed to
- **switcher** — select labelled "Business" at the top of My business that names each listing and each draft of the owner

`ListingStage` has five values: `Draft`, `ReadyToReview` ("Ready to review"),
`ChangesRequested` ("Changes requested"), `Live` and `Declined`. A pause is not
a stage: a live listing carries `IsPaused`. A submitted listing shows the mark
"Pending verification" to its owner until it is `Live`.

Submission is a create request and carries an idempotency key, so a double
press or a network retry submits the listing once. An unconfirmed member may
fill in the form but may not submit it.

## Description

The feature is a vertical slice from the `/list` page to the `Jubilee database`,
with one scheduled job in `Jubilee Worker` for the re-agreement. Submission
sends no e-mail and involves no third party (ADR 0041): the listing goes
straight to the verification queue. The names below are the names in the code;
the decisions are in ADR 0018, ADR 0041, ADR 0050 and ADR 0052.

### Submission

- **`ListBusinessPage`** — Angular page at `/list`. `submit` runs `check`, the
  browser copy of the submission rules. With no error it sets `busy`, which
  makes the fields read-only and shows the button with `aria-busy="true"`
  (`L2-127` AC1), saves the form through `ListingDraftsApi`, and then calls
  `submit` with the same body and the idempotency key. On success it shows
  "{Business} is in for verification" with "Nothing more to do right now.
  We’ll e-mail you the moment you’re live.", "Go to My business" and "Add more
  products" (or "Add more services"). Under "What happens next" a `jb-timeline`
  shows three steps: "You submitted {Business}" (complete), "We review your
  listing" with "Within two business days" (current) and "You’re live" with "We
  e-mail you the moment members can find you" (upcoming). An HTTP 422 answer
  restores the editable form with the field errors; another failure, or no
  answer within 10 seconds (`SUBMIT_TIMEOUT_MS`), shows "We couldn’t save that.
  Try again." (`L2-127` AC2).
- **`FormSummary`** (`jb-form-summary`) — component of the `components`
  library. For three invalid fields it shows "Fix 3 things to continue" with
  `role="alert"`, lists each error as a link to its field, and receives focus
  (`L2-078` AC2, `L2-126` AC1).
- **`newKey`** — helper of the `api` library. The page creates one key when it
  opens and sends it as `idempotencyKey` in the body of each try of the
  submission (`L2-132`). The API has no idempotency middleware and reads no
  header.
- **`ListingDraftsApi`** — service contract behind `LISTING_DRAFTS_API`.
  `submit` sends `POST /api/listing-drafts/{id}/submit` and returns a
  `SubmittedListing`.
- **`ListingDraftsController`** — ASP.NET Core controller. `Submit` carries
  `[RequiresConfirmedEmail]`: an unconfirmed member receives HTTP 403 with code
  `EMAIL_UNCONFIRMED`, and the page keeps the button disabled with "Confirm
  your e-mail to submit." (`L2-005` AC2). It answers HTTP 201 with a
  `SubmittedListingDto`.
- **`SubmitListingCommandHandler`** — MediatR handler; it has no separate
  validator. It works in this order.
  1. It looks for a `ListingSubmission` of the caller with the same
     `IdempotencyKey` and returns that first result when it finds one. The key
     is kept with the submission, so a repeat is answered for longer than the
     24 hours `L2-132` asks for.
  2. It loads the draft with `Drafts.Owned`; the draft of another member is
     HTTP 404 (`L2-133` AC2).
  3. It checks the name, the tagline (90 characters at most), the category
     and the agreement, and for a space the space fields. A failure saves the
     typed values to the draft and returns HTTP 422 with a code per field
     (`REQUIRED`, `TOO_LONG:{n}`), the codes the page words with `messageFor`
     (`L2-126` AC5).
  4. It flags `CONTACT_IN_TEXT` when the name or the tagline contains a URL,
     an e-mail address, a phone number or a discount code. A bare domain is
     flagged in the tagline only, so the name "Luzandre.com" is not flagged
     (`L2-072` AC6).
  5. It builds the slug with `Slugs.From` and appends "-2", "-3" and so on
     while the slug is taken (`L2-072` AC5).
  6. It creates the listing with `Listing.Create`, sets its kind, owner, place
     and highlight, and calls `MoveTo(ListingStage.ReadyToReview)`.
  7. `AddItems` creates a `Product` for each `DraftItem` of a shop, with its
     name, price, description and stock, and a `Service` for each `DraftItem`
     of a services business, with its name, detail, price and action. A
     service to book keeps its meeting length and how it meets. A service whose
     booking details are not acceptable (a length outside 15 to 480 minutes, no
     way to meet, or in person with no place) is kept as `ServiceAction.Ask`
     (`L2-073` AC5). A space has no items; the handler calls `DescribeSpace`.
  8. It records the `ListingSubmission` with `ListingSubmission.Record`, which
     stores `StatementOfFaith.Version` as `StatementVersion`, the time as
     `AgreedAt` and `SubmittedAt`, the key and the flags (`L2-075` AC2), and
     calls `MarkReady`.
  9. It removes the draft and saves everything in one unit of work.
- **`ListingSubmission`** — domain entity, one per listing. `SubmittedAt`
  orders the verification queue and `ReadyAt` is where "overdue" counts from
  (`L2-099`). The products and services of a listing that is not live are not
  public (`L2-073` AC4).

### The review screen

`GetVerificationReviewQuery` returns the `VerificationReviewDto` that
`AdminVerificationPage` of the admin application shows. Two of its fields come
from this feature.

- **`ItemCount`** — number of products and services of the listing. When it is
  0 and the listing is not a space, the page shows "No products or services
  yet" above the checklist (`L2-073` AC3).
- **`ReviewOwner.OtherListings`** — list of `ReviewOtherListing(Name,
  StageLabel)`: each other listing of the owner that is not deleted, with its
  stage worded by `Workspace.StageLabel` as the switcher words it, and each
  listing draft of the owner as "Draft". The Owner panel shows "Laurent
  Photography · Pending verification" per entry, or "None" (`L2-079` AC3).

### More than one listing

The limit is in `SaveListingDraftCommandHandler`: a save without a draft id
counts the caller's listings that are not deleted and the caller's drafts and
refuses a sixth with HTTP 409 and code `LISTING_LIMIT` (`Drafts.MaxListings`).
`ListBusinessPage` shows the detail of the answer, "You can list up to 5
businesses. Write to help@jubilee.example for more." (`L2-079` AC2).

"List another business" and the switcher are on `MyBusinessPage` and are
described in
[View the business overview](../../owner-workspace/view-business-overview/README.md)
(ADR 0052). In short: "List another business" is a link to `/list?draft=new`;
`MyBusinessDto.Businesses` names each listing with its stage and each draft;
choosing a listing sends `PUT /api/my-business/current`, which stamps
`Listing.WorkspaceChosenAt` so that `Workspace.Find` returns that listing from
then on; choosing a draft opens `/list?draft={id}` (`L2-079` AC1, AC4 and AC5).

### Re-agreement to a new statement of faith

- **`StatementOfFaith`** — static class of the domain. `Version` is the date
  the statement was last updated, `UpdatedOn` is that date and `AgreeBy` is 30
  days later.
- **`StatementAgreement`** — domain entity: the owner's subject, the version
  and the time of the agreement. An owner's latest agreed version is the
  greatest of the owner's `ListingSubmission.StatementVersion` and
  `StatementAgreement.Version`. A member with neither is not an owner and is
  not asked.
- **`StatementDueDto`** — part of the answer of `GET /api/session` as
  `statementDue`: `version`, `updatedOn`, `agreeBy`, `overdue` and `business`.
  It is present only for an owner whose latest agreed version is earlier than
  `StatementOfFaith.Version`. `SessionController` asks `GetStatementDueQuery`,
  which reads the latest agreed version with
  `StatementAgreements.LatestAgreedAsync` and names the listing
  `Workspace.Find` returns; `overdue` is true once the Toronto date is after
  `StatementOfFaith.AgreeBy`.
- **`StatementAgreementDialog`** — CDK dialog in `dialogs/statement-agreement`.
  The root component `App` opens it once per load of the app when the session
  carries `statementDue`. It is titled "The statement of faith has been
  updated" and says "We updated Jubilee’s statement of faith on {date}. Read it
  and agree by {date} to keep your listing on Jubilee.", with the link "Read
  the statement of faith" (a new tab), "Not now" and "I agree". When `overdue`
  is true it says "{Business} is paused until you agree to the updated
  statement of faith." "I agree" shows the button busy and posts the version.
  On success the dialog closes and a toast says "Thank you" with "Your
  agreement to the statement of faith is recorded." On failure the dialog
  stays open with "We couldn’t record that. Try again." (`L2-075` AC3 and
  AC4). It posts through `StatementOfFaithApi`, the contract behind
  `STATEMENT_OF_FAITH_API`, and on success tells `SessionService`
  (`statementAgreed`), so the banner of My business goes at once. Escape and a
  click outside are "Not now", except while the agreement is being recorded.
- **`MyBusinessPage`** — while the session carries `statementDue` it shows the
  banner "The statement of faith has been updated. Read it and agree by {date}
  to keep {Business} live." with "Read and agree", which opens the dialog
  (`L2-075` AC5). When the agreement is overdue the banner says the listing is
  paused and offers "Read and agree" in place of "Resume listing" (`L2-096`
  AC6).
- **`StatementOfFaithController`** —
  `POST /api/statement-of-faith/agreement` sends `AgreeToStatementCommand`.
  The handler refuses a version other than the current one with HTTP 409 and
  code `STATEMENT_VERSION`, records one `StatementAgreement` per owner and
  version however often it is called, and resumes each listing the job paused,
  the listings that carry `Listing.StatementLapsedAt`, with
  `Listing.ResumeAfterStatement`. Such a listing is live again at once, without
  new verification (`L2-075` AC6); a listing the owner paused themselves stays
  paused. `MyBusinessPage` loads the overview again when the session no longer
  carries `statementDue`.
- **`StatementAgreementJob`** — hosted service in `Jubilee Worker`. Once a day
  it sends `RunStatementAgreementJobCommand`, whose handler works through
  `ScheduledJobs.RunOnceAsync` with the job name `statement-agreement` and the
  interval of 24 hours, so that one instance does the work of the day and its
  last success is recorded in `JobRun` (`L2-182` AC1). After `AgreeBy` the work
  takes each owner who has still not agreed, pauses each of the owner's live
  listings with `Listing.PauseForStatement`, which stamps
  `Listing.StatementLapsedAt`, and queues one e-mail per listing in the outbox
  with the subject "{Business} is paused until you agree to the statement of
  faith". A listing already stamped is skipped, so a repeat sends nothing.
- **`ResumeListingCommandHandler`** — handler of the owner workspace
  ([Pause and resume a listing](../../owner-workspace/pause-listing/README.md)).
  While the owner's agreement is overdue it refuses with HTTP 409 and code
  `STATEMENT_AGREEMENT_REQUIRED` and the listing stays paused (`L2-096` AC6).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-078` | `L1-011` | When a valid form is submitted, the system shall make the fields read-only and the button busy, move the listing to the stage "Ready to review" in the verification queue and show "{Business} is in for verification" with the three steps of "What happens next". An invalid form shall show the summary "Fix {n} things to continue" with a link to each field and move focus to it. My business shall then show the pending state. |
| `L2-075` | `L1-011` | Submission shall require the statement of faith checkbox and shall record the agreement with the time and the version of the statement. When the statement is updated, an owner whose latest agreement is to an earlier version shall be asked to agree in the dialog "The statement of faith has been updated" on the next opening of the app, and My business shall offer "Read and agree" meanwhile. An agreement to another version than the current one shall be refused with HTTP 409 and code `STATEMENT_VERSION`. When 30 days pass without the agreement, the daily job shall pause each live listing of the owner and e-mail the owner once per listing; when the owner agrees, each such listing shall be live again at once without new verification. |
| `L2-079` | `L1-011` | An owner may hold up to 5 listings, shown in a switcher at the top of My business with "List another business", and the system shall refuse a sixth. The verification team shall see each other listing of the owner with its stage and each draft under "Other listings" when reviewing one, or "None". |
| `L2-072` | `L1-011` | At submission the system shall generate a unique URL slug from the business name, with a numeric suffix if taken, and shall accept and flag a name or tagline that contains a URL, e-mail address, phone number or discount code. The submitted listing shall carry the highlight. |
| `L2-073` | `L1-011` | Submission shall be allowed with zero items, and the review screen shall then show "No products or services yet" above the checklist. At submission each product shall become a product of the listing with its name, price, stock and description and each service a service with its name, detail, price and action; a service whose booking details the API would not accept shall be kept as "Ask for a quote". |
| `L2-096` | `L1-013` | When the owner has not agreed to the current statement of faith 30 days after it was updated, "Resume listing" shall be refused with HTTP 409 and code `STATEMENT_AGREEMENT_REQUIRED`, the listing shall stay paused, and My business shall offer "Read and agree" in place of "Resume listing". |
| `L2-099` | `L1-014` | The verification queue shall list each submitted listing, ordered oldest submitted first, and shall mark a listing overdue when it has been "Ready to review" for more than 2 business days. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member shall be able to browse, search and save but shall not message, book, request or list a business; the API shall respond 403 with code `EMAIL_UNCONFIRMED`. |
| `L2-126` | `L1-018` | A page form submitted with errors shall show the summary "Fix {n} thing(s) to continue", mark each invalid field, keep typed values, and apply the same rules and message codes on the server. |
| `L2-127` | `L1-018` | While a form or dialog is submitting, the fields shall be read-only, the primary button shall show a spinner with `aria-busy="true"`, and a second press shall send nothing. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | Each API endpoint shall check the caller's role and ownership of the specific object before doing anything; a request for another member's object shall return 404. |
| `L2-182` | `L1-025` | Each scheduled job shall be idempotent, shall run at most once per schedule across instances, and shall record its last success. |

## Diagrams

### System context

The owner submits a listing and agrees to the statement of faith. Jubilee puts
the listing in front of the verification team, and e-mails the owner through
the `E-mail provider` when a listing is paused for a missing agreement.

![C4 system context for submitting for verification](diagrams/c4-context.png)

### Containers

`Jubilee Web` submits with an idempotency key in the body. `Jubilee API` stores
the listing, the submission and the agreement in the `Jubilee database`; it
uses no cache for the key. `Jubilee Admin Web` shows the review screen, and
`Jubilee Worker` runs the daily agreement job.

![C4 container view for submitting for verification](diagrams/c4-container.png)

### Components

`ListingDraftsController` sends `SubmitListingCommand` after the
confirmed-e-mail filter. `StatementOfFaithController` sends
`AgreeToStatementCommand`. `StatementAgreementJob` reaches the pausing work
through `ScheduledJobs`.

![C4 component view for submitting for verification](diagrams/c4-component.png)

### Class structure

`SubmitListingCommandHandler` turns a `ListingDraft` into a `Listing` and a
`ListingSubmission` and returns a `SubmittedListingDto`. `StatementAgreement`
and `ListingSubmission` both record a statement version, and
`ReviewOwner` carries a `ReviewOtherListing` per other listing.

![Class diagram for submitting for verification](diagrams/class-structure.png)

### Behaviour — submit a listing for verification

The browser checks first and saves the draft. The server checks the confirmed
e-mail, the idempotency key, the ownership and the rules, then creates the
listing in `ReadyToReview`, where the verification queue shows it.

![Sequence diagram for submitting a listing for verification](diagrams/sequence-submit.png)

### Behaviour — list another business

The switcher names the owner's listings and drafts. "List another business"
opens a blank form; its first save succeeds below 5 listings and returns
HTTP 409 at 5.

![Sequence diagram for listing another business](diagrams/sequence-list-another.png)

### Behaviour — agree again to an updated statement of faith

The session names the agreement that is due and the app opens the dialog. An
agreement in time changes nothing else. After 30 days the daily job pauses the
owner's live listings and e-mails the owner; the agreement then makes them live
again.

![Sequence diagram for agreeing again to an updated statement of faith](diagrams/sequence-re-agree.png)
