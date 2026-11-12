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
  - `server.js` on the public port, which serves the built app and sends `/api` to the API.

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
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (the package is already built) |

| `Google__ClientId`, `Google__ClientSecret` | the OAuth client `Jubilee web` (see "Google sign-in" below); the secret exists nowhere else |

| `Email__ConnectionString`, `Email__From`, `Email__WebhookSecret` | set by `configure-email.sh` (see "E-mail" below); without the first, no e-mail leaves |

| `StaffSignIn__TenantId`, `StaffSignIn__ClientId`, `StaffSignIn__ClientSecret`, `StaffSignIn__PublicBaseUrl` | staff sign-in (see "The admin application" below) |
| `StaffAccess__AllowedNetworks`, `StaffAccess__ProxyKey` | the networks the staff endpoints answer, and the key of the admin host's and the marketing host's proxy; without the first, every staff endpoint is refused |
| `Launch__TeamEmail` | where each pre-registration and each new launch sign-up is e-mailed; set by `deploy.sh` (see "The launching-soon forms" below) |

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
host forwards its calls. Everything this needs is done by the Deploy workflow on every
deployment (ADR 0047); there is no step to run by hand.

- **The migrations.** `deploy.sh --migrate` applies `AddLaunchSubscribers` and
  `AddBusinessPreRegistrations` with the rest.
- **The settings.** `deploy.sh` sets each of these when its value differs, and prints names only:

  | App Service | Setting | Value |
  |---|---|---|
  | `jubilee-to-www` | `API_ORIGIN` | `https://app.jubilee.to` |
  | `jubilee-to-www` | `API_PATHS` | `/api/launch` (any other `/api` path answers 404 on this host) |
  | `jubilee-to-www` | `PROXY_KEY` | the key of `StaffAccess__ProxyKey` on `jubilee-to-app`, so the API counts the limits of five an hour per visitor's address, not per host, and believes the time a submission was received |
  | `jubilee-to-www` | `KEEP_DIR` | `/home/data/launch-kept` (persistent storage) |
  | `jubilee-to-app` | `Launch__TeamEmail` | `quinntynebrown@gmail.com` (`LAUNCH_TEAM_EMAIL` in `deploy.sh`) |

  When `jubilee-to-app` has no `StaffAccess__ProxyKey`, the script makes one and sets it on the
  three App Services. The key only lets a proxy state the caller's address and, for a launch
  submission, when it was received; the staff endpoints still answer only the allowed networks,
  and this host never forwards them. Rotating the key means removing `StaffAccess__ProxyKey` from
  `jubilee-to-app` and deploying.
- **The check.** After the health check `deploy.sh` asks `https://www.jubilee.to/api/launch` for
  200 and `https://www.jubilee.to/api/session` for 404. The deployment fails if either differs.
- **The team's e-mail.** Each business pre-registration and each new launch notification sign-up
  queues one e-mail to `Launch__TeamEmail` in the outbox, which the worker sends (see "E-mail").
  A repeat sign-up of a known address e-mails no one.
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
- **Reading the submissions.** `jubilee launch list --kind notifications` (or `--kind businesses`)
  prints CSV to whoever holds the connection string; each run is written to the audit log. The
  rows are deleted 12 months after they were sent. To check that one sign-up arrived without
  reading the list, start the workflow "Check a launch sign-up" from the Actions tab with the
  address: it prints the number of rows and whether that address is among them, and nothing else.
- **The bot challenge.** When the Turnstile keys are set (above), the widget must also list
  `jubilee.to` and `www.jubilee.to`; the page then loads Cloudflare's script for the challenge.

At launch, revert the marketing site's commits of ADR 0044 and remove the four settings of
`jubilee-to-www` from `deploy.sh` and from the App Service, once `KEEP_DIR` is empty.

## The admin application

The verification team's screens are a separate application at `https://admin.jubilee.to` (ADR
0040). Staff sign in through Microsoft Entra ID with a second factor, and the staff endpoints of
the API (`/api/admin/*`, `/api/staff/*`) answer only an allowed network. The App Service, its
proxy key, the DNS records and the certificate were set up on 11 November 2026 (steps 4 and 6, and
the key of step 5), and every deployment publishes the application. Until the remaining steps are
done, nobody can use the staff endpoints in production: the allow-list is empty, so the API
refuses them all. The access restrictions of step 4 are not set yet either, so the application's
own files answer any network.

