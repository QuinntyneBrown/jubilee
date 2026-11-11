import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One place in a `jb-photo-card-grid`. `lead` is the featured card's: two columns wide. */
@Component({
  selector: 'li[jb-photo-card-grid-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.mkt-cards__lead]': 'lead()' },
  templateUrl: './photo-card-grid-item.html',
  styleUrl: './photo-card-grid-item.scss',
})
export class PhotoCardGridItem {
  readonly lead = input(false, { transform: booleanAttribute });
}
