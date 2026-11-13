# Launching soon

## Overview

Jubilee is Toronto's Christian marketplace, and it is not open yet. Until it opens, the marketing
site (`show-marketing-site`) is in its launching-soon state (`L1-030`): the page says that Jubilee
is launching soon, an owner sends their business's details so that the Jubilee team can arrange
for the listing to be on Jubilee on launch day, anyone leaves an e-mail address to be told when
Jubilee launches, and no element of the page links to the app. The reason is honesty: a page that
says "Start browsing" and "47 businesses" before anyone can browse says something that is not so
(`docs/scripture.md`, "accurate weights"; ADR 0044).

This feature covers the whole slice: the page and its two forms, the three endpoints under
`/api/launch`, the two tables that hold what is collected, the forwarding of `/api/launch` by the
marketing host, the keeping of a submission the API could not take, the command the Jubilee team
reads the submissions with, and the daily job that deletes them after 12 months. The mocks are `docs/mocks/pages/marketing-home/`: `default.html`,
`playing.html`, six `business-*.html` states and six `notify-*.html` states. The Magic Patterns
design has no launching-soon frame, so the mocks are the source for these states.

The terms below are local to this feature.

- **launching-soon state** — the state of the marketing page before Jubilee opens
- **launch notification sign-up** — an e-mail address, with an optional first name, left to be told when Jubilee launches
- **business pre-registration** — the details of a business an owner sends before launch; it does not list the business: once Jubilee opens, the owner publishes the listing (`L2-078`)
- **consent** — the ticked checkbox of a form, stored with its time and the method "marketing site form"
- **e-mail key** — the e-mail address in lower case, by which two sign-ups are compared
- **bot challenge** — the privacy-respecting challenge of `L2-137`, shown only when a site key is configured
- **quiet duplicate** — a repeat sign-up that is answered as the first one was and changes nothing
- **marketing host** — the App Service `jubilee-to-www`, whose `server.js` serves the site's files
- **kept submission** — a sign-up or a pre-registration the marketing host holds because the API could not take it, with the time it was received, until the API accepts it
- **received time** — the time the marketing host received a submission; it is the consent time of the row
- **Jubilee team** — the staff who read the submissions and contact owners; nobody verifies a listing before it goes live (ADR 0057), and the team looks after published listings (`L1-014`)

The design amends ADR 0013: the site is no longer static, it has an HTTP client, and it has no
`APP_URL`. It still has no router and no session. `L2-185` (links from the site to the app) is
suspended while this state lasts.

## Description

### Backend

The feature follows the pattern of the other features: entities in `Jubilee.Domain`, MediatR
commands and handlers in `Jubilee.Application`, EF configurations and a migration in
`Jubilee.Infrastructure` and a thin controller in `Jubilee.Api`. The rules live in the handlers.

- **`LaunchSubscriber`** — domain entity (`backend/src/Jubilee.Domain/Launch.cs`): `Id`, `Email`,
  `EmailKey` (the address in lower case, with a unique index), the optional `FirstName`,
  `ConsentedAt`, `ConsentMethod` and `CreatedAt`. One row is kept per e-mail key.
- **`BusinessPreRegistration`** — domain entity (same file): `Id`, `BusinessName`, `ContactName`,
  `Email`, `EmailKey`, the optional `Phone`, `CategorySlug`, `Area`, the optional `Website`,
  `Description`, `ConsentedAt`, `ConsentMethod` and `CreatedAt`. `EmailKey` is not unique here:
  one owner may have two businesses, so every pre-registration is stored.
- **`ConsentMethod.MarketingSiteForm`** — new value of the existing enum. The consent is stored
  on the row it belongs to, because `ConsentRecord` is tied to a member and these people have no
  account (`L2-218` AC1, `L2-149` AC3).
- **`SignUpForLaunchCommand`** and its handler (`backend/src/Jubilee.Application/Launch/`) —
  validates the e-mail address (`REQUIRED`, `EMAIL_INVALID`, `TOO_LONG` over 254 characters), the
  first name (`TOO_LONG` over 50) and the consent (`CONSENT_REQUIRED`). It then looks for a
  `LaunchSubscriber` with the e-mail key. When one exists it changes nothing; otherwise it stores
  a new row. Both cases answer the same, so nothing tells a new address from a known one
  (`L2-217` AC5). No account is created and no e-mail is sent to the address. When
  `LaunchSettings.TeamEmail` is set, a new row comes with an `OutboxMessage` e-mail "New launch
  notification sign-up" to the team, added in the same save, so the row and the e-mail are
  written together or not at all; a quiet duplicate adds none (`L2-217` AC9, ADR 0038).
