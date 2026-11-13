# Jubilee user journeys

Every journey serves Jubilee's mission, the single level-0 requirement in
[`specs/L0.md`](specs/L0.md):

> Abiding in Jesus and for love of Him, Jubilee equips Christian business people in Toronto to
> prosper with purpose and resource His Kingdom.

Each row is one end-to-end user journey to implement, ordered by the value it adds to the user, highest first. The journeys are composed
from the feature designs in [`detailed-designs/`](detailed-designs/README.md), the requirements in
[`specs/L2.md`](specs/L2.md) and the screens in [`mocks/`](mocks/README.md).

Effort is working days for one intermediate developer, tests included. Complete is the share of the
journey that is implemented: the effort-weighted average of its feature designs in
[`estimates/`](estimates/README.md).

| # | Journey | Description | Effort (days) | Complete |
|---|---|---|---|---|
| 1 | Discover businesses | Explore the welcome page, browse home and filtered category pages. | 10 | 100% |
| 2 | View a business and its products | Open a business or shop page and its product details. | 7 | 100% |
| 3 | Search the directory | Search businesses, services and products by keyword with grouped results. | 6 | 100% |
| 4 | Join Jubilee | Create an account by e-mail or Google and confirm the address. | 8 | 98% |
| 5 | Sign in and out | Sign in, stay signed in safely, and sign out. | 6 | 100% |
| 6 | Message a business | Hold a private conversation with a business from an inbox. | 12 | 98% |
| 7 | Book a meeting | Request a meeting time for a service with a business. | 6 | 100% |
| 8 | Request a quote | Describe a job and ask a business for a quote. | 3 | 100% |
| 9 | Request a product | Send a shop an order request for a product, without payment. | 3 | 100% |
| 10 | List a business | Describe a business, agree to the statement of faith and publish it; it is live straight away. | 12 | 100% |
| 11 | Removed: answer a church reference | Jubilee no longer asks for a church reference (ADR 0041). The number is not reused. | 0 | n/a |
| 12 | Keep listings honest | The Jubilee team looks through published listings and takes down one that misrepresents a business. | 10 | 100% |
| 13 | Respond to customer requests | See incoming requests and confirm or decline each one. | 6 | 100% |
| 14 | Track and cancel requests | Follow each request's progress and cancel an open one. | 6 | 100% |
| 15 | Run a business listing | Monitor the listing, edit its details, pause or resume it. | 9 | 100% |
| 16 | Manage products and services | Add, edit, reorder and delete products and services. | 8 | 100% |
| 17 | Stay notified | Receive events through the notification centre, toasts, banners and e-mail. | 9 | 100% |
| 18 | Recover a forgotten password | Request a reset link by e-mail and set a new password. | 3 | 100% |
| 19 | Save listings for later | Save businesses and products to a private list. | 3 | 100% |
| 20 | Manage profile and settings | Edit profile, change e-mail or password, choose which e-mails arrive. | 6 | 100% |
| 21 | Share or report a listing | Share a listing's link or report a problem with it. | 3 | 100% |
| 22 | Read policies and get help | Read the statement of faith, terms, privacy notice and help; an administrator publishes a new version of each from the admin application. | 4 | 98% |
| 23 | Recover from errors | See clear pages for missing, forbidden, failed or maintenance states. | 3 | 100% |
| 24 | Use Jubilee offline | Browse cached pages and queue messages on poor connections. | 7 | 99% |
| 25 | Moderate reports and feature businesses | Staff handle reports and choose the featured businesses. | 5 | 100% |
| 26 | Download data and delete account | Export personal data or permanently delete the account. | 5 | 98% |
| 27 | Meet Jubilee on the marketing site | Read the marketing page and watch the pitch film, by pointer or keyboard, with its captions in the picture. Its links to the app and to listing (L2-185) are suspended while Jubilee is launching soon and wait on the owner's decision to open it; journey 31 takes their place until launch. | 4 | 95% |
| 28 | Rent a room or space | List a room, suite or hall; find spaces by term on Browse, the category and search; request one and let the owner confirm. | 19 | 100% |
| 29 | Give feedback | Rate Jubilee, report a bug or send kudos from any screen, answer a check-in, and follow past feedback. | 9 | 99% |
| 30 | Work in the admin application | Staff sign in to the admin application through single sign-on from an allowed network, work in its shell and sign out; old admin links in the app point there. | 20 | 96% |
| 31 | Get ready for launch | Before Jubilee opens: see that it is launching soon, leave an e-mail address for the launch notice, or send a business's details to be listed on launch day; the team reads them with the CLI. | 7 | 100% |
| 32 | Write and read reviews | After a request the owner confirmed, write a review of the business, shop or space; read every listing's rating and reviews, sorted and filtered, and its average on the cards; edit or remove your review; the owner replies in public; anyone signed in reports a review and the Jubilee team takes it down. Requirements L2-226 to L2-240. | 14 | 95% |
| 33 | Discover and review software platforms | A founder lists a software platform (name, one line, web address, what it does, who it is for, pricing); it is found in its own category "Software platforms", in search and on a platform page whose main action is a link out to its website, with Message, save, share and report; a member who states they have used it writes a review, and the rest of reviews applies. Requirements L2-248 to L2-262. | 16 | 0% |

**Total: 249 days** for the 32 journeys, **93% complete** weighted by effort.

## Notes

- The order is by user value: first finding and viewing businesses, then joining and contacting
  them, then the supply side that fills the directory, then follow-up, convenience and housekeeping. It is
  not a strict dependency order. Journeys 28 to 33 were added later and keep the number they were given.
- [`AGENTS.md`](../AGENTS.md) holds the rules and the folder structure every journey follows.
- The first journey implemented also paid a one-off foundation cost of about 15 days (the `backend/`,
  `frontend/`, `e2e/` and `eng/` skeleton, design tokens and base components, CI). It is not in the figures
  above.
- The cross-cutting designs (accessibility, design system, interaction states, responsive design, security,
  privacy, performance, operations) are not journeys. Each journey is bound to them, and the effort
  figures include meeting them for that journey's screens and endpoints. Journey 30 is the exception: it
  counts the two security designs that exist only for staff (authorize staff requests, restrict staff
  network) beside the admin application and staff sign-in. Production operations work that no
  journey reaches (backups, deployment pipeline, load and penetration testing) is not estimated here.
- The percentages were last recalculated from the code and its tests on 12 November 2026, after
  Jubilee began shipping without verification (ADR 0057) and that work was implemented: journey 10
  publishes a listing that is live at once (publish-listing), journey 12 is the Jubilee team's
  Listings screen and the takedown (browse-listings, take-down-listing), and the "Verified" mark and
  the verification copy have left journeys 1, 2, 3, 15, 22, 25, 27, 28 and 30, whose figures stand.
  What keeps journeys 10 and 12 below 100% is listed in [`estimates/`](estimates/README.md).
- [`prompts/`](prompts/) holds one implementation prompt per unfinished journey, named by its number. Each
  lists what the journey still lacks and runs it to 100%, from requirements to a pull request. Journey 28
  is complete and has none. The prompt for journey 27 is for launch day: it restores the links to the app. Its part that did not wait on
  launch (a behaviour spec for every criterion of L2-183, L2-184 and L2-186) was run on 12 November 2026; the
  row stays at 95% because L2-185 waits on the owner's launch decision.
- The prompt for journey 30 was run on 13 November 2026 (ADR 0070): every criterion of L2-188 to L2-195
  that code can meet has a test, and the row stays at 96% until the owner works through the checklist under
  "The admin application" in [`eng/azure/README.md`](../eng/azure/README.md).
