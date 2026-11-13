# Estimates: admin

| Design | Effort | Complete |
|---|---|---|
| run-admin-application | 7 days | 95% |

run-admin-application, sign-in-as-staff, authorize-staff-requests and restrict-staff-network (ADR 0040, ADR 0070): the admin application with its admin bar, staff sign-in through Entra ID with a proved second factor, the staff session, the staff-only admin endpoints, the network allow-list with the admin host's proxy key, the moved screens and the app's moved page are done, and every criterion of L2-188 to L2-195 that code can meet has a test (`StaffAccessTests`, `StaffSignInTests`, `NetworkRestrictionTests`, `StaffCommandTests`, `StaffIdentityClientTests`, `admin-application.spec.ts`, `admin-moved.spec.ts`, `keep-listings-honest.spec.ts`, `moderation.spec.ts`, `admin-policies.spec.ts`). ADR 0057 is done (the `moderator` role, "Listings", "Reports", "Featured", `/` opens `/listings`, old `/admin/verifications` links lead to `/listings`), and a role change by `jubilee staff` is audited (ADR 0059).

What keeps the four designs below 100% is the owner's checklist under "The admin application" in `eng/azure/README.md`, steps 1, 2 and 4 to 9: the Entra ID registration and its Conditional Access, the staff sign-in settings, the allowed networks on the host and the API (`STAFF_NETWORKS=… bash eng/azure/create-admin.sh`), the first administrator (`bash eng/azure/staff.sh grant`), one sign-in against production, and the sweeps of the admin screens (L2-188 AC6). The App Service, its host name and the proxy key (step 3) were done on 11 November 2026.
