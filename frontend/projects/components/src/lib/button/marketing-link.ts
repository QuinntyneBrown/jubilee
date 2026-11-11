import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The marketing site's standalone text link, with room for an arrow after its words:
 *
 *     <a jb-marketing-link href="#film">Watch the film <svg jb-icon name="arrow-down"></svg></a>
 *
 * The link sizes the icon; `iconSize="sm"` is the smaller arrow of a link that points down the
 * page.
 */
@Component({
  selector: 'a[jb-marketing-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-link', '[class.mkt-link--icon-sm]': 'iconSize() === "sm"' },
  templateUrl: './marketing-link.html',
  styleUrl: './marketing-link.scss',
})
export class MarketingLink {
  readonly iconSize = input<'md' | 'sm'>('md');
}
