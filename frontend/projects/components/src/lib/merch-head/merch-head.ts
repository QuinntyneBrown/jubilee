import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The head of a piece of Jubilee merchandise: the kicker, the name with its one accent word, the
 * price with its currency, and what it is:
 *
 *     <div jb-merch-head kicker="Jubilee tee · Black" heading="Prosper with" accent="purpose."
 *       price="$25" currency="CAD" titleId="tee-title">Heavyweight black cotton…</div>
 */
@Component({
  selector: 'div[jb-merch-head]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'merch-head' },
  templateUrl: './merch-head.html',
  styleUrl: './merch-head.scss',
})
export class MerchHead {
  readonly kicker = input.required<string>();
  readonly heading = input.required<string>();
  readonly accent = input<string | null>(null);
  readonly price = input.required<string>();
  readonly currency = input('CAD');
  readonly titleId = input<string | null>(null);
}
