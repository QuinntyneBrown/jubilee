import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A line between groups of a `jb-menu`: `<div jb-menu-divider></div>`. */
@Component({
  selector: 'div[jb-menu-divider]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'menu__divider', role: 'separator' },
  templateUrl: './menu-divider.html',
  styleUrl: './menu-divider.scss',
})
export class MenuDivider {}