- **`PreRegisterBusinessCommand`** and its handler — validates every field: `REQUIRED` and
  `TOO_LONG` against the lengths of `L2-216` AC1 (80, 100, 254, 80, 200 and 500 characters),
  `EMAIL_INVALID`, `PHONE_INVALID` (ten digits; an eleventh leading 1 is allowed),
  `WEBSITE_INVALID` (an `http` or `https` address; a bare host name is accepted and stored as
  `https://` and the name), `CATEGORY_UNKNOWN` (one of the eleven category slugs of `L2-023`) and
  `CONSENT_REQUIRED`. It stores a `BusinessPreRegistration` and, when `LaunchSettings.TeamEmail`
  is set, adds an `OutboxMessage` e-mail "New business pre-registration: {business name}" with
  the details in the same save (`L2-216` AC10, ADR 0038). It adds nothing to the directory and
  creates no listing, draft or account (`L2-216` AC9). Given a received time, it first looks for
  a row with the same e-mail key, business name and time, and when one exists it changes
  nothing: that is the same pre-registration, sent again by the marketing host.
- **Received time** — both commands carry an optional `ReceivedAt`. When it is given and is not
  in the future, it is the row's `ConsentedAt` and `CreatedAt`; otherwise the time of
  `TimeProvider` is (`L2-218` AC9). The 12 months of the purge therefore count from the day the
  visitor sent the form.
- **`StaffProxyMiddleware`** — changed. Beside the caller's address it now reads
  `X-Jubilee-Received-At` (the received time) and `X-Jubilee-Kept` (the submission was kept and
  is sent again). Both are believed only with the proxy key, compared in fixed time, and both
  are removed from every request, as the address and the key are (ADR 0040). `LaunchController`
  passes the received time to the command and does not ask a kept submission for the bot
  challenge, whose token has expired by then.
- **`LaunchSettings`** — a record with `TeamEmail`, read once from `Launch:TeamEmail` by the
  Infrastructure composition, optional. Without it nothing is queued and the CLI is the only way
  to read a submission. In production the deployment sets it (see Hosting).
- **Validation failures** — each handler collects one code per field and throws the existing
  `ValidationFailedException`, which the API answers as 422 ProblemDetails with the code
  `validation_failed` and the codes per field; nothing is stored (`L2-136`, ADR 0012). Text is
  stored as text.
- **`ListLaunchSubmissionsQuery`** and its handler — takes the kind (`notifications` or
  `businesses`) and answers comma-separated lines with a header row. Each run writes an
  `AuditRecord` with the action `launch.list`, the kind and the number of rows, and no personal
  data (`L2-218` AC4, `L2-150` AC4).
- **`PurgeLaunchDataCommand`** and its handler — deletes the `LaunchSubscriber` and
  `BusinessPreRegistration` rows whose `CreatedAt` is more than 12 months before the time of
  `TimeProvider`, and answers the two counts (`L2-218` AC6, `L2-148` AC6).
- **Persistence** — `IAppDbContext` and `AppDbContext` gain the sets `LaunchSubscribers` and
  `BusinessPreRegistrations`, each with an EF configuration. The migrations `AddLaunchSubscribers`
  and `AddBusinessPreRegistrations` add the tables; `jubilee migrate` applies them, never the API.
- **`LaunchController`** — ASP.NET Core controller with `[Route("api/launch")]`. Its three
  actions are `[AllowAnonymous]` on purpose: they are called by people who have no account. They
  carry no session cookie, so the anti-CSRF token does not apply to them.

| Endpoint | Does | Answer |
|---|---|---|
| `GET /api/launch` | Answers the public site key of the bot challenge when one is configured, and nothing else | 200 with `{ botChallengeSiteKey? }` |
| `POST /api/launch/notifications` | Sends `SignUpForLaunchCommand` | 202 with no body |
| `POST /api/launch/businesses` | Sends `PreRegisterBusinessCommand` | 202 with no body |

