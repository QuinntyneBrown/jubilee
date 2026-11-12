# 04 · Journey 3: Search the directory

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey three: search the directory. Anyone searches businesses, services and products by keyword, and sees grouped results. This run takes the journey from eighty-five percent to complete.

A member types plumber in the top bar and lands on the search page. The heading names the query, and one line counts the businesses, the services and the products that match.

Each result explains why it matched, with the matched word highlighted. Plumber also finds plumbing, because search folds word endings, case and accents.

Results are grouped under three tabs, each with its count. A search for bibles finds one business and one product. A new Playwright spec proves that each tab lists only the results of its kind.

A misspelling matches nothing. The page says so, offers the close term, plumber, and links to the category where it is listed. The button runs that search.

With no query, the page helps the member start: their recent searches, newest first, and the popular categories. Removing a recent search deletes it on the server.

The question this run settled is how search stays current. Here a search for plumbing finds two businesses. In this recording the answers are stubbed.

Then the owner of one pauses the listing. The member searches again, and the next search finds only the other. Nothing waits to be indexed.

That is the decision, recorded in decision record eleven. Search reads the public listings in the Jubilee database at the moment of the query. That is the final design: there is no separate index to bring up to date, and no indexing job in the worker.

Twenty-one new API tests prove it through the real endpoints. An owner's pause and resume, an edit, a service or a product added, changed or deleted, a verifier's approval and a moderation hold each reach the very next search. A listing that is not public is never found, even by the fallback name search.

When search fails, the page says nothing is lost and shows a reference to quote. Try again now has its own spec: it loads the results.

The requirements, the search design and its diagrams now describe the code as built, and journey three is complete. Left for the owner: the visual, responsive and accessibility sweeps, which only the owner runs. Search latency under load belongs to the performance designs.
