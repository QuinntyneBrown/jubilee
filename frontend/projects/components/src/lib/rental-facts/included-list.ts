import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** What a space includes, each item with a check (L2-204 AC1): `<ul jb-included-list [items]="…"></ul>`. */
@Component({
  selector: 'ul[jb-included-list]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'included-list' },
  templateUrl: './included-list.html',
  styleUrl: './included-list.scss',
})
export class IncludedList {
  readonly items = input.required<readonly string[]>();
}
