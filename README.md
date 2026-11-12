<p align="center">
  <img src="docs/assets/jubilee-icon.svg" alt="Jubilee logo" width="96" height="96">
</p>

<h1 align="center">Jubilee</h1>

<p align="center">
  <strong>Toronto's Christian marketplace.</strong>
</p>

<p align="center">
  <a href="https://github.com/QuinntyneBrown/jubilee/actions/workflows/ci.yml"><img src="https://github.com/QuinntyneBrown/jubilee/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/.NET-10-512BD4.svg" alt=".NET 10">
  <img src="https://img.shields.io/badge/Angular-22-DD0031.svg" alt="Angular 22">
  <img src="https://img.shields.io/badge/tested%20with-Playwright-2EAD33.svg" alt="Tested with Playwright">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="Pull requests welcome"></a>
</p>

<p align="center">
  <a href="#getting-started">Getting started</a> ·
  <a href="docs/specs/L0.md">Mission</a> ·
  <a href="docs/specs/L1.md">Requirements</a> ·
  <a href="docs/mocks/README.md">Mocks</a> ·
  <a href="docs/design-system/README.md">Design system</a> ·
  <a href="docs/adr/README.md">Architecture decisions</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

## Mission

> Abiding in Jesus and for love of Him, Jubilee equips Christian business people in Toronto to
> prosper with purpose and resource His Kingdom.

This is the motive of everything in Jubilee and its single level-0 requirement
([`docs/specs/L0.md`](docs/specs/L0.md)). Every requirement, design and line of code points back to
it.

Jubilee is a directory of verified Christian-owned businesses in Toronto. A member finds a
business, messages it, books a meeting, asks for a quote or requests a product, and the business
confirms or declines. Every listing is confirmed by a pastor or elder before it goes live. Jubilee
does not take payment; members pay the business directly.

## Contents

