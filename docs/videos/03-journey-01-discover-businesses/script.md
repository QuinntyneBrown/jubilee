# 03 · Journey 1: Discover businesses

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey one: discover businesses. A visitor explores the welcome page, browses home, and opens a category with its filters. This run takes the journey from ninety-three percent to complete.

The welcome page is the public landing page for visitors. It says what Jubilee is, Toronto's Christian marketplace, and shows the live count: forty-seven verified businesses in the recorded directory.

Below are the eleven categories as links, the three steps of how Jubilee works, and up to four businesses featured this week.

Browse businesses opens the browse home. A visitor sees the same directory as a member, with a New here panel and Join free in place of the greeting.

Further down, all forty-seven businesses are grouped by category, each group with its count. A group of more than four lists four, and a See all link.

A category with no live businesses has no group. Here, no Learning business is live, so Business and tech is followed by Media. A new Playwright spec now proves this criterion.

A category chip opens the category page. Home and property: ten verified businesses, three of which take emergency calls.

Pressing the Emergency calls chip narrows the list to those three. The filter is kept in the address, so a copied link shows the same result.

Results can be sorted by Recommended, Newest, or Name A to Z. Here they are, by name.

These pages are cached for sixty seconds. This run settled how the cache is cleared: when the API saves a change to a listing, the cached pages are removed, and the next visitor sees the change. Decision record three now names this as the designed path.

Three new API tests prove it through the real endpoints: an owner pausing and resuming a listing, a verifier approving one, and a verifier setting the featured week. A change made outside the API is seen within sixty seconds.

The requirement, the three designs and their diagrams now describe the code as built, and journey one is complete. Left for the owner: the visual, responsive and accessibility sweeps, which only the owner runs. Page weight and latency budgets belong to the performance designs.
