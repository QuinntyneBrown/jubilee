# Jubilee on Azure

How Jubilee is hosted, and how to deploy it again. Set up on 11 November 2026.

| Address | Serves | App Service |
|---|---|---|
| `https://www.jubilee.to`, `https://jubilee.to` | the marketing site (`frontend/projects/marketing`), `/api/launch` sent to the app's host | `jubilee-to-www` |
| `https://app.jubilee.to` | the app (`frontend/projects/jubilee`), the API under `/api`, the worker | `jubilee-to-app` |
| `https://admin.jubilee.to` | the admin application (`frontend/projects/admin`), `/api` sent to the app's host | `jubilee-to-admin` |

## Resources

Everything is in the resource group `rg-jubilee-prod`, Canada Central.

- `jubilee-plan`: one Linux App Service plan, B1. The three web apps run on it.
- `jubilee-to-www`: Node 22. Start-up command `node server.js`. `server.js` serves the built
  marketing page; it answers byte ranges so the pitch film can be seeked. While Jubilee is
  launching soon it also sends the page's two forms to the API (see "The launching-soon forms"
  below).
- `jubilee-to-app`: .NET 10. Start-up command `bash /home/site/wwwroot/start.sh`, which runs three
  processes in the one container:
  - the API (`Jubilee.Api`) on `127.0.0.1:5080`, not reachable from outside;
  - the worker (`Jubilee.Worker`);
  - `server.js` on the public port, which serves the built app and sends `/api` to the API. A
    link-preview fetcher's `/b/{slug}` (Facebook, X, LinkedIn, WhatsApp, Slack and the others of
    `previewAgents`) is answered with the API's `/api/listings/{slug}/social-preview`, so a shared
    listing shows its name, tagline and `og-image.png` (ADR 0055). Nothing outside `server.js` is
    needed for it; the preview's addresses come from `App__PublicBaseUrl`.

    A page load gets its status before the app runs (ADR 0056): `server.js` matches the address
    against the app's `routes.json` and asks the API `GET /api/documents/status`, then answers the
    app with 200, 404 or 403, a 301 for an old listing slug, the static maintenance page with 503
    and `Retry-After` while `Maintenance__Enabled` is on, or the static server error page with 500
    (`public/static/`, no script). The API has three seconds; without an answer the app is served
    with 200. No setting is needed: it runs because the app's folder has `routes.json` and `/api`
    goes to the API beside it. The marketing and admin sites have no `routes.json` and are unchanged.

  The app and the API share an origin because the app calls `/api` by relative address and the
  session cookie is same-site. The API cannot serve the app's files itself: its security headers
  (`default-src 'none'`) are meant for API answers only. The API sits behind `server.js` on
  loopback so that it trusts the forwarded headers and sees the caller's address (rate limits)
  and HTTPS (Secure cookies, HSTS).
- `jubilee-sql-28686` / database `jubilee`: Azure SQL, Basic tier. The firewall admits Azure
  services only.

The web apps are HTTPS only, TLS 1.2 or later, Always On, FTP off, with App Service managed
certificates for the four host names.

### Settings of `jubilee-to-app`

| Setting | Value |
|---|---|
| Connection string `Jubilee` (SQL Azure) | the database; the password exists nowhere else |
| `Database__Provider` | `SqlServer` |
| `App__PublicBaseUrl` | `https://app.jubilee.to` |
| `Media__Root` | `/home/data/media` (persistent storage) |
| `Email__UnsubscribeKey` | a random key |
| `Email__MailingAddress` | Jubilee's mailing address, printed in the weekly note of new businesses and the tips for owners; while it is not set neither is sent (L2-149 AC1, ADR 0053). **Not set yet: an owner step** |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (the package is already built) |

| `Google__ClientId`, `Google__ClientSecret` | the OAuth client `Jubilee web` (see "Google sign-in" below); the secret exists nowhere else |

| `Email__ConnectionString`, `Email__From`, `Email__WebhookSecret` | set by `configure-email.sh` (see "E-mail" below); without the first, no e-mail leaves |

