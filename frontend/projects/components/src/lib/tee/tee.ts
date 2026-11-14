import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The Purpose Tee drawn flat, front or back, with its print (ADR 0073):
 *
 *     <svg jb-tee view="back" label="The Purpose Tee from the back: …"></svg>
 *
 * With a `label` it is an image with that name; without one it is decoration, hidden from
 * assistive technology. The garment colours are the garment tokens, the same in both themes.
 */
@Component({
  selector: 'svg[jb-tee]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tee',
    viewBox: '0 0 600 700',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label()',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.focusable]': 'label() ? null : "false"',
  },
  templateUrl: './tee.html',
  styleUrl: './tee.scss',
})
export class Tee {
  readonly view = input<'front' | 'back'>('front');
  readonly label = input<string | null>(null);
  /** The collar dips at the front and sits high at the back. */
  protected readonly collar = computed(() => (this.view() === 'front' ? 'Q300 122' : 'Q300 64'));
}
