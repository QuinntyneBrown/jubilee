# Estimates: security

| Design | Effort | Complete |
|---|---|---|
| assure-security | 4 days | 0% |
| authorize-requests | 3 days | 10% |
| authorize-staff-requests | 4 days | 100% |
| keep-addresses-safe | 2 days | 85% |
| limit-abuse | 5 days | 20% |
| protect-credentials-and-sessions | 4 days | 0% |
| restrict-staff-network | 4 days | 95% |
| secure-transport-and-tokens | 3 days | 0% |
| secure-uploads | 4 days | 65% |
| validate-input | 3 days | 0% |

## authorize-staff-requests and restrict-staff-network

Built (ADR 0040, ADR 0070): every admin-only endpoint answers a staff session only, with a test per endpoint that a member session is refused (L2-191 AC5), and the staff endpoints answer the allow-list only, checked before any session, failing closed, and believing a forwarded address from the trusted proxy alone (`StaffAccessTests`, `NetworkRestrictionTests`). Left in restrict-staff-network: the allowed networks on the admin host and the API in production (step 5 of the owner's checklist in `eng/azure/README.md`).

## limit-abuse

Built: the ASP.NET Core rate limiter policies of `DirectoryRateLimit.cs` (directory reads, search, join, confirmation resend and the launch forms) and the limits counted in their handlers (`RateLimitedException`: password reset, messages, reports, data export, feedback, product photos), each answered 429 with `Retry-After`; the join form’s bot challenge and its existing-address notice (journey 4); the reset request that answers the same for any address, tested by timing, and the burst alert on reset requests to the on-call contact (ADR 0064).

What is left: one policy table for all the limits, the bot challenge on the report forms, the spam suspension (L2-137 AC3), the alerts on failed sign-ins and role changes (L2-143 AC2), and a single interceptor for the 429 message.

## secure-uploads

Built for message photos by journey 6 (ADR 0051): the checks by content, both sides limited to
8,000 pixels, the malware scan before anything is stored (`IMalwareScanner`, ClamAV over `INSTREAM`,
no scanner means no photo), the bytes kept by `IMediaStore` under a random name, and signed links
that are never signed with a published key outside Development. Listing photos were already
re-encoded and kept by the media store.

What is left: a running `clamd` and the cookieless media domain (owner steps, `eng/azure/README.md`);
the scan for listing photos and feedback screenshots; re-encoding message photos; product photo
uploads, which do not exist yet (journey 16).

keep-addresses-safe (L2-246, ADR 0067): the classification of the host (own, address, foreign with 400), an address answering only a redirect or the not-found page with no cookie in or out, the redirect target built from a setting and a path the API encodes, the 404 for a path that tries to leave the listing, the limit of 120 addresses a minute and the origin rule are done with tests (`eng/azure/server.test.js`, `AddressResolutionTests`, `AddressRateLimitTests`, `ListingAddressTests`). Left, as owner steps of `eng/azure/README.md`: the wildcard certificate with its expiry alert and "HTTPS only" (L2-246 AC1, AC2).
