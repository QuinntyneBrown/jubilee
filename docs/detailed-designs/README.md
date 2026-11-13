# Jubilee detailed designs

This tree holds one detailed design per vertically sliced feature of Jubilee,
grouped by subsystem. Each feature folder contains a `README.md` with four
sections (Overview, Description, Requirements, Diagrams) and a `diagrams/`
folder with the PlantUML sources and their rendered images. Every feature traces
to level-2 requirements in [`docs/specs/L2.md`](../specs/L2.md), each of which
refines a level-1 requirement in [`docs/specs/L1.md`](../specs/L1.md), each of which
traces to the mission, the single level-0 requirement in [`docs/specs/L0.md`](../specs/L0.md).

## Architecture baseline

The designs share one set of containers. No code exists yet; the names below are
the names the designs introduce.

| Container | Technology | Responsibility |
|---|---|---|
| `Jubilee Web` | Angular single-page application | Pages, dialogs and notifications from `docs/mocks/` |
| `Jubilee Admin Web` | Angular single-page application | The admin application: staff sign-in and the listings, moderation and featured screens of the Jubilee team (ADR 0040, ADR 0057) |
| `Jubilee service worker` | Angular service worker | Offline cache and outgoing message queue |
| `Jubilee API` | ASP.NET Core | JSON API under `/api`, real-time hub, authentication, authorization |
| `Jubilee Worker` | .NET worker service | Background jobs, outbox dispatch, e-mail sending |
| `Jubilee database` | SQL Server | System of record |
| `Cache` | Redis | Sessions, rate-limit counters, idempotency keys, short-lived read caches |
| `Search index` | Query-time analysis of `Jubilee database` (ADR 0011) | Full-text search over businesses, services and products; part of `Jubilee API`, with no store of its own and no indexing job |
| `Media storage` | Object storage and CDN | Uploaded photos on a separate cookieless domain |

The Angular frontend is stated by the mocks. The backend technologies
(ASP.NET Core, MediatR, EF Core, SQL Server, Redis) are design decisions the
specifications do not fix; vendors for hosting, e-mail, search, bot challenge
and observability are marked `<TO SUPPLY>` in the feature designs.

## Subsystems and features

### accessibility

| Feature | L2 requirements cited |
|---|---|
| [Adapt visual presentation](accessibility/adapt-visual-presentation/README.md) | `L2-160`, `L2-161`, `L2-170` |
| [Announce to screen readers](accessibility/announce-to-screen-readers/README.md) | `L2-157`, `L2-159`, `L2-066` |
| [Operate by keyboard](accessibility/operate-by-keyboard/README.md) | `L2-158`, `L2-162`, `L2-112`, `L2-130` |

### admin

| Feature | L2 requirements cited |
|---|---|
| [Run the admin application](admin/run-admin-application/README.md) | `L2-188`, `L2-194`, `L2-098` |

### accounts

| Feature | L2 requirements cited |
|---|---|
| [Change credentials](accounts/change-credentials/README.md) | `L2-014`, `L2-015`, `L2-134`, `L2-140`, `L2-143`, `L2-126` |
| [Choose notification settings](accounts/choose-notification-settings/README.md) | `L2-016`, `L2-068`, `L2-182`, `L2-149`, `L2-118` |
| [Confirm e-mail](accounts/confirm-email/README.md) | `L2-004`, `L2-005`, `L2-140`, `L2-137`, `L2-118` |
| [Continue with Google](accounts/continue-with-google/README.md) | `L2-003`, `L2-010`, `L2-012`, `L2-135` |
| [Delete account](accounts/delete-account/README.md) | `L2-017`, `L2-129`, `L2-128`, `L2-180`, `L2-143` |
| [Download data](accounts/download-data/README.md) | `L2-018`, `L2-140`, `L2-196`, `L2-133`, `L2-182` |
| [Edit profile](accounts/edit-profile/README.md) | `L2-013`, `L2-196`, `L2-145`, `L2-019`, `L2-126`, `L2-133`, `L2-118` |
| [Join with e-mail](accounts/join-with-email/README.md) | `L2-001`, `L2-196`, `L2-002`, `L2-134`, `L2-137`, `L2-140`, `L2-141`, `L2-187` |
| [Manage session](accounts/manage-session/README.md) | `L2-010`, `L2-011`, `L2-116`, `L2-135` |
| [Reset password](accounts/reset-password/README.md) | `L2-008`, `L2-009`, `L2-134`, `L2-140`, `L2-141`, `L2-137` |
| [Sign in](accounts/sign-in/README.md) | `L2-006`, `L2-007`, `L2-012`, `L2-141`, `L2-137`, `L2-010`, `L2-187` |
| [Sign in as staff](accounts/sign-in-as-staff/README.md) | `L2-189`, `L2-190`, `L2-193`, `L2-098` |

