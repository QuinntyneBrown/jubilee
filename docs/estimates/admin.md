# Estimates: admin

| Design | Effort | Complete |
|---|---|---|
| run-admin-application | 7 days | 90% |

run-admin-application, sign-in-as-staff, authorize-staff-requests and restrict-staff-network (ADR 0040): the admin application with its admin bar, staff sign-in through Entra ID with a proved second factor, the staff session, the staff-only admin endpoints, the network allow-list with the admin host's proxy key, the moved screens and the app's moved page are done with tests (`StaffAccessTests`, `StaffSignInTests`, `NetworkRestrictionTests`, `StaffCommandTests`, `admin-application.spec.ts`, `admin-moved.spec.ts`). Left for the owner: the Entra ID registration and Conditional Access, the `jubilee-to-admin` App Service, its DNS and the allow-list (`eng/azure/README.md`). The sweeps of the new screens are written and have not been run.

ADR 0057 is done: the navigation reads "Listings", "Reports", "Featured", `/` opens `/listings`, a staff member without the `moderator` role sees "Nothing here for your role", the app's old `/admin/verifications` links lead to `/listings`, and the staff session counts no queue (`keep-listings-honest.spec.ts`, `admin-moved.spec.ts`).
