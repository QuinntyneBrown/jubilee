# 18 · Journey 23: Recover from errors

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-three: recover from errors. Anyone who meets a missing, forbidden, failed or maintenance page sees a clear page and a way forward. This run takes the journey from seventy-nine percent to complete.

In this demo, Legacy Financial was once listed as Legacy Financial Group. Someone follows a link they were sent under the old name, and the listing opens.

When an owner changes the business name, the listing's address now follows it, and the old one is kept. The old address answers with a permanent redirect, and is never given to another business.

An address that is no page of Jubilee shows the not-found page, with Back to browse and Search.

And now the server says so before the app even loads. The app's host checks each page load against the app's addresses and asks the API: four oh four for a missing page or a listing that is not public, four oh three for an area that is not yours, and three oh one for an old link.

While Jubilee is being updated, every page load answers five oh three, with Retry After, and this page: a static copy, with no script, that says when Jubilee is back and that nothing you've sent is lost.

If the app itself cannot be served, the host answers five hundred with a static copy of the error page: Try again, Get help, and a reference to quote, which leads support to the log.

Joanna opens the owner's workspace, but she owns no listing. The page tells her plainly, and she presses Ask for access.

The request is passed to the team. Nothing is granted.

With the request, the verification team is now e-mailed: the page, who asked and when. A repeated press, or more than five in an hour, sends nothing more.

Tests prove each criterion: API tests for the slugs, the statuses and the e-mail, host tests for every page-load status, and browser tests for the redirects and the static pages.

Journey twenty-three is complete. Nothing new needs setting on Azure. Left for the owner: check the statuses after deploying, and run the visual, responsive and accessibility sweeps.