| `StaffSignIn__TenantId`, `StaffSignIn__ClientId`, `StaffSignIn__ClientSecret`, `StaffSignIn__PublicBaseUrl` | staff sign-in (see "The admin application" below) |
| `StaffAccess__AllowedNetworks`, `StaffAccess__ProxyKey` | the networks the staff endpoints answer, and the key of the admin host's and the marketing host's proxy; without the first, every staff endpoint is refused |
| `ADDRESS_DOMAIN`, `APP_ORIGIN`, `OWN_HOSTS`, `Addresses__Domain` | listing addresses, `https://{slug}.jubilee.to` (see "Listing addresses" below); set by `deploy.sh` when it is given `ADDRESS_DOMAIN`. **Not set yet: an owner step.** Without them every shared link is the app's `/b/{slug}` |
| `Addresses__Reserved` | optional: more words that are never a slug, separated by commas, beside the built-in list (L2-242 AC4) |
| `Launch__TeamEmail` | where each pre-registration and each new launch sign-up is e-mailed; set by `deploy.sh` (see "The launching-soon forms" below) |
| `Security__OnCallEmail` | the on-call security contact, e-mailed "Security alert: a burst of password reset requests" when more than 100 reset requests arrive in 5 minutes (L2-143 AC4, ADR 0064); without it the Jubilee team's address (`Moderation__TeamEmail`, else `Launch__TeamEmail`) is e-mailed. **Set** on `jubilee-to-app` by the owner on 13 November 2026. Change it with `az webapp config appsettings set -g "$G" -n "$APP" -o none --settings Security__OnCallEmail=<address>` |
| `Deletions__LedgerPath` | `/home/data/deletions/ledger.jsonl`: the deletion ledger, outside the database (L2-017 AC7, ADR 0069); set by `deploy.sh` |
| `Exports__Root` | `/home/data/exports`: the export store, where data archives are kept for the 7 days their link works (L2-018 AC5, ADR 0069); set by `deploy.sh` |

Not configured yet, so this feature is off: the bot challenge of the join form (Cloudflare
Turnstile). It needs a Turnstile widget for `app.jubilee.to` and two settings: `BotChallenge__SiteKey`
(public; the join form reads it from `GET /api/session` and shows the challenge) and
`BotChallenge__SecretKey` (the API verifies the token with it). Set both or neither: with only the
site key the form sends a token nobody checks, and with only the secret every join is refused.

## Message photos and the malware scanner

Not configured yet, so this feature is off: **photos in messages**. A photo a member attaches to a
message is scanned for malware before it is stored (L2-060 AC9, L2-138 AC4, ADR 0051), and the API
accepts no photo it could not scan. Until a scanner is set, an upload is answered
`503 SCAN_UNAVAILABLE`, nothing is stored, and the member's message says "Not sent. We couldn’t
check this photo just now." Text messages are not affected.

The scanner is ClamAV's daemon, `clamd`, reached over TCP on a private network. Nothing leaves
Jubilee's own resources. These steps need the repository owner:

1. Run `clamd` where only the API can reach it. The container image `clamav/clamav:stable` listens
   on port 3310 and keeps its signatures current with `freshclam`. An Azure Container Instance in a
   virtual network that `jubilee-to-app` is integrated with is enough (the signatures are held in
   memory, so give it 3 GB). No such network exists yet: `jubilee-vnet` and its two subnets below
   are names to create first, and these commands have not been run:

   ```bash
   az container create --resource-group rg-jubilee-prod --name jubilee-clamav \
     --image clamav/clamav:stable --cpu 1 --memory 3 --ports 3310 \
     --vnet jubilee-vnet --subnet clamav --restart-policy Always
   az webapp vnet-integration add --resource-group rg-jubilee-prod --name jubilee-to-app \
     --vnet jubilee-vnet --subnet app
   ```

   Do not give the container a public address: `clamd` has no authentication.
2. Tell the API where it is:

   ```bash
   az webapp config appsettings set --resource-group rg-jubilee-prod --name jubilee-to-app --settings \
     Malware__Scanner=clamav Malware__ClamAv__Host=<the container's private address> \
     Malware__ClamAv__Port=3310 Malware__ClamAv__TimeoutSeconds=10
   ```

3. Check it: send a message with a photo from a test account. The standard anti-malware test file
   (EICAR) inside a photo is refused with `422 FAILED_SCAN`; the API's log names what `clamd` found.

`Malware__Scanner=none` passes every photo unscanned. It is for a developer's machine and the e2e
API, which set it themselves; never set it here.

Two more settings belong to message photos:

| Setting | Value |
|---|---|
| `Attachments__SigningKey` | a random key of 32 bytes or more. It signs the five-minute links of message photos. Without it each instance makes its own key when it starts, which is safe on one instance but breaks links when a second instance answers; set it before scaling out. |
| `Media__Root` | already set (above). Message photos are files under it, each in a folder with a random name, beside the listing photos. |

Still open, and the owner's to decide (L2-138 AC2): moving the media folder to Azure Blob Storage,
and serving photos from a separate cookieless domain. A message photo is delivered by the API on
`app.jubilee.to`, behind its signed link, with `X-Content-Type-Options: nosniff` and
`Cache-Control: private, no-store`.

## The launching-soon forms

While Jubilee is launching soon the marketing page sends two forms, the launch notification and
the business pre-registration, to `/api/launch` on its own origin (ADR 0044). `server.js` on
`jubilee-to-www` forwards that prefix, and nothing else of `/api`, to the app's host, as the admin
host forwards its calls. The Deploy workflow applies every setting below on each deployment
(ADR 0047), each only when its value differs, and never prints a value.

### The owner's checklist

Run these in order, in Azure Cloud Shell (bash) from a clone of this repository, after the first
deployment and whenever the forms seem not to arrive (ADR 0062). Each step says how to check it
and, if the check fails, how to put it right. Nothing here prints a secret or anyone's details;
step 7 reads the database through the CLI, and that reading is written to the audit log.

