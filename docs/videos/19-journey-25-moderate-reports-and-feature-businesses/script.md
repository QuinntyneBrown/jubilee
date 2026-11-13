# 19 · Journey 25: Moderate reports and feature businesses

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-five: moderate reports and feature businesses. The Jubilee team handles the reports members send, and chooses the businesses featured this week. This run takes the journey from eighty-two percent to complete.

A report must reach the team when it arrives. A report of a listing already e-mailed the team. Now a report of a conversation does too: New report, a conversation with the business, with what the member wrote and a link to the report. It never names who reported, and never carries the messages.

Miriam of the Jubilee team opens the reports. Beside Reports, the admin bar now counts the unresolved reports, here two, and a screen reader hears: two unresolved.

She opens the report about Luzandre dot com. Opening it moves it into review, and the access is recorded in the audit log.

She places the listing on hold, with the note every action requires. The owner is told the listing is paused while the team looks into a report, and never who reported it.

A held or removed listing leaves the welcome page, Browse, its category, search and the related businesses on the very next request. The save itself clears the directory cache, and search reads the database, so no outbox step is needed.

Meanwhile another report comes in. The admin application does not poll, which would keep an idle staff session alive. It reads the staff session again each time Miriam moves between screens, or acts on a report.

So when she opens the featured businesses, the bar reads three.

She chooses this week's businesses, up to five live listings in the order she wants, and saves the week.

A week saved, or saved again, shows on the welcome page and Browse on the next request. A featured listing that is paused, held or removed is skipped, and returns when it is live again.

Tests prove each criterion: API tests for the team's e-mail, the count and every public page, each seen failing first, and browser tests for the admin bar.

Journey twenty-five is complete. Nothing new needs setting on Azure: the team's e-mail goes to the address already set for the launch. Left for the owner: run the visual, responsive and accessibility sweeps.
