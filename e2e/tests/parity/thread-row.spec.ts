import { parity } from '../../fixtures/parity';
import { MessagesPage } from '../../pages/messages.page';

// The list of conversations is a column of its own from the desktop layout, as wide in the mock
// as in the app; below it the mock keeps a page margin the app does not (ADR 0036).
const widths = [1280] as const;

// jb-thread-row: unread, read, and the row that stands in while loading. The open conversation is
// not compared: its row is read in the mock and still unread in the recorded answers of the app.
parity('thread-row', {
  cases: [
    {
      name: 'unread',
      route: 'messages',
      screen: (page) => new MessagesPage(page),
      region: (screen: MessagesPage) => screen.list.rows.nth(0),
      widths,
    },
    {
      name: 'read',
      route: 'messages',
      screen: (page) => new MessagesPage(page),
      region: (screen: MessagesPage) => screen.list.rows.nth(2),
      widths,
    },
    {
      name: 'skeleton',
      route: 'messages.loading',
      screen: (page) => new MessagesPage(page),
      region: (screen: MessagesPage) => screen.list.skeletonRows.nth(0),
      widths,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no messages.',
    nearestFrame: 'home-1280.png',
  },
});
