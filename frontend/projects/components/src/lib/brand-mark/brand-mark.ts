import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The J T mark that precedes the wordmark: `<svg jb-brand-mark></svg>`. */
@Component({
  selector: 'svg[jb-brand-mark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'brand-mark', 'aria-hidden': 'true', viewBox: '0 0 100 100' },
  templateUrl: './brand-mark.html',
})
export class BrandMark {}
