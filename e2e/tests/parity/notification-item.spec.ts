import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/notifications.page';

// jb-notification-item: unread, read, and the last of the list, which has no line under it.
parity('notification-item', {
  cases: [
    {
      name: 'unread',
      route: 'notifications',
      screen: (page) => new NotificationsPage(page),
      region: (screen: NotificationsPage) => screen.unread().first(),
    },
    {
      name: 'back-in-stock',
      route: 'notifications.back-in-stock',
      screen: (page) => new NotificationsPage(page),
      region: (screen: NotificationsPage) => screen.unread().first(),
    },
    {
      name: 'read',
      route: 'notifications.read',
      screen: (page) => new NotificationsPage(page),
      region: (screen: NotificationsPage) => screen.links.first(),
    },
    {
      name: 'last',
      route: 'notifications.read',
      screen: (page) => new NotificationsPage(page),
      region: (screen: NotificationsPage) => screen.links.last(),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no notifications.',
    nearestFrame: 'home-1280.png',
  },
});
