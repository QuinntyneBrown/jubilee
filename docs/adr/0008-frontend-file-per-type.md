# 0008. Frontend: one file per type, no single-file components

## Status

Accepted, 10 November 2026.

## Context

Eighteen components kept their markup in an inline `template:` string inside the class file, while
the pages already used a `.html` file beside the class. Inline templates are not formatted or
linted as HTML, do not get editor support for markup, and make a component's structure harder to
compare with its mock.

## Decision

- Every Angular component is a file per type, beside its class and named after it:
  `name.ts` holds the class and its metadata, `name.html` holds the template, and a stylesheet
  would be `name.scss` (ADR 0002 keeps appearance in the global stylesheet, so none exist today).
- A component sets `templateUrl` (and `styleUrl` when it has styles). It never sets `template` or
  `styles`, however short the markup is. A one-line template still gets its own `.html` file.

## Consequences

- The 18 inline components were split into `.ts` + `.html` pairs with no change to their markup.
- A new component adds at least two files; a review rejects an inline `template` or `styles`.
- Prettier and angular-eslint now see all markup, so CI checks it like the pages.
