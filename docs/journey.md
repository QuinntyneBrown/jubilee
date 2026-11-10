# Jubilee user journeys

Each row is one end-to-end user journey to implement, ordered by the value it adds to the user, highest first. The journeys are composed
from the feature designs in [`detailed-designs/`](detailed-designs/README.md), the requirements in
[`specs/L2.md`](specs/L2.md) and the screens in [`mocks/`](mocks/README.md).

Effort is working days for one intermediate developer, tests included.

| # | Journey | Description | Effort (days) | Prompt |
|---|---|---|---|---|
| 1 | Discover businesses | Explore the welcome page, browse home and filtered category pages. | 10 | [01-discover-businesses.md](prompts/01-discover-businesses.md) |
| 2 | View a business and its products | Open a business or shop page and its product details. | 7 | [02-view-business-and-products.md](prompts/02-view-business-and-products.md) |
| 3 | Search the directory | Search businesses, services and products by keyword with grouped results. | 6 | [03-search-directory.md](prompts/03-search-directory.md) |
| 4 | Join Jubilee | Create an account by e-mail or Google and confirm the address. | 8 | [04-join-jubilee.md](prompts/04-join-jubilee.md) |
| 5 | Sign in and out | Sign in, stay signed in safely, and sign out. | 6 | [05-sign-in-and-out.md](prompts/05-sign-in-and-out.md) |
| 6 | Message a business | Hold a private conversation with a business from an inbox. | 12 | [06-message-a-business.md](prompts/06-message-a-business.md) |
| 7 | Book a meeting | Request a meeting time for a service with a business. | 6 | [07-book-a-meeting.md](prompts/07-book-a-meeting.md) |
| 8 | Request a quote | Describe a job and ask a business for a quote. | 3 | [08-request-a-quote.md](prompts/08-request-a-quote.md) |
| 9 | Request a product | Send a shop an order request for a product, without payment. | 3 | [09-request-a-product.md](prompts/09-request-a-product.md) |
| 10 | List a business | Describe a business, name a church reference, submit for verification. | 12 | [10-list-a-business.md](prompts/10-list-a-business.md) |
| 11 | Answer a church reference | A pastor confirms or declines an owner through a private link. | 6 | [11-answer-church-reference.md](prompts/11-answer-church-reference.md) |
| 12 | Verify a listing | Staff review submitted listings, then approve or request changes. | 10 | [12-verify-a-listing.md](prompts/12-verify-a-listing.md) |
| 13 | Respond to customer requests | See incoming requests and confirm or decline each one. | 6 | [13-respond-to-customer-requests.md](prompts/13-respond-to-customer-requests.md) |
| 14 | Track and cancel requests | Follow each request's progress and cancel an open one. | 6 | [14-track-and-cancel-requests.md](prompts/14-track-and-cancel-requests.md) |
| 15 | Run a business listing | Monitor the listing, edit its details, pause or resume it. | 9 | [15-run-a-business-listing.md](prompts/15-run-a-business-listing.md) |
| 16 | Manage products and services | Add, edit, reorder and delete products and services. | 8 | [16-manage-products-and-services.md](prompts/16-manage-products-and-services.md) |
| 17 | Stay notified | Receive events through the notification centre, toasts, banners and e-mail. | 9 | [17-stay-notified.md](prompts/17-stay-notified.md) |
| 18 | Recover a forgotten password | Request a reset link by e-mail and set a new password. | 3 | [18-recover-password.md](prompts/18-recover-password.md) |
| 19 | Save listings for later | Save businesses and products to a private list. | 3 | [19-save-listings.md](prompts/19-save-listings.md) |
| 20 | Manage profile and settings | Edit profile, change e-mail or password, choose which e-mails arrive. | 6 | [20-manage-profile-and-settings.md](prompts/20-manage-profile-and-settings.md) |
| 21 | Share or report a listing | Share a listing's link or report a problem with it. | 3 | [21-share-or-report-listing.md](prompts/21-share-or-report-listing.md) |
| 22 | Read policies and get help | Read the statement of faith, terms, privacy notice and help. | 2 | [22-read-policies-and-get-help.md](prompts/22-read-policies-and-get-help.md) |
| 23 | Recover from errors | See clear pages for missing, forbidden, failed or maintenance states. | 3 | [23-recover-from-errors.md](prompts/23-recover-from-errors.md) |
| 24 | Use Jubilee offline | Browse cached pages and queue messages on poor connections. | 7 | [24-use-jubilee-offline.md](prompts/24-use-jubilee-offline.md) |
| 25 | Moderate reports and feature businesses | Staff handle reports and choose the featured businesses. | 5 | [25-moderate-reports-and-feature-businesses.md](prompts/25-moderate-reports-and-feature-businesses.md) |
| 26 | Download data and delete account | Export personal data or permanently delete the account. | 5 | [26-download-data-and-delete-account.md](prompts/26-download-data-and-delete-account.md) |

**Total: 164 days** for the 26 journeys.

## Notes

- The order is by user value: first finding and viewing verified businesses, then joining and contacting
  them, then the supply side that fills the directory, then follow-up, convenience and housekeeping. It is
  not a strict dependency order. Each prompt names the journeys it builds on and builds the smallest seam
  itself when one is missing.
- [`AGENTS.md`](../AGENTS.md) holds the rules and the folder structure every journey follows.
- No application code exists yet. The first journey implemented also pays a one-off foundation cost of about
  15 days (the `backend/`, `frontend/`, `e2e/` and `eng/` skeleton, design tokens and base components, CI). It is not in the figures above. Every
  prompt carries the foundation as a phase that is skipped once the solution exists.
- The cross-cutting designs (accessibility, design system, interaction states, responsive design, security,
  privacy, performance, operations) are not journeys. Each prompt binds its journey to them, and the effort
  figures include meeting them for that journey's screens and endpoints. Production operations work that no
  journey reaches (backups, deployment pipeline, load and penetration testing) is not estimated here.
- Each prompt in [`prompts/`](prompts/) was written with the `writing-feature-prompts` skill and runs one
  journey from artifact alignment to a pull request.
