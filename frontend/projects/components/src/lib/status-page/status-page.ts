import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState } from '../empty-state/empty-state';
import { IconName } from '../icon/icons';

/**
 * A page that has nothing to show but why: not found, no access.
 *
 *     <jb-status-page icon="compass" heading="We can’t find that page">
 *       The link may be old.
 *       <a slot="actions" jb-button variant="primary" routerLink="/">Back to browse</a>
 *     </jb-status-page>
 *
 * It centres one `jb-empty-state` in the page, with the heading as the page's `h1`.
 */
@Component({
  selector: 'jb-status-page',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'status-page' },
  templateUrl: './status-page.html',
  styleUrl: './status-page.scss',
})
export class StatusPage {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
}
