import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The short boxed list of what a form has collected or a request holds:
 * `<ul jb-item-list><li jb-item-list-item>…</li></ul>`.
 */
@Component({
  selector: 'ul[jb-item-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'item-list' },
  templateUrl: './item-list.html',
  styleUrl: './item-list.scss',
})
export class ItemList {}
