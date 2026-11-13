# 0071. A listing has its own address: the app's host answers `{slug}.jubilee.to` with a redirect the API decides, the slug rules tighten to one DNS label, and the address is off until the owner sets its domain

## Status

Accepted, 13 November 2026. Builds on ADR 0055 (the app's host and link previews) and ADR 0056
(a slug follows the business name; the host gives a page load its status). Applies ADR 0009 (tests
without a database) and ADR 0035 (presentation in the components library). Requirements L1-032
and L2-241 to L2-246.

## Context

L1-032 gives every listing the public address `https://{slug}.jubilee.to`. Until now a listing's
only link was its page in the app, `https://app.jubilee.to/b/{slug}`, and the slug rule was loose:
up to 80 characters, the fallback "business" with no number, no reserved words. A slug that
becomes a DNS label must be 63 characters at most, must not collide with a host Jubilee serves
itself, and is printed on cards and signs, so it must keep working.

The app's document is served by `eng/azure/server.js` (ADR 0055, ADR 0056), which already asks
the API what a page load answers. The member's session is a `__Host-` cookie on the app's host
(ADR 0046), which a browser never sends to another host. The mocks and the Magic Patterns design
do not draw the address.

## Decision

- **The slug rule lives in one place, `AddressRules`** (Application, `Listings`). A slug is the
  name in lower case, accents removed, every other character a hyphen, runs of hyphens made one,
  hyphens trimmed, a leading "xn--" dropped, cut to 40 characters without a trailing hyphen. A
  result shorter than 3 characters becomes "business" (for a space, "space") and always takes a
  number. A numeric suffix is added by cutting the base so the whole stays within 40. A label is
  *well formed* when it matches `^[a-z0-9]+(-[a-z0-9]+)*$` and is 3 to 40 characters long.
- **Reserved words are a setting.** `AddressSettings` holds the built-in list of L2-242 AC4 and
  whatever `Addresses:Reserved` adds (a list, or one comma-separated value, so an App Service
  setting can extend it without a release). A reserved word is treated as taken when a slug is
  generated; a listing that already holds a word keeps it, because the check runs only when a
  slug is made.
- **Taken means any listing has or had it.** `ListingSlugs.UniqueAsync` already reads every
  listing (live, paused, removed, deleted with its owner's account: a deleted listing is kept as a
  row) and every kept slug. Slugs are stored in lower case, so the comparison is exact.
- **Two publishers at once both succeed.** The unique index on `Listings.Slug` refuses the second
  of two equal slugs. `PublishListingCommandHandler` catches that failure, asks for a free slug
  again and saves again, up to five times, so the owner never sees a failure caused by the
  address.
- **Listings that existed before are realigned by `jubilee migrate`.** After the schema step the
  CLI sends `RealignListingSlugsCommand`: every listing whose slug is not well formed, is longer
  than 40 or is a reserved word receives a slug by the rules, and the old one is kept as a
  `ListingSlug` row and redirected (ADR 0056). The command changes nothing on a second run.
- **The address is made by the API and is off by default.** `AddressSettings.Domain`
  (`Addresses:Domain`, for production `jubilee.to`) is empty unless set.
  `AddressSettings.AddressOf(slug)` answers `https://{slug}.{domain}` or null. The listing page,
  My business, the listing editor and the answer to a publish carry it as `address`. With no
  domain the app shares `{origin}/b/{slug}` (`listingAddress`, the `api` library), so local
  development and the end-to-end suite work unchanged and production does not hand out an address
  before its DNS record and certificate exist. A draft has no slug and so no address.
- **The app's host answers an address; no new site.** `*.jubilee.to` points at the app's App
  Service. With `ADDRESS_DOMAIN` and `APP_ORIGIN` set, `server.js` looks at `Host` before anything
  else:
  - one of Jubilee's own hosts (`OWN_HOSTS`, `WEBSITE_HOSTNAME`, a loopback name or an IP literal,
    which is how the platform's probes arrive): answered as before;
  - one label under the domain: an address. For `GET` and `HEAD` the host asks the API
    `GET /api/addresses/{label}?path={path}` with no cookie and answers 301 to
    `APP_ORIGIN` + the location the API gave + the request's query; a 404 from the API, any other
    method, `/api/**`, a label that is not well formed and a host more than one label deep answer
    the static not-found page with 404; a 429 is passed on with `Retry-After`; an API that does
    not answer in 3 seconds answers 503 with `Retry-After`;
  - anything else: 400 "Bad request.", with nothing of the host in the answer.
  An address response sets no cookie, forwards no cookie, and serves no file of the app.
- **The API decides the redirect.** `ResolveAddressQueryHandler` (anonymous,
  `GET /api/addresses/{label}`): a label that is not well formed or is reserved is a 404 before
  any database call; a path with an empty, `.` or `..` segment, a backslash or a control character
  is a 404; otherwise the location is `/b/{slug}{path}`, each segment encoded again, where `slug`
  is the current slug of the public listing that kept the label, or else the label itself. The
  handler does not look whether the label's listing exists or is public: the app's host decides
  that for `/b/{slug}` (ADR 0056), where the owner's session is. So a public listing, an unknown
  address and a hidden listing all answer the same 301, and only the app's own answer (200 or
  404) differs, exactly as it does for a `/b/{slug}` link. An old address of a public listing
  reaches its page in one redirect.
