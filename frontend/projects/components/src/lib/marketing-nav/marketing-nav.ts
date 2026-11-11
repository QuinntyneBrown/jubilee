import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A link of the marketing navigation bar to a section of the page. */
export interface MarketingNavLink {
  label: string;
  href: string;
}

/**
 * The marketing site's navigation bar, which stays at the top of the page:
 *
 *     <header jb-marketing-nav linksLabel="Sections" [links]="links">
 *       <a slot="brand" jb-lockup size="sm" href="#top" aria-label="Jubilee home"></a>
 *       <a slot="action" jb-marketing-button variant="pill" href="…">Open Jubilee</a>
 *     </header>
 *
 * The links show from the desktop layout; below it the page is short enough to scroll. It reads
 * the marketing page's grounds: --jb-mkt-paper, --jb-mkt-max, --jb-mkt-gutter.
 */
@Component({
  selector: 'header[jb-marketing-nav]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-nav' },
  templateUrl: './marketing-nav.html',
  styleUrl: './marketing-nav.scss',
})
export class MarketingNav {
  readonly links = input<readonly MarketingNavLink[]>([]);
  /** The name of the list of links, for assistive technology. */
  readonly linksLabel = input.required<string>();
}
