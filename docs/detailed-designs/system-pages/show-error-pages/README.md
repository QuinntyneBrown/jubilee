# Show error pages

## Overview

Every product meets missing pages, refused access and failures. Jubilee answers
each case with the correct HTTP status, a page written in plain language, a way
forward, and, for failures, a reference the person can quote to support. This
feature covers the not found page, the forbidden page, the server error page
and the error reference scheme used by every load-error state.

*Error reference* — short code shown to the user that support can match to the
failing request, in the form `JB-<AREA>-<NNN>`. `<AREA>` names the feature (for
example `REQ` for requests, `ADM` for admin). `<NNN>` is `502` when an upstream
dependency failed and `503` when the service was unavailable. An unhandled
server error uses the form `JB-500-{code}`. *Correlation ID* — identifier
assigned to each request and written to every log entry for that request.

`Jubilee Web` is a single-page application, so the status code of a page load
comes from the server endpoint that returns the application shell. That endpoint
decides between 200, 301, 302, 403 and 404 before any script runs. API calls
made after the shell has loaded receive RFC 9457 `ProblemDetails`, which
`ErrorInterceptor` maps to the same pages and to in-place load-error states.

## Description

The slice is cross-cutting: three pages and one shared component in
`Jubilee Web`, and the endpoint and middleware in `Jubilee API` that produce
statuses and references.

- **`NotFoundPage`** — shows "We can't find that page. The link may be old, or
  the listing may have been removed. Search for the business by name, or start
  from browse." with "Back to browse" and "Search". It is the wildcard route and
  the target of every 404.
- **`ForbiddenPage`** — shows "You don't have access to this page. This area is
  for the owner of the listing or the Jubilee verification team." with "Back to
  browse" and "Ask for access".
- **`ServerErrorPage`** — shows "Something went wrong on our side. Your messages
  and requests are safe. Try again in a minute; if it keeps happening, tell us
  and quote the reference below." with "Try again", "Get help" and
  "Reference JB-500-{code}". A static copy of the page, served by
  `ProblemDetailsMiddleware`, covers a failure of the page load itself.
- **`LoadErrorState`** — shared component for a page or section that fails to
  load. It renders "We couldn't load {thing}. Nothing is lost. Check your
  connection and try again. If it keeps happening, tell us and quote
  {reference}." with "Try again" and one way out supplied by the host page.
- **`ErrorInterceptor`** — Angular HTTP interceptor. It parses `ProblemDetails`,
  routes 404 to `NotFoundPage`, 403 to `ForbiddenPage` and 500 to
  `ServerErrorPage`, and hands 502 and 503 with their reference to the calling
  page for `LoadErrorState`. A 403 with the code `EMAIL_UNCONFIRMED` is left to
  the calling feature.
- **`AuthGuard`** — sends a visitor who opens a protected route to `/sign-in`
  with a return URL; the forbidden page is reserved for signed-in members.
- **`PageShellEndpoint`** — fallback endpoint in `Jubilee API` for document
  requests. It matches the path against the route manifest generated from the
  Angular routes, reads the session, and returns the application shell with
  200, 404 or 403, a 302 to sign-in for a visitor on a protected route, or a
  301 for a renamed listing slug. It returns 404 for a resource whose existence
  the caller may not know.
- **`ListingSlugResolver`** and **`ListingSlugHistory`** — the resolver looks
  up `/b/:slug` among current slugs and then among old slugs. A match in
  `ListingSlugHistory` yields a 301 to the current slug.
- **`CorrelationIdMiddleware`** — assigns the correlation ID and adds it to the
  logging scope and the response.
- **`ProblemDetailsMiddleware`** — catches failures and writes
  `JubileeProblemDetails` with `Reference` and `CorrelationId`. The body never
  contains a stack trace, SQL, a file path or an internal host name. It logs the
  reference, the correlation ID and the exception to the
  `Observability platform`, so a search by reference and time finds the request.
- **`ErrorReferenceFactory`** — builds references. `ForLoadFailure` combines the
  area declared by `ErrorAreaAttribute` on the controller with `502` or `503`.
  `ForUnhandled` returns `JB-500-{code}`; the mock shows a code of 4 characters
  (`7F3K`), and the code is four characters of a hash of the correlation ID, so one request
  always quotes one code (ADR 0031).
- **`HelpController`** and **`CreateAccessRequestCommandHandler`** — expose
  `POST /api/help/access-requests`. The handler stores an `AccessRequest` with
  the URL and the member's account and changes no role or permission. The
  verification team reads it from the stored requests; no e-mail is sent yet
  (ADR 0031).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-113` | `L1-016` | The system shall respond 404 with the not found page for an unknown URL, a removed listing or a resource the user may not know exists, and shall redirect an old listing slug to the current slug with 301. |
| `L2-114` | `L1-016` | The system shall respond 403 with the forbidden page to a signed-in member without permission for a page, shall create a help request with the URL and the member's account on "Ask for access" without granting anything, and shall send a visitor to sign in with a return URL instead of the forbidden page. |
| `L2-115` | `L1-016` | The system shall respond 500 to an unhandled server error on a page load with the server error page, "Try again", "Get help" and "Reference JB-500-{code}", and the page shall contain no stack trace, SQL, file path or internal host name. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference the user can quote to support: the area code of the feature with `502` when an upstream dependency failed and `503` when the service was unavailable. Support shall find the failing request's correlation ID and log entries by searching logs for the reference with the time. |
| `L2-133` | `L1-019` | The system shall check the caller's role and ownership of the specific object on every API endpoint before doing anything, and shall return 404 for another member's object requested by ID. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |

## Diagrams

### System context

Visitors and members request pages from Jubilee. Jubilee sends structured logs
to the observability platform, where the on-call engineer searches by reference
and time.

![C4 system context for showing error pages](diagrams/c4-context.png)

### Containers

`Jubilee API` serves the page shell with its status and returns `ProblemDetails`
to `Jubilee Web`. It reads slugs from the `Jubilee database`, sessions from the
`Cache`, and writes logs to the observability platform.

![C4 container view for showing error pages](diagrams/c4-container.png)

### Components

`ErrorInterceptor` routes each status to its page or to `LoadErrorState`. In
`Jubilee API`, `PageShellEndpoint` resolves page statuses and
`ProblemDetailsMiddleware` builds error bodies with `ErrorReferenceFactory`.

![C4 component view for showing error pages](diagrams/c4-component.png)

### Class structure

`ProblemDetailsMiddleware` writes `JubileeProblemDetails` carrying an
`ErrorReference` from `ErrorReferenceFactory`. `PageShellEndpoint` uses
`ListingSlugResolver`, which reads `ListingSlugHistory`.

![Class diagram for showing error pages](diagrams/class-structure.png)

### Behaviour — answer an unknown URL or a renamed slug

`PageShellEndpoint` returns 404 for an unknown path or a listing the caller may
not see, and 301 for a renamed slug.

![Sequence diagram for answering an unknown URL or a renamed slug](diagrams/sequence-not-found-and-slug-redirect.png)

### Behaviour — refuse a page and ask for access

A visitor is redirected to sign in; a signed-in member without permission
receives 403 and may create an access request that grants nothing.

![Sequence diagram for refusing a page and asking for access](diagrams/sequence-forbidden-and-ask-for-access.png)

### Behaviour — show an error reference

`ProblemDetailsMiddleware` logs the reference with the correlation ID and
returns it to the client, which shows it in `LoadErrorState` or on
`ServerErrorPage`.

![Sequence diagram for showing an error reference](diagrams/sequence-error-reference.png)
