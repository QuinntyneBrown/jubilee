import { expect, test } from '../fixtures/jb-test';
import { ShellPage } from '../pages/shell.page';

// Phase 2 proof: the Angular app, the dev proxy and the API started by
// eng/Start-E2eApi.ps1 work together.
test('the app loads and reaches the API', async ({ page, jb }) => {
  // Given the stack is running
  const session = page.waitForResponse('**/api/session');

  // When a visitor opens the app
  await jb.goto('/');

  // Then the API answers the session request and the app renders its main landmark
  expect((await session).status()).toBe(200);
  await expect(new ShellPage(page).main).toBeAttached();
});
