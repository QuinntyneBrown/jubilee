# Estimates: security

| Design | Effort | Complete |
|---|---|---|
| assure-security | 4 days | 0% |
| authorize-requests | 3 days | 10% |
| authorize-staff-requests | 4 days | 100% |
| limit-abuse | 5 days | 10% |
| protect-credentials-and-sessions | 4 days | 0% |
| restrict-staff-network | 4 days | 90% |
| secure-transport-and-tokens | 3 days | 0% |
| secure-uploads | 4 days | 65% |
| validate-input | 3 days | 0% |

## secure-uploads

Built for message photos by journey 6 (ADR 0050): the checks by content, both sides limited to
8,000 pixels, the malware scan before anything is stored (`IMalwareScanner`, ClamAV over `INSTREAM`,
no scanner means no photo), the bytes kept by `IMediaStore` under a random name, and signed links
that are never signed with a published key outside Development. Listing photos were already
re-encoded and kept by the media store.

What is left: a running `clamd` and the cookieless media domain (owner steps, `eng/azure/README.md`);
the scan for listing photos and feedback screenshots; re-encoding message photos; product photo
uploads, which do not exist yet (journey 16).
