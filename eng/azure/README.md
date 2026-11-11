# Jubilee on Azure

How Jubilee is hosted, and how to deploy it again. Set up on 11 November 2026.

| Address | Serves | App Service |
|---|---|---|
| `https://www.jubilee.to`, `https://jubilee.to` | the marketing site (`frontend/projects/marketing`) | `jubilee-to-www` |
| `https://app.jubilee.to` | the app (`frontend/projects/jubilee`), the API under `/api`, the worker | `jubilee-to-app` |

## Resources

Everything is in the resource group `rg-jubilee-prod`, Canada Central.

- `jubilee-plan`: one Linux App Service plan, B1. Both web apps run on it.
- `jubilee-to-www`: Node 22. Start-up command `node server.js`. `server.js` serves the built
  marketing page; it answers byte ranges so the pitch film can be seeked.
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

Both web apps are HTTPS only, TLS 1.2 or later, Always On, FTP off, with App Service managed
certificates for the three host names.

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

Not configured yet, so this feature is off: `BotChallenge__SecretKey` (Turnstile).

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
| TXT | `asuid`, `asuid.www`, `asuid.app` | the App Service domain verification ID |

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
3. Check: join with a real address at `https://app.jubilee.to/join`; the confirmation e-mail
   arrives within two minutes. `az webapp log tail` shows a failed send, which the outbox retries
   for 24 hours.

A new sending domain starts with a low sending limit; ask Azure support to raise it before a
large mailing. Rotating the key is `az communication regenerate-key` followed by the script.

## Deploying

Every push to `main` is deployed by [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
once CI has passed on it. The workflow applies new EF Core migrations, builds and packages both
sites, deploys them and waits for the health check. It can also be started by hand from the
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
bash eng/azure/deploy.sh             # build, package, deploy both sites
bash eng/azure/deploy.sh --migrate   # the same, after applying new EF Core migrations
```

`--seed` adds the demo directory (safe to repeat). The database was seeded with it on the first
deployment; `jubilee reset` followed by `jubilee migrate` empties it before real listings go in.

## Checking it

- `https://app.jubilee.to/api/health` answers `{"status":"ok"}`.
- Logs: `az webapp log tail -g rg-jubilee-prod -n jubilee-to-app` (the API, the worker and
  `server.js` all write to the container log).