```bash
G=rg-jubilee-prod; WWW=jubilee-to-www; APP=jubilee-to-app
setting() { az webapp config appsettings list -g "$G" -n "$1" --query "[?name=='$2'].value | [0]" -o tsv; }
```

1. **The database has the launch tables.** The Deploy workflow runs `deploy.sh --migrate`, which
   applies `AddLaunchSubscribers` and `AddBusinessPreRegistrations` with the rest.
   Check: `gh run list --workflow deploy.yml -L 1` shows `completed success`.
   Fix: `gh workflow run deploy.yml` (or `bash eng/azure/deploy.sh --migrate` here), then check again.
2. **The app has the proxy key.** The API believes a visitor's address and the time a submission
   was received only from a proxy that presents it.
   Check: `[ -n "$(setting $APP StaffAccess__ProxyKey)" ] && echo set` prints `set`.
   Fix: run step 1's fix; `deploy.sh` makes a key and sets it on the three App Services.
3. **The marketing host sends `/api/launch`, and only that, to the app, with the same key.**
   Check:

   ```bash
   for name in API_ORIGIN API_PATHS KEEP_DIR; do echo "$name=$(setting $WWW $name)"; done
   [ "$(setting $WWW PROXY_KEY | sha256sum)" = "$(setting $APP StaffAccess__ProxyKey | sha256sum)" ] && echo "same key"
   ```

   prints `API_ORIGIN=https://app.jubilee.to`, `API_PATHS=/api/launch`,
   `KEEP_DIR=/home/data/launch-kept` and `same key`. Without the key the API would count every
   visitor as the marketing host, so the limit of five an hour would be shared by everyone.
   Fix (by hand, without printing the key):

   ```bash
   KEY=$(setting $APP StaffAccess__ProxyKey) && az webapp config appsettings set -g "$G" -n "$WWW" -o none \
     --settings API_ORIGIN=https://app.jubilee.to API_PATHS=/api/launch KEEP_DIR=/home/data/launch-kept "PROXY_KEY=$KEY"; unset KEY
   ```

4. **The team's address is set.** Each business pre-registration and each new sign-up is e-mailed
   there through the outbox (`L2-216` AC10, `L2-217` AC9).
   Check: `setting $APP Launch__TeamEmail` prints the address (`LAUNCH_TEAM_EMAIL` in `deploy.sh`).
   Fix: `az webapp config appsettings set -g "$G" -n "$APP" -o none --settings Launch__TeamEmail=<address>`.
5. **The forms reach the API.**
   Check: `curl -s -w ' %{http_code}\n' https://www.jubilee.to/api/launch` prints `{} 200` (or the
   site key of step 8 and `200`), and
   `curl -s -o /dev/null -w '%{http_code}\n' https://www.jubilee.to/api/session` prints `404`.
   Fix: the settings of step 3; the marketing host restarts by itself when they change, so allow
   it a minute.
6. **Send each form once.** Open `https://www.jubilee.to`, choose "Tell me when it launches", and
   send your own address with the box ticked; then choose "Send your business’s details" and send
   a test business with your address.
   Check: the page shows "You’re on the list." and "Thank you. We have your details."
7. **Read them back.**
   Check the sign-up: start the workflow "Check a launch sign-up" from the Actions tab with your
   address (or `bash eng/azure/check-launch.sh <your address>` here); it prints
   `Launch notification sign-ups: <n>` and `<your address> is among them: yes`. Check the
   pre-registration: within two minutes the team's address receives "New business pre-registration:
   <the business's name>", and "New launch notification sign-up" for the address of step 6. To
   export either list, run `jubilee launch list --kind notifications > sign-ups.csv` (or
   `--kind businesses`) with the connection string, as `check-launch.sh` does; it prints the
   header row alone when nothing is stored.
   If the page confirmed but the row is missing, the marketing host kept the submission:
   `az webapp log tail -g "$G" -n "$WWW"` shows `Kept a launch submission (n waiting).`, and
   `Sent n kept launch submissions (0 waiting).` once the API takes it, within a minute of its
   return. Fix what step 3 or 5 found and wait for that line.
8. **The bot challenge (when it is turned on).** It is off until the Turnstile keys of the join
   form are set (`BotChallenge__SiteKey` and `BotChallenge__SecretKey` on `jubilee-to-app`, both or
   neither); the widget must also list `jubilee.to` and `www.jubilee.to`.
   Check: `curl -s https://www.jubilee.to/api/launch` prints `{"botChallengeSiteKey":"<site key>"}`,
   and steps 6 and 7 still pass.

The test sign-up and the test business stay in the lists, marked by your own address; like every
row they are deleted 12 months after they were sent (`L2-218` AC6).

### How it works

