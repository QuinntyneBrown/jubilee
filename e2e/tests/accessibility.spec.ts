import { accessibilityViolations } from '../fixtures/a11y';
import { expect, test, themes } from '../fixtures/jb-test';
import { screens } from '../fixtures/screens';
import { ShellPage } from '../pages/shell.page';

// Automated WCAG 2.2 AA check of every screen and state of the journey, on a phone and on a
// desktop, in both themes. It complements the keyboard criteria in the behaviour specs.
for (const { key, screen, below } of screens) {
  for (const theme of themes) {
    for (const width of [360, 1280].filter((w) => w < (below ?? Infinity))) {
      test(`${key} has no automated accessibility violations at ${width} px, ${theme}`, async ({
        page,
        jb,
      }) => {
        await new ShellPage(page).setWidth(width);
        await jb.open(key, { theme });
        await screen(page).ready();
        expect(await accessibilityViolations(page)).toEqual([]);
      });
    }
  }
}
