import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A plain list of items that bring their own look (directory rows, threads, menu items):
 * `<ul jb-list>…</ul>`.
 */
@Component({
  selector: 'ul[jb-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'list' },
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {}
