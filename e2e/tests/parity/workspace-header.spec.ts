import { parity } from '../../fixtures/parity';
import { MyBusinessPage } from '../../pages/my-business.page';
import { MyServicesPage } from '../../pages/my-services.page';

// jb-workspace-header: its title block with the link to the public listing, and its tabs on the
// overview and on another section. The mock has no element around the two, so each is compared.
parity('workspace-header', {
  cases: [
    {
      name: 'title',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.pageHeader,
    },
    {
      name: 'tabs-on-overview',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.sections,
    },
    {
      name: 'title-on-services',
      route: 'my-services',
      screen: (page) => new MyServicesPage(page),
      region: (screen: MyServicesPage) => screen.pageHeader,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no page of the owner’s workspace.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
