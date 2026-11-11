import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { RequestItemDialog } from '../../pages/messages.page';

// jb-card: a card with its heading, the danger zone and the well.
parity('card', {
  cases: [
    {
      name: 'with-heading',
      route: 'account',
      screen: (page) => new AccountPage(page),
      region: (screen: AccountPage) => screen.dataCard,
    },
    {
      name: 'danger-zone',
      route: 'account',
      screen: (page) => new AccountPage(page),
      region: (screen: AccountPage) => screen.dangerZone,
    },
    {
      name: 'well',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.amounts,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show no card of this kind: their cards are business and product cards.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
