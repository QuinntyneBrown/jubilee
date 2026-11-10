import type { Page } from '@playwright/test';
import type { StubName } from './routes';

/** Installs the API answers that put a screen in a state the seeded data cannot produce. */
export async function applyStub(page: Page, name: StubName): Promise<void> {
  throw new Error(`No stub is defined for "${name}" on ${page.url()}`);
}
