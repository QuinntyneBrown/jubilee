# 21 · Journey 12: Keep listings honest

> **Runtime:** 1:22 (81.9 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 12

**Video:** [21-journey-12-keep-listings-honest.mp4](21-journey-12-keep-listings-honest.mp4) · **Audio:** [21-journey-12-keep-listings-honest.mp3](21-journey-12-keep-listings-honest.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/12-keep-listings-honest.md`, which took journey 12 from 93% to 100% (ADR
0057, ADR 0059). Jubilee ships without verification: owners publish and are live straight away, and
the Jubilee team looks through what was published. In the admin application, "Listings" reads "6
listings · 4 published in the last 7 days", newest first, with each status ("Live", "Paused", "On
hold") and the tag "Flagged" on Luzandre.com. A search for "okafor" keeps Okafor & Sons Furniture.
Luzandre.com opens with "Shops · published today, 9:40 a.m. · Live", the Owner card with Naomi's other
listing "Laurent Photography · Draft", the flag and "How members see it". "Take down listing" asks
"Take down Luzandre.com?"; sent without a reason it says "Tell the owner why it was taken down.", and
with one the listing is taken down and the page says Naomi has been e-mailed the reason. Two cards say
what the run did behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The app is answered from the stand-ins of the behaviour specs (`e2e/fixtures/admin.ts`, ADR 0009), so
the pictures prove what the browser does with each answer: the count, the order, the statuses and the
tag, the search, the listing's panels, the dialog's required reason and the result.

Only the tests prove what the server does:

- that each opening of a listing writes `owner.viewed` with the owner as the target and "Listing
  {id}" as the reason, and that a listing not found writes nothing (`AdminListingsTests`, L2-150 AC1,
  ADR 0059). Not shown: it is said in the narration;
- that `jubilee staff grant` and `revoke` write `staff.role-granted` and `staff.role-revoked` with the
  operator (`cli|{user}`) and the roles before and after, and nothing for a command that changes
  nothing or is refused (`StaffCommandTests`, L2-098 AC4, L2-180 AC1). Not shown: it is said on a card;
- that a takedown removes the listing from every public page, notifies and e-mails the owner "We’ve
  taken down {Business}" with the reason, writes `listing.taken-down`, answers 409
  `ALREADY_TAKEN_DOWN` for a second takedown and 403 for the moderator's own listing, and that My
  business then offers to list again (`AdminListingsTests`, L2-101). In the video the takedown is the
  stand-in's.

Jubilee takes no payment: the team keeps listings honest, and members pay the business directly.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:15 | Card: "Journey 12 · Keep listings honest" |
| 02 | `listings` | 0:15 | 0:26 | Listings: "6 listings · 4 published in the last 7 days", the statuses and "Flagged" (L2-099 AC1, AC2) |
| 03 | `search` | 0:26 | 0:31 | "okafor" keeps Okafor & Sons Furniture (L2-099 AC3) |
| 04 | `listing` | 0:31 | 0:43 | Luzandre.com: where it stands, the Owner card with other listings, the flag, "How members see it" (L2-100 AC1 to AC3, L2-079 AC3) |
| 05 | `reason` | 0:43 | 0:51 | "Take down Luzandre.com?" sent without a reason: "Tell the owner why it was taken down." (L2-101 AC1, AC2) |
| 06 | `taken` | 0:51 | 1:01 | The reason typed and sent: the result says Naomi has been e-mailed the reason (L2-101 AC3) |
| 07 | `behind` | 1:01 | 1:13 | Card: the role-change and access audit records, the tests |
| 08 | `close` | 1:13 | 1:22 | Card: journey 12 at 100%; the visual comparison with the mocks is left to the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/21-journey-12-keep-listings-honest --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/21-journey-12-keep-listings-honest           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
