import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName, IconShape } from './icons';

/**
 * A decorative icon: `<svg jb-icon name="search"></svg>`. It is hidden from assistive
 * technology, so the control around it carries the name.
 */
@Component({
  selector: 'svg[jb-icon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'icon',
    'aria-hidden': 'true',
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
  protected readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
