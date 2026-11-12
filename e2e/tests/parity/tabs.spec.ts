import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { MyBusinessPage } from '../../pages/my-business.page';
import { FeedbackPage } from '../../pages/feedback.page';
import { FeedbackPanelScreen } from '../../pages/feedback.screens';
import { RequestsPage } from '../../pages/requests.page';

// jb-tabs (links between pages, with and without a count) and jb-tab-list (the views of one
// page, each with its count; and segmented with icons, in the panel and at the page size).
parity('tabs', {
  cases: [
    {
      name: 'pages',
      route: 'account',
      screen: (page) => new AccountPage(page),
      region: (screen: AccountPage) => screen.sectionTabs,
    },
    {
      name: 'pages-with-a-count',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.sections,
    },
    {
      name: 'views-with-counts',
      route: 'requests',
      screen: (page) => new RequestsPage(page),
      region: (screen: RequestsPage) => screen.typeTabs,
    },
    {
      name: 'segmented',
      route: 'feedback-panel',
      screen: (page) => new FeedbackPanelScreen(page),
      region: (screen: FeedbackPanelScreen) => screen.panel.tabs,
    },
    {
      name: 'segmented-large',
      route: 'feedback',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.kindTabs,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show no tab strip: their only navigation is the top bar.',
    nearestFrame: 'home-1280.png',
  },
});
