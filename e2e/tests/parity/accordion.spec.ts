import { parity } from '../../fixtures/parity';
import { HelpPage } from '../../pages/help.page';

// jb-accordion and its items, as the help page opens.
parity('accordion', {
  cases: [
    {
      name: 'help',
      route: 'help',
      screen: (page) => new HelpPage(page),
      region: (screen: HelpPage) => screen.accordion,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no help page and no accordion.',
    nearestFrame: 'home-1280.png',
  },
});
