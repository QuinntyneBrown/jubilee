import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The marketing site's standalone text link, with room for an arrow after its words:
 *
 *     <a jb-marketing-link href="#film">Watch the film</a>
 */
@Component({
  selector: 'a[jb-marketing-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-link' },
  templateUrl: './marketing-link.html',
  styleUrl: './marketing-link.scss',
})
export class MarketingLink {}
