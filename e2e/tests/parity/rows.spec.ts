import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessPage } from '../../pages/business.page';
import { RequestItemDialog } from '../../pages/messages.page';
import { MyServicesPage } from '../../pages/my-services.page';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';
import { RequestsPage } from '../../pages/requests.page';

// jb-rows and jb-row with their parts, the rows that are components of their own (service row,
// directory row), jb-list and jb-item-list.
parity('rows', {
  cases: [
    {
      name: 'row-with-avatar-and-state',
      route: 'requests',
      screen: (page) => new RequestsPage(page),
      region: (screen: RequestsPage) => screen.row('Discovery meeting').first(),
    },
    {
      name: 'row-with-price-and-actions',
      route: 'my-services',
      screen: (page) => new MyServicesPage(page),
      region: (screen: MyServicesPage) => screen.rows.first(),
    },
    {
      name: 'row-that-labels-a-switch',
      route: 'preferences',
      screen: (page) => new NotificationSettingsPage(page),
      region: (screen: NotificationSettingsPage) => screen.settingRows.first(),
    },
    {
      name: 'service-row',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.serviceRows.first(),
    },
    {
      name: 'directory-row',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.directoryRows.first(),
    },
    {
      name: 'list',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.directoryLists.first(),
    },
    {
      name: 'item-list',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.summary,
    },
  ],
  reference: {
    crops: [
      {
        case: 'directory-row',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 32, y: 1822, width: 380, height: 64 },
        knownDifference:
          'The reference draws the row 380 px wide with a smaller tagline, in Inter; the design system has a wider column and the tagline at the small body size, in the system face.',
      },
      {
        case: 'service-row',
        width: 1280,
        frame: 'business-services-1280.png',
        clip: { x: 32, y: 686, width: 768, height: 77 },
        knownDifference:
          'The reference gives the services column 768 px and draws the row 77 px tall around a 42 px Book button, in Inter; the design system has the column 704 px and the row 79 px around a 32 px button, in the system face.',
      },
    ],
  },
});
