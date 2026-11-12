import type { Page, Route } from '@playwright/test';
import { meetsOn } from './catalogue';

// A stand-in for the booking endpoints (L2-044 to L2-046). The requests the app makes are kept so
// a test can prove what it sent (ADR 0009).

export type BookingDelivery = 'ok' | 'fail' | 'hang' | 'unconfirmed' | 'day-gone';

export interface FakeBooking {
  delivery: BookingDelivery;
  /** Days (YYYY-MM-DD) the business does not meet, by weekday: 0 Sunday, 6 Saturday. */
  closedWeekdays: number[];
  area: string | null;
  /** The owner's saved meeting hours (L2-220); without them the default times are offered. */
  hours: { days: number[]; opensAt: string; closesAt: string; slotMinutes: number } | null;
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

const LENGTHS: Record<string, number> = { 's-discovery': 30, 's-rrsp': 60 };

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/** The times of a day inside saved hours, as the API computes them: every slot length while the meeting ends by closing. */
function slotsInside(hours: NonNullable<FakeBooking['hours']>, serviceId: string): string[] {
  const slots: string[] = [];
  const length = LENGTHS[serviceId] ?? 30;
  for (
    let start = minutes(hours.opensAt);
    start + length <= minutes(hours.closesAt);
    start += hours.slotMinutes
  ) {
    slots.push(
      `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
    );
  }
  return slots;
}

const options = (area: string | null, days: number[]) => ({
  business: { name: 'Legacy Financial', slug: 'legacy-financial' },
  ownerFirstName: 'Trevor',
  meetsOn: meetsOn(days),
  meetingDays: days,
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
    hours: null,
    availabilityAsked: [],
    sends: [],
    ...initial,
  };

  await page.route('**/api/listings/legacy-financial/booking', (route) =>
    route.fulfill({ json: options(fake.area, fake.hours?.days ?? [1, 2, 3, 4, 5]) }),
  );

  await page.route(/\/api\/listings\/legacy-financial\/availability\?.*/, (route) => {
    const url = new URL(route.request().url());
    const day = url.searchParams.get('day') ?? '';
    const serviceId = url.searchParams.get('serviceId') ?? '';
    fake.availabilityAsked.push({ day, serviceId });
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const open = fake.hours
      ? fake.hours.days.includes(weekday)
      : !fake.closedWeekdays.includes(weekday);
    const slots = fake.hours ? slotsInside(fake.hours, serviceId) : SLOTS;
    return route.fulfill({ json: { day, available: open, slots: open ? slots : [] } });
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
