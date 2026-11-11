# Jubilee detailed designs

This tree holds one detailed design per vertically sliced feature of Jubilee,
grouped by subsystem. Each feature folder contains a `README.md` with four
sections (Overview, Description, Requirements, Diagrams) and a `diagrams/`
folder with the PlantUML sources and their rendered images. Every feature traces
to level-2 requirements in [`docs/specs/L2.md`](../specs/L2.md), each of which
refines a level-1 requirement in [`docs/specs/L1.md`](../specs/L1.md).

## Architecture baseline

The designs share one set of containers. No code exists yet; the names below are
the names the designs introduce.

| Container | Technology | Responsibility |
|---|---|---|
| `Jubilee Web` | Angular single-page application | Pages, dialogs and notifications from `docs/mocks/` |
| `Jubilee service worker` | Angular service worker | Offline cache and outgoing message queue |
| `Jubilee API` | ASP.NET Core | JSON API under `/api`, real-time hub, authentication, authorization |
| `Jubilee Worker` | .NET worker service | Background jobs, outbox dispatch, e-mail sending, search indexing |
| `Jubilee database` | SQL Server | System of record |
| `Cache` | Redis | Sessions, rate-limit counters, idempotency keys, short-lived read caches |
| `Search index` | `<TO SUPPLY>` | Full-text search over businesses, services and products |
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

### accounts

| Feature | L2 requirements cited |
|---|---|
| [Change credentials](accounts/change-credentials/README.md) | `L2-014`, `L2-015`, `L2-134`, `L2-140`, `L2-143`, `L2-126` |
| [Choose notification settings](accounts/choose-notification-settings/README.md) | `L2-016`, `L2-068`, `L2-182`, `L2-149`, `L2-118` |
| [Confirm e-mail](accounts/confirm-email/README.md) | `L2-004`, `L2-005`, `L2-140`, `L2-137`, `L2-118` |
| [Continue with Google](accounts/continue-with-google/README.md) | `L2-003`, `L2-010`, `L2-012`, `L2-135` |
| [Delete account](accounts/delete-account/README.md) | `L2-017`, `L2-129`, `L2-128`, `L2-180`, `L2-143` |
| [Download data](accounts/download-data/README.md) | `L2-018`, `L2-140`, `L2-146`, `L2-133`, `L2-182` |
| [Edit profile](accounts/edit-profile/README.md) | `L2-013`, `L2-019`, `L2-126`, `L2-133`, `L2-118` |
| [Join with e-mail](accounts/join-with-email/README.md) | `L2-001`, `L2-002`, `L2-134`, `L2-137`, `L2-140`, `L2-141`, `L2-187` |
| [Manage session](accounts/manage-session/README.md) | `L2-010`, `L2-011`, `L2-116`, `L2-135` |
| [Reset password](accounts/reset-password/README.md) | `L2-008`, `L2-009`, `L2-134`, `L2-140`, `L2-141`, `L2-137` |
| [Sign in](accounts/sign-in/README.md) | `L2-006`, `L2-007`, `L2-012`, `L2-141`, `L2-137`, `L2-010`, `L2-187` |

### church-reference

| Feature | L2 requirements cited |
|---|---|
| [Answer a church reference request](church-reference/answer-church-reference/README.md) | `L2-080`, `L2-081`, `L2-082`, `L2-140`, `L2-146`, `L2-126` |
| [Track the reference outcome](church-reference/track-reference-outcome/README.md) | `L2-083`, `L2-084`, `L2-086`, `L2-146`, `L2-182`, `L2-133` |

### design-system

| Feature | L2 requirements cited |
|---|---|
| [Apply design tokens](design-system/apply-design-tokens/README.md) | `L2-169`, `L2-170`, `L2-172`, `L2-160` |
| [Build components](design-system/build-components/README.md) | `L2-171`, `L2-173`, `L2-163`, `L2-160` |

