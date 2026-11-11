import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, Button, Badge, PageHeader } from 'components';

export type WorkspaceSection = 'overview' | 'listing' | 'products' | 'services' | 'requests';

/**
 * The header every page of the owner's workspace shares: the business, its stage, the link to
 * its public page and the "My business sections" tabs (L2-097 AC2).
 */
@Component({
  selector: 'jb-workspace-header',
  imports: [RouterLink, Icon, Button, Badge, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-header.html',
})
export class WorkspaceHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
  readonly current = input.required<WorkspaceSection>();
  /** Open requests, shown on the Requests tab when above zero. */
  readonly openRequests = input<number>(0);
  readonly slug = input<string | null>(null);
  /** "Preview listing" until the listing is public, "View public listing" after. */
  readonly live = input<boolean>(true);
}
