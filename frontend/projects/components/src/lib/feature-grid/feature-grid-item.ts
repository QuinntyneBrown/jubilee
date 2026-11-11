import { ChangeDetectionStrategy, Component } from '@angular/core';

/** One card of `jb-feature-grid`. The first takes the width of the grid, or two columns and rows. */
@Component({
  selector: 'li[jb-feature-grid-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature-grid__item' },
  templateUrl: './feature-grid-item.html',
  styleUrl: './feature-grid-item.scss',
})
export class FeatureGridItem {}
