/** The cast of the mocks (docs/mocks/README.md): the member every buyer screen shows. */
export const joanna = {
  session: {
    signedIn: true,
    firstName: 'Joanna',
    displayName: 'Joanna Adeyemi',
    initials: 'JA',
  },
  navigation: {
    unreadConversationCount: 2,
    unreadNotificationCount: 3,
    newRequestCount: 0,
    ownsListing: false,
  },
} as const;

/** "Today is Tuesday 10 November 2026", in the morning, Toronto time. */
export const mockNow = new Date('2026-11-10T09:00:00-05:00');
