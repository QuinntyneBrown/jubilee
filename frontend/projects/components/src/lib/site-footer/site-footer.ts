import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The footer of every app page (L2-112): the copyright line and the four trust links. */
@Component({
  selector: 'footer[jb-site-footer]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'footer' },
  template: `
    <span>© {{ year() }} Jubilee · Toronto’s Christian marketplace</span>
    <span class="cluster">
      <a routerLink="/statement-of-faith">Statement of faith</a>
      <a routerLink="/help">Help</a>
      <a routerLink="/terms">Terms</a>
      <a routerLink="/privacy">Privacy</a>
    </span>
  `,
})
export class SiteFooter {
  readonly year = input.required<number>();
}
