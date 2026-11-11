import { parity } from '../../fixtures/parity';
import { ConversationPage, ConversationPhotoAttachedScreen } from '../../pages/messages.page';

// On a phone the mock's tab bar lies over its composer, which the app keeps clear of it: a
// difference of the page, left to the sweep (ADR 0036).
const widths = [1280] as const;

// jb-attach-photo: the composer's photo control, empty and with a photo chosen.
parity('attach-photo', {
  cases: [
    {
      name: 'empty',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.attach,
      widths,
    },
    {
      name: 'with-photo',
      route: 'conversation.photo-attached',
      screen: (page) => new ConversationPhotoAttachedScreen(page),
      region: (screen: ConversationPhotoAttachedScreen) => screen.attach,
      widths,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no conversation and no photo control.',
    nearestFrame: 'home-1280.png',
  },
});