### design-system

| Feature | L2 requirements cited |
|---|---|
| [Apply design tokens](design-system/apply-design-tokens/README.md) | `L2-169`, `L2-170`, `L2-172`, `L2-160` |
| [Build components](design-system/build-components/README.md) | `L2-171`, `L2-173`, `L2-163`, `L2-160` |

### directory

| Feature | L2 requirements cited |
|---|---|
| [Browse a category](directory/browse-category/README.md) | `L2-023`, `L2-024`, `L2-025`, `L2-026`, `L2-028`, `L2-113`, `L2-118`, `L2-202` |
| [Browse home](directory/browse-home/README.md) | `L2-021`, `L2-022`, `L2-027`, `L2-028`, `L2-012`, `L2-106`, `L2-118`, `L2-156`, `L2-201` |
| [Browse platforms](directory/browse-platforms/README.md) | `L2-248`, `L2-252`, `L2-253`, `L2-025`, `L2-026`, `L2-028`, `L2-118`, `L2-156` |
| [Browse spaces](directory/browse-spaces/README.md) | `L2-197`, `L2-201`, `L2-202`, `L2-203`, `L2-204`, `L2-208`, `L2-026`, `L2-028`, `L2-118`, `L2-156` |
| [Search the directory](directory/search-directory/README.md) | `L2-029`, `L2-030`, `L2-031`, `L2-032`, `L2-028`, `L2-118`, `L2-133`, `L2-181`, `L2-204` |
| [View welcome page](directory/view-welcome-page/README.md) | `L2-020`, `L2-028`, `L2-027`, `L2-106` |

### feedback

| Feature | L2 requirements cited |
|---|---|
| [Answer a moment check-in](feedback/answer-moment-check-in/README.md) | `L2-211` |
| [Follow your feedback](feedback/follow-your-feedback/README.md) | `L2-213`, `L2-123`, `L2-125`, `L2-133` |
| [Receive and store feedback](feedback/receive-and-store-feedback/README.md) | `L2-214`, `L2-132`, `L2-133`, `L2-136`, `L2-137`, `L2-138`, `L2-017`, `L2-018` |
| [Send feedback from the page](feedback/send-feedback-from-page/README.md) | `L2-212`, `L2-126`, `L2-138` |
| [Send feedback from the panel](feedback/send-feedback-from-panel/README.md) | `L2-210`, `L2-127`, `L2-128`, `L2-130`, `L2-132`, `L2-158` |

### interaction-states

| Feature | L2 requirements cited |
|---|---|
| [Confirm in dialogs](interaction-states/confirm-in-dialogs/README.md) | `L2-129`, `L2-130`, `L2-127`, `L2-128`, `L2-133` |
| [Deduplicate writes](interaction-states/deduplicate-writes/README.md) | `L2-132`, `L2-127`, `L2-120` |
| [Format dates and money](interaction-states/format-dates-and-money/README.md) | `L2-131` |
| [Present load states](interaction-states/present-load-states/README.md) | `L2-123`, `L2-124`, `L2-125`, `L2-118` |
| [Validate forms](interaction-states/validate-forms/README.md) | `L2-126`, `L2-127`, `L2-128`, `L2-132`, `L2-130` |

### listings

| Feature | L2 requirements cited |
|---|---|
| [Give a listing an address](listings/give-listing-an-address/README.md) | `L2-241`, `L2-242`, `L2-245`, `L2-072`, `L2-113` |
| [Open a listing by its address](listings/open-listing-by-address/README.md) | `L2-243`, `L2-245`, `L2-113`, `L2-028`, `L2-037` |
| [Report a listing](listings/report-listing/README.md) | `L2-039`, `L2-126`, `L2-128`, `L2-132`, `L2-133` |
| [Save a listing](listings/save-listing/README.md) | `L2-041`, `L2-042`, `L2-005`, `L2-012`, `L2-118`, `L2-133` |
| [Share a listing](listings/share-listing/README.md) | `L2-038`, `L2-028`, `L2-130` |
| [Share the address of a listing](listings/share-listing-address/README.md) | `L2-244`, `L2-245`, `L2-038`, `L2-078`, `L2-085`, `L2-087` |
| [View a business page](listings/view-business-page/README.md) | `L2-033`, `L2-034`, `L2-037`, `L2-040`, `L2-028`, `L2-118`, `L2-133`, `L2-205` |
| [View a platform](listings/view-platform/README.md) | `L2-254`, `L2-255`, `L2-248`, `L2-261`, `L2-262`, `L2-012`, `L2-028`, `L2-037`, `L2-118`, `L2-136` |
| [View a product](listings/view-product/README.md) | `L2-035`, `L2-036`, `L2-028`, `L2-118` |
| [View a space](listings/view-space/README.md) | `L2-205`, `L2-206`, `L2-208`, `L2-012`, `L2-028`, `L2-037`, `L2-118` |

