import { ChangeDetectionStrategy, Component } from '@angular/core';

/** One item of `jb-item-list`: its picture, its `span[jb-item-list-name]`, its price, its action. */
@Component({
  selector: 'li[jb-item-list-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'item-list__item' },
  templateUrl: './item-list-item.html',
  styleUrl: './item-list-item.scss',
})
export class ItemListItem {}
