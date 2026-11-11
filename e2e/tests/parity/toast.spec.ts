import { parity } from '../../fixtures/parity';
import { ConversationPhotoRefusedScreen } from '../../pages/messages.page';

// jb-toast: the toast that stays until it is dismissed, with a title and a line of text. The
// other toast mocks carry sample words no state of the app says, and a toast that counts down
// draws a bar the mock holds still.
parity('toast', {
  cases: [
    {
      name: 'danger',
      route: 'conversation.photo-refused',
      screen: (page) => new ConversationPhotoRefusedScreen(page),
      region: (screen: ConversationPhotoRefusedScreen) => screen.refusal,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no toast.',
    nearestFrame: 'home-1280.png',
  },
});
