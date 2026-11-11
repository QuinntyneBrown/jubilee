import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The grid of featured cards, the first of which is drawn large:
 * `<ul jb-feature-grid><li jb-feature-grid-item>…</li></ul>`.
 */
@Component({
  selector: 'ul[jb-feature-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card-grid feature-grid' },
  templateUrl: './feature-grid.html',
  styleUrl: './feature-grid.scss',
})
export class FeatureGrid {}
