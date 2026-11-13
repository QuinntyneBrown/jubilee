# 31 · Journey 30: Work in the admin application

> **Runtime:** 1:40 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 30

**Video:** [31-journey-30-work-in-the-admin-application.mp4](31-journey-30-work-in-the-admin-application.mp4) · **Audio:** [31-journey-30-work-in-the-admin-application.mp3](31-journey-30-work-in-the-admin-application.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/30-work-in-the-admin-application.md`, which took journey 30 from 92% to
96% (`L2-188` to `L2-195`, ADR 0070).

The admin application's sign-in screen offers one way in, "Sign in with your staff account", with
no e-mail or password field, and says "Members sign in at app.jubilee.to." (`L2-189` AC1). Pressed,
it hands over to the identity provider; in the recording a stand-in plays the provider and sends
Miriam back signed in (AC7). Miriam is a moderator: the admin bar shows "Listings", "Reports" with
the unresolved reports, "Featured", her name with "Moderator", and "Sign out" (`L2-188` AC3).
Daniel holds only the administrator role: `/reports` says "Nothing here for your role" and his
navigation offers only "Policies" (`L2-188` AC4). "Sign out" ends the staff session and says
"You’ve signed out of the admin application." (`L2-190` AC4). Off an allowed network the screen
says "You’re not on an allowed network." and offers no sign-in (`L2-192` AC6). In the app,
`/admin/verifications` says "This page has moved" with "Open the admin application" (`L2-194`
AC2). Two cards say what the tests prove behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The API is answered by the stand-ins of the behaviour specs (ADR 0009), and the identity provider
by a stand-in that answers the sign-in with Miriam's session. The pictures prove what the admin
application and the app show: the sign-in screen, the admin bar for each role, the refusal for a
role and for a network, the signed-out screen and the moved page.

Only the tests prove the rest:

- that every admin-only endpoint, the takedown and the policy pages included, refuses a member
  session with 403 `STAFF_SESSION_REQUIRED` and no session with 401 (`StaffAccessTests`, `L2-191`
  AC5). On a card;
- that a member session and a staff session in the same browser outlive each other's sign-out
  (`StaffAccessTests`, `L2-190` AC5). On a card;
- that a staff member signed in through single sign-on acts as the member with their confirmed
  address and cannot take down that member's listing (`StaffSignInTests`, `L2-193` AC6). On a
  card;
- that every role change by `jubilee staff` is written to the audit log with the operator and the
  roles before and after, and a command that changes nothing writes nothing (`StaffCommandTests`,
  `L2-098` AC4). On a card;
- that the API proves the second factor, binds the staff account on first sign-in, ends a staff
  session after 30 minutes idle or 8 hours, and checks the network before any session
  (`StaffSignInTests`, `StaffAccessTests`, `NetworkRestrictionTests`);
- that every Jubilee team screen, not only `/reports`, refuses a staff member without the
  moderator role, and that the app's top bar, tab bar and account menu carry no link to an admin
  screen (`admin-application.spec.ts`, `admin-moved.spec.ts`).

What remains is the owner's, in one checklist under "The admin application" in
`eng/azure/README.md`: register the application with Entra ID and require a second factor, set the
staff sign-in settings and the allowed networks, grant the first administrator, sign in once
against production, and run the sweeps. No automated test reaches the real identity provider.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:11 | Card: "Journey 30 · Work in the admin application" |
| 02 | `sign-in` | 0:12 | 0:25 | "Sign in to the admin application", then signed in (`L2-189` AC1, AC7) |
| 03 | `shell` | 0:25 | 0:37 | Listings with the admin bar of a moderator (`L2-188` AC3) |
| 04 | `role` | 0:37 | 0:48 | "Nothing here for your role", only Policies (`L2-188` AC4) |
| 05 | `sign-out` | 0:48 | 0:54 | "You’ve signed out of the admin application." (`L2-190` AC4) |
| 06 | `network` | 0:54 | 1:01 | "You’re not on an allowed network." (`L2-192` AC6) |
| 07 | `moved` | 1:01 | 1:09 | The app's "This page has moved" (`L2-194` AC2) |
| 08 | `behind` | 1:10 | 1:26 | Card: what the tests prove |
| 09 | `close` | 1:26 | 1:40 | Card: the owner’s checklist |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/31-journey-30-work-in-the-admin-application --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/31-journey-30-work-in-the-admin-application           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
