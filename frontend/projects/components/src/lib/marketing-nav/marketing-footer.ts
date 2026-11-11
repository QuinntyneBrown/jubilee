import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The marketing site's footer, on ink:
 *
 *     <footer jb-marketing-footer>
 *       <span slot="brand" jb-lockup size="xs" onInk role="img" aria-label="Jubilee"></span>
 *       Toronto’s Christian marketplace · jubilee.to
 *     </footer>
 *
 * It reads the marketing page's grounds: --jb-mkt-ink, --jb-mkt-paper, --jb-mkt-max,
 * --jb-mkt-gutter.
 */
@Component({
  selector: 'footer[jb-marketing-footer]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-footer' },
  templateUrl: './marketing-footer.html',
  styleUrl: './marketing-footer.scss',
})
export class MarketingFooter {}
