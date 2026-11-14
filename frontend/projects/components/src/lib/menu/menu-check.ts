import { CdkMenuItemCheckbox } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A choice that is on or off in a `jb-menu`, such as a column of a table:
 *
 *     <button jb-menu-check [checked]="shown()" (chosen)="toggle()">Email</button>
 *
 * It is a `menuitemcheckbox` whose `aria-checked` says whether it is on, drawn with a check.
 */
@Component({
  selector: 'button[jb-menu-check]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: CdkMenuItemCheckbox,
      inputs: ['cdkMenuItemChecked: checked', 'cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: chosen'],
    },
  ],
  host: { class: 'menu__item', type: 'button' },
  templateUrl: './menu-check.html',
  styleUrl: './menu-check.scss',
})
export class MenuCheck {}