- **The team's e-mail.** A repeat sign-up of a known address e-mails no one.
- **A submission the API cannot take.** When the API is restarting, down or slow, `server.js`
  keeps the submission as one file in `KEEP_DIR`, answers the visitor 202, and sends it to the API
  again every minute until it is accepted; then the file is removed. The row's consent time is
  the time the marketing host received it. The container log says `Kept a launch submission (n
  waiting).` and `Sent n kept launch submissions (n waiting).`, with no personal data. Files 12
  months old are deleted unsent.
- **Just after a deployment.** The plan is one B1 worker for the three sites, and it is at full
  CPU for several minutes while they restart. A form sent then is usually kept, and reaches the
  database a few minutes later, once the API answers within 8 seconds. The API does not count a
  kept submission against the 5 an hour of its address, so nothing holds it back.
- **The deployment's own check.** After the health check `deploy.sh` asks
  `https://www.jubilee.to/api/launch` for 200 and `https://www.jubilee.to/api/session` for 404
  (step 5), and fails the deployment if either differs.
- **Rotating the proxy key** means removing `StaffAccess__ProxyKey` from `jubilee-to-app` and
  deploying. The key only lets a proxy state the caller's address and, for a launch submission,
  when it was received; the staff endpoints still answer only the allowed networks, and this host
  never forwards them.
- **Reading the submissions** is `jubilee launch list` only, by whoever holds the connection
  string; each run is written to the audit log, and the rows are deleted 12 months after they were
  sent.

At launch, revert the marketing site's commits of ADR 0044 and remove the four settings of
`jubilee-to-www` from `deploy.sh` and from the App Service, once `KEEP_DIR` is empty.

## The admin application

The Jubilee team's screens (Listings, Reports, Featured) and the administrators' Policies are a
separate application at `https://admin.jubilee.to` (ADR 0040, ADR 0057). Staff sign in through
Microsoft Entra ID with a second factor, and the staff endpoints of the API (`/api/admin/*`,
`/api/staff/*`) answer only an allowed network. Every deployment publishes the application.

Where it stands: the App Service, its proxy key, the DNS records and the certificate were set up
on 11 November 2026 (step 3). Steps 1, 2 and 4 to 8 are open. Until step 5 is done the allow-list
is empty, so the API refuses every staff request in production, and the application's own files
answer any network. Write the date beside each step in the table at the end as you finish it.

### The owner's checklist

Run these in order, in Azure Cloud Shell (bash) from a clone of this repository. Each step says
how to check it and, if the check fails, how to put it right. Nothing here prints a secret.

```bash
G=rg-jubilee-prod; ADMIN=jubilee-to-admin; APP=jubilee-to-app
setting() { az webapp config appsettings list -g "$G" -n "$1" --query "[?name=='$2'].value | [0]" -o tsv; }
```

1. **Register the application with Entra ID.** In the Jubilee tenant: App registrations, New
   registration, `Jubilee admin`, single tenant, platform Web, redirect URI
   `https://admin.jubilee.to/api/staff/sign-in/callback`. Under Authentication, tick "ID tokens".
   Under Certificates and secrets, add a client secret and keep it for step 4. The API uses the
   v1.0 endpoints, whose ID token carries `amr`.
   Check:
   `az ad app list --display-name "Jubilee admin" --query "[0].{client:appId, redirect:web.redirectUris[0], idTokens:web.implicitGrantSettings.enableIdTokenIssuance}"`
   prints the client ID, the callback address above and `true`.
2. **Require a second factor.** A Conditional Access policy for the `Jubilee admin` application
   that grants access only with multifactor authentication, for every staff member. The API also
   refuses a sign-in whose `amr` does not name `mfa` (L2-189 AC3), so a staff member without a
   second factor is told to set one up rather than let in.
   Check: Entra ID, Conditional Access, Policies lists the policy as On, with the `Jubilee admin`
   application under Target resources and "Require multifactor authentication" under Grant. After
   step 8, the sign-in logs show the staff sign-in with "Multifactor authentication" as its
   authentication requirement.
3. **The App Service, its proxy key and its host name** (done 11 November 2026):
   `bash eng/azure/create-admin.sh`. It creates `jubilee-to-admin` on `jubilee-plan` (Node 22,
   `node server.js`, HTTPS only, TLS 1.2, Always On, FTP off, `API_ORIGIN=https://app.jubilee.to`),
   sets one proxy key as `PROXY_KEY` on it and `StaffAccess__ProxyKey` on `jubilee-to-app`, and
   binds `admin.jubilee.to` with a managed certificate. When it stops with exit code 2 it prints
   the `CNAME admin` and `TXT asuid.admin` records (see "DNS" below); publish them, wait a few
   minutes and run it again.
   Check: `az webapp config hostname list -g "$G" --webapp-name "$ADMIN" --query "[?name=='admin.jubilee.to'].sslState" -o tsv`
   prints `SniEnabled`, and
   `[ "$(setting $ADMIN PROXY_KEY | sha256sum)" = "$(setting $APP StaffAccess__ProxyKey | sha256sum)" ] && echo "same key"`
   prints `same key`.
   Fix: run the script again; to make a new key, delete `PROXY_KEY` from `jubilee-to-admin` first.
