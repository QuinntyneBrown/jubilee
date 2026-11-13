import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * "Your host": who is renting the space (L2-205 AC1):
 * `<section jb-host-card [name]="listing.ownerName" [about]="listing.about"></section>`.
 */
@Component({
  selector: 'section[jb-host-card]',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'host-card', '[attr.aria-labelledby]': 'id' },
  templateUrl: './host-card.html',
  styleUrl: './host-card.scss',
})
export class HostCard {
  readonly name = input.required<string>();
  readonly about = input<string | null>(null);
  protected readonly id = `jb-host-${++nextId}`;
}
