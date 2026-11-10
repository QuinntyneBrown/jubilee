import { expect, test, themes, widths } from '../../fixtures/jb-test';
import { screens } from '../../fixtures/screens';
import { shownAt } from '../../fixtures/visual';

// L2-163 criterion 2: each screen is compared with its mock, region by region, at five widths
// in both themes. With JB_BASELINE=1 this spec renders the mocks and writes the baselines;
// without it, it renders the app and compares (ADR 0005).
for (const { key, screen } of screens) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`${key} matches its mock at ${width} px, ${theme}`, async ({ page, jb }) => {
        await page.setViewportSize({ width, height: 800 });
        await jb.open(key, { theme });
        const view = screen(page);
        await view.ready();

        for (const region of view.regions().filter((r) => shownAt(r, width))) {
          await expect
            .soft(region.locator, `${region.name} of ${key}`)
            .toHaveScreenshot([key, `${region.name}-${width}-${theme}.png`]);
        }
      });
    }
  }
}