### messaging

| Feature | L2 requirements cited |
|---|---|
| [Exchange messages](messaging/exchange-messages/README.md) | `L2-057`, `L2-058`, `L2-060`, `L2-062`, `L2-132`, `L2-133`, `L2-138` |
| [Read the inbox](messaging/read-inbox/README.md) | `L2-056`, `L2-059`, `L2-061`, `L2-118`, `L2-133` |
| [Report a conversation](messaging/report-conversation/README.md) | `L2-063`, `L2-132`, `L2-133`, `L2-180` |
| [Start a conversation](messaging/start-conversation/README.md) | `L2-055`, `L2-005`, `L2-126`, `L2-132` |

### moderation

The Jubilee team's side of listings, reports and featured businesses, in the
admin application. Jubilee ships without verification (ADR 0057): an owner
publishes a listing and it is live at once; the team looks through published
listings and takes down one that misrepresents a business.

| Feature | L2 requirements cited |
|---|---|
| [Browse listings](moderation/browse-listings/README.md) | `L2-098`, `L2-099`, `L2-133`, `L2-180`, `L2-118`, `L2-257` |
| [Feature businesses](moderation/feature-businesses/README.md) | `L2-106`, `L2-133`, `L2-180` |
| [Handle reports](moderation/handle-reports/README.md) | `L2-105`, `L2-063`, `L2-133`, `L2-150`, `L2-180` |
| [Take down a listing](moderation/take-down-listing/README.md) | `L2-100`, `L2-101`, `L2-098`, `L2-079`, `L2-150`, `L2-180`, `L2-257` |

### notifications

| Feature | L2 requirements cited |
|---|---|
| [Deliver real-time events](notifications/deliver-real-time-events/README.md) | `L2-070`, `L2-121` |
| [Send e-mail notifications](notifications/send-email-notifications/README.md) | `L2-068`, `L2-069`, `L2-016`, `L2-061` |
| [Show toasts and banners](notifications/show-toasts-and-banners/README.md) | `L2-066`, `L2-067`, `L2-005` |
| [View the notification centre](notifications/view-notification-centre/README.md) | `L2-064`, `L2-065`, `L2-118`, `L2-133` |

### offline

| Feature | L2 requirements cited |
|---|---|
| [Browse offline](offline/browse-offline/README.md) | `L2-119`, `L2-122`, `L2-120`, `L2-121` |
| [Queue messages offline](offline/queue-messages-offline/README.md) | `L2-120`, `L2-132`, `L2-119` |
| [Show connection state](offline/show-connection-state/README.md) | `L2-121`, `L2-067`, `L2-132` |

### onboarding

| Feature | L2 requirements cited |
|---|---|
| [Describe a listing](onboarding/describe-listing/README.md) | `L2-071`, `L2-072`, `L2-073`, `L2-076`, `L2-005`, `L2-126`, `L2-133`, `L2-198` |
| [Describe a platform](onboarding/describe-platform/README.md) | `L2-248`, `L2-249`, `L2-250`, `L2-251`, `L2-261`, `L2-262`, `L2-076`, `L2-077`, `L2-126`, `L2-133`, `L2-136` |
| [Describe a space](onboarding/describe-space/README.md) | `L2-197`, `L2-198`, `L2-199`, `L2-200`, `L2-076`, `L2-077`, `L2-126`, `L2-133` |
| [Save a draft](onboarding/save-draft/README.md) | `L2-077`, `L2-118`, `L2-133`, `L2-182` |
| [Publish a listing](onboarding/publish-listing/README.md) | `L2-078`, `L2-079`, `L2-028`, `L2-005`, `L2-126`, `L2-127`, `L2-132` |

