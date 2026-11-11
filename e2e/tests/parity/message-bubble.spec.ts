import { parity } from '../../fixtures/parity';
import {
  BubbleRegion,
  ConversationPage,
  ConversationPhotoSendingScreen,
} from '../../pages/messages.page';

// On a phone the mock keeps the page margin around the conversation and the app does not, so a
// bubble wraps at another width there: a difference of the page, left to the sweep (ADR 0036).
const widths = [1280] as const;

// jb-message-bubble: the other side's and the member's own, with a photo, and on its way.
parity('message-bubble', {
  cases: [
    {
      name: 'theirs',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.bubble('Hi Joanna').root,
      widths,
    },
    {
      name: 'mine',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.bubble('Thank you!').root,
      widths,
    },
    {
      name: 'photo-mine',
      route: 'conversation.photo',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.bubble('Here’s the page').root,
      widths,
    },
    {
      name: 'photo-theirs',
      route: 'conversation.photo',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => new BubbleRegion(screen.bubbles.last()).root,
      widths,
    },
    {
      name: 'photo-pending',
      route: 'conversation.photo-sending',
      screen: (page) => new ConversationPhotoSendingScreen(page),
      region: (screen: ConversationPhotoSendingScreen) => screen.pending.root,
      widths,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no conversation.',
    nearestFrame: 'home-1280.png',
  },
});
