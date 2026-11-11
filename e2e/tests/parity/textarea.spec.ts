import { parity } from '../../fixtures/parity';
import { EditListingPage } from '../../pages/edit-listing.page';

// jb-textarea: at rest with a value.
parity('textarea', {
  cases: [
    {
      name: 'value',
      route: 'edit-listing',
      screen: (page) => new EditListingPage(page),
      region: (screen: EditListingPage) => screen.about,
      arrange: (screen: EditListingPage) =>
        screen.typeAboutAndLeave(
          'Custom tees, mugs and original artwork designed to share joy. Order a ready-made piece or ask for something made just for your church, team or family.',
        ),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no multi-line control.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