### operations

| Feature | L2 requirements cited |
|---|---|
| [Back up and recover](operations/back-up-and-recover/README.md) | `L2-177`, `L2-180` |
| [Deliver e-mail](operations/deliver-email/README.md) | `L2-179`, `L2-004`, `L2-068` |
| [Deploy safely](operations/deploy-safely/README.md) | `L2-178`, `L2-195`, `L2-133`, `L2-180` |
| [Observe the system](operations/observe-the-system/README.md) | `L2-175`, `L2-176`, `L2-118` |
| [Record audit log](operations/record-audit-log/README.md) | `L2-180`, `L2-133`, `L2-150`, `L2-098` |
| [Run background jobs](operations/run-background-jobs/README.md) | `L2-182`, `L2-175` |
| [Stay available](operations/stay-available/README.md) | `L2-174`, `L2-181` |

### marketing

| Feature | L2 requirements cited |
|---|---|
| [Launching soon](marketing/launching-soon/README.md) | `L2-215`, `L2-216`, `L2-217`, `L2-218`, `L2-183`, `L2-186`, `L2-137`, `L2-148`, `L2-149`, `L2-150` |
| [Show the marketing site](marketing/show-marketing-site/README.md) | `L2-183`, `L2-184`, `L2-185`, `L2-186` |

### owner-workspace

| Feature | L2 requirements cited |
|---|---|
| [Edit a listing](owner-workspace/edit-listing/README.md) | `L2-087`, `L2-088`, `L2-126`, `L2-127`, `L2-133`, `L2-138`, `L2-209`, `L2-208`, `L2-256` |
| [Manage products](owner-workspace/manage-products/README.md) | `L2-089`, `L2-090`, `L2-091`, `L2-092`, `L2-132`, `L2-133`, `L2-128`, `L2-129` |
| [Manage services](owner-workspace/manage-services/README.md) | `L2-093`, `L2-094`, `L2-095`, `L2-090`, `L2-132`, `L2-133`, `L2-129` |
| [Pause and resume a listing](owner-workspace/pause-listing/README.md) | `L2-096`, `L2-028`, `L2-067`, `L2-129`, `L2-133` |
| [View the business overview](owner-workspace/view-business-overview/README.md) | `L2-085`, `L2-086`, `L2-097`, `L2-133`, `L2-065`, `L2-118` |

### performance

| Feature | L2 requirements cited |
|---|---|
| [Meet API latency and scale](performance/meet-api-latency-and-scale/README.md) | `L2-152`, `L2-154`, `L2-156`, `L2-070`, `L2-118` |
| [Meet page budgets](performance/meet-page-budgets/README.md) | `L2-151`, `L2-153`, `L2-155`, `L2-088` |

### privacy

| Feature | L2 requirements cited |
|---|---|
| [Enforce data visibility](privacy/enforce-data-visibility/README.md) | `L2-145`, `L2-150`, `L2-133`, `L2-180` |
| [Manage e-mail consent](privacy/manage-email-consent/README.md) | `L2-149`, `L2-016`, `L2-068` |
| [Retain and protect data](privacy/retain-and-protect-data/README.md) | `L2-147`, `L2-148`, `L2-182` |

### requests

| Feature | L2 requirements cited |
|---|---|
| [Book a meeting](requests/book-meeting/README.md) | `L2-044`, `L2-050`, `L2-043`, `L2-005`, `L2-132` |
| [Cancel a request](requests/cancel-request/README.md) | `L2-049`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Confirm a request](requests/confirm-request/README.md) | `L2-052`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Decline a request](requests/decline-request/README.md) | `L2-053`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Handle incoming requests](requests/handle-incoming-requests/README.md) | `L2-051`, `L2-054`, `L2-043`, `L2-133`, `L2-070`, `L2-182`, `L2-207` |
| [Request an item](requests/request-item/README.md) | `L2-046`, `L2-043`, `L2-005`, `L2-132`, `L2-133` |
| [Request a quote](requests/request-quote/README.md) | `L2-045`, `L2-043`, `L2-005`, `L2-126`, `L2-132` |
| [Request a space](requests/request-space/README.md) | `L2-206`, `L2-207`, `L2-208`, `L2-043`, `L2-052`, `L2-053`, `L2-005`, `L2-132`, `L2-133` |
| [Track requests](requests/track-requests/README.md) | `L2-043`, `L2-047`, `L2-048`, `L2-133`, `L2-118`, `L2-070`, `L2-182`, `L2-207`, `L2-208` |