- **Addresses have their own budget.** The rate-limit policy `addresses` allows 120 a minute per
  caller (`RateLimits:AddressesPerMinute`); the host states the caller as it does for a page load.
- **The static not-found page** is built with the other two static pages
  (`tools/static-pages/build.mjs`) from `pages/not-found/default.html`, with its two links
  its icon and its font pointing at `APP_ORIGIN`, which the host writes into them; the app's host
  lets any origin read a font file (`Access-Control-Allow-Origin: *` on `.woff2` only), because a
  browser fetches a font with CORS.
- **The listing page names its canonical link.** `BusinessPage` sets
  `<link rel="canonical" href="{origin}/b/{slug}">` while it shows and removes it when it leaves,
  so a crawler that followed an address indexes the listing once.
- **Where the owner sees it.** The publish success state, the "Your listing" card of My business
  and the listing editor show the address as text in a read-only field with "Copy", composed of
  `jb-field`, `jb-input-group`, `jb-input` and `jb-button` as the share dialog is; no new
  component. A read-only field keeps the whole address available to assistive technology at 360 px
  and never widens the page. After a save that changed the address the editor says
  "Your address is now {new}. {old} still opens your listing."
- **E-mails and notifications keep the app's links** (`AccountSettings.PublicBaseUrl`); nothing
  there changes.

## Consequences

- **Owner steps before `Addresses:Domain` is set** (`eng/azure/README.md`): a wildcard DNS record
  `*.jubilee.to` to the app's App Service, a wildcard certificate bound to it (App Service managed
  certificates do not cover a wildcard, so the certificate is brought and its renewal alerted,
  L2-176), "HTTPS only" on, then `ADDRESS_DOMAIN`, `APP_ORIGIN` and `OWN_HOSTS` on the host and
  `Addresses__Domain` on the API. `deploy.sh` sets them only when it is given `ADDRESS_DOMAIN`.
  Until then every link is the app's, and nothing is broken.
- L2-243 AC8 (200 ms at the 95th percentile) and L2-246 AC1 and AC2 (certificate, HTTP to HTTPS)
  are properties of the deployment. The code keeps the redirect to one indexed read; the host's
  tests and the API's tests prove everything else.
- A redirect is answered `no-store`, as the host's other redirects are: a renamed listing's
  address may change target, and one indexed read is cheaper than a stale card.
- The API never tells an address's caller whether a listing exists. The price is that an unknown
  address costs two responses (301, then the app's 404) instead of one.
- A product has an address too (`https://{slug}.jubilee.to/p/{product}`), but the product page has
  no share action yet; when it gains one it shares that address.
- Slugs of new listings are at most 40 characters; the column stays 120 wide for kept slugs made
  before this decision, so there is no schema change and no migration.
