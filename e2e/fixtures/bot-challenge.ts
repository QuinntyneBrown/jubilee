import type { Page } from '@playwright/test';

/**
 * Stands in for Cloudflare Turnstile (L2-137 AC2, ADR 0061): the script renders nothing and hands
 * each widget on the page the next of `tokens`, at first and after each reset of that widget, as
 * Turnstile gives each widget its own. No test reaches Cloudflare. Resolves with a count of the
 * times the script was loaded.
 */
export async function stubChallenge(page: Page, tokens: string[]): Promise<() => number> {
  let requests = 0;
  await page.route('https://challenges.cloudflare.com/**', (route) => {
    requests++;
    return route.fulfill({
      contentType: 'text/javascript',
      body: `(() => {
        const widgets = [];
        const next = (id) => widgets[id].callback(widgets[id].tokens.shift());
        window.turnstile = {
          render: (_el, options) => {
            const id = widgets.push({ callback: options.callback, tokens: ${JSON.stringify(tokens)} }) - 1;
            next(id);
            return id;
          },
          reset: (id) => next(id),
          remove: () => {},
        };
      })();`,
    });
  });
  return () => requests;
}

/** The settings of the launch forms with a bot challenge configured (L2-218 AC5). */
export async function stubLaunchChallenge(page: Page): Promise<void> {
  await page.route('**/api/launch', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { botChallengeSiteKey: 'site-key' } })
      : route.fallback(),
  );
}
