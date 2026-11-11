import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The name of an item of `jb-item-list`; it takes the room its picture and price leave. */
@Component({
  selector: 'span[jb-item-list-name]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'item-list__name' },
  templateUrl: './item-list-name.html',
  styleUrl: './item-list-name.scss',
})
export class ItemListName {}
