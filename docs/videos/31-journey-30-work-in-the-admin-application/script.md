# 31 · Journey 30: Work in the admin application

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey thirty: work in the admin application. Staff sign in through single sign-on from an allowed network, work in its shell, and sign out.

The sign-in screen offers one way in: the staff account, confirmed with a second factor. There is no e-mail or password field. Here a stand-in plays the identity provider.

Miriam is a moderator. The admin bar shows Listings, Reports with the unresolved reports, and Featured, with her name, her role, and Sign out.

Daniel holds only the administrator role. Every Jubilee team screen tells him it is not for his role, and his navigation offers only Policies.

Sign out ends the staff session on the server, and says so.

Off an allowed network, the admin application says so, and offers no sign-in.

In the app, an old admin link says the page has moved, and opens the matching screen in the admin application.

Behind the screen, the tests prove that every admin-only endpoint refuses a member session; that signing out of the app or the admin application leaves the other signed in; that staff cannot take down their own listing; and that every role change is audited.

What is left is the owner's, in one checklist: register the application with the identity provider and require a second factor, set the allowed networks, grant the first administrator, and sign in once against production.
