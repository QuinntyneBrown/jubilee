# Architecture decisions

One record per decision that shapes the code. Read the records for an area before changing it,
and add a record when a decision is made or replaced. A record is never rewritten to say
something else: a new record supersedes it and both say so.

| No. | Decision | Status |
|---|---|---|
| [0001](0001-backend-stack.md) | Backend stack: .NET 10, MediatR, EF Core, SQL Server, with SQLite for tests and the e2e API | Accepted |
| [0002](0002-frontend-workspace.md) | Frontend workspace: three Angular projects built from source, one global component stylesheet, `jb-*` attribute selectors | Accepted, amended by 0035 |
| [0003](0003-directory-read-cache.md) | Directory read cache: 60 seconds, removed by a SaveChanges interceptor when a listing changes (the designed path, no outbox handler), and a rate limit on public reads | Accepted |
| [0004](0004-directory-ordering-rules.md) | Directory ordering rules: the Recommended score, category groups, "From the shops" and the category fact | Accepted |
| [0005](0005-visual-baselines-from-mocks.md) | Visual regression: baselines are rendered from the mocks on each run | Accepted |
| [0006](0006-session-and-navigation-before-sign-in.md) | Session and navigation endpoints before sign-in exists | Accepted |
| [0007](0007-listing-pages-before-accounts-and-requests.md) | Listing pages before accounts, requests and messaging exist: owner subject, links to later journeys | Accepted |
| [0009](0009-tests-without-a-backend-or-database.md) | Tests run without a real backend or database: Playwright API mocking for e2e, EF Core InMemory for the backend | Accepted |
| [0010](0010-behaviour-tests-only-by-default.md) | Only behaviour tests run; the visual, responsive and accessibility sweeps run by hand | Accepted |
| [0011](0011-search-index-over-the-database.md) | Search index: query-time analysis over the database behind `ISearchIndex`, always current, with no indexing job (the final design) | Accepted |
| [0012](0012-account-join-decisions.md) | Joining: Argon2id, outbox e-mail, confirmation links, the bounce webhook secret and Google linking | Accepted |
| [0014](0014-messaging-decisions.md) | Messaging: one conversation per business, read marks, photos, limits, report and block | Accepted, completed by 0039 |
| [0015](0015-booking-decisions.md) | Booking: weekday-bitmask hours, fixed slots, one request lifecycle, idempotent bookings | Accepted |
| [0016](0016-quote-request-decisions.md) | Quote requests: one request row, ten-digit phone, field codes, no pronouns; amended with the phone prefilled from the profile through the dialog's options, the notifications and the quote card | Accepted, amended 12 November 2026 |
| [0017](0017-order-request-decisions.md) | Order requests: delivery methods, server-computed amounts, no tax, stock checked at send | Accepted |
| [0018](0018-listing-onboarding-decisions.md) | Listing onboarding: drafts, limit, submission flags, expiry; amended with the editors on `/list`, the highlight, agreeing again to an updated statement of faith, and the draft expiry as scheduled work | Accepted, amended by 0041, amended 12 November 2026 |
| [0019](0019-church-reference-decisions.md) | Church reference: hashed links, owner-safe status, resend, remind, change | Superseded by 0041 |
| [0020](0020-verification-decisions.md) | Verification: the team, decisions, stages, overdue, checklist, retention and audit | Accepted, partly superseded by 0040, amended by 0041 |
| [0013](0013-server-side-sessions.md) | Server-side sessions in the database, sign-in throttling, drafts and the sign-in prompt | Accepted, completed by 0046 |
| [0008](0008-frontend-file-per-type.md) | Frontend: one file per type, no single-file components (`templateUrl`, never `template`) | Accepted |
| [0013](0013-marketing-site-application.md) | Marketing site: a second, static Angular application with editorial content and one `APP_URL` | Accepted, amended by 0044 |
| [0035](0035-presentation-in-the-components-library.md) | Prefer best practice; presentation only in `components`, one encapsulated `.scss` per component, BEM names | Accepted |
| [0036](0036-component-parity-specs.md) | Component parity specs: `npm run parity`, against the mocks and the Magic Patterns reference, in CI | Accepted |
| [0037](0037-google-sign-in-setup.md) | Google sign-in setup: one OAuth client, configured per environment | Accepted |
| [0038](0038-log-in-and-sign-up-screens.md) | Log in and Sign up screens: the Magic Patterns frame, its words, and what stays as it was | Accepted, amended by 0041 |
| [0037](0037-google-sign-in-setup.md) | Google sign-in setup: one OAuth client, redirect URI from `App:PublicBaseUrl`, off and hidden without keys | Accepted |
| [0038](0038-e-mail-delivery.md) | E-mail delivery: Azure Communication Services Email, one HTML layout rendered from the text | Accepted, amended by 0041 |
| [0039](0039-finish-messaging-decisions.md) | Finish messaging: the conversation menu, photos shrunk on the device and renewed links, real-time arrival over the event stream, request cards, the away period | Accepted |
| [0040](0040-separate-admin-application.md) | The admin application: a third Angular application, staff sessions through Entra ID with a proved second factor, a network allow-list at the API and the admin host | Accepted |
| [0042](0042-rooms-and-rentals.md) | Rooms and rentals: a space is a listing kind with owned rental details, a space request is a request kind, the exact address released only to the accepted renter | Accepted |
| [0041](0041-remove-church-reference-and-add-home-church-address.md) | The church reference is removed: submit goes straight to Ready to review, two stages and the reference data go; an optional home church address is added | Accepted |
| [0043](0043-member-feedback.md) | Member feedback: one feedback record of four kinds, a corner dialog for the panel, check-ins addressed by id, statuses and replies shown while writing them is deferred | Accepted |
| [0044](0044-launching-soon.md) | Launching soon: the marketing site sends two forms to `/api/launch` on its own origin, links nowhere outside itself, `APP_URL` removed, submissions read with the CLI, the way back is a revert | Accepted, amended by 0047 |
| [0045](0045-finish-view-business-and-products.md) | Finish viewing a business and its products: back-in-stock notices written with the stock change, once per alert, under "Request updates"; `stockChange` for the owner's toast; `status` for the preview of a listing that is not public | Accepted |
| [0046](0046-finish-sign-in-and-out.md) | Finish sign in and out: drafts kept on the device by member, address and form; the started action carried in the return path; `__Host-jubilee.session` outside Development; no CORS allowlist because every caller is same-origin | Accepted |
| [0047](0047-launch-forms-never-lose-a-submission.md) | The launch forms never lose a submission: `deploy.sh` sets the marketing host on every deployment and checks it, a forwarded request names the API's host, the marketing host keeps what the API cannot take and sends it again, the page keeps sending instead of showing a fault, and each new sign-up e-mails the team | Accepted |
| [0048](0048-finish-book-a-meeting.md) | Finish book a meeting: meeting hours the owner sets (days, one window a day in Toronto time, a slot length) stored on the listing; the default times stand until an owner saves; saving never changes a request already sent | Accepted |
| [0049](0049-finish-join-jubilee.md) | Finish joining: the unconfirmed address changed in a dialog of its own, an address in use said from the session, the resend limit said in the banner, and tokens kept out of the logs by `LoggedPath` | Accepted |
| [0050](0050-finish-respond-to-customer-requests.md) | Finish responding to customer requests: the page listens to the event stream and polls only while it cannot connect, "Replies fast" is a `jb-badge` on the listing page and the business card, the response-time job runs once per hour across instances through `JobRun`, and a confirmation that answers after its dialog closed is still reported | Accepted |
| [0051](0051-finish-message-a-business.md) | Finish messaging: the away notice as a toast with its day, the inbox paged by 50 with a button, message photos scanned by ClamAV before they are stored and kept by `IMediaStore` (no scanner, no photo), photos still not queued offline, conversation reports limited to 10 a day | Accepted |
| [0052](0052-finish-run-a-business-listing.md) | Finish running a business listing: "Saved by members" counts first saves of the week, the owner's choice of business is kept on the listing and switched with a select on My business, a re-check e-mails the owner and the team, photos are reordered by drag with the CDK beside the move buttons, public photos are a `picture` with `srcset` drawn by `jb-media-tile`, and the 60-second pause bound is proved for every public read | Accepted |
| [0053](0053-finish-stay-notified.md) | Finish stay notified: the daily summary holds "New messages" and "Request updates" in the outbox and sends one e-mail at 7:00 a.m. Toronto time on `ScheduledJobs`; a new business is told in the app at once and in a weekly note, "browsed" being read from the listing views that exist; tips for owners are a fixed series, one a month; promotional e-mail needs `Email:MailingAddress`; the footer link opens `/unsubscribe/{token}`; the application opens the event stream again when the browser gives up; no backplane, because each connection reads the database |
| [0054](0054-finish-save-listings.md) | Finish save listings: the heart sits beside the card's link in `jb-saveable`, named "Save {name}" or "Saved. Remove {name} from saved" and busy while its request is on its way; `CardHearts` wires the hearts of Browse, a category, search, a shop and the listing and product pages; a visitor's save on a card is remembered for the tab; the application root clears `SavedStore` whenever no member is signed in | Accepted |

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
