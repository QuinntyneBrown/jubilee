# 30 · Journey 26: Download data and delete account

> **Runtime:** 1:21 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 26

**Video:** [30-journey-26-download-data-and-delete-account.mp4](30-journey-26-download-data-and-delete-account.mp4) · **Audio:** [30-journey-26-download-data-and-delete-account.mp3](30-journey-26-download-data-and-delete-account.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/26-download-data-and-delete-account.md`, which took journey 26 from 83%
to 98% (`L2-017`, `L2-018`, ADR 0069).

Joanna, a member, opens her account. Her last download could not be prepared, and the page says
"We couldn’t prepare your data. Something went wrong while we put your file together, and the
Jubilee team has been told." (`L2-018` AC7). She asks again, and the page says "We’re preparing
your data" (AC1). She opens Delete my account: "Keep my account" has the focus (`L2-129` AC1),
and the dialog names her account and counts what is deleted and cancelled (`L2-017` AC1). She
types DELETE while her connection is down: "Your connection dropped before it reached us.
Nothing was sent and what you typed is still here. Try again." (`L2-128` AC2). With the
connection back she deletes the account, lands on the welcome page with "Your account was
deleted", and the saved pages, the outgoing queue and her drafts leave the device (`L2-017` AC3).
Two cards say what the tests prove behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The API is answered by the stand-ins of the behaviour specs (ADR 0009); the dropped connection is
a request the browser aborts. The pictures prove what the app does: the failed-build state, a new
request, the dialog's focus and counts, the dropped connection, the deletion and the welcome page.
The recording checks that the device kept no saved page and no queued message after the deletion.

Only the tests prove the rest:

- that every deletion is written to the deletion ledger outside the database, and that after a
  restore the worker deletes the account again with its original time (`AccountDataTests.Restore`,
  `L2-017` AC7). On a card;
- that the archive is kept in the export store under a random key, never in the database, and
  leaves it with the link or the account (`AccountDataTests.ExportStore`, `L2-018` AC5). On a card;
- that the data link and the deletion confirmation are sent whatever the settings say and carry
  no unsubscribe (`AccountDataTests.Emails`, `L2-018` AC6, `L2-068` AC6). On a card;
- that a build is tried again after 1, 2, 4 and 8 minutes and its dead letter tells the on-call
  contact without personal data (`DataExportDeadLetterTests`, `L2-182` AC2);
- that the archive holds sessions, statement-of-faith agreements and back-in-stock alerts and
  counts photos, and that the erasure removes sessions, agreements, a request's phone and delivery
  address, a reporter's name and the listing photos (`AccountDataTests.Coverage`, `L2-018` AC4,
  `L2-017` AC6);
- that the listing leaves search at once (`AccountDataTests.Search`, `L2-017` AC4), and that the
  deletion is in the security log (`AccountDataTests.SecurityLog`);
- that the drafts leave the device (`e2e/tests/account-data.spec.ts`, `L2-017` AC3).

What remains is the owner's: keep the database's backups for 35 days or less, with no long-term
retention (`eng/azure/README.md`, "Deleted accounts, backups and data archives").

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:16 | Card: "Journey 26 · Download data and delete account" |
| 02 | `failed` | 0:16 | 0:33 | "We couldn’t prepare your data", then "We’re preparing your data" (`L2-018` AC7, AC1) |
| 03 | `dialog` | 0:33 | 0:43 | The dialog, "Keep my account" in focus (`L2-129` AC1, `L2-017` AC1) |
| 04 | `dropped` | 0:43 | 0:49 | "Your connection dropped before it reached us." (`L2-128` AC2) |
| 05 | `deleted` | 0:49 | 1:00 | The welcome page and "Your account was deleted" (`L2-017` AC3) |
| 06 | `behind` | 1:00 | 1:13 | Card: what the tests prove |
| 07 | `close` | 1:13 | 1:21 | Card: the owner’s step, the backup retention |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/30-journey-26-download-data-and-delete-account --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/30-journey-26-download-data-and-delete-account           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".