- [Mission](#mission)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Building and testing](#building-and-testing)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Architecture

| Part | Technology | Responsibility |
|---|---|---|
| `backend/` | .NET 10, ASP.NET Core, EF Core, MediatR | Accounts, listings, requests, messaging, notifications and verification |
| `frontend/` | Angular 22, Angular CDK | The app (`jubilee`), the marketing site (`marketing`), service contracts (`api`) and `jb-*` UI atoms (`components`) |
| `e2e/` | Playwright (Chromium) | Behaviour tests against the app, with every `/api` request answered from a recording |
| `docs/` | Markdown, HTML, PlantUML | Requirements, mocks, design system, detailed designs and architecture decisions |

The backend layers depend in one direction only: `Domain` ← `Application` ← `Infrastructure` ←
`Api` / `Worker` / `Cli`. The rules behind that, and the frontend and end-to-end conventions, are
in [`AGENTS.md`](AGENTS.md) and the [architecture decision records](docs/adr/README.md).

## Getting started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 | Pinned by [`backend/global.json`](backend/global.json) |
| [Node.js](https://nodejs.org) | 22 | npm 10 |
| [PowerShell](https://learn.microsoft.com/powershell/) | 7 (`pwsh`) | Runs the scripts in `eng/` |
| SQL Server | Any supported edition | Optional; only for the full local stack |

The quick start runs on SQLite, and the tests need no database at all
([ADR 0009](docs/adr/0009-tests-without-a-backend-or-database.md)).

### Quick start

1. Clone the repository and install the frontend and end-to-end dependencies.

   ```shell
   git clone https://github.com/QuinntyneBrown/jubilee.git
   cd jubilee
   npm ci --prefix frontend
   npm ci --prefix e2e
   ```

2. Start the API with the demo data. It listens on `http://localhost:5080`, uses SQLite and needs
   no database server.

   ```shell
   pwsh eng/Start-E2eApi.ps1
   ```

3. In a second terminal, start the app and open `http://localhost:4200`. The development server
   sends `/api` to the API.

   ```shell
   npm start --prefix frontend
   ```

#### Signing in with Google locally

"Join with Google" and "Continue with Google" need the OAuth client of ADR 0037, whose redirect
URIs include `http://localhost:4200/api/auth/google/callback`. Set its two values in the terminal
before you start the API, from wherever you keep secrets; never put them in a file of the
repository:

```shell
$env:Google__ClientId = '<client ID>'
$env:Google__ClientSecret = '<client secret>'
pwsh eng/Start-E2eApi.ps1
```

Without them the script supplies placeholders: the buttons show, as in the mocks, but Google
refuses the request. An API started with neither variable reports Google sign-in as off and the
pages show no Google button.

#### Seeing e-mail locally

No e-mail leaves a development machine: without `Email__ConnectionString` the sender only logs
the recipient and the subject (ADR 0038). The e-mails are sent by the worker, which reads the
outbox of the same database as the API. To read them, start the worker beside the API with the
same `Database__Provider` and `ConnectionStrings__Jubilee`, and name a folder for the previews:

```shell
$env:Email__PreviewFolder = "$PWD/.cache/mail"
dotnet run --project backend/src/Jubilee.Worker
```

Each e-mail is then written there twice, as `.html` (open it in a browser) and as `.txt`. Every
e-mail as it should look is in [`docs/mocks/emails/`](docs/mocks/emails/index.html).

### Marketing site

The marketing site is a second application in the same workspace and needs no API. It copies the
pitch film from `docs/videos/` and serves on `http://localhost:4201`:

```shell
npm run start:marketing --prefix frontend
```

### Running against SQL Server

Set the connection string `ConnectionStrings:Jubilee` and run `pwsh eng/Start-FreshStack.ps1`. It
resets the database, applies the migrations, seeds the demo data and starts the API and the app.
The API never applies migrations by itself; the `jubilee` command-line tool does:

```shell
dotnet run --project backend/src/Jubilee.Cli -- migrate
dotnet run --project backend/src/Jubilee.Cli -- seed
dotnet run --project backend/src/Jubilee.Cli -- reset
```

### Reading the design without running anything

Open `docs/mocks/index.html` for every page, dialog and notification (press `t` to switch themes)
and `docs/design-system/index.html` for the tokens and components.

## Building and testing

| What | Command | Where |
|---|---|---|
| Build the frontend | `npm run build` | `frontend/` |
| Backend tests | `pwsh eng/Test-Backend.ps1` | repository root |
| Frontend lint | `npm run lint` | `frontend/` |
| Frontend format check | `npm run format:check` | `frontend/` |
| Design-system copy is current | `npm run design:check` | `frontend/` |
| End-to-end type check | `npm run typecheck` | `e2e/` |
| End-to-end behaviour tests | `npm test` | `e2e/` |
| Component parity with the mocks and the Magic Patterns design | `npm run parity` | `e2e/` |
| Visual, responsive and accessibility sweeps | `npm run sweeps` | `e2e/` (repository owner, by hand only) |

- The backend tests run on EF Core InMemory and need no database.
- The end-to-end suite runs in Chromium only; run `npx playwright install chromium` in `e2e/`
  once. It starts the app by itself, or uses the one already running, and never reaches the API:
  every `/api` request is answered from the recorded responses in
  `e2e/fixtures/api/responses.json` ([ADR 0009](docs/adr/0009-tests-without-a-backend-or-database.md)).
  When an endpoint's answer changes, start `pwsh eng/Start-E2eApi.ps1` and run
  `npm run record-api` in `e2e/` to refresh the recording.
- `npm test` runs the behaviour specs only
  ([ADR 0010](docs/adr/0010-behaviour-tests-only-by-default.md)). The sweeps render the mocks in
  `docs/mocks` to screenshots, then compare the app with them region by region. CI never runs the
  sweeps, and the screenshots are not committed: to change how a screen looks, change its mock
  first.
- `npm run parity` runs the component parity specs in `e2e/tests/parity/` and nothing else
  ([ADR 0036](docs/adr/0036-component-parity-specs.md)): one spec per component of the
  `components` library. It renders the component's region from the mocks, then compares the app
  with it at 360 px and 1280 px in both themes (1 % of pixels), and with the crops of the Magic
  Patterns reference images in `docs/design-reference/magic-patterns/` (3 %).

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs everything above except the sweeps on
every push to `main` and every pull request.

## Repository structure

The full layout and its rules are in [`AGENTS.md`](AGENTS.md).

```
jubilee/
├── backend/                .NET solution (Jubilee.sln)
│   ├── src/                Jubilee.Domain, .Application, .Infrastructure, .Api, .Worker, .Cli
│   └── tests/              one test project per source project
├── frontend/               Angular workspace
│   └── projects/           jubilee (the app), marketing, api (service contracts), components (jb-* atoms)
├── e2e/                    Playwright suite: fixtures, page objects, specs
├── eng/                    local engineering scripts
├── tools/                  scripts that build the narrated videos
├── docs/
│   ├── specs/              requirements: L0.md (the mission), L1.md (high level), L2.md (acceptance criteria)
│   ├── mocks/              static HTML mocks of every screen in every state
│   ├── design-system/      tokens, foundations, components and patterns
│   ├── detailed-designs/   one design per feature, grouped by subsystem
│   ├── adr/                architecture decisions
│   ├── estimates/          effort and percent complete per design
│   ├── videos/             narrated videos, one folder each
│   ├── journey.md          the user journeys, with effort estimates
│   └── prompts/            one implementation prompt per journey
├── .github/                CI workflow, issue and pull request templates
├── AGENTS.md               rules for people and coding agents working in this repository
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── SUPPORT.md
└── README.md
```

## Documentation

| Document | What it covers |
|---|---|
| [Mission](docs/specs/L0.md) | Why Jubilee exists: the single level-0 requirement everything traces to |
| [High-level requirements](docs/specs/L1.md) | What Jubilee must do, in 25 requirements, and the roles |
| [Detailed requirements](docs/specs/L2.md) | Acceptance criteria for every requirement |
| [Mocks](docs/mocks/README.md) | 67 screens in 271 states; the source of truth for the UI |
| [Design system](docs/design-system/README.md) | Tokens, foundations, components and patterns |
| [Detailed designs](docs/detailed-designs/README.md) | The architecture baseline and one design per feature |
| [Architecture decisions](docs/adr/README.md) | The decisions that shape the code, one record each |
| [Estimates](docs/estimates/README.md) | Effort and percent complete for every design |
| [User journeys](docs/journey.md) | The 26 journeys to implement, with effort estimates |
| [Implementation prompts](docs/prompts/) | One ready-to-run prompt per journey |
| [Videos](docs/videos/README.md) | Narrated videos and how they are built |
| [AGENTS.md](AGENTS.md) | Repository layout, architecture rules and the required workflow |

## Roadmap

The journeys in [`docs/journey.md`](docs/journey.md) are ordered by the value they add to the
user:

1. **Find a business:** discover, view and search.
2. **Join and make contact:** accounts, messaging and requests.
3. **Fill the directory:** list a business, church reference and verification.
4. **Follow through:** answering and tracking requests, the owner workspace and notifications.
5. **Convenience and housekeeping:** saved lists, settings, policies, offline use and moderation.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, and
[`AGENTS.md`](AGENTS.md) for the architecture rules, before you open a pull request. In short:

- Every change to production behaviour needs a requirement, a detailed design and a mock before
  any code is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code in agreement.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By taking part you agree
to uphold it.

## Security

Do not report a security vulnerability in a public issue. See [`SECURITY.md`](SECURITY.md) for how
to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown.

Licensed under the [MIT License](LICENSE).