4. **The staff sign-in settings of `jubilee-to-app`**, from step 1:

   ```bash
   read -rp 'Tenant ID: ' TENANT; read -rp 'Client ID: ' CLIENT; read -rsp 'Client secret: ' SECRET; echo
   az webapp config appsettings set -g "$G" -n "$APP" -o none --settings \
     "StaffSignIn__TenantId=$TENANT" "StaffSignIn__ClientId=$CLIENT" "StaffSignIn__ClientSecret=$SECRET" \
     StaffSignIn__PublicBaseUrl=https://admin.jubilee.to; unset SECRET
   ```

   Never set `StaffSignIn__Provider`: its only other value, `Development`, signs anyone in, and the
   API refuses to start with it outside the Development environment (L2-195 AC2).
   Check:
   `for n in StaffSignIn__TenantId StaffSignIn__ClientId StaffSignIn__PublicBaseUrl; do echo "$n=$(setting $APP $n)"; done; [ -n "$(setting $APP StaffSignIn__ClientSecret)" ] && echo "secret set"; [ -z "$(setting $APP StaffSignIn__Provider)" ] && echo "no provider"`
   prints the two IDs, `https://admin.jubilee.to`, `secret set` and `no provider`.
5. **The allowed networks.** The address ranges of the Jubilee staff networks, as CIDR, separated
   by commas:
   `STAFF_NETWORKS='203.0.113.0/24, 2001:db8:5::/48' bash eng/azure/create-admin.sh`. It allows
   them on `jubilee-to-admin` and denies every other network there (L2-192 AC5), and sets the same
   list as `StaffAccess__AllowedNetworks` on `jubilee-to-app` (AC1). Rules already in place are
   kept; remove a network under Networking, Access restrictions, and from the setting.
   Check:
   `az webapp config access-restriction show -g "$G" -n "$ADMIN" --query "{unmatched:ipSecurityRestrictionsDefaultAction, allowed:ipSecurityRestrictions[?action=='Allow'].ipAddress}"`
   shows `Deny` and your ranges, and `setting $APP StaffAccess__AllowedNetworks` prints them. From
   a network that is not on the list (Cloud Shell is not),
   `curl -s -o /dev/null -w '%{http_code}\n' https://admin.jubilee.to` prints `403` and
   `curl -s https://app.jubilee.to/api/staff/session` names `NETWORK_NOT_ALLOWED`.
6. **Deploy.** `gh workflow run deploy.yml` (or `bash eng/azure/deploy.sh --migrate`, which
   applies the staff migrations).
   Check: `gh run list --workflow deploy.yml -L 1` shows `completed success`.
7. **The first administrator and the Jubilee team.**
   `bash eng/azure/staff.sh grant --email {address} --role admin` for the first administrator, and
   `--role moderator` for each member of the Jubilee team. The address is the staff member's Entra
   ID address; their first sign-in binds the account to that identity (L2-193 AC5). ADR 0057
   renamed the role from `verifier`; existing grants carry over. Each grant is written to the
   audit log as `staff.role-granted`, with the account that ran the command as the actor.
   Check: `bash eng/azure/staff.sh list` prints each address with its roles
   (`{address}: moderator, admin`).
8. **Sign in once against production, and record it.** From a staff network, open
   `https://admin.jubilee.to`, choose "Sign in with your staff account", sign in with the second
   factor and see Listings (a moderator) or Policies (an administrator only); then "Sign out" says
   "You've signed out of the admin application." From any other network, the address does not
   open (step 5).
   Check: the sign-in works as above, and `az webapp log tail -g "$G" -n "$APP"` shows no
   `Failed authorization` for your address. Write the date and your initials beside step 8 below.
   If the screen says "Sign-in needs a second factor", step 2 is not in force; if it says "This
   account isn't on the Jubilee staff list", step 7 used another address; "We couldn't sign you
   in" with `JB-STAFF-503` points at the settings of step 4.
9. **Run the sweeps by hand** (ADR 0010, for the repository owner only): in `e2e/`, `npm run
   sweeps`, which covers the admin screens at every width and in both themes (L2-188 AC6).
   Check: it ends with every test passed.

| Step | Done on |
|---|---|
| 1. Entra ID registration | |
| 2. Second factor | |
| 3. App Service, proxy key, host name | 11 November 2026 |
| 4. Staff sign-in settings | |
| 5. Allowed networks | |
| 6. Deploy | |
| 7. First administrator and the Jubilee team | |
| 8. Signed in against production | |
| 9. Sweeps run | |

Rotating the proxy key means setting the new value on the three App Services at once; removing
`StaffAccess__ProxyKey` from `jubilee-to-app` and deploying does that. Revoking a staff member's
roles (`bash eng/azure/staff.sh revoke --email {address} --role moderator`) ends their staff
sessions and is written to the audit log as `staff.role-revoked`.

## Google sign-in

Set up on 11 November 2026 (ADR 0037). To repeat it:

