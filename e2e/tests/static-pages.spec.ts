import { expect, test } from '../fixtures/jb-test';
import { routes } from '../fixtures/routes';
import { StaticPage } from '../pages/static-page';

// The static copies of the server error and maintenance pages (L2-115 AC3, L2-117 AC1, ADR 0056). The app's host
// serves them with 500 and 503 and writes the reference and the back-by time in (eng/azure/server.test.js); here
// they are opened as built, to prove what a person sees: the copy, a way forward, Archivo, and no script.

test.describe('static pages for a page load the app cannot answer', () => {
  test('L2-115 AC3: the server error page says what happened, offers Try again and Get help, and shows a reference', async ({
    page,
  }) => {
    const error = new StaticPage(page);
    await error.goto(routes['static-server-error'].app);

    await expect(error.heading).toHaveText('Something went wrong on our side');
    await expect(error.text).toHaveText(
      'Your messages and requests are safe. Try again in a minute; if it keeps happening, tell us and quote the reference below.',
    );
    await expect(error.tryAgain).toHaveAttribute('href', '');
    await expect(error.getHelp).toHaveAttribute('href', '/help');
    await expect(error.reference).toHaveText(/^JB-500-[A-Z0-9]{4}$/);
    await expect(error.brand).toHaveAttribute('href', '/');
  });

  test('L2-117 AC1: the maintenance page says Jubilee is being updated and nothing is lost, with Check again', async ({
    page,
  }) => {
    const maintenance = new StaticPage(page);
    await maintenance.goto(routes['static-maintenance'].app);

    await expect(maintenance.heading).toHaveText('Jubilee is being updated');
    await expect(maintenance.text).toHaveText(
      'We’ll be back shortly. Nothing you’ve sent is lost.',
    );
    await expect(maintenance.checkAgain).toHaveAttribute('href', '');
  });

  for (const key of ['static-server-error', 'static-maintenance'] as const) {
    test(`${key}: carries no script and draws its heading in the bundled Archivo`, async ({
      page,
    }) => {
      const shown = new StaticPage(page);
      await shown.goto(routes[key].app);

      await expect(shown.scripts).toHaveCount(0);
      const font = await shown.headingFont();
      expect(font.family).toMatch(/^"?Archivo"?/);
      expect(font.loaded).toBe(true);
    });
  }
});
