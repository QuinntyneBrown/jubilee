import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';

// jb-perk and jb-tag, in the head of a business page.
parity('perk', {
  cases: [
    {
      name: 'perk',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.highlight,
    },
    {
      name: 'tag',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.credentialTags.first(),
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show a perk only inside a business card and no credential tag.',
    nearestFrame: 'business-services-1280.png',
  },
});