1. Google Cloud Console, project `Jubilee` (`jubilee-514409`), Google Auth Platform.
2. Branding: app name `Jubilee`, a support e-mail, home page `https://www.jubilee.to`, privacy
   policy `https://app.jubilee.to/privacy`, terms `https://app.jubilee.to/terms`, authorised domain
   `jubilee.to`. No logo: a logo requires Google's verification.
3. Audience: External, published ("In production"). The scopes `openid`, `email` and `profile`
   are not sensitive and need no verification.
4. Clients: one client of type Web application, `Jubilee web`.

   | | |
   |---|---|
   | Authorised JavaScript origins | `https://app.jubilee.to`, `http://localhost:4200` |
   | Authorised redirect URIs | `https://app.jubilee.to/api/auth/google/callback`, `http://localhost:4200/api/auth/google/callback` |

   The redirect URI is `App__PublicBaseUrl` followed by `/api/auth/google/callback`
   (`GoogleSignInController.RedirectUri()`).
5. Copy the client ID, and add a client secret (Google shows a secret once, when it is made). In
   Azure Cloud Shell, set both without echoing the secret or leaving it in the shell history:

   ```
   read -rp "Google client ID: " GID && read -rsp "Google client secret (hidden): " GSEC && echo \
     && az webapp config appsettings set -g rg-jubilee-prod -n jubilee-to-app \
          --settings "Google__ClientId=$GID" "Google__ClientSecret=$GSEC" -o none \
     && unset GID GSEC
   ```

   The app restarts by itself; allow it a minute. For local development see "Signing in with
   Google locally" in the root `README.md`.
6. Check: `curl -s -o /dev/null -D - https://app.jubilee.to/api/auth/google/start` answers `302`
   with a `Location` at `accounts.google.com`, and `GET /api/session` reports `"googleSignIn": true`.

Without the two settings Google sign-in is off: the join and sign-in pages show no Google button.
A missing button is not always a missing setting. For the few minutes `jubilee-to-app` takes to
restart after a deployment, `server.js` answers `/api/session` with 503 "Jubilee is
starting.", and a page opened then shows no Google button until the app's next request for the
session is answered (L2-003 AC9; it asks again by itself, no reload is needed). Check the settings
and `GET /api/session` (step 6) before setting anything again.
`deploy.sh` stops before building when either setting is missing on `jubilee-to-app`, and after
deploying fails unless `GET /api/session` reports `"googleSignIn": true`, so the button cannot
disappear unnoticed. `SKIP_GOOGLE_CHECK=1 bash eng/azure/deploy.sh` deploys without Google sign-in
on purpose.

## The app offline: service worker and status page

The app's production build carries the Angular service worker (ADR 0068): `jubilee-sw.js`,
`ngsw-worker.js`, `safety-worker.js` and `ngsw.json` beside `index.html`. `server.js` serves those
four with `Cache-Control: no-cache`, so a deploy is seen the next time a member opens Jubilee. The
worker keeps the app shell only; it never answers or keeps an `/api` request. Nothing has to be set.
To take the worker off every device, deploy a build whose `jubilee-sw.js` is a copy of
`safety-worker.js`.

**Owner step: the status page.** When Jubilee cannot be reached, the banner's "Check status" opens
`statusUrl` of `frontend/projects/jubilee/src/environments/environment.ts` (L2-121 AC2). It is still
the placeholder `https://status.jubilee.example`. Host a status page apart from `jubilee-to-app`
(so it answers while the app's host is down: a hosted status service, or a static page on another
host), put its address there and deploy.

## Deleted accounts, backups and data archives

A deleted account must stay deleted, also after the database is restored from a backup, and no
backup may hold its personal data later than 35 days after the deletion (L2-017 AC6 and AC7,
ADR 0069). Three things make that so:

- **The deletion ledger.** Every deletion is appended to `/home/data/deletions/ledger.jsonl`
  (`Deletions__LedgerPath`): one JSON line with the account's id and the time, nothing else. It
  is on the app's persistent storage, so restoring the database does not touch it. The worker
  re-applies it when it starts and every hour: an account the ledger names that the database holds
  as not deleted is deleted again with its original time, telling no one again, and its erasure
  follows 30 days after that time. Nothing needs doing after a restore; the worker starts with the
  app. Never delete or edit the ledger.
- **The database's backups are kept 35 days or less.** Azure SQL keeps point-in-time restore
  backups 7 days on the Basic tier, and no long-term retention is set. **Owner step:** keep it so.
  Check it with

  ```bash
  az sql db str-policy show -g rg-jubilee-prod -s <server> -n jubilee --query retentionDays
  az sql db ltr-policy show -g rg-jubilee-prod -s <server> -n jubilee
  ```

  The first must say 35 or less, and the second must show no weekly, monthly or yearly retention
  (`PT0S`). A longer retention, or long-term backups, would keep deleted accounts' data past 35
  days.
- **Data archives live in the export store** (`/home/data/exports`, `Exports__Root`), a private
  folder that no address serves. Each archive is deleted when its link expires after 7 days, when
  the account is deleted, and at the latest at erasure. Azure encrypts the storage at rest.
  **Owner step, only if wanted:** a private blob container can replace the folder; it needs a
  blob store written behind `IExportStore` first.

