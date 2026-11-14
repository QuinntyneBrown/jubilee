import type { Page, Route } from '@playwright/test';

// A stand-in for the merchandise endpoints (L1-034, ADR 0009). The product is what the seeded API
// answers; the checkouts the app sends are kept so a test can prove what it sent. The provider's
// hosted page is answered on localhost: a test never leaves it.

export interface MerchSizeData {
  sku: string;
  label: string;
  ages: string | null;
  chest: number;
  length: number;
  left: number | null;
}

export interface MerchFitData {
  key: 'youth' | 'womens' | 'mens';
  name: string;
  note: string;
  guideNote: string;
  sizes: MerchSizeData[];
}

export interface MerchProductData {
  name: string;
  colour: string;
  unitPriceCents: number;
  currency: string;
  shippingCents: number;
  freeShippingFromCents: number;
  fits: MerchFitData[];
}

const size = (
  fit: string,
  label: string,
  chest: number,
  length: number,
  left: number | null = null,
  ages: string | null = null,
): MerchSizeData => ({ sku: `${fit}-${label}`, label, ages, chest, length, left });

/** The Purpose Tee as the seeded API answers it (MerchCatalogue). */
export function purposeTee(): MerchProductData {
  return {
    name: 'Purpose Tee',
    colour: 'Black',
    unitPriceCents: 2500,
    currency: 'CAD',
    shippingCents: 900,
    freeShippingFromCents: 6000,
    fits: [
      {
        key: 'youth',
        name: 'Youth',
        note: 'Kids’ cut for ages 4–16. Same print, scaled to fit a smaller chest.',
        guideNote: 'Between sizes? Size up; they grow.',
        sizes: [
          size('youth', 'XS', 15, 20, null, '4–5'),
          size('youth', 'S', 16, 22, null, '6–8'),
          size('youth', 'M', 17, 24, null, '10–12'),
          size('youth', 'L', 18, 26, 3, '14–16'),
          size('youth', 'XL', 19, 27, 0, '18–20'),
        ],
      },
      {
        key: 'womens',
        name: 'Women’s',
        note: 'Slim through the body with a slightly shorter length. For a relaxed look, size up or choose Men’s.',
        guideNote: 'Slim fit.',
        sizes: [
          size('womens', 'XS', 16.5, 25),
          size('womens', 'S', 17.5, 25.75),
          size('womens', 'M', 18.5, 26.5),
          size('womens', 'L', 19.5, 27.25),
          size('womens', 'XL', 20.5, 28, 2),
          size('womens', '2XL', 21.5, 28.75),
        ],
      },
      {
        key: 'mens',
        name: 'Men’s',
        note: 'Classic straight fit, true to size. Unisex, so it suits anyone who likes a roomier tee.',
        guideNote: 'Classic fit.',
        sizes: [
          size('mens', 'S', 18, 28),
          size('mens', 'M', 20, 29),
          size('mens', 'L', 22, 30),
          size('mens', 'XL', 24, 31),
          size('mens', '2XL', 26, 32),
          size('mens', '3XL', 28, 33, 2),
        ],
      },
    ],
  };
}

/** Every size of a fit sold out (L2-264 AC6). */
export function youthSoldOut(): MerchProductData {
  const product = purposeTee();
  product.fits[0].sizes = product.fits[0].sizes.map((s) => ({ ...s, left: 0 }));
  return product;
}

export type CheckoutAnswer = 'ok' | 'invalid' | 'unavailable' | 'failed' | 'rate-limited' | 'hang';

export interface MerchOrderData {
  number: string;
  status: 'pending' | 'paid' | 'expired';
  delivery: 'ship' | 'pickup';
  lines: { fit: string; size: string; quantity: number }[];
  totalCents: number;
}

export interface FakeMerch {
  product: MerchProductData;
  productAnswer: 'ok' | 'error' | 'hang';
  checkout: CheckoutAnswer;
  /** The codes per field of a 422 (L2-267 AC3). */
  invalid: Record<string, string>;
  /** The bodies of the checkouts the app sent. */
  checkouts: {
    lines: { sku: string; quantity: number; unitPriceCents: number }[];
    delivery: string;
  }[];
  /** The order the return page reads, one answer per read; the last repeats. */
  orders: (MerchOrderData | 'missing' | 'error' | 'hang')[];
  orderReads: number;
}

