import { expect, test, themes, widths } from '../fixtures/jb-test';
import { screens } from '../fixtures/screens';
import { ShellPage } from '../pages/shell.page';

// L2-163 criterion 1 and L2-162: every screen and state of the journey, at the five widths in
// both themes, scrolls in one direction only and keeps its controls large enough to touch.
for (const { key, screen, below } of screens) {
  for (const theme of themes) {
    for (const width of widths.filter((w) => w < (below ?? Infinity))) {
      test(`${key} fits ${width} px, ${theme}`, async ({ page, jb }) => {
        const shell = new ShellPage(page);
        await shell.setWidth(width);
        await jb.open(key, { theme });
        await screen(page).ready();

        expect(await shell.overflowsHorizontally(), 'no horizontal overflow').toBe(false);
        expect(await shell.targetsSmallerThanMinimum(), 'targets of at least 24 px').toEqual([]);
        if (width < 768) {
          expect(
            await shell.primaryControlsSmallerThan(44),
            'primary controls of at least 44 px on a phone',
          ).toEqual([]);
        }
      });
    }
  }
}
