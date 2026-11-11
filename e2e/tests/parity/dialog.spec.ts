import { parity } from '../../fixtures/parity';
import { RequestItemDialog } from '../../pages/messages.page';

// jb-dialog: the header (icon, title, description, close button) and the footer of a dialog,
// as a bottom sheet at 360 px and a centred panel at 1280 px.
parity('dialog', {
  cases: [
    {
      name: 'header',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.header,
    },
    {
      name: 'footer',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.footer,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no dialog.',
    nearestFrame: 'business-shop-1280.png',
  },
});
