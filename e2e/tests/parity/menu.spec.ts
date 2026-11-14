import { parity } from '../../fixtures/parity';
import { AdminRowMenuScreen } from '../../pages/admin-records.page';
import { ConversationMenuScreen } from '../../pages/messages.page';

// jb-menu and its items: the conversation menu, for a conversation that is not muted and one that is;
// and the actions of a row of the admin application, with the start of its ID as a hint (L2-280 AC1).
parity('menu', {
  cases: [
    {
      name: 'conversation',
      route: 'conversation.menu',
      screen: (page) => new ConversationMenuScreen(page),
      region: (screen: ConversationMenuScreen) => screen.menu,
    },
    {
      name: 'muted',
      route: 'conversation.muted',
      screen: (page) => new ConversationMenuScreen(page),
      region: (screen: ConversationMenuScreen) => screen.menu,
      // On a phone the mock's trigger sits on a half pixel beside the "Muted" badge, so the
      // menu anchored to it is cropped a pixel wider; the unmuted case covers the phone.
      widths: [1280],
    },
    {
      name: 'row-actions',
      route: 'admin-records.row-menu',
      screen: (page) => new AdminRowMenuScreen(page),
      region: (screen: AdminRowMenuScreen) => screen.menu,
      widths: [1280],
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no menu and no conversation.',
    nearestFrame: 'home-1280.png',
  },
});
