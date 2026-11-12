export interface NavigationSummary {
  unreadConversationCount: number;
  unreadNotificationCount: number;
  newRequestCount: number;
  ownsListing: boolean;
}

/** The cast of the mocks (docs/mocks/README.md): the member every buyer screen shows. */
export const joanna = {
  session: {
    signedIn: true,
    firstName: 'Joanna',
    displayName: 'Joanna Adeyemi',
    initials: 'JA',
    // The mocks' story: Joanna is also signed in on one other device (L2-011 AC4).
    otherSessionCount: 1,
  },
  navigation: {
    unreadConversationCount: 2,
    unreadNotificationCount: 3,
    newRequestCount: 0,
    ownsListing: false,
  } satisfies NavigationSummary as NavigationSummary,
};

/** "Today is Tuesday 10 November 2026", in the morning, Toronto time. */
export const mockNow = new Date('2026-11-10T09:00:00-05:00');
