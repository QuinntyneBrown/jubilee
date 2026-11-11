import { parity } from '../../fixtures/parity';
import { ConversationPage } from '../../pages/messages.page';

// The mock keeps the page margin around the conversation and the app does not, at every width,
// so the composer is another width there: a difference of the page, left to the sweep
// (ADR 0036). "Send", which the composer draws itself, is the same size in both.
const widths = [1280] as const;

// jb-composer.
parity('composer', {
  cases: [
    {
      name: 'send',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: (screen: ConversationPage) => screen.send,
      widths,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no conversation.',
    nearestFrame: 'home-1280.png',
  },
});