None of these steps is run by the workflows. `bash eng/azure/create-admin.sh`, in Cloud Shell,
does step 4 (without the access restrictions), the proxy key of step 5 and the Azure half of
step 6; it prints the two DNS records and is run again once they are published. In order:

1. **Entra ID app registration.** In the Jubilee tenant: App registrations, New registration,
   `Jubilee admin`, single tenant, platform Web, redirect URI
   `https://admin.jubilee.to/api/staff/sign-in/callback`. Under Authentication, tick "ID tokens".
   Under Certificates and secrets, add a client secret. Note the tenant ID and the client ID. The
   API uses the v1.0 endpoints, whose ID token carries `amr`.
2. **Second factor.** A Conditional Access policy for the `Jubilee admin` application that grants
   access only with multifactor authentication, for every staff member. The API refuses a sign-in
   whose `amr` does not name `mfa` (L2-189 AC3), so a staff member without a second factor is told
   to set one up.
3. **The allowed networks.** The address ranges of the Jubilee staff networks, as CIDR, separated
   by commas (`203.0.113.0/24, 2001:db8:5::/48`).
4. **The App Service.** `jubilee-to-admin` on `jubilee-plan`, Node 22, start-up command
   `node server.js`, HTTPS only, TLS 1.2, Always On, FTP off. Settings:

   | Setting | Value |
   |---|---|
   | `API_ORIGIN` | `https://app.jubilee.to` |
   | `PROXY_KEY` | a new random key (`openssl rand -base64 32`), the same as `StaffAccess__ProxyKey` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |

   Under Networking, Access restrictions, allow the staff networks of step 3 and deny the rest, so
   that the application itself only answers there.
5. **The settings of `jubilee-to-app`** (in Cloud Shell, with `read -rs` for the secrets, as for
   Google sign-in): `StaffSignIn__TenantId`, `StaffSignIn__ClientId`, `StaffSignIn__ClientSecret`,
   `StaffSignIn__PublicBaseUrl=https://admin.jubilee.to`, `StaffAccess__AllowedNetworks` (step 3)
   and `StaffAccess__ProxyKey` (the key of step 4). Never set `StaffSignIn__Provider`: its only
   other value, `Development`, signs anyone in and the API refuses to start with it outside the
   Development environment.
6. **DNS.** `CNAME admin → jubilee-to-admin.azurewebsites.net.` and `TXT asuid.admin` with the
   domain verification ID; then add the host name to `jubilee-to-admin` with a managed certificate.
7. **Deploy.** Run the Deploy workflow (or `bash eng/azure/deploy.sh --migrate`, which applies the
   staff migrations). It now deploys `jubilee-to-admin` too.
8. **The first administrator.** In Cloud Shell, with the connection string as in `deploy.sh`:
   `dotnet run --project backend/src/Jubilee.Cli -- staff grant --email {address} --role admin`,
   and `--role verifier` for each member of the verification team. The address is the staff
   member's Entra ID address; the first sign-in binds the account to that identity.
9. **Check.** From a staff network, open `https://admin.jubilee.to`, sign in with a second factor
   and see the queue. From any other network the screen says "You're not on an allowed network."
   `az webapp log tail -n jubilee-to-app` shows a refused staff request as `Failed authorization`
   or `NETWORK_NOT_ALLOWED`.

Rotating the proxy key means setting the new value on the three App Services at once; removing
`StaffAccess__ProxyKey` from `jubilee-to-app` and deploying does that. Revoking a staff
member's roles (`jubilee staff revoke`) ends their staff sessions.

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

## DNS (Namecheap, Advanced DNS of `jubilee.to`)

| Type | Host | Value |
|---|---|---|
| A | `@` | `20.116.40.17` (inbound address of `jubilee-to-www`) |
| CNAME | `www` | `jubilee-to-www.azurewebsites.net.` |
| CNAME | `app` | `jubilee-to-app.azurewebsites.net.` |
| CNAME | `admin` | `jubilee-to-admin.azurewebsites.net.` |
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
- Logs: `az webapp log tail -g rg-jubilee-prod -n jubilee-to-app` (the API, the worker and
  `server.js` all write to the container log).
