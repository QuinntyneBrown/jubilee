import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The grid of photo business cards, two to a row and four from the desktop layout:
 *
 *     <ul jb-photo-card-grid>
 *       <li jb-photo-card-grid-item lead>…</li>
 *       <li jb-photo-card-grid-item>…</li>
 *     </ul>
 */
@Component({
  selector: 'ul[jb-photo-card-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-cards' },
  templateUrl: './photo-card-grid.html',
  styleUrl: './photo-card-grid.scss',
})
export class PhotoCardGrid {}
