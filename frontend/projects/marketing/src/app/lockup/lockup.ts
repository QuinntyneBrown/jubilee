import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The J mark and the lowercase wordmark, on a link or a span:
 * `<a jb-lockup href="#top"></a>`, `<span jb-lockup size="sm" onInk></span>`.
 */
@Component({
  selector: '[jb-lockup]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-lockup',
    '[class.mkt-lockup--sm]': 'size() === "sm"',
    '[class.mkt-lockup--on-ink]': 'onInk()',
  },
  templateUrl: './lockup.html',
})
export class Lockup {
  readonly size = input<'md' | 'sm'>('md');
  readonly onInk = input(false, { transform: booleanAttribute });
}