/** Where the stand-in for the provider's hosted page lives, on localhost. */
export const HOSTED_CHECKOUT = '/stripe-checkout/cs_test_e2e';

export const PAID_ORDER: MerchOrderData = {
  number: 'PT-4F7K2Q',
  status: 'paid',
  delivery: 'ship',
  lines: [
    { fit: 'Men’s', size: 'L', quantity: 1 },
    { fit: 'Women’s', size: 'M', quantity: 1 },
  ],
  totalCents: 6667,
};

const problem = (status: number, body: object, headers: Record<string, string> = {}) => ({
  status,
  headers,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const pending = (): Promise<void> => new Promise(() => undefined);

export async function stubMerch(page: Page, initial: Partial<FakeMerch> = {}): Promise<FakeMerch> {
  const fake: FakeMerch = {
    product: purposeTee(),
    productAnswer: 'ok',
    checkout: 'ok',
    invalid: {},
    checkouts: [],
    orders: [PAID_ORDER],
    orderReads: 0,
    ...initial,
  };

  await page.route('**/api/merch/purpose-tee', async (route: Route) => {
    if (fake.productAnswer === 'hang') return pending();
    return route.fulfill(
      fake.productAnswer === 'error'
        ? problem(503, { code: 'service_unavailable', reference: 'JB-MERCH-503' })
        : { json: fake.product },
    );
  });

  await page.route('**/api/merch/checkout', async (route: Route) => {
    fake.checkouts.push(route.request().postDataJSON() as FakeMerch['checkouts'][number]);
    switch (fake.checkout) {
      case 'hang':
        return pending();
      case 'invalid':
        return route.fulfill(problem(422, { code: 'validation_failed', errors: fake.invalid }));
      case 'unavailable':
        return route.fulfill(problem(503, { code: 'checkout_unavailable' }));
      case 'failed':
        return route.fulfill(problem(503, { code: 'checkout_failed', reference: 'JB-MERCH-503' }));
      case 'rate-limited':
        return route.fulfill(problem(429, { code: 'rate_limited' }, { 'Retry-After': '720' }));
      default:
        return route.fulfill({
          status: 201,
          json: { url: `http://localhost:4200${HOSTED_CHECKOUT}` },
        });
    }
  });

  await page.route('**/api/merch/orders/*', async (route: Route) => {
    const answer = fake.orders[Math.min(fake.orderReads, fake.orders.length - 1)];
    fake.orderReads++;
    if (answer === 'hang') return pending();
    if (answer === 'missing') return route.fulfill(problem(404, { code: 'order_not_found' }));
    if (answer === 'error')
      return route.fulfill(
        problem(503, { code: 'service_unavailable', reference: 'JB-MERCH-503' }),
      );
    return route.fulfill({ json: answer });
  });

  // The provider's hosted page, stood in for on localhost (L2-267 AC1).
  await page.route(`**${HOSTED_CHECKOUT}`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Stripe Checkout</title><main id="main">Stripe</main>',
    }),
  );

  return fake;
}

/** A bag already on the device (L2-266 AC4), written before the app starts. */
export async function seedBag(
  page: Page,
  lines: { sku: string; fit: string; size: string; quantity: number; unitPriceCents?: number }[],
): Promise<void> {
  await page.addInitScript(
    (value) => {
      if (!sessionStorage.getItem('jb-bag-seeded')) {
        localStorage.setItem('jubilee.bag', value);
        sessionStorage.setItem('jb-bag-seeded', '1');
      }
    },
    JSON.stringify(lines.map((l) => ({ unitPriceCents: 2500, ...l }))),
  );
}

/** What the device keeps of the bag. */
export function storedBag(page: Page): Promise<unknown> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('jubilee.bag') ?? '[]'));
}
