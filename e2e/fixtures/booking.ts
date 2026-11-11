import type { Page, Route } from '@playwright/test';

// A stand-in for the booking endpoints (L2-044 to L2-046). The requests the app makes are kept so
// a test can prove what it sent (ADR 0009).

export type BookingDelivery = 'ok' | 'fail' | 'hang' | 'unconfirmed' | 'day-gone';

export interface FakeBooking {
  delivery: BookingDelivery;
  /** Days (YYYY-MM-DD) the business does not meet, by weekday: 0 Sunday, 6 Saturday. */
  closedWeekdays: number[];
  area: string | null;
  availabilityAsked: { day: string; serviceId: string }[];
  sends: {
    listingSlug: string;
    serviceId: string;
    day: string | null;
    time: string | null;
    mode: string;
    note: string | null;
    idempotencyKey: string;
  }[];
}

export const SLOTS = ['09:00', '10:00', '13:30', '16:00', '19:00'];

const options = (area: string | null) => ({
  business: { name: 'Legacy Financial', slug: 'legacy-financial' },
  ownerFirstName: 'Trevor',
  meetsOn: 'Monday to Friday',
  meetingDays: [1, 2, 3, 4, 5],
  area,
  usuallyConfirms: 'within a day',
  maxDaysAhead: 180,
  services: [
    {
      id: 's-discovery',
      name: 'Discovery meeting',
      detail: '30 min',
      priceKind: 'free',
      priceCents: null,
    },
    {
      id: 's-rrsp',
      name: 'Retirement & RRSP review',
      detail: '60 min',
      priceKind: 'ask',
      priceCents: null,
    },
  ],
});

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubBooking(
  page: Page,
  initial: Partial<FakeBooking> = {},
): Promise<FakeBooking> {
  const fake: FakeBooking = {
    delivery: 'ok',
    closedWeekdays: [0, 6],
    area: 'North York',
    availabilityAsked: [],
    sends: [],
    ...initial,
  };

  await page.route('**/api/listings/legacy-financial/booking', (route) =>
    route.fulfill({ json: options(fake.area) }),
  );

  await page.route(/\/api\/listings\/legacy-financial\/availability\?.*/, (route) => {
    const url = new URL(route.request().url());
    const day = url.searchParams.get('day') ?? '';
    const serviceId = url.searchParams.get('serviceId') ?? '';
    fake.availabilityAsked.push({ day, serviceId });
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const open = !fake.closedWeekdays.includes(weekday);
    return route.fulfill({ json: { day, available: open, slots: open ? SLOTS : [] } });
  });

  await page.route('**/api/requests/bookings', (route: Route) => {
    const body = route.request().postDataJSON() as FakeBooking['sends'][number];
    switch (fake.delivery) {
      case 'hang':
        return new Promise<void>(() => void route);
      case 'fail':
        return route.abort('failed');
      case 'unconfirmed':
        return route.fulfill(problem(403, { code: 'EMAIL_UNCONFIRMED' }));
      case 'day-gone':
        return route.fulfill(
          problem(422, { code: 'validation_failed', errors: { day: 'DAY_UNAVAILABLE' } }),
        );
      default:
        fake.sends.push(body);
        return route.fulfill({
          status: 201,
          json: { id: 'r-booked', status: 'new', memberStatus: 'Sent' },
        });
    }
  });

  return fake;
}