### directory

| Feature | L2 requirements cited |
|---|---|
| [Browse a category](directory/browse-category/README.md) | `L2-023`, `L2-024`, `L2-025`, `L2-026`, `L2-028`, `L2-113`, `L2-118` |
| [Browse home](directory/browse-home/README.md) | `L2-021`, `L2-022`, `L2-027`, `L2-028`, `L2-012`, `L2-106`, `L2-118`, `L2-156` |
| [Search the directory](directory/search-directory/README.md) | `L2-029`, `L2-030`, `L2-031`, `L2-032`, `L2-028`, `L2-118`, `L2-133`, `L2-181` |
| [View welcome page](directory/view-welcome-page/README.md) | `L2-020`, `L2-028`, `L2-027`, `L2-106` |

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
| [Report a listing](listings/report-listing/README.md) | `L2-039`, `L2-126`, `L2-128`, `L2-132`, `L2-133` |
| [Save a listing](listings/save-listing/README.md) | `L2-041`, `L2-042`, `L2-005`, `L2-012`, `L2-118`, `L2-133` |
| [Share a listing](listings/share-listing/README.md) | `L2-038`, `L2-028`, `L2-130` |
| [View a business page](listings/view-business-page/README.md) | `L2-033`, `L2-034`, `L2-037`, `L2-040`, `L2-028`, `L2-118`, `L2-133` |
| [View a product](listings/view-product/README.md) | `L2-035`, `L2-036`, `L2-028`, `L2-118` |

### messaging

| Feature | L2 requirements cited |
|---|---|
| [Exchange messages](messaging/exchange-messages/README.md) | `L2-057`, `L2-058`, `L2-060`, `L2-062`, `L2-132`, `L2-133`, `L2-138` |
| [Read the inbox](messaging/read-inbox/README.md) | `L2-056`, `L2-059`, `L2-061`, `L2-118`, `L2-133` |
| [Report a conversation](messaging/report-conversation/README.md) | `L2-063`, `L2-132`, `L2-133`, `L2-180` |
| [Start a conversation](messaging/start-conversation/README.md) | `L2-055`, `L2-005`, `L2-126`, `L2-132` |

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
| [Describe a listing](onboarding/describe-listing/README.md) | `L2-071`, `L2-072`, `L2-073`, `L2-076`, `L2-005`, `L2-126`, `L2-133` |
| [Name a church reference](onboarding/name-church-reference/README.md) | `L2-074`, `L2-075`, `L2-126`, `L2-146` |
| [Save a draft](onboarding/save-draft/README.md) | `L2-077`, `L2-118`, `L2-133`, `L2-182` |
| [Submit for verification](onboarding/submit-for-verification/README.md) | `L2-078`, `L2-079`, `L2-005`, `L2-126`, `L2-127`, `L2-132` |

### operations

| Feature | L2 requirements cited |
|---|---|
| [Back up and recover](operations/back-up-and-recover/README.md) | `L2-177`, `L2-180` |
| [Deliver e-mail](operations/deliver-email/README.md) | `L2-179`, `L2-004`, `L2-068` |
| [Deploy safely](operations/deploy-safely/README.md) | `L2-178`, `L2-133`, `L2-180` |
| [Observe the system](operations/observe-the-system/README.md) | `L2-175`, `L2-176`, `L2-118` |
| [Record audit log](operations/record-audit-log/README.md) | `L2-180`, `L2-133`, `L2-150`, `L2-098` |
| [Run background jobs](operations/run-background-jobs/README.md) | `L2-182`, `L2-175` |
| [Stay available](operations/stay-available/README.md) | `L2-174`, `L2-181` |

### marketing

| Feature | L2 requirements cited |
|---|---|
| [Show the marketing site](marketing/show-marketing-site/README.md) | `L2-183`, `L2-184`, `L2-185`, `L2-186` |

### owner-workspace

