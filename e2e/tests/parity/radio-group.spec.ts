import { parity } from '../../fixtures/parity';
import { RequestItemDialog } from '../../pages/messages.page';

// jb-radio-group: the legend and the options with their hints, one chosen.
parity('radio-group', {
  cases: [
    {
      name: 'with-hints',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.methodGroup,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no radio group; its one choice is a pair of cards.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
