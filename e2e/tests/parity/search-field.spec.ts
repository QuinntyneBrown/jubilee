import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { MessagesPage } from '../../pages/messages.page';
import { SearchPage } from '../../pages/search.page';

// jb-search-field: on ink in the top bar, as the tall pill a phone shows in the hero, large and
// focused on the search page, and above the list of messages.
parity('search-field', {
  cases: [
    {
      name: 'top-bar',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.searchField,
      widths: [1280],
    },
    {
      name: 'hero',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.heroSearchField,
      widths: [360],
    },
    {
      name: 'large-focused',
      route: 'search.empty',
      screen: (page) => new SearchPage(page),
      region: (screen: SearchPage) => screen.pageSearchField,
      // The mock opens with the box focused; in the app a member moves there.
      arrange: (screen: SearchPage) => screen.pageSearchBox.focus(),
    },
    {
      name: 'messages',
      route: 'messages',
      screen: (page) => new MessagesPage(page),
      region: (screen: MessagesPage) => screen.list.searchField,
      widths: [1280],
    },
  ],
  reference: {
    crops: [
      {
        case: 'top-bar',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 162, y: 12, width: 448, height: 40 },
        knownDifference:
          'The reference draws the box of the top bar 452 px wide with a 12 px radius, in Inter; the design system draws a pill that shares the bar with the navigation, in the system face.',
      },
    ],
  },
});