### responsive-design

| Feature | L2 requirements cited |
|---|---|
| [Adapt layouts](responsive-design/adapt-layouts/README.md) | `L2-165`, `L2-166`, `L2-167`, `L2-168`, `L2-163` |
| [Adapt navigation](responsive-design/adapt-navigation/README.md) | `L2-163`, `L2-164`, `L2-162` |

### reviews

Decisions in [ADR 0066](../adr/0066-reviews.md); reviews of software platforms in [ADR 0072](../adr/0072-software-platforms.md).

| Feature | L2 requirements cited |
|---|---|
| [Edit and remove a review](reviews/edit-and-remove-a-review/README.md) | `L2-233`, `L2-238`, `L2-240`, `L2-128`, `L2-129`, `L2-130`, `L2-133` |
| [Moderate reviews](reviews/moderate-reviews/README.md) | `L2-236`, `L2-237`, `L2-235`, `L2-238`, `L2-239`, `L2-105`, `L2-180` |
| [Read reviews](reviews/read-reviews/README.md) | `L2-229`, `L2-230`, `L2-231`, `L2-232`, `L2-226`, `L2-238`, `L2-239`, `L2-240`, `L2-123`, `L2-125` |
| [Reply to a review](reviews/reply-to-a-review/README.md) | `L2-234`, `L2-235`, `L2-229`, `L2-238`, `L2-064`, `L2-068` |
| [Review a platform](reviews/review-a-platform/README.md) | `L2-258`, `L2-259`, `L2-260`, `L2-261`, `L2-262`, `L2-226`, `L2-227`, `L2-228`, `L2-238`, `L2-126` |
| [Review data](reviews/review-data/README.md) | `L2-238`, `L2-239`, `L2-017`, `L2-018`, `L2-133`, `L2-136`, `L2-137`, `L2-148`, `L2-261` |
| [Write a review](reviews/write-a-review/README.md) | `L2-226`, `L2-227`, `L2-228`, `L2-235`, `L2-238`, `L2-240`, `L2-126`, `L2-127`, `L2-132`, `L2-137`, `L2-258`, `L2-259` |

### security

| Feature | L2 requirements cited |
|---|---|
| [Assure security](security/assure-security/README.md) | `L2-142`, `L2-143`, `L2-144`, `L2-180`, `L2-133` |
| [Authorize requests](security/authorize-requests/README.md) | `L2-133`, `L2-143` |
| [Authorize staff requests](security/authorize-staff-requests/README.md) | `L2-191`, `L2-098`, `L2-133` |
| [Keep addresses safe](security/keep-addresses-safe/README.md) | `L2-246`, `L2-242`, `L2-135`, `L2-137`, `L2-139` |
| [Limit abuse](security/limit-abuse/README.md) | `L2-137`, `L2-141`, `L2-007`, `L2-008`, `L2-143` |
| [Protect credentials and sessions](security/protect-credentials-and-sessions/README.md) | `L2-134`, `L2-135`, `L2-010`, `L2-009` |
| [Restrict staff access by network](security/restrict-staff-network/README.md) | `L2-192`, `L2-189` |
| [Secure transport and tokens](security/secure-transport-and-tokens/README.md) | `L2-139`, `L2-140`, `L2-136` |
| [Secure uploads](security/secure-uploads/README.md) | `L2-138`, `L2-133`, `L2-135` |
| [Validate input](security/validate-input/README.md) | `L2-136`, `L2-139`, `L2-002` |

### system-pages

| Feature | L2 requirements cited |
|---|---|
| [Handle session expiry](system-pages/handle-session-expiry/README.md) | `L2-116`, `L2-010` |
| [Run maintenance mode](system-pages/run-maintenance-mode/README.md) | `L2-117` |
| [Show error pages](system-pages/show-error-pages/README.md) | `L2-113`, `L2-114`, `L2-115`, `L2-118`, `L2-133`, `L2-132` |

### trust-content

| Feature | L2 requirements cited |
|---|---|
| [Publish policy pages](trust-content/publish-policy-pages/README.md) | `L2-107`, `L2-108`, `L2-109`, `L2-110`, `L2-133` |
| [Render the site chrome](trust-content/render-site-chrome/README.md) | `L2-112`, `L2-164`, `L2-065` |

## Regenerating the diagrams

```bash
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The C4 diagrams use only macros available in PlantUML 1.2020.02 and later, so
they render with both old and current PlantUML releases.
