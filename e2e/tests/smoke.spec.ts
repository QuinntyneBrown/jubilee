import { expect, test } from '../fixtures/jb-test';
import { ShellPage } from '../pages/shell.page';

// The app loads with its API requests answered by Playwright API mocking (ADR 0009).
test('the app loads and its session request is answered', async ({ page, jb }) => {
  // Given the app is running
  const session = page.waitForResponse('**/api/session');

  // When a visitor opens the app
  await jb.goto('/');

  // Then the session request is answered and the app renders its main landmark
  expect((await session).status()).toBe(200);
  await expect(new ShellPage(page).main).toBeAttached();
});
