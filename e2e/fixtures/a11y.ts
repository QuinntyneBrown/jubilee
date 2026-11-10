import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Runs the automated WCAG 2.2 AA checks and returns the violations in a readable form. */
export async function accessibilityViolations(page: Page): Promise<string[]> {
  // axe-core's adapter is typed against its own Playwright release; the page is the same.
  const results = await new AxeBuilder({ page: page as never })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
  );
}
