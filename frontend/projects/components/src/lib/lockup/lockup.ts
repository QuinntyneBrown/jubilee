import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandMark } from '../brand-mark/brand-mark';

export type LockupSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * The J mark and the lowercase wordmark, on a link or on text:
 *
 *     <a jb-lockup routerLink="/welcome"></a>
 *     <span jb-lockup size="xl" onInk></span>
 *
 * `md` is the brand link of the bare pages and of the top bar. `lg` (48 px) and `xl` (52 px)
 * are the lockup of the Log in and Sign up screens, `sm` (24 px) and `xs` (22 px) the lockup of
 * the marketing site's bar and footer: those four have the mark at 1.1em, as the Magic Patterns
 * design draws it.
 * `onInk` is for the brand panel, which is ink in both themes. What the lockup holds follows the
 * wordmark: the admin bar puts its "admin" tag there.
 */
@Component({
  selector: 'a[jb-lockup], span[jb-lockup]',
  imports: [BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lockup',
    '[class.lockup--xs]': 'size() === "xs"',
    '[class.lockup--sm]': 'size() === "sm"',
    '[class.lockup--lg]': 'size() === "lg"',
    '[class.lockup--xl]': 'size() === "xl"',
    '[class.lockup--on-ink]': 'onInk()',
  },
  templateUrl: './lockup.html',
  styleUrl: './lockup.scss',
})
export class Lockup {
  readonly size = input<LockupSize>('md');
  /** On the ink of a brand panel or band. */
  readonly onInk = input(false, { transform: booleanAttribute });
}
