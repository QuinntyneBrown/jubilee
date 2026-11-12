import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-booking-bar: the rent and the call to action, fixed above the tab bar under 768 px
// (L2-204 AC4). From 768 px it draws nothing.
parity('booking-bar', {
  cases: [
    {
      name: 'room',
      route: 'space.room',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.bookingBar,
      widths: [360],
    },
  ],
  reference: {
    absent:
      'The 360 px capture of a space is a full-page shot; the Magic Patterns prototype keeps its call to action in the card and draws no bar fixed above the tab bar.',
    nearestFrame: 'space-360.png',
  },
});
