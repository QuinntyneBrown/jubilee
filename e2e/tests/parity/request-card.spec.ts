import { parity } from '../../fixtures/parity';
import { ConversationPage, ConversationRequestsScreen } from '../../pages/messages.page';

// On a phone the mock keeps the page margin around the conversation and the app does not, so a
// card is another width there: a difference of the page, left to the sweep (ADR 0036).
const widths = [1280] as const;

const card = (title: string) => (screen: ConversationPage) => screen.card(title).root;

// jb-request-card: a booking, a quote and an order, in each status that has its own colour.
parity('request-card', {
  cases: [
    {
      name: 'confirmed',
      route: 'conversation',
      screen: (page) => new ConversationPage(page),
      region: card('Discovery meeting'),
      widths,
    },
    {
      name: 'awaiting-reply',
      route: 'conversation.requests',
      screen: (page) => new ConversationRequestsScreen(page),
      region: card('Discovery meeting'),
      widths,
    },
    {
      name: 'quote',
      route: 'conversation.requests',
      screen: (page) => new ConversationRequestsScreen(page),
      region: card('A plan for giving'),
      widths,
    },
    {
      name: 'declined',
      route: 'conversation.requests',
      screen: (page) => new ConversationRequestsScreen(page),
      region: card('Retirement planning workbook'),
      widths,
    },
    {
      name: 'cancelled',
      route: 'conversation.requests',
      screen: (page) => new ConversationRequestsScreen(page),
      region: card('Follow-up meeting'),
      widths,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no conversation and no request.',
    nearestFrame: 'home-1280.png',
  },
});