- **Order of checks on a submission** — the rate-limit policy of the endpoint counts the request
  by address before the action runs, as for join. In the action the body is bound with unknown
  fields refused, then `IBotChallengeVerifier.VerifyAsync` is called before any field is checked:
  a configured challenge that is not passed answers 422 `validation_failed` with
  `challenge: CHALLENGE_FAILED` and nothing is stored (`L2-218` AC3). Only then is the command
  sent and the handler validates.
- **`LaunchRateLimit`** — two fixed-window policies beside the existing ones in
  `Jubilee.Api/RateLimiting/`: `LaunchRateLimit.SignUps` and `LaunchRateLimit.PreRegistrations`,
  each 5 per address per hour (`RateLimits:LaunchSignUpsPerHour`,
  `RateLimits:LaunchPreRegistrationsPerHour`). A request over the limit answers 429
  `rate_limited` with `Retry-After` (`L2-137` AC1). The address is the one the marketing host
  states in `X-Jubilee-Client-Address`, believed only with the proxy key. A kept submission
  (`ProxiedSubmission.Kept`, so only with the proxy key) has no limiter (`L2-218` AC9): each
  time it is sent again would otherwise count against the visitor's address, and five attempts
  while the API was slow would hold the submission back for an hour.
- **`LaunchRetentionJob`** — background service in `Jubilee.Worker`. Once a day it sends
  `PurgeLaunchDataCommand` and logs the two counts and nothing else (`L2-148` AC5).
- **`jubilee launch list --kind notifications|businesses`** — command of `Jubilee.Cli`. It sends
  `ListLaunchSubmissionsQuery` and prints the lines. It is the only way the submissions are read:
  no screen and no endpoint returns them, and whoever runs it holds the database connection
  (`L2-150` AC2).
- **Tests** — integration tests exercise the three endpoints over HTTP on the EF Core InMemory
  provider (ADR 0009): each code, the challenge, the limit, the quiet duplicate, the team's
  e-mail in the outbox, the listing with its audit record and the purge.

### Frontend `api` library

- **`LaunchApi`** — the contract: read the form settings, send a launch notification sign-up and
  send a business pre-registration. **`LAUNCH_API`** is its injection token and
  **`HttpLaunchApi`** its implementation, which calls `/api/launch` by relative address, so the
  browser sees one origin.
- **Models** — `LaunchFormSettings` (the optional `botChallengeSiteKey`),
  `LaunchNotificationRequest` (the e-mail address, the optional first name, the consent and the
  challenge token when there is one) and `BusinessPreRegistrationRequest` (the eight fields of
  the form, the consent and the challenge token when there is one).

### Frontend `components` library

Presentation lives in `components` only (ADR 0035). Each component is `name.ts`, `name.html` and
`name.scss`, has a parity spec (ADR 0036), and its rules leave `marketing.css` in the same change.

- **`LaunchBadge`** (`p[jb-launch-badge]`, block `mkt-badge`) — new. The label "Launching soon"
  above the opening's heading.
- **`LaunchForm`** (`form[jb-launch-form]`, block `mkt-form`) — new. The frame of a form of the
  page: its accessible name, the fields, the action and the line about how the details are used.
- **`LaunchConfirmation`** (`div[jb-launch-confirmation]`, block `mkt-confirmation`) — new. The
  heading and paragraph that replace a form after 202. It takes focus when it is shown.
- **`MarketingButton`** — changed. It is also `button[jb-marketing-button]`, and has `busy`: the
  button carries `aria-busy="true"` with a spinner beside its label. Its slots are declared once
  and rendered in both branches with `ngTemplateOutlet`.
- **`MarketingHeading`** — changed. It gains an eyebrow slot, used for the label above the
  opening's heading.
- **`PhotoBusinessCard`** — changed. It is a `div` when it is not a link, so the five cards of
  "Shops and services, side by side." link nowhere (`L2-183` AC5).

Each changed component keeps its look where it was already used.

### Marketing application

`frontend/projects/marketing/src/app`. The application declares containers only.

