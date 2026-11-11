import type { Locator, Page } from '@playwright/test';
import { BASELINE, expect, test, themes } from './jb-test';
import type { RouteKey } from './routes';
import type { Screen } from './visual';

/**
 * Component parity (ADR 0035): a component of the `components` library is compared, region by
 * region, with the same region of its mock and with the Magic Patterns design reference.
 *
 * `npm run parity` runs the specs of `tests/parity/` twice. With JB_PARITY=mocks they render the
 * mocks, and the crops of the reference images, into `__baselines__/parity/`; with JB_PARITY=app
 * they render the app and compare. Nothing here is part of `npm test`.
 */

/** The widths a component is compared at: the phone and the desktop layout. */
export const parityWidths = [360, 1280] as const;
export type ParityWidth = (typeof parityWidths)[number];

/** Share of differing pixels above which the comparison with the mock fails (ADR 0005). */
const MOCK_THRESHOLD = 0.01;
/** Share of differing pixels above which the comparison with the Magic Patterns design fails. */
const REFERENCE_THRESHOLD = 0.03;
/** Where the mocks server (`http-server ../docs`) serves the reference images. */
const REFERENCE_URL = 'http://localhost:4300/design-reference/magic-patterns';

/** One variant or state of the component, on the screen state that shows it. */
export interface ParityCase<T extends Screen = Screen> {
  /** Names the variant in the test title and in the baseline file. */
  name: string;
  /** The screen state, in the app and in the mocks. */
  route: RouteKey;
  /** The page object that knows the screen. */
  screen: (page: Page) => T;
  /** The component's region, from the page object: a spec holds no selector. */
  region: (screen: T) => Locator;
  /** The widths the region is on screen at, when it is not both. */
  widths?: readonly ParityWidth[];
  /**
   * What a member does to reach the state in the app, through the page object, when the state
   * has no address of its own (a form submitted with errors). The mock is already in the state.
   */
  arrange?: (screen: T) => Promise<void>;
}

/** The crop of a reference image that shows one case of the component. The reference is light only. */
export interface ReferenceCrop {
  /** The `name` of the case the crop is compared with. */
  case: string;
  width: ParityWidth;
  /** A file of `docs/design-reference/magic-patterns/`. */
  frame: string;
  clip: { x: number; y: number; width: number; height: number };
  /**
   * Set while the design system and the mocks still differ from the reference here: what
   * differs, as listed in `docs/design-reference/magic-patterns/README.md`. The comparison is
   * then reported as a known failure (`fixme`) instead of failing the run. The threshold stays;
   * the entry goes when the design system and the mock are corrected.
   */
  knownDifference?: string;
}

/**
 * What the Magic Patterns design shows of the component: the crops to compare with, or, when
 * the reference does not show the component, why and which frame is nearest.
 */
export type Reference = { crops: ReferenceCrop[] } | { absent: string; nearestFrame: string };

export interface ParityOptions {
  // Each case names its own page object, so the list is heterogeneous.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cases: ParityCase<any>[];
  reference: Reference;
}

/** Brings the region to the middle of the viewport, clear of the fixed bars at its edges. */
async function centre(region: Locator): Promise<void> {
  await region
    .first()
    .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

function baselineOf(component: string, file: string): string[] {
  return ['parity', component, file];
}

/** Declares the parity tests of one component. Call it once, at the top level of its spec. */
export function parity(component: string, { cases, reference }: ParityOptions): void {
  test.describe(`${component} parity`, () => {
    for (const item of cases) {
      for (const width of item.widths ?? parityWidths) {
        for (const theme of themes) {
          test(`${item.name} matches its mock at ${width} px, ${theme}`, async ({ page, jb }) => {
            if ('absent' in reference) {
              test.info().annotations.push({
                type: 'magic-patterns',
                description: `${reference.absent} Nearest frame: ${reference.nearestFrame}. Compared with the mock only.`,
              });
            }
            await page.setViewportSize({ width, height: 800 });
            await jb.open(item.route, { theme });
            const screen = item.screen(page);
            await screen.ready();
            if (!BASELINE) await item.arrange?.(screen);
            await centre(item.region(screen));
            await expect(item.region(screen), `${item.name} of ${component}`).toHaveScreenshot(
              baselineOf(component, `${item.name}-${width}-${theme}.png`),
              { maxDiffPixelRatio: MOCK_THRESHOLD },
            );
          });
        }
      }
    }

    if ('absent' in reference) return;
    for (const crop of reference.crops) {
      const item = cases.find((candidate) => candidate.name === crop.case);
      if (!item) throw new Error(`${component}: no parity case named "${crop.case}"`);
      const file = `${crop.case}-${crop.width}-magic-patterns.png`;

      test(`${crop.case} matches the Magic Patterns design at ${crop.width} px`, async ({
        page,
        jb,
      }) => {
        if (BASELINE) {
          // The baseline of this comparison is the crop of the committed reference image.
          await page.setViewportSize({ width: crop.width, height: 800 });
          await page.setContent(
            `<body style="margin:0"><img src="${REFERENCE_URL}/${crop.frame}" style="display:block;max-width:none"></body>`,
            { waitUntil: 'load' },
          );
          await expect(page).toHaveScreenshot(baselineOf(component, file), {
            fullPage: true,
            clip: crop.clip,
          });
          return;
        }
        test.fixme(!!crop.knownDifference, crop.knownDifference);
        await page.setViewportSize({ width: crop.width, height: 800 });
        await jb.open(item.route, { theme: 'light' });
        const screen = item.screen(page);
        await screen.ready();
        await item.arrange?.(screen);
        await centre(item.region(screen));
        // The reference was captured on one platform; text set in the same face can land a pixel
        // or two narrower on another. Compare the crop's footprint from the region's corner, so
        // that difference counts against the threshold instead of failing on the image size.
        const box = await item.region(screen).first().boundingBox();
        if (!box) throw new Error(`${crop.case} of ${component} is not on screen.`);
        await expect(page, `${crop.case} of ${component} against ${crop.frame}`).toHaveScreenshot(
          baselineOf(component, file),
          {
            clip: { x: box.x, y: box.y, width: crop.clip.width, height: crop.clip.height },
            maxDiffPixelRatio: REFERENCE_THRESHOLD,
          },
        );
      });
    }
  });
}