## Listing addresses

Every published listing has the address `https://{slug}.jubilee.to` (L1-032, ADR 0071). The app's
host (`server.js` on `jubilee-to-app`) answers it with a 301 to `https://app.jubilee.to/b/{slug}`,
which the API decides (`GET /api/addresses/{label}`); an address serves no file, no `/api` and no
cookie. Addresses are **off** until the steps below are done: until then the app shares
`https://app.jubilee.to/b/{slug}` and nothing is broken.

### The owner's checklist

Do the steps in order; each has its check. `G=rg-jubilee-prod`, `APP=jubilee-to-app`.

1. **Wildcard DNS.** At Namecheap add `CNAME * → jubilee-to-app.azurewebsites.net.` The records of
   `www`, `app`, `admin` and `notify` stay as they are: a named record wins over the wildcard.
   Check: `dig +short anything-at-all.jubilee.to` answers the app's address.
2. **A wildcard certificate.** An App Service managed certificate does not cover a wildcard, so
   bring one for `*.jubilee.to` (bought, or issued through a DNS-01 challenge) as a PFX, upload it
   and note its thumbprint:
   `az webapp config ssl upload -g "$G" -n "$APP" --certificate-file wildcard.pfx --certificate-password "$PFX_PASSWORD" --query thumbprint -o tsv`
3. **Bind the wildcard host name.**
   `az webapp config hostname add -g "$G" --webapp-name "$APP" --hostname '*.jubilee.to'`, then
   `az webapp config ssl bind -g "$G" -n "$APP" --certificate-thumbprint <thumbprint> --ssl-type SNI`.
   Check: `curl -sI https://anything-at-all.jubilee.to` completes the TLS handshake.
4. **HTTPS only**, so `http://` is sent to `https://` at the same address before the host sees it
   (L2-246 AC2): `az webapp update -g "$G" -n "$APP" --https-only true`.
   Check: `curl -sI http://luzandre-com.jubilee.to` answers 301 to `https://luzandre-com.jubilee.to/`.
5. **An alert before the certificate expires** (L2-246 AC1, L2-176): an Azure Monitor alert, or a
   calendar entry 30 days before the date of
   `az webapp config ssl list -g "$G" --query "[?contains(subjectName, '*.jubilee.to')].expirationDate"`.
   One certificate serves every address, so a new listing never waits for one.
6. **Realign older slugs.** `bash eng/azure/deploy.sh --migrate` runs `jubilee migrate`, which
   gives every listing whose slug breaks the address rules a new one and keeps the old as a
   redirect (L2-241 AC5). It prints how many, and nothing on a second run.