| Feature | L2 requirements cited |
|---|---|
| [Edit a listing](owner-workspace/edit-listing/README.md) | `L2-087`, `L2-088`, `L2-126`, `L2-127`, `L2-133`, `L2-138` |
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
| [Protect reference answers](privacy/protect-reference-answers/README.md) | `L2-146`, `L2-133`, `L2-150`, `L2-018`, `L2-182` |
| [Retain and protect data](privacy/retain-and-protect-data/README.md) | `L2-147`, `L2-148`, `L2-182` |

### requests

| Feature | L2 requirements cited |
|---|---|
| [Book a meeting](requests/book-meeting/README.md) | `L2-044`, `L2-050`, `L2-043`, `L2-005`, `L2-132` |
| [Cancel a request](requests/cancel-request/README.md) | `L2-049`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Confirm a request](requests/confirm-request/README.md) | `L2-052`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Decline a request](requests/decline-request/README.md) | `L2-053`, `L2-043`, `L2-129`, `L2-128`, `L2-133` |
| [Handle incoming requests](requests/handle-incoming-requests/README.md) | `L2-051`, `L2-054`, `L2-043`, `L2-133`, `L2-070`, `L2-182` |
| [Request an item](requests/request-item/README.md) | `L2-046`, `L2-043`, `L2-005`, `L2-132`, `L2-133` |
| [Request a quote](requests/request-quote/README.md) | `L2-045`, `L2-043`, `L2-005`, `L2-126`, `L2-132` |
| [Track requests](requests/track-requests/README.md) | `L2-043`, `L2-047`, `L2-048`, `L2-133`, `L2-118`, `L2-070`, `L2-182` |

### responsive-design

| Feature | L2 requirements cited |
|---|---|
| [Adapt layouts](responsive-design/adapt-layouts/README.md) | `L2-165`, `L2-166`, `L2-167`, `L2-168`, `L2-163` |
| [Adapt navigation](responsive-design/adapt-navigation/README.md) | `L2-163`, `L2-164`, `L2-162` |

### security

| Feature | L2 requirements cited |
|---|---|
| [Assure security](security/assure-security/README.md) | `L2-142`, `L2-143`, `L2-144`, `L2-180`, `L2-133` |
| [Authorize requests](security/authorize-requests/README.md) | `L2-133`, `L2-143` |
| [Limit abuse](security/limit-abuse/README.md) | `L2-137`, `L2-141`, `L2-007`, `L2-008`, `L2-143` |
| [Protect credentials and sessions](security/protect-credentials-and-sessions/README.md) | `L2-134`, `L2-135`, `L2-010`, `L2-009` |
| [Secure transport and tokens](security/secure-transport-and-tokens/README.md) | `L2-139`, `L2-140`, `L2-136`, `L2-080` |
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
| [Show the verified mark](trust-content/show-verified-mark/README.md) | `L2-111`, `L2-028`, `L2-133` |

### verification

| Feature | L2 requirements cited |
|---|---|
| [Feature businesses](verification/feature-businesses/README.md) | `L2-106`, `L2-133`, `L2-180` |
| [Handle reports](verification/handle-reports/README.md) | `L2-105`, `L2-063`, `L2-133`, `L2-150`, `L2-180` |
| [Request changes](verification/request-changes/README.md) | `L2-102`, `L2-103`, `L2-104`, `L2-098`, `L2-146`, `L2-180` |
| [Review and approve a listing](verification/review-and-approve-listing/README.md) | `L2-100`, `L2-101`, `L2-098`, `L2-146`, `L2-150`, `L2-180` |
| [Work the verification queue](verification/work-verification-queue/README.md) | `L2-098`, `L2-099`, `L2-133`, `L2-180`, `L2-118` |

## Regenerating the diagrams

```bash
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The C4 diagrams use only macros available in PlantUML 1.2020.02 and later, so
they render with both old and current PlantUML releases.
