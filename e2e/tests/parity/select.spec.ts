import { parity } from '../../fixtures/parity';
import { EditListingPage } from '../../pages/edit-listing.page';

// jb-select: at rest with a value.
parity('select', {
  cases: [
    {
      name: 'value',
      route: 'edit-listing',
      screen: (page) => new EditListingPage(page),
      region: (screen: EditListingPage) => screen.category,
    },
  ],
  reference: {
    crops: [
      {
        case: 'value',
        width: 1280,
        frame: 'list-your-business-1280.png',
        clip: { x: 96, y: 653, width: 345, height: 50 },
        knownDifference:
          'The reference select is 50 px tall with a 12 px radius, the browser arrow and Inter; the design system select is 44 px tall (--control-height-md) with --radius-md, its own drawn arrow and the system text face.',
      },
    ],
  },
});
