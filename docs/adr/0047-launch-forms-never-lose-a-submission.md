# 0046. The launch forms never lose a submission: the deployment sets the marketing host, the proxy names the API's host and keeps what the API cannot take, and the team is e-mailed

## Status

Accepted, 12 November 2026. Amends ADR 0044 (launching soon): the marketing host's settings are
applied by the deployment, not by hand; a form that cannot be sent no longer shows an error; a
launch notification sign-up now e-mails the team. Applies ADR 0009 (tests without a database),
ADR 0038 (e-mail through the outbox) and ADR 0040 (a host's `server.js` forwards `/api` and states
the caller's address with the proxy key).

## Context

On 12 November 2026 nobody could send either form of `https://www.jubilee.to`. A visitor who
pressed "Tell me when it launches" read "We couldn’t add you to the list." and nothing was saved.

What was found in production:

- `https://www.jubilee.to/api/launch` answered 404 and `https://app.jubilee.to/api/launch`
  answered 200 with `{}`. The API was up; the marketing host did not forward to it.
- `jubilee-to-www` had one app setting, `SCM_DO_BUILD_DURING_DEPLOYMENT`. `API_ORIGIN`,
  `API_PATHS` and `PROXY_KEY` were never set. ADR 0044 left them to be set by hand and
  `eng/azure/README.md` said so: "None of this is done by the workflows, and nothing here was run
  yet." Without `API_ORIGIN`, `server.js` answers every `/api` path 404.
- `jubilee-to-app` had `Email__ConnectionString` and `StaffAccess__ProxyKey`, and no
  `Launch__TeamEmail`, so a pre-registration would have e-mailed nobody.
- A second fault waited behind the first. `server.js` named the API's host in `Host` only when
  `PROXY_KEY` was set. With `API_ORIGIN` alone, App Service's front end would have received a
  request still addressed to `www.jubilee.to` and routed it back to the marketing site.

The owner asked for three things beyond the repair: each sign-up e-mails the team, a visitor
never again reads that error because of a fault on Jubilee's side, and nothing about production
depends on a step someone must remember.

## Decision

- **The deployment sets the settings, every time.** `eng/azure/deploy.sh` applies them before it
  deploys, each only when its value differs, so an unchanged deployment restarts no site for
  them. It prints setting names, never a value.

  | App Service | Setting | Value |
  |---|---|---|
  | `jubilee-to-www` | `API_ORIGIN` | `https://app.jubilee.to` |
  | `jubilee-to-www` | `API_PATHS` | `/api/launch` |
  | `jubilee-to-www` | `KEEP_DIR` | `/home/data/launch-kept` |
  | `jubilee-to-www` | `PROXY_KEY` | the value of `StaffAccess__ProxyKey` on `jubilee-to-app` |
  | `jubilee-to-app` | `Launch__TeamEmail` | `quinntynebrown@gmail.com` |

  When `jubilee-to-app` has no proxy key, the script makes one (`openssl rand -base64 32`) and
  sets it on the three App Services together, as `create-admin.sh` does. After the health check
  it asks `https://www.jubilee.to/api/launch` for 200 and `https://www.jubilee.to/api/session`
  for 404, and the deployment fails if either differs: a deployment that leaves the forms
  broken is not a successful one, and one that forwards more than `/api/launch` is not either.
- **A forwarded request names the host it is sent to.** `server.js` sets `Host` to the API's host
  whenever the API is on another host, with or without `PROXY_KEY`. Forwarding to the API beside
  it on loopback, as the app's host does, keeps the public host, which the API there needs for
  its links and cookies.
- **The marketing host keeps what the API cannot take.** With `KEEP_DIR` set, `server.js` reads
  the body of `POST /api/launch/notifications` and `POST /api/launch/businesses` (at most 16 KB),
  notes the time it received it, and sends it on, waiting 8 seconds at most. When the API cannot
  be reached, does not answer in time, or answers 5xx, 401, 403, 404 or 408, the submission is
  written to one file in `KEEP_DIR`, flushed to disk, and the caller is answered 202 with no body,
  as the API would have. Answers a visitor can act on pass through and nothing is kept: 422 (a
  field, the consent, the bot challenge), 400 and 429.
  - Only a submission that carries consent and an e-mail address is kept. Without them nothing
    valid could ever be stored, and Jubilee keeps nothing a person did not agree to
    (`docs/scripture.md`, "accurate weights").
  - A file holds the path, the body, the received time and the caller's address. `/home` on App
    Service is persistent storage shared by a site's instances and kept across restarts and
    deployments.
  - At start and every minute the kept submissions are sent again, oldest first. 2xx removes the
    file. A refusal as invalid removes it and logs the count. 429 or another fault ends the
    round. A file 12 months old is deleted unsent, so the retention of L2-218 holds here too.
  - At most 1,000 are kept. Past that the API's own answer is relayed, so a flood cannot fill
    the disk.
  - No log line holds any part of a submission.
- **The received time is the consent time.** The proxy states it in `X-Jubilee-Received-At` on
  every submission, first attempt or not, and marks one sent again with `X-Jubilee-Kept: true`.
  The API believes both only with the proxy key, in `StaffProxyMiddleware`, exactly as it believes
  the caller's address (0040), and removes them from every request. The received time becomes
  `ConsentedAt` and `CreatedAt`, so the consent recorded is the moment the visitor gave it and the
  12 months count from then. A time in the future is ignored.
- **Sending again stores once.** A sign-up of a known address already changes nothing (0044). A
  pre-registration is stored every time by design, so the handler recognises one sent again by
  its e-mail key, business name and received time, and changes nothing. This also covers the
  API that stored a submission but answered too late: the proxy kept a copy, and the copy is
  recognised. No new column and no migration.
- **A kept submission is not asked for the bot challenge again.** A Turnstile token lives for
  minutes and passes one check. The API could not check it when the visitor sent it, so a
  submission the proxy marks as kept skips the challenge. The per-address limit still counts it,
  with the address the file holds. No challenge is configured in production today.
- **The page keeps sending instead of reporting a fault.** When a form's request cannot be sent,
  is not answered within 10 seconds, or is answered with anything but 202, 422 or 429, the form
  stays busy, says "Still sending." in an info notice with `role="status"`, and sends the same
  body again every 5 seconds until one of those answers comes. This is what is left once the
  proxy keeps submissions: the visitor's own connection, or the marketing host restarting. The
  page does not claim a submission was kept when it cannot know that, and it does not store
  anything in the browser. The mock states `notify-error` and `business-error` became
  `notify-retrying` and `business-retrying`.
- **A new sign-up e-mails the team.** `SignUpForLaunchCommandHandler` adds an outbox e-mail "New
  launch notification sign-up" to `Launch:TeamEmail` in the same save as the row, so both are
  written or neither. A repeat sign-up adds none, which keeps "nothing says whether the address
  was already there" (L2-217 AC5) true for the visitor and spares the team duplicates. Like the
  pre-registration e-mail it is plain text for staff, not a member e-mail, and has no mock in
  `docs/mocks/emails/`.
- **`server.js` has tests.** `eng/azure/server.test.js` runs with `node --test` and nothing but
  Node's standard library: it starts `server.js` against a stand-in API and checks the `Host`
  rule, the pass-through answers, keeping, sending again and the 12-month deletion. CI runs it.
- **Production can be checked without reading the list.** The workflow "Check a launch sign-up"
  (`eng/azure/check-launch.sh`) runs `jubilee launch list` and prints only the number of rows and
  whether one address is among them. It is started by hand, and each run is in the audit log
  like any other reading (L2-218 AC4).

Considered and not chosen:

- **A queue or a table of its own for kept submissions** (Azure Storage, a second database). It
  would be one more resource to create, secure and pay for, for a state that should be rare and
  last a minute. Files on storage the site already has need nothing new.
- **Keeping every submission first and loading the database only from the files.** Simpler to
  reason about, but validation, the bot challenge and the limit would answer the visitor a minute
  late or never, and those are the errors a visitor can fix.
- **Keeping the submission in the browser** (`localStorage`) and sending it on a later visit. The
  page would confirm something that is stored only if the visitor returns.
- **An idempotency key column** on `BusinessPreRegistrations`. Correct, but a migration for what
  the received time already identifies.

## Consequences

- The marketing host now holds personal data for as long as the API cannot take it, usually a
  minute. It is in a folder only that site reads, it never reaches a log, and it leaves when the
  API accepts or refuses it.
- `StaffAccess__ProxyKey` now also lets its holder state a received time and skip the bot
  challenge for a launch submission. The key was already what lets a proxy state a caller's
  address; it stays in the App Service settings and nowhere else.
- A wrong setting on the marketing host no longer loses submissions: they are kept, and the next
  deployment both corrects the setting and fails loudly if `/api/launch` still does not answer.
- The team address is in the repository, in `deploy.sh`. It is the address the owner named.
  Changing it is a one-line change that the next deployment applies.
- When Jubilee launches, reverting ADR 0044 removes the forms; `API_ORIGIN`, `API_PATHS`,
  `PROXY_KEY` and `KEEP_DIR` leave `deploy.sh` in the same change, after `KEEP_DIR` is empty.
- Turnstile keys for the launch forms stay deferred (L2-218 AC3), as in ADR 0044.
