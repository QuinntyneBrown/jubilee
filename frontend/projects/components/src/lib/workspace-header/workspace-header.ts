import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { PageHeader } from '../page-header/page-header';
import { TabItem, Tabs } from '../tabs/tabs';

export type WorkspaceSection = 'overview' | 'listing' | 'products' | 'services' | 'requests';

/**
 * The header every page of the owner's workspace shares: the business, its stage, the link to
 * its public page and the "My business sections" tabs (L2-097 AC2).
 */
@Component({
  selector: 'jb-workspace-header',
  imports: [RouterLink, Icon, Button, PageHeader, Tabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
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

  protected readonly tabs = computed<TabItem[]>(() => {
    const open = this.openRequests();
    return [
      { key: 'overview', label: 'Overview', link: '/my-business' },
      { key: 'listing', label: 'Listing', link: '/my-business/listing' },
      { key: 'products', label: 'Products', link: '/my-business/products' },
      { key: 'services', label: 'Services', link: '/my-business/services' },
      {
        key: 'requests',
        label: 'Requests',
        link: '/my-business/requests',
        count: open > 0 ? { value: open, label: `${open} open` } : null,
      },
    ];
  });
}
