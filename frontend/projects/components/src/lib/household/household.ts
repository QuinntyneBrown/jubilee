import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * "Who lives here": the household of a Room or Roommate space, as the owner wrote it
 * (L2-196 AC2): `<section jb-household [text]="space.household"></section>`.
 */
@Component({
  selector: 'section[jb-household]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'household', '[attr.aria-labelledby]': 'id' },
  templateUrl: './household.html',
  styleUrl: './household.scss',
})
export class Household {
  readonly text = input.required<string>();
  protected readonly id = `jb-household-${++nextId}`;
}