7. **Turn the addresses on.** `ADDRESS_DOMAIN=jubilee.to bash eng/azure/deploy.sh` (or add
   `ADDRESS_DOMAIN` to the Deploy workflow's environment). It sets `ADDRESS_DOMAIN`, `APP_ORIGIN`
   and `OWN_HOSTS` for the host and `Addresses__Domain` for the API on `jubilee-to-app`.
8. **Check.**
   - `curl -sI https://<a live slug>.jubilee.to/` answers `301` with
     `Location: https://app.jubilee.to/b/<slug>` and no `Set-Cookie`;
   - `curl -s -o /dev/null -w '%{http_code}' https://a.b.jubilee.to/` (if the certificate allows the
     handshake) and `https://admin-x.jubilee.to/api/session` answer `404`;
   - `curl -s -o /dev/null -w '%{http_code}' https://app.jubilee.to/api/health` still answers `200`;
   - a listing's Share dialog shows `https://<slug>.jubilee.to`.

To turn the addresses off again, remove `Addresses__Domain` (the app shares its own links again)
and, if the hosts must stop answering, `ADDRESS_DOMAIN`:
`az webapp config appsettings delete -g "$G" -n "$APP" --setting-names Addresses__Domain ADDRESS_DOMAIN`.

## DNS (Namecheap, Advanced DNS of `jubilee.to`)

| Type | Host | Value |
|---|---|---|
| A | `@` | `20.116.40.17` (inbound address of `jubilee-to-www`) |
| CNAME | `www` | `jubilee-to-www.azurewebsites.net.` |
| CNAME | `app` | `jubilee-to-app.azurewebsites.net.` |
| CNAME | `admin` | `jubilee-to-admin.azurewebsites.net.` |
| CNAME | `*` | `jubilee-to-app.azurewebsites.net.` (listing addresses; **not added yet: an owner step**, see "Listing addresses") |
| TXT | `asuid`, `asuid.www`, `asuid.app`, `asuid.admin` | the App Service domain verification ID |

| TXT | `notify` | `v=spf1 include:spf.protection.outlook.com -all` (SPF of the sending domain) |
| TXT | `notify` | `ms-domain-verification=…`, the value Azure shows for the domain |
| CNAME | `selector1-azurecomm-prod-net._domainkey.notify` | `selector1-azurecomm-prod-net._domainkey.azurecomm.net` (DKIM) |
| CNAME | `selector2-azurecomm-prod-net._domainkey.notify` | `selector2-azurecomm-prod-net._domainkey.azurecomm.net` (DKIM) |
| TXT | `_dmarc.notify` | `v=DMARC1; p=quarantine` |

The `@` TXT record for e-mail forwarding was left as it was. It is the SPF record of `jubilee.to`
and Namecheap locks it while forwarding is on, which is why e-mail is sent from the subdomain
`notify.jubilee.to` (ADR 0038).

## E-mail

Jubilee sends through Azure Communication Services Email, from `no-reply@notify.jubilee.to`
(ADR 0038). The resources are in `rg-jubilee-prod`:

- `jubilee-email`: the Email Communication Service, with the customer-managed domain
  `notify.jubilee.to` and the sender `no-reply`.
- `jubilee-communication`: the Communication Service linked to that domain; its connection string
  is `Email__ConnectionString`.
- `jubilee-email-delivery`: the Event Grid subscription that posts delivery reports to
  `https://app.jubilee.to/api/webhooks/email-events` with the header `X-Webhook-Secret`
  (`Email__WebhookSecret`), so a bounce marks the address undeliverable (L2-179).

To set it up, or to repeat it:

1. Publish the five `notify` records of the DNS table above at Namecheap. The verification value
   comes from `az communication email domain show --domain-name notify.jubilee.to
   --email-service-name jubilee-email -g rg-jubilee-prod --query verificationRecords` (the script
   below creates the domain on its first run and stops until the records are verified).
2. In Azure Cloud Shell, from a clone of this repository: `bash eng/azure/configure-email.sh`. It
   creates what is missing, verifies the records, creates the sender, links the domain, sets the
   three settings without printing them, and subscribes the webhook. Run it again whenever it
   stops for DNS; it changes nothing that is already in place.
3. Check: ask for a reset link for your own account at `https://app.jubilee.to/forgot-password`,
   or join with a real address; the e-mail arrives within two minutes. It was set up and checked
   this way on 11 November 2026: the message reached a Gmail inbox, not spam, with the layout of
   `docs/mocks/emails/`. `az webapp log tail` shows a failed send, which the outbox retries
   for 24 hours.

A new sending domain starts with a low sending limit; ask Azure support to raise it before a
large mailing. Rotating the key is `az communication regenerate-key` followed by the script.

## Deploying

Every push to `main` is deployed by [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
once CI has passed on it. The workflow applies new EF Core migrations, builds and packages the
three sites, sets the settings of the launching-soon forms, deploys the sites, waits for the
health check and checks that the marketing host forwards `/api/launch` and nothing else. It can also be started by hand from the
Actions tab.

The workflow signs in to Azure with OpenID Connect, so the repository holds no password. It needs
three repository variables (Settings, Secrets and variables, Actions, Variables):

| Variable | Value |
|---|---|
| `AZURE_CLIENT_ID` | the application (client) ID of the app registration `jubilee-github-deploy` |
| `AZURE_TENANT_ID` | the directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | the subscription that holds `rg-jubilee-prod` |

The app registration has one federated credential (`github-main`) and the Contributor role on
`rg-jubilee-prod` only. The credential's subject is the one GitHub presents for this repository,
which carries the owner and repository IDs:
`repo:QuinntyneBrown@1749159/jubilee@1452953441:ref:refs/heads/main`. The plain form
`repo:QuinntyneBrown/jubilee:ref:refs/heads/main` is refused (`AADSTS700213`); the sign-in error
quotes the subject it was given.

To deploy by hand instead, in Azure Cloud Shell (bash):

```
git clone https://github.com/QuinntyneBrown/jubilee.git && cd jubilee
bash eng/azure/deploy.sh             # build, package, deploy the sites
bash eng/azure/deploy.sh --migrate   # the same, after applying new EF Core migrations
```

`--seed` adds the demo directory (safe to repeat). The database was seeded with it on the first
deployment; `jubilee reset` followed by `jubilee migrate` empties it before real listings go in.

## Checking it

- `https://app.jubilee.to/api/health` answers `{"status":"ok"}`.
- Page-load statuses (ADR 0056), after a deployment that changed `server.js`, the routes or the
  listings: `curl -sI https://app.jubilee.to/no-such-page` answers `404`;
  `curl -sI https://app.jubilee.to/b/{a listing's slug}` answers `200`; a listing renamed by its
  owner answers its old slug with `301` and `Location: /b/{new slug}`. While `Maintenance__Enabled`
  is `true` (with `Maintenance__BackBy` an ISO time), `curl -si https://app.jubilee.to/` answers
  `503` with `Retry-After` and the page "Jubilee is being updated"; set it back to `false` after.
- Logs: `az webapp log tail -g rg-jubilee-prod -n jubilee-to-app` (the API, the worker and
  `server.js` all write to the container log).
