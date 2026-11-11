# Security policy

The security of Jubilee and of the people who use it matters. Jubilee holds members' accounts,
private messages and requests, owners' listings and church references, so we treat every report
seriously.

## Supported versions

Jubilee is under active development and has no released versions yet. Security fixes are made on
the `main` branch only.

| Version | Supported |
|---|---|
| `main` | Yes |
| Anything else | No |

## Reporting a vulnerability

**Do not report a security vulnerability in a public GitHub issue, discussion or pull request.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/QuinntyneBrown/jubilee/security/advisories/new)
for this repository. If that is not available to you, contact the repository owner privately
through their [GitHub profile](https://github.com/QuinntyneBrown).

Include as much of the following as you can:

- the kind of issue (for example, broken access control, injection or cross-site scripting);
- the affected endpoint, page or source file, with the branch or commit;
- the steps to reproduce it, and any configuration it needs;
- a proof of concept, if you have one;
- the impact, and how an attacker could use it.

## What to expect

- We acknowledge a report within **three business days**.
- We confirm or rule out the issue and share an expected timeline within **ten business days**.
- We keep you informed until it is fixed, and credit you in the advisory unless you would rather
  stay anonymous.

Please give us reasonable time to fix an issue before you disclose it publicly.

## Scope

In scope: the code in this repository, including the API (`backend/`), the app and the marketing
site (`frontend/`).

Out of scope: denial-of-service testing, social engineering, physical attacks, and findings in
third-party dependencies that are already publicly known (report those to the dependency's
maintainers).

Test only against your own local copy of the stack. Never access, change or delete data that does
not belong to you.
