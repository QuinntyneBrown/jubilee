# Estimates: reviews

| Design | Effort | Complete |
|---|---|---|
| review-data | 2 days | 100% |
| review-a-platform | 5 days | 100% |
| write-a-review | 3 days | 95% |
| read-reviews | 4 days | 95% |
| edit-and-remove-a-review | 2 days | 90% |
| reply-to-a-review | 1 day | 95% |
| moderate-reviews | 2 days | 95% |

The API, the app and the admin application are built and proved by their API tests and
behaviour specs, with a parity spec for each new component (ADR 0066). What remains: the Edit
dialog offers no choice of product for a shop's review (the listing page's product cards carry no
id, so the review keeps its product); the parity crops of the rating under the name and of the
review subject are not measured yet; and the owner runs the sweeps. Photos on reviews and
"Helpful" are deferred by ADR 0066.

review-a-platform (ADR 0071): eligibility by the statement of use for platforms only, the statement on the Write a review screen, `Review.StatedUseAt`, the line that says the reviews are the members' own word, and editing, removing, replying to, reporting and taking down such a review are done with tests (`PlatformReviewTests`, `PlatformReviewChangesTests`, `write-platform-review.spec.ts`, `platform-reviews.spec.ts`, `platform-review-changes.spec.ts`). Nothing is left.
