## Summary

<!-- What does this pull request change, and why? -->

## Requirement

<!-- The requirement and acceptance criteria this satisfies, e.g. L2-012 in docs/specs/L2.md.
     Write "Not a behaviour change" for documentation, mock, design-system or test-only changes. -->

Closes #

## Type of change

- [ ] Production behaviour (new feature or change to an existing one)
- [ ] Bug fix
- [ ] Documentation, mock or design system only
- [ ] Tests only
- [ ] Build, CI or tooling

## Checklist

- [ ] I have read [`AGENTS.md`](../AGENTS.md) and [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- [ ] A behaviour change has a requirement, a detailed design and a mock.
- [ ] Each acceptance test was written first and seen to fail for the expected reason.
- [ ] The requirement, design, mock, tests and code agree.
- [ ] `pwsh eng/Test-Backend.ps1` passes.
- [ ] `npm run lint`, `npm run format:check` and `npm run design:check` pass in `frontend/`.
- [ ] `npm run typecheck` and `npm test` pass in `e2e/`.
- [ ] If an endpoint's answer changed, the API recording is refreshed (`npm run record-api`).

## How it was tested

<!-- The tests added or changed, and anything checked by hand. -->

## Screenshots

<!-- For UI changes: the app beside the mock, in light and dark, on a phone and a desktop. -->
