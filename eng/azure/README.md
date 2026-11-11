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

Not configured yet, so these features are off or stubbed: `Google__ClientId` /
`Google__ClientSecret` (sign in with Google), `BotChallenge__SecretKey` (Turnstile), and a real
e-mail sender (the API and the worker still use the logging sender, so no e-mail leaves).

## DNS (Namecheap, Advanced DNS of `jubilee.to`)

| Type | Host | Value |
|---|---|---|
| A | `@` | `20.116.40.17` (inbound address of `jubilee-to-www`) |
| CNAME | `www` | `jubilee-to-www.azurewebsites.net.` |
| CNAME | `app` | `jubilee-to-app.azurewebsites.net.` |
| TXT | `asuid`, `asuid.www`, `asuid.app` | the App Service domain verification ID |

The `@` TXT record for e-mail forwarding was left as it was.

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
