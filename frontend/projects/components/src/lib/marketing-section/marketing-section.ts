import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The ground of a marketing section: cream paper, the white surface or the ink band. */
export type MarketingSectionTone = 'paper' | 'surface' | 'ink';

/**
 * How a marketing section lays out what is projected into it:
 * `stack` one under the other; `opening` the heading beside a picture; `film` a heading over a
 * film, close under the opening; `split` a heading beside a list; `pitch` a heading with its
 * action beside a list; `closing` centred, with room around it.
 */
export type MarketingSectionLayout = 'stack' | 'opening' | 'film' | 'split' | 'pitch' | 'closing';

/**
 * A section of the marketing page, at the page's width with its gutters:
 *
 *     <section jb-marketing-section id="why" layout="split" divided aria-labelledby="why-title">
 *       <jb-marketing-heading headingId="why-title" text="Trust," accent="built in." />
 *       <ul jb-rule-list>…</ul>
 *     </section>
 *
 * On `ink` the focus ring, the heading's accent and its lead take the colours that read on ink.
 * It reads the marketing page's grounds: --jb-mkt-ink, --jb-mkt-paper, --jb-mkt-max,
 * --jb-mkt-gutter.
 */
@Component({
  selector: 'section[jb-marketing-section]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-section',
    '[class.mkt-section--surface]': 'tone() === "surface"',
    '[class.mkt-section--ink]': 'tone() === "ink"',
    '[class.mkt-section--divided]': 'divided()',
    '[class.mkt-section--opening]': 'layout() === "opening"',
    '[class.mkt-section--film]': 'layout() === "film"',
    '[class.mkt-section--split]': 'layout() === "split"',
    '[class.mkt-section--pitch]': 'layout() === "pitch"',
    '[class.mkt-section--closing]': 'layout() === "closing"',
  },
  templateUrl: './marketing-section.html',
  styleUrl: './marketing-section.scss',
})
export class MarketingSection {
  readonly tone = input<MarketingSectionTone>('paper');
  readonly layout = input<MarketingSectionLayout>('stack');
  /** A hairline above the section, where it follows another on the same ground. */
  readonly divided = input(false, { transform: booleanAttribute });
}
