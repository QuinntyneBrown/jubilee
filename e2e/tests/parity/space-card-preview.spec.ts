import { parity } from '../../fixtures/parity';
import { AdminVerificationPage } from '../../pages/admin-verification.page';
import { EditListingPage } from '../../pages/edit-listing.page';
import { ListBusinessPage } from '../../pages/list-business.page';

// jb-space-card-preview: how renters will see a space while it waits for verification (L2-197 AC3,
// L2-199 AC3), and as its owner edits it (L2-208).
parity('space-card-preview', {
  cases: [
    {
      name: 'list-a-space',
      route: 'list-business.space',
      screen: (page) => new ListBusinessPage(page),
      region: (screen: ListBusinessPage) => screen.spacePreview,
      arrange: (screen: ListBusinessPage) => screen.space.fillExample(screen.name),
    },
    {
      name: 'review',
      route: 'admin-verification.space',
      screen: (page) => new AdminVerificationPage(page),
      region: (screen: AdminVerificationPage) => screen.spacePreview,
    },
    {
      name: 'edit-a-space',
      route: 'edit-listing.space',
      screen: (page) => new EditListingPage(page),
      region: (screen: EditListingPage) => screen.spacePreview,
    },
  ],
  reference: {
    crops: [
      {
        case: 'list-a-space',
        width: 1280,
        frame: 'list-a-space-1280.png',
        clip: { x: 863, y: 135, width: 320, height: 352 },
        knownDifference:
          'The reference shows the space with a photo, its own title and "From Mar 1", and marks nothing as pending; the app draws the tinted tile by term until the owner adds photos from My business, and marks the card "Pending verification" until it is approved (L2-197 AC3).',
      },
    ],
  },
});
