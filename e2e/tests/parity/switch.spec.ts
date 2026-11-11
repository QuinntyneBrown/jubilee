import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

// jb-switch: on, and off.
parity('switch', {
  cases: [
    {
      name: 'on',
      route: 'preferences',
      screen: (page) => new NotificationSettingsPage(page),
      region: (screen: NotificationSettingsPage) => screen.switches.first(),
    },
    {
      name: 'off',
      route: 'preferences',
      screen: (page) => new NotificationSettingsPage(page),
      region: (screen: NotificationSettingsPage) => screen.switches.nth(3),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no switch.',
    nearestFrame: 'home-1280.png',
  },
});
