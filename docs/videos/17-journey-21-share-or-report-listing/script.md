# 17 · Journey 21: Share or report a listing

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-one: share or report a listing. Anyone can pass a listing on, and a member can privately report one. This run takes the journey from seventy-eight percent to complete.

Anyone, signed in or not, presses Share on a listing. The dialog, Share Luzandre dot com, shows the listing's own link, with Copy, E-mail, WhatsApp and More.

Copy puts the link on the clipboard. The button reads Copied for two seconds, and a polite status tells a screen reader: Link copied. Focus stays where it was.

More appears only where the device has a share sheet, and opens it with the name and the link. Both cases now have a test.

Done closes the dialog, and focus returns to Share, the control that opened it. Escape does the same.

A pasted link builds a preview in a chat. This is the image every shared listing now carries: the Jubilee lockup, drawn from the design tokens.

The app's host now tells a link-preview fetcher from a browser. WhatsApp, Facebook, Slack and the others get the business's name, tagline and that image. A browser gets the app.

Reporting needs an account. A visitor who presses Report this listing is asked to join or sign in first, and comes back to the report.

Joanna, signed in, opens the report. Reports are private. She chooses: the listing is misleading or out of date, and writes a sentence. The counter shows what is left.

On its way, the form is read-only and busy. A second press, or Escape, does nothing.

The server answers, and the dialog thanks her. Her report is private, and the verification team reviews it within one business day.

In the same transaction as the report, the team is e-mailed: New report, with the business, the reason, what happened and a link to it in the admin application. Never the reporter.

Tests prove each criterion: the share sheet, the announcement, focus, the busy dialog, and a report that fails after ten seconds. API tests prove the e-mail; host tests prove the preview.

Journey twenty-one is complete, with no migration and no new setting. Left for the owner: the visual, responsive and accessibility sweeps.
