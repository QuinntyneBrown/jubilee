# Estimates: trust-content

| Design | Effort | Complete |
|---|---|---|
| publish-policy-pages | 6 days | 98% |
| render-site-chrome | 4 days | 80% |

publish-policy-pages (ADR 0030, ADR 0067): the statement of faith, terms, privacy and help pages read the published version of their text through a read cache, a built-in first version stands until an administrator publishes the next, every version is kept, joining records the terms version, and the help page is native disclosures with anchors. Administrators edit each page at `/policies` in the admin application, preview the draft as members will read it, and publish it as the next version; a publish started from an older version is refused, the publish is audited, and it clears the cached page. Open, for the owner and needing no deployment: publish the real privacy contact and the final legal wording of the terms and the privacy notice from `/policies` (ADR 0067).

show-verified-mark is removed (ADR 0057): Jubilee no longer marks a business as verified. Deleting `jb-verified-mark` and `jb-verified-business-label` and every use of them is counted in the designs whose screens carried the mark (directory, listings, marketing). ADR 0057 is done in publish-policy-pages: the help answer "How does Jubilee keep listings honest?" and the statement of faith's section "How listings stay honest" speak of the owner's agreement, members' reports and the Jubilee team's takedowns.