- **`App`** (`jb-root`) — the page. The top bar's action is the link "Launching soon", which
  moves to `#notify` and is kept at every width. The opening shows the label "Launching soon",
  "Tell me when it launches" (to `#notify`) and "Watch the film". After "Run a Christian-owned
  business? Be found.", whose action "Send your business’s details" moves to `#pre-register`,
  come the two form sections and then the footer (`L2-215` AC4). Every link on the page moves
  within the page (`L2-215` AC6). The copy and the previews are in `content.ts`, without a count
  of businesses or a reply time.
- **`BusinessPreRegistration`** (`jb-business-pre-registration`) — container of the section
  `#pre-register`, "Be listed on launch day.". It holds the form "Business pre-registration"
  with its eight fields, the checkbox and the button "Send my details".
- **`LaunchNotification`** (`jb-launch-notification`) — container of the section `#notify`,
  "Jubilee is launching soon.". It holds the form "Launch notification" with "Email", "First
  name", the checkbox and the button "Tell me when it launches".
- **States of a form** — both containers behave alike. The form is checked in the page first: an
  invalid form sends nothing, shows `jb-form-summary` with a link to each field, moves focus to
  the summary and shows a message below each field. A valid form makes the button busy and locks
  the fields, so a second press sends nothing. On 202 the form is replaced by
  `jb-launch-confirmation`. On 422 the codes are shown as the same messages. On 429 the alert
  says "You’re doing that a lot. Try again in {n} minutes." from `Retry-After`. On
  `CHALLENGE_FAILED` the alert says "We couldn’t check that you’re not a robot. Wait a moment and
  try again." and a fresh challenge is asked for. Every value typed and the checkbox are kept in
  each of these cases.
- **Still sending** — when the request cannot be sent, is not answered within 10 seconds or is
  answered with anything other than 202, 422 or 429, the form shows no error. It stays busy with
  its fields locked, shows the notice "Still sending." (`jb-alert`, tone `info`, `role="status"`)
  and sends the same body again every 5 seconds until one of those three answers arrives
  (`L2-216` AC6, `L2-217` AC6). `keepSending` in `launch-forms/launch-messages.ts` holds the
  rule for both containers. Sending again is safe: a sign-up is a quiet duplicate, and the
  marketing host answers 202 for anything the API could not take.
- **Bot challenge** — the page calls `GET /api/launch` once. `jb-bot-challenge` is shown, and
  loads Cloudflare's Turnstile script, only when the answer names a site key. When the call
  fails the forms still show, without a challenge.
- **`app.config.ts`** — the composition root provides `provideHttpClient()` and `LAUNCH_API` with
  `HttpLaunchApi`. The two containers depend on the token.
- **Removed** — the token `APP_URL`, `app-url.ts`, the environment files and the
  `fileReplacements` entry. The page does not know the app's address.
- **`proxy.conf.json`** — for `ng serve marketing`, sends `/api` to `http://localhost:5080`.
- **Tests** — Playwright behaviour specs with page objects cover the page and each state of both
  forms. Every `/api/launch` call is answered from the recording or a stub (ADR 0009).

### Hosting

- **`eng/azure/server.js`** on `jubilee-to-www` — forwards the paths named by `API_PATHS`, which
  is `/api/launch`, to `API_ORIGIN`, which is `https://app.jubilee.to`. Any other `/api` path
  answers 404 on the marketing host, so a public host never forwards a staff path. The proxy
  states the caller's address in `X-Jubilee-Client-Address` and proves itself with
  `X-Jubilee-Proxy-Key` (`PROXY_KEY`, the key of `StaffAccess:ProxyKey`); without that the limits
  would count every visitor as the marketing host. Without `API_ORIGIN` the host serves files
  only and the forms show their error state.
- **Host of a forwarded request** — a request forwarded to an API on another host always names
  that host in `Host`, with or without `PROXY_KEY`: App Service's front end routes by it, and a
  request still addressed to `www.jubilee.to` would come back to the marketing site. Forwarding
  to the API beside it on loopback (`127.0.0.1`, `localhost`, `::1`), as the app's host does,
  keeps the public host. A caller's own `X-Jubilee-Received-At` and `X-Jubilee-Kept` are
  removed by a proxy that forwards to another host or holds a key, because that proxy vouches
  for what it forwards. The app's host does neither: it passes both on, as it passes the key,
  and the API believes them only with the key (`L2-218` AC9).
