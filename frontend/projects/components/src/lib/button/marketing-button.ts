import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The marketing site's call to action, a link drawn as a button:
 *
 *     <a jb-marketing-button [href]="browseUrl">Start browsing</a>
 *
 * `pill` is the small one of the navigation bar, `gold` the one on the ink band.
 */
@Component({
  selector: 'a[jb-marketing-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-btn',
    '[class.mkt-btn--pill]': 'variant() === "pill"',
    '[class.mkt-btn--gold]': 'variant() === "gold"',
  },
  templateUrl: './marketing-button.html',
  styleUrl: './marketing-button.scss',
})
export class MarketingButton {
  readonly variant = input<'default' | 'pill' | 'gold'>('default');
}
