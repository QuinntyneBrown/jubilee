import { CdkMenuItemRadio } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * One choice of several in a `jb-menu`, such as the rows per page:
 *
 *     <button jb-menu-radio [checked]="size() === 50" (chosen)="show(50)">50</button>
 *
 * It is a `menuitemradio` whose `aria-checked` says whether it is the choice, drawn with a check.
 */
@Component({
  selector: 'button[jb-menu-radio]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: CdkMenuItemRadio,
      inputs: ['cdkMenuItemChecked: checked', 'cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: chosen'],
    },
  ],
  host: { class: 'menu__item', type: 'button' },
  templateUrl: './menu-radio.html',
  styleUrl: './menu-radio.scss',
})
export class MenuRadio {}
