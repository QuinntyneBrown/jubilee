import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CONTENT_API, ContentPage, ContentSlug, parseBody } from 'api';
import { EmptyState, Icon } from 'components';
import { LoadState, errorReference } from '../../services/load-state';

/**
 * PolicyPage (L2-107 to L2-109): the statement of faith, terms of use and privacy notice, read
 * from the published version of the page. The route's `slug` says which one.
 */
@Component({
  selector: 'jb-policy-page',
  imports: [DatePipe, EmptyState, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'container page' },
  templateUrl: './policy.page.html',
})
export class PolicyPage implements OnInit {
  private readonly api = inject(CONTENT_API);
  private readonly slug = inject(ActivatedRoute).snapshot.data['slug'] as ContentSlug;

  protected readonly state = signal<LoadState<ContentPage>>({ status: 'loading' });
  protected readonly body = parseBody;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.get(this.slug).subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-CONT-503') }),
    });
  }
}
