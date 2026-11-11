import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A list of `jb-menu-link` lines: `<ul jb-menu-list><li><a jb-menu-link …>…</a></li></ul>`.
 * The lines reach past the list's edges by their own padding, so their text lines up with the
 * text around the list.
 */
@Component({
  selector: 'ul[jb-menu-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'list menu-list' },
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.scss',
})
export class MenuList {}
