# 27 · Journey 20: Manage profile and settings

> **Runtime:** 1:28 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 20

**Video:** [27-journey-20-manage-profile-and-settings.mp4](27-journey-20-manage-profile-and-settings.mp4) · **Audio:** [27-journey-20-manage-profile-and-settings.mp3](27-journey-20-manage-profile-and-settings.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/20-manage-profile-and-settings.md`, which took journey 20 from 93% to
100% (ADR 0065, amending ADR 0028). At `/account` the profile shows "Home church address" with
"Shown to no one." (`L2-196` AC1) and "Pronouns" with "Used in messages we write about you, such
as a message from the Jubilee team." (`L2-013` AC8). The new card "Where you’re signed in" lists
"Safari on iPhone" with "This device · Network 203.0.113.x" first, then "Chrome on Windows" with
"Last active 2 hours ago · Network 198.51.100.x" (`L2-143` AC3). "Sign out" on that row ends it:
the row goes and the card says "No other devices are signed in." In the admin application, the
Owner panel of Luzandre.com gives "Pronouns · she/her" beside Naomi Laurent’s name (`L2-013` AC8).
Two cards say what the tests prove behind the screen and close the journey.

## What the pictures prove, and what only the tests prove

The app is answered from the stand-ins of the behaviour specs (`e2e/fixtures/profile.ts`,
`e2e/fixtures/admin.ts`, ADR 0009). The pictures prove what the browser does: the hints, the
session list with this device first, one device signed out and the list after it, and the
pronouns row of the Owner panel. The "Sign out" row above the list still counts one other
device after the signing out, because the stand-in of `/api/session` keeps its count; against the
API the page asks the session again and the count follows.

Only the tests prove what the server does:

- that a session records its browser and system and its network with the last part hidden, never
  the full address; that the list holds only the member’s live sessions, this one first; and that
  signing one out ends that session only, again answering 204 (`AccountSessionsTests`, `L2-143`
  AC3). Said in the narration;
- that another member’s session answers 404 `session_not_found`, changes nothing and the attempt
  is logged with the actor, the address, the method and the path (`AccountSessionsTests`,
  `L2-133` AC2). Said on a card;
- that each password change, e-mail change request and e-mail change is logged with the member,
  the address and the outcome, a refused one included, and that no password, new address or token
  reaches the log (`AccountSettingsTests.Credentials`, `L2-143` AC1). Said on a card;
- that a business reading a request or a conversation, the Jubilee team and the public listing
  page are given neither the home church nor its address, and that no reader but the Jubilee team
  is given pronouns (`MemberPrivacyTests`, `L2-196` AC7, `L2-145` AC1, `L2-013` AC8). Said on a
  card.

The daily summary (`L2-016` AC6) and promotional e-mail (`L2-149` AC1), which the prompt listed
as missing, were built with their tests by journey 17 (ADR 0053); this run built nothing there.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:13 | Card: "Journey 20 · Manage profile and settings", from 93% to 100% |
| 02 | `profile` | 0:13 | 0:24 | `/account`: "Home church address" with "Shown to no one.", "Pronouns" with its hint (L2-196 AC1, L2-013 AC8) |
| 03 | `sessions` | 0:24 | 0:38 | "Where you’re signed in": "Safari on iPhone · This device · Network 203.0.113.x", then "Chrome on Windows · Last active 2 hours ago" (L2-143 AC3) |
| 04 | `end` | 0:38 | 0:47 | "Sign out" on Chrome on Windows: the row goes, "No other devices are signed in.", the toast "Signed out of Chrome on Windows" (L2-143 AC3) |
| 05 | `team` | 0:47 | 1:00 | Admin application, Luzandre.com: the Owner panel with "Pronouns · she/her" (L2-013 AC8) |
| 06 | `behind` | 1:00 | 1:18 | Card: the security log of credential changes, another member's session, the home church given to no other reader |
| 07 | `close` | 1:18 | 1:28 | Card: journey 20 complete; the daily summary and promotional e-mail built with journey 17 |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/27-journey-20-manage-profile-and-settings --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/27-journey-20-manage-profile-and-settings           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
