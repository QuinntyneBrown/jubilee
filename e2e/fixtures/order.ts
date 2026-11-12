import type { Page, Route } from '@playwright/test';

// A stand-in for the order-request endpoints (L2-046). The requests the app makes are kept so a
// test can prove what it sent (ADR 0009).

export type OrderDelivery = 'ok' | 'fail' | 'hang' | 'unconfirmed' | 'address' | 'stock';

export interface FakeOrder {
  delivery: OrderDelivery;
  /** False when the order options cannot be read, so the dialog has nothing to offer. */
  optionsLoad: boolean;
  /** The address of the member's last shipped request, offered again. */
  lastAddress: string | null;
  freeShippingOverCents: number | null;
  usuallyReplies: string | null;
  leadTime: string | null;
  sends: {
    listingSlug: string;
    productSlug: string;
    option: string | null;
    quantity: number;
    deliveryMethodId: string;
    shippingAddress: string | null;
    note: string | null;
    idempotencyKey: string;
  }[];
}

export const SHIP_ID = 'd-ship';
export const PICKUP_ID = 'd-pickup';

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubOrder(page: Page, initial: Partial<FakeOrder> = {}): Promise<FakeOrder> {
  const fake: FakeOrder = {
    delivery: 'ok',
    optionsLoad: true,
    lastAddress: '48 Woodmount Ave, East York, ON M4C 3X8',
    freeShippingOverCents: 7500,
    usuallyReplies: 'within a few hours',
    leadTime: 'Made to order: ready in 5–7 days.',
    sends: [],
    ...initial,
  };

  await page.route(
    '**/api/listings/luzandre/products/faith-heavyweight-tee-charcoal/order',
    (route) =>
      route.fulfill(
        fake.optionsLoad
          ? {
              json: {
                shop: { name: 'Luzandre.com', slug: 'luzandre' },
                ownerFirstName: 'Naomi',
                usuallyReplies: fake.usuallyReplies,
                leadTime: fake.leadTime,
                product: {
                  id: 'a82b0ff9-76cc-47df-869f-94df0b624e7c',
                  slug: 'faith-heavyweight-tee-charcoal',
                  name: 'Faith heavyweight tee, charcoal',
                  priceCents: 3400,
                  perUnit: false,
                  optionName: 'Size',
                  options: [
                    { label: 'S', maxQuantity: 8 },
                    { label: 'M', maxQuantity: 20 },
                    { label: 'L', maxQuantity: 99 },
                    { label: 'XL', maxQuantity: 0 },
                    { label: '2XL', maxQuantity: 99 },
                  ],
                  minimumQuantity: 1,
                  maxQuantity: 99,
                  tile: { tint: 'ink', icon: 'shirt' },
                },
                deliveryMethods: [
                  {
                    id: SHIP_ID,
                    kind: 'ship',
                    label: 'Ship to me',
                    detail: 'Canada Post, $9 flat · 3–6 business days',
                    feeCents: 900,
                  },
                  {
                    id: PICKUP_ID,
                    kind: 'pickup',
                    label: 'Pick up in Leslieville',
                    detail: 'Free · Naomi sends the address when it’s ready',
                    feeCents: 0,
                  },
                ],
                freeShippingOverCents: fake.freeShippingOverCents,
                lastShippingAddress: fake.lastAddress,
              },
            }
          : problem(503, { code: 'unavailable' }),
      ),
  );

  await page.route('**/api/requests/orders', (route: Route) => {
    const body = route.request().postDataJSON() as FakeOrder['sends'][number];
    switch (fake.delivery) {
      case 'hang':
        return new Promise<void>(() => void route);
      case 'fail':
        return route.abort('failed');
      case 'unconfirmed':
        return route.fulfill(problem(403, { code: 'EMAIL_UNCONFIRMED' }));
      case 'address':
        return route.fulfill(
          problem(422, { code: 'validation_failed', errors: { shippingAddress: 'REQUIRED' } }),
        );
      case 'stock':
        return route.fulfill(
          problem(422, { code: 'validation_failed', errors: { quantity: 'ONLY_LEFT:1' } }),
        );
      default:
        fake.sends.push(body);
        return route.fulfill({
          status: 201,
          json: { id: 'r-order', status: 'new', memberStatus: 'Awaiting reply' },
        });
    }
  });

  return fake;
}
