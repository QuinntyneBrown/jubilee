<p align="center">
  <img src="docs/assets/jubilee-icon.svg" alt="Jubilee logo" width="96" height="96">
</p>

<h1 align="center">Jubilee</h1>

<p align="center">
  <strong>Toronto's Christian marketplace.</strong>
</p>

Jubilee is a directory of verified Christian-owned businesses in Toronto. A member finds a
business, messages it, books a meeting, asks for a quote or requests a product, and the business
confirms or declines. Every listing is confirmed by a pastor or elder before it goes live. Jubilee
does not take payment; members pay the business directly.

> **Status: the first of 26 journeys is implemented.** A visitor can open the welcome page, browse
> the directory and filter, sort and page through a category. The [user journeys](docs/journey.md)
> list what is built next, in order of value to the user, and
> [`docs/estimates/`](docs/estimates/README.md) tracks how far each design is.

## Table of contents

- [Features](#features)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Running the tests](#running-the-tests)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

These are the planned features. Each one is specified in [`docs/specs/L2.md`](docs/specs/L2.md).
The directory is built; the others follow in the order of the journeys.

- **Directory.** A welcome page, a browse home with featured businesses, and category pages with
  filters, sorting and pagination. Only verified, live listings are public.
- **Search.** Keyword search across businesses, services and products, with grouped results.
- **Business and product pages.** A page per service business or shop, and a page per product.
- **Requests.** Book a meeting, ask for a quote or request a product, without paying. Follow each
  request and cancel an open one.
- **Messaging.** Private one-to-one conversations between a member and a business.
- **Notifications.** A notification centre, toasts, banners and e-mail, according to preferences.
- **Business onboarding.** List a business for free, name a church reference and submit it for
  verification.
- **Church reference.** A pastor or elder confirms an owner through a private, single-use link.
- **Owner workspace.** Monitor a listing, edit it, manage products and services, answer requests.
- **Verification team.** A review queue, approval, change requests and report handling.
- **Accounts.** Join by e-mail or Google, confirm the address, reset a password, download data and
  delete the account.
- **Offline use.** Cached pages and a queue for outgoing messages on a poor connection.
- **Accessible and responsive.** WCAG 2.2 AA, light and dark themes, every viewport from 360 px.

## Project structure

The layout is defined in [`AGENTS.md`](AGENTS.md).

```
jubilee/
├── backend/                .NET solution (Jubilee.sln)
│   ├── src/                Jubilee.Domain, .Application, .Infrastructure, .Api, .Worker, .Cli
│   └── tests/              one test project per source project
├── frontend/               Angular workspace
│   └── projects/           jubilee (the app), api (service contracts), components (jb-* atoms)
├── e2e/                    Playwright suite: fixtures, page objects, specs
├── eng/                    local engineering scripts
├── docs/
│   ├── specs/              requirements: L1.md (high level), L2.md (acceptance criteria)
│   ├── mocks/              static HTML mocks of every screen in every state
│   ├── design-system/      tokens, foundations, components and patterns
│   ├── detailed-designs/   one design per feature, grouped by subsystem
│   ├── adr/                architecture decisions
│   ├── estimates/          effort and percent complete per design
│   ├── journey.md          the user journeys, with effort estimates
│   └── prompts/            one implementation prompt per journey
├── AGENTS.md               rules for people and coding agents working in this repository
└── README.md
```

## Getting started

You need the [.NET 10 SDK](https://dotnet.microsoft.com/download), [Node.js 22](https://nodejs.org)
and [PowerShell 7](https://learn.microsoft.com/powershell/) (`pwsh`). SQL Server is needed only
for the full local stack; the quick start runs on SQLite, and the tests need no database at all
(ADR 0009).

1. Clone the repository and install the frontend and end-to-end dependencies.

   ```
   git clone https://github.com/QuinntyneBrown/jubilee.git
   cd jubilee
   npm ci --prefix frontend
   npm ci --prefix e2e
   ```

2. Start the API with the demo data. It listens on `http://localhost:5080`, uses SQLite and needs
   no database server.

   ```
   pwsh eng/Start-E2eApi.ps1
   ```

3. In a second terminal, start the app and open `http://localhost:4200`. The development server
   sends `/api` to the API.

   ```
   npm start --prefix frontend
   ```

To run against SQL Server instead, set the connection string `ConnectionStrings:Jubilee` and run
`pwsh eng/Start-FreshStack.ps1`. It resets the database, applies the migrations, seeds the demo
data and starts the API and the app. The API never applies migrations by itself; the `jubilee`
command-line tool does:

```
dotnet run --project backend/src/Jubilee.Cli -- migrate
dotnet run --project backend/src/Jubilee.Cli -- seed
dotnet run --project backend/src/Jubilee.Cli -- reset
```

The design can be read without running anything: open `docs/mocks/index.html` for every page,
dialog and notification (press `t` to switch themes) and `docs/design-system/index.html` for the
tokens and components.

## Running the tests

| What | Command | Where |
|---|---|---|
| Backend tests | `pwsh eng/Test-Backend.ps1` | repository root |
| Frontend lint | `npm run lint` | `frontend/` |
| Frontend format check | `npm run format:check` | `frontend/` |
| Design-system copy is current | `npm run design:check` | `frontend/` |
| End-to-end behaviour tests | `npm test` | `e2e/` |
| Visual, responsive and accessibility sweeps (by hand only) | `npm run sweeps` | `e2e/` |

The backend tests run on EF Core InMemory and need no database. The end-to-end suite runs in
Chromium only; run `npx playwright install chromium` in `e2e/` once. It starts the app by itself,
or uses the one already running, and never reaches the API: every `/api` request is answered from
the recorded responses in `e2e/fixtures/api/responses.json` (ADR 0009). When an endpoint's answer
changes, start `pwsh eng/Start-E2eApi.ps1` and run `npm run record-api` in `e2e/` to refresh the
recording.

`npm test` runs the behaviour specs only (ADR 0010). `npm run sweeps` is run by hand: it renders
the mocks in `docs/mocks` to screenshots, then compares the app with them region by region and
runs the responsive and accessibility sweeps. CI never runs the sweeps. The screenshots are not
committed: to change how a screen looks, change its mock first.
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs all of the above except the sweeps on
every pull request.

## Documentation

| Document | What it covers |
|---|---|
| [High-level requirements](docs/specs/L1.md) | What Jubilee must do, in 25 requirements, and the roles |
| [Detailed requirements](docs/specs/L2.md) | Acceptance criteria for every requirement |
| [Mocks](docs/mocks/README.md) | 67 screens in 271 states; the source of truth for the UI |
| [Design system](docs/design-system/README.md) | Tokens, foundations, components and patterns |
| [Detailed designs](docs/detailed-designs/README.md) | The architecture baseline and one design per feature |
| [Architecture decisions](docs/adr/README.md) | The decisions that shape the code, one record each |
| [Estimates](docs/estimates/README.md) | Effort and percent complete for every design |
| [User journeys](docs/journey.md) | The 26 journeys to implement, with effort estimates |
| [Implementation prompts](docs/prompts/) | One ready-to-run prompt per journey |
| [AGENTS.md](AGENTS.md) | Repository layout, architecture rules and the required workflow |

## Roadmap

The journeys in [`docs/journey.md`](docs/journey.md) are ordered by the value they add to the
user:

1. Find a business: discover, view and search.
2. Join and make contact: accounts, messaging and requests.
3. Fill the directory: list a business, church reference and verification.
4. Follow through: answering and tracking requests, the owner workspace and notifications.
5. Convenience and housekeeping: saved lists, settings, policies, offline use and moderation.

## Contributing

Read [`AGENTS.md`](AGENTS.md) before you change anything. In short:

- Every change to production behaviour needs a requirement, a detailed design and a mock before
  any code is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code in agreement.

## Security

Do not report a security problem in a public issue. Contact the repository owner privately through
their [GitHub profile](https://github.com/QuinntyneBrown).

## License

No licence has been chosen yet. Until one is added, all rights are reserved.
