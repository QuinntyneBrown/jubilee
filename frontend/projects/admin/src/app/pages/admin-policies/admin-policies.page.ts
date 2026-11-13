import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ADMIN_CONTENT_API,
  AdminContentRow,
  LoadState,
  errorReference,
  fullDate,
  versionLine,
} from 'api';
import {
  Button,
  EmptyState,
  Icon,
  PageHeader,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  Skeleton,
} from 'components';

/** `/policies`: the four policy pages with their published version, for an administrator (L2-247). */
@Component({
  selector: 'jb-admin-policies-page',
  imports: [
    RouterLink,
    Button,
    EmptyState,
    Icon,
    PageHeader,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-policies.page.html',
})
export class AdminPoliciesPage implements OnInit {
  private readonly api = inject(ADMIN_CONTENT_API);

  protected readonly state = signal<LoadState<AdminContentRow[]>>({ status: 'loading' });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.list().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-521') }),
    });
  }

  protected line(row: AdminContentRow): string {
    return versionLine(row.version, row.publishedBy, fullDate(row.publishedAt));
  }
}
