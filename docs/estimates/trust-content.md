# Estimates: trust-content

| Design | Effort | Complete |
|---|---|---|
| publish-policy-pages | 4 days | 85% |
| render-site-chrome | 4 days | 80% |

publish-policy-pages (ADR 0030): the statement of faith, terms, privacy and help pages read the published version of their text, a built-in first version stands until an admin publishes the next, every version is kept, joining records the terms version, and the help page is native disclosures with anchors. Deferred: the staff editing screen, the cache, the real privacy contact, final legal wording.

show-verified-mark is removed (ADR 0057): Jubilee no longer marks a business as verified. Deleting `jb-verified-mark` and `jb-verified-business-label` and every use of them is counted in the designs whose screens carried the mark (directory, listings, marketing). ADR 0057 is done in publish-policy-pages: the help answer "How does Jubilee keep listings honest?" and the statement of faith's section "How listings stay honest" speak of the owner's agreement, members' reports and the Jubilee team's takedowns.
