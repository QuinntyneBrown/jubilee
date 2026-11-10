import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The J T mark that precedes the wordmark: `<svg jb-brand-mark></svg>`. */
@Component({
  selector: 'svg[jb-brand-mark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'brand-mark', 'aria-hidden': 'true', viewBox: '0 0 100 100' },
  template: `
    <svg:path class="brand-mark__j" d="M60 8V60A20 20 0 0 1 20 60V38" />
    <svg:path class="brand-mark__bar" d="M36 27H84" />
  `,
})
export class BrandMark {}
