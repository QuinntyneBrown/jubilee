import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A heading inside a `jb-menu`, such as "Rows per page": `<div jb-menu-label>Download</div>`. */
@Component({
  selector: 'div[jb-menu-label]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'menu__label', role: 'presentation' },
  templateUrl: './menu-label.html',
  styleUrl: './menu-label.scss',
})
export class MenuLabel {}
