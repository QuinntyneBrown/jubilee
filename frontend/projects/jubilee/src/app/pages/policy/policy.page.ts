import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CONTENT_API, ContentPage, ContentSlug, parseBody } from 'api';
import {
  EmptyState,
  Icon,
  Button,
  Skeleton,
  Breadcrumb,
  PolicyDocument,
  PolicySection,
} from 'components';
import { LoadState, errorReference } from 'api';

/**
 * PolicyPage (L2-107 to L2-109): the statement of faith, terms of use and privacy notice, read
 * from the published version of the page and rendered by `jb-policy-document`. The route's `slug`
 * says which one.
 */
@Component({
  selector: 'jb-policy-page',
  imports: [EmptyState, Icon, RouterLink, Button, Skeleton, Breadcrumb, PolicyDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './policy.page.html',
})
export class PolicyPage implements OnInit {
  private readonly api = inject(CONTENT_API);
  private readonly slug = inject(ActivatedRoute).snapshot.data['slug'] as ContentSlug;

  protected readonly state = signal<LoadState<ContentPage>>({ status: 'loading' });

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

  /** The page's sections with their bodies parsed into blocks; the text is never markup. */
  protected sections(page: ContentPage): PolicySection[] {
    return page.sections.map((s) => ({ ...s, blocks: parseBody(s.body) }));
  }
}
