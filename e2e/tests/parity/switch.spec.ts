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
      // Picked by its setting, not its place: the mock lists "Event reminders" (L1-036) above it.
      region: (screen: NotificationSettingsPage) => screen.switchControl('New businesses'),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no switch.',
    nearestFrame: 'home-1280.png',
  },
});
