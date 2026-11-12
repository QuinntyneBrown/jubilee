import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The marketing site's call to action, a link drawn as a button:
 *
 *     <a jb-marketing-button [href]="browseUrl">Start browsing</a>
 *
 * `pill` is the small one of the navigation bar, `gold` the one on the ink band. On a `<button>`
 * it sends a form; `busy` marks it while the form is on its way: a spinner beside its label and
 * `aria-busy="true"` (L2-127).
 */
@Component({
  selector: 'a[jb-marketing-button], button[jb-marketing-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-btn',
    '[class.mkt-btn--pill]': 'variant() === "pill"',
    '[class.mkt-btn--gold]': 'variant() === "gold"',
    '[attr.aria-busy]': 'busy() ? "true" : null',
  },
  templateUrl: './marketing-button.html',
  styleUrl: './marketing-button.scss',
})
export class MarketingButton {
  readonly variant = input<'default' | 'pill' | 'gold'>('default');
  readonly busy = input(false, { transform: booleanAttribute });
}