- **Kept submissions** (`L2-218` AC8, AC9, ADR 0047) — with `KEEP_DIR` set, `server.js` handles
  `POST /api/launch/notifications` and `POST /api/launch/businesses` itself. It reads the body
  (at most 16 KB), notes the received time, and sends it to the API with
  `X-Jubilee-Received-At`, waiting 8 seconds at most, which is inside the page's 10.

  | The API | The marketing host |
  |---|---|
  | answers 2xx, 400, 422, 429 or another 4xx not named below | relays the answer; nothing is kept |
  | cannot be reached, does not answer in 8 seconds, or answers 5xx, 401, 403, 404 or 408 | keeps the submission and answers 202 with no body |

  A submission is kept only when its body is a JSON object with `consent: true` and an e-mail
  address, and fewer than 1,000 are kept; otherwise the API's answer (or 503) is relayed. Each
  kept submission is one file in `KEEP_DIR`, written and flushed before the 202: the path, the
  body, the received time and the caller's address, which the per-address limit needs when it
  is sent again. The folder is on App Service's persistent storage and survives a restart and
  a deployment.
- **Sending again** — at start and every minute `server.js` sends the kept submissions to the
  API, oldest first, with `X-Jubilee-Received-At` and `X-Jubilee-Kept: true`. 2xx removes the
  file. A refusal as invalid (a 4xx other than 401, 403, 404, 408 and 429) removes it too and
  logs the count. Anything else ends the round, and the next one starts a minute later. A file
  12 months old is deleted unsent. Sending again is idempotent: a sign-up is a quiet duplicate
  and a pre-registration is recognised by its received time. No log line holds personal data.
  The API does not count a kept submission against the rate limit of its address, so 429 is
  not expected here; it ends the round like any other fault if it comes.
- **Settings** — `eng/azure/deploy.sh` applies them on every deployment, each only when its
  value differs, and never prints a value: on `jubilee-to-www` `API_ORIGIN`
  (`https://app.jubilee.to`), `API_PATHS` (`/api/launch`), `KEEP_DIR` (`/home/data/launch-kept`)
  and `PROXY_KEY` (read from `StaffAccess__ProxyKey` of `jubilee-to-app`; made and set on the
  three App Services when there is none); on `jubilee-to-app` `Launch__TeamEmail`. After the
  health check the script asks `https://www.jubilee.to/api/launch` for 200 and
  `https://www.jubilee.to/api/session` for 404, and fails the deployment otherwise. The
  Turnstile widget lists `jubilee.to` and `www.jubilee.to` before a site key is set.
- **Tests** — `eng/azure/server.test.js` (`node --test`, run by CI) starts `server.js` against a
  stand-in API and covers the `Host` rule, the pass-through answers, keeping, sending again and
  the 12-month deletion.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier. `L2-183` and `L2-186` are cited as amended for the
