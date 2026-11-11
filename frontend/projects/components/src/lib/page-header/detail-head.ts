import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The head of a detail page (a business, a product): its kicker, its `h1`, what it offers and
 * its actions, one under the other.
 *
 *     <div jb-detail-head>
 *       <p jb-detail-head-kicker>Sold by …</p>
 *       <h1>{{ name }}</h1>
 *       <div jb-detail-head-actions>…</div>
 *     </div>
 */
@Component({
  selector: 'div[jb-detail-head]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'detail-head' },
  templateUrl: './detail-head.html',
  styleUrl: './detail-head.scss',
})
export class DetailHead {}
