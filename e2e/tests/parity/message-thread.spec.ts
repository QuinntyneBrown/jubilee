import { parity } from '../../fixtures/parity';
import { ConversationPage } from '../../pages/messages.page';

// The mock keeps the page margin around the conversation and the app does not, at every width,
// so the head and the log are another width there: a difference of the page, left to the sweep
// (ADR 0036). The day between the messages is as wide as its text, and is compared here.
const widths = [1280] as const;

// jb-message-day, inside jb-message-thread.
parity('message-thread', {
  cases: [
    {
      name: 'day',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.days.last(),
      widths,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no conversation.',
    nearestFrame: 'home-1280.png',
  },
});
