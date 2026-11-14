import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName, IconShape } from './icons';

/**
 * A decorative icon: `<svg jb-icon name="search"></svg>`. It is hidden from assistive
 * technology, so the control around it carries the name. An icon that carries a state of its own
 * is given a `label` and is an image of that name: `<svg jb-icon name="alert" label="Failed">`.
 */
@Component({
  selector: 'svg[jb-icon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'icon',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label()',
    viewBox: '0 0 24 24',
    '[class.icon--lg]': 'size() === "lg"',
    '[class.icon--sm]': 'size() === "sm"',
  },
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** The name of the state the icon carries; without one the icon is decorative. */
  readonly label = input<string | null>(null);
  protected readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