launching-soon state.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-215` | `L1-030`, `L1-026` | While Jubilee is launching soon, the marketing page shall say so in the opening and the top bar, shall show the sections "Be listed on launch day." and "Jubilee is launching soon." with their forms before the footer, shall say or imply nowhere that anyone can browse, message or book today, and shall hold no link to the app: every link moves within the page. |
| `L2-216` | `L1-030` | The system shall let an owner send their business's details before launch through the form "Business pre-registration", shall validate them in the page and on the server, shall answer 202 and show a confirmation, and shall not list the business, which its owner publishes once Jubilee opens (`L2-078`); when a team address is configured, an e-mail with the details shall go to it through the outbox, once; a failure to reach Jubilee shall show no error: the page shall keep sending. |
| `L2-217` | `L1-030` | The system shall let anyone leave an e-mail address through the form "Launch notification" to be told when Jubilee launches, shall keep one sign-up per address, shall answer a repeat sign-up as the first without saying whether the address was already there, and shall e-mail the team address once for each new sign-up, in the same transaction; a failure to reach Jubilee shall show no error: the page shall keep sending. |
| `L2-218` | `L1-030`, `L1-020`, `L1-019` | What the two forms collect shall be stored with its consent (given, time, method "marketing site form"), accepted without a session but validated on the server, limited to 5 per IP address per hour per form, guarded by the bot challenge before anything else is checked, read only with `jubilee launch list` with an audit record of each run, and deleted after 12 months; a submission with consent that the API cannot take shall be kept by the marketing host with its received time, answered 202 and sent again until the API accepts it, and that time shall be its consent time. |
| `L2-183` | `L1-026` | The marketing home page shall show the top bar with "Launching soon", the opening with the label "Launching soon" and a preview of the app that states no count and no reply time, the film section, the mission statement of L0-001, the benefits, the steps, five business cards that are not links, the section for businesses, "Be listed on launch day.", "Jubilee is launching soon." and the footer. |
| `L2-186` | `L1-026`, `L1-022`, `L1-023` | The marketing site shall be its own application with no sign-in; rendering it shall call nothing but `GET /api/launch` on its own origin, and while Jubilee is launching soon it shall also send the two forms to the Jubilee API on its own origin and call nothing else; it shall use the light theme, be usable from 360 px to 1280 px and by keyboard, and respect reduced motion. |
| `L2-137` | `L1-019` | The server shall respond 429 with `Retry-After` when a defined limit is exceeded, among them 5 launch notification sign-ups and 5 business pre-registrations per IP per hour, and the two forms of the launching-soon page shall be protected by the bot challenge. |
| `L2-148` | `L1-020` | Launch notification sign-ups and business pre-registrations shall be deleted when 12 months have passed since they were sent, and the daily job shall log counts only. |
| `L2-149` | `L1-020` | The time and method of a consent shall be recorded; consent given on the launching-soon marketing page shall be recorded with the sign-up or the pre-registration itself. |
| `L2-150` | `L1-020` | Staff shall read the launch notification sign-ups and the business pre-registrations only as `L2-218` says, and each reading shall be recorded in the audit log. |

`L2-185` is not realized by this design: it is suspended until launch, except its criterion 3
(top bar links move within the page), which stays in force and is unchanged.

## Diagrams

The PlantUML sources are in [`diagrams/`](diagrams/). They are not rendered: there is no PlantUML
on the machine that wrote this design.

### Containers

PlantUML source: [`diagrams/c4-container.puml`](diagrams/c4-container.puml).

`Jubilee Marketing` now calls `/api/launch` on its own origin. The marketing host forwards those
calls, and no other `/api` path, to `Jubilee API`, which stores the submissions in
`Jubilee database`. `Jubilee Worker` deletes them after 12 months and sends the team's e-mail from
the outbox; the Jubilee team reads them with `Jubilee CLI`. The page links to `Jubilee Web`
nowhere.

### Class structure — backend

PlantUML source: [`diagrams/class-backend.puml`](diagrams/class-backend.puml).

`LaunchController` verifies the challenge and sends one command per submission.
`SignUpForLaunchCommandHandler` creates at most one `LaunchSubscriber` per e-mail key;
`PreRegisterBusinessCommandHandler` creates a `BusinessPreRegistration` every time and queues an
`OutboxMessage` when `LaunchSettings.TeamEmail` is set. `LaunchRetentionJob` and
`jubilee launch list` reach the same data through `PurgeLaunchDataCommand` and
`ListLaunchSubmissionsQuery`.

### Class structure — frontend

PlantUML source: [`diagrams/class-frontend.puml`](diagrams/class-frontend.puml).

The two containers of the marketing application inject `LAUNCH_API` and compose `LaunchForm`,
`LaunchConfirmation`, `MarketingButton` and the existing form components. `app.config.ts` provides
the token with `HttpLaunchApi`.

### Behaviour — sign up for the launch notice

PlantUML source: [`diagrams/sequence-notify.puml`](diagrams/sequence-notify.puml).

A sign-up passes the page's own check, the marketing host, the limit of 5 an hour, the bot
challenge and the handler's validation, in that order. The diagram shows the 429 path, the
challenge failure (422 with `challenge: CHALLENGE_FAILED`), the validation failure (422 with a
code per field) and the quiet duplicate, which answers 202 like a new address (`L2-217`,
`L2-218`).

### Behaviour — pre-register a business

PlantUML source: [`diagrams/sequence-pre-register.puml`](diagrams/sequence-pre-register.puml).

A pre-registration follows the same order and has the same 429, challenge-failure and validation
paths. A valid one is stored every time, with the team's e-mail queued in the same save when
`Launch:TeamEmail` is set, and answers 202 (`L2-216`, `L2-218`).

### Behaviour — keep a submission the API cannot take

PlantUML source: [`diagrams/sequence-kept-submission.puml`](diagrams/sequence-kept-submission.puml).

When the API cannot take a submission, the marketing host writes it to `KEEP_DIR` and answers
202, so the visitor sees the confirmation. A minute later, and every minute after, it sends the
kept submission again with its received time; the API stores it with that time as the consent
time, queues the team's e-mail and answers 202, and the file is removed (`L2-218` AC8, AC9).

## Failure modes

| What fails | What the visitor sees | What happens to the submission |
|---|---|---|
| The API is restarting, down or slow (over 8 seconds), or answers 5xx | The confirmation | Kept by the marketing host, stored within a minute of the API's return |
| The marketing host cannot route to the API (404, 401, 403: a missing or wrong setting) | The confirmation | Kept, and stored once the next deployment has set the setting |
| The API answered, but its answer was lost on the way | The confirmation | Stored by the first attempt; the copy sent again changes nothing |
| The visitor's connection drops, or the marketing host is restarting | "Still sending.", and then the confirmation | Sent again by the page every 5 seconds |
| The folder cannot be written, or 1,000 submissions are kept already | "Still sending." | Not kept; the page keeps sending until the API answers |
| The worker or the e-mail service is down | The confirmation | Stored; the team's e-mail waits in the outbox, which retries for 24 hours (ADR 0038) |
| The details are invalid, consent is missing, the challenge fails or the limit is passed | The message for it, as before | Nothing is stored or kept |

## Open questions

Each question below was decided in ADR 0044. None is open; they are listed so that the answer is
found with the design.

| Question | Answer |
|---|---|
| Are the forms inline sections or dialogs? | Inline sections (`#pre-register`, `#notify`), each in its own container. The form is the page's purpose, an in-page link lands on it, and a dialog would hide it from a visitor who scrolls. The rule "no inline forms in pages" concerns button-triggered editing in the app. |
| Does `APP_URL` stay, unused? | No. The token, `app-url.ts` and the environment files are removed: a token nothing injects is dead code, and "no link to the app" is easier to keep true when the page does not know the app's address. |
| Is an invalid submission 400 or 422? | 422 `validation_failed` with a code per field, as everywhere in the API (ADR 0012). A failed challenge is 422 with `challenge: CHALLENGE_FAILED`, and a limit is 429 `rate_limited` with `Retry-After`. |
| How does the Jubilee team read the submissions? | With `jubilee launch list --kind notifications\|businesses`, and by an e-mail per pre-registration and per new sign-up to `Launch:TeamEmail`, which the deployment sets. No screen and no endpoint returns them. |
| What does a visitor see when Jubilee cannot be reached? | Never an error. The marketing host keeps what the API cannot take and answers 202; when the page cannot reach the marketing host it says "Still sending." and tries again every 5 seconds (ADR 0047). |
| Where is a kept submission held? | One file each in `/home/data/launch-kept` on the marketing host, App Service's persistent storage. A queue or a second database would be one more resource to run for a state that should be rare and short. |
| Which time is the consent time of a kept submission? | The time the marketing host received it, stated in `X-Jubilee-Received-At` and believed only with the proxy key. |
| Is a kept submission asked for the bot challenge again? | No. Its token has expired, so the API skips the challenge for a submission the marketing host's proxy marks as kept; the per-address limit still counts it. |
| Is the team's e-mail of a sign-up mocked? | No. Like the e-mail of a pre-registration it is plain text for the team, not one of the member e-mails of `docs/mocks/emails/`. |
| How long is the data kept? | 12 months, then `LaunchRetentionJob` deletes it. The launch is expected well inside that time. |
| How does the page return to its launched state? | By reverting the marketing-site commits of this change and lifting the suspension of `L2-185`. The endpoints, the tables and the CLI stay until the data has been used and deleted. |
| Is there a feature flag between the two states? | No. A switch would keep two pages alive in one build for the sake of one day. |

Deferred, and decided at launch (`L2-218` AC7, ADR 0044):

- the launch-day e-mail to the sign-ups;
- turning a pre-registration into a listing draft;
- a screen in the admin application for the submissions;
- a Magic Patterns frame for the launching-soon state.
