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

> **Status: design complete, implementation not started.** The requirements, mocks, design system
> and detailed designs are in `docs/`. No application code exists yet. The
> [user journeys](docs/journey.md) list what will be built, in order of value to the user.

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

`docs/` exists today. The other folders are the layout the implementation will follow; it is
defined in [`AGENTS.md`](AGENTS.md).

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
│   ├── journey.md          the user journeys, with effort estimates
│   └── prompts/            one implementation prompt per journey
├── AGENTS.md               rules for people and coding agents working in this repository
└── README.md
```

## Getting started

There is nothing to build or run yet. You can read the design today:

1. Clone the repository.

   ```
   git clone https://github.com/QuinntyneBrown/jubilee.git
   ```

2. Open `docs/mocks/index.html` in a browser to see every page, dialog and notification. No server
   or network is needed. Press `t` to switch between the light and dark themes.
3. Open `docs/design-system/index.html` to see the tokens and components.

Setup and run commands for the backend and frontend will be added here when the first journey is
implemented.

## Running the tests

No tests exist yet. The implementation will use these commands, as set out in
[`AGENTS.md`](AGENTS.md):

| What | Command | Where |
|---|---|---|
| Backend tests | `pwsh eng/Test-Backend.ps1` | repository root |
| Frontend lint | `npm run lint` | `frontend/` |
| Frontend format check | `npm run format:check` | `frontend/` |
| End-to-end tests | `npx playwright test` | `e2e/` |

## Documentation

| Document | What it covers |
|---|---|
| [High-level requirements](docs/specs/L1.md) | What Jubilee must do, in 25 requirements, and the roles |
| [Detailed requirements](docs/specs/L2.md) | Acceptance criteria for every requirement |
| [Mocks](docs/mocks/README.md) | 67 screens in 271 states; the source of truth for the UI |
| [Design system](docs/design-system/README.md) | Tokens, foundations, components and patterns |
| [Detailed designs](docs/detailed-designs/README.md) | The architecture baseline and one design per feature |
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
