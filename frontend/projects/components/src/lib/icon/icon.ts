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
  template: `
    @for (shape of shapes(); track $index) {
      @switch (shape.kind) {
        @case ('path') {
          <svg:path [attr.d]="shape.d" />
        }
        @case ('circle') {
          <svg:circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" />
        }
        @case ('rect') {
          <svg:rect
            [attr.x]="shape.x"
            [attr.y]="shape.y"
            [attr.width]="shape.width"
            [attr.height]="shape.height"
            [attr.rx]="shape.rx"
          />
        }
      }
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
