import type { Locator } from '@playwright/test';

/**
 * A part of a screen that is compared with the same part of its mock. `from` and `below`
 * bound the widths at which the part is on screen, so that a part missing from the app
 * fails the comparison instead of being skipped.
 */
export interface Region {
  name: string;
  locator: Locator;
  from?: number;
  below?: number;
}

export function shownAt(region: Region, width: number): boolean {
  return width >= (region.from ?? 0) && width < (region.below ?? Infinity);
}

/** What a page object offers the visual, responsive and accessibility sweeps. */
export interface Screen {
  /** Resolves when the screen has finished rendering its state. */
  ready(): Promise<void>;
  regions(): Region[];
}
