import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CONTENT_API, ContentPage, parseBody } from 'api';
import { EmptyState, Icon, Button, Skeleton, Card, PageHeader, Breadcrumb } from 'components';
import { LoadState, errorReference } from '../../services/load-state';

/** Where a person who is still stuck writes (L2-110 AC1). */
export const HELP_ADDRESS = 'help@jubilee.example';

/**
 * HelpPage (L2-110): the questions members ask most, each a native disclosure with an anchor.
 * `/help#how-do-i-report-a-listing` opens that answer and scrolls to it.
 */
@Component({
  selector: 'jb-help-page',
  imports: [EmptyState, Icon, RouterLink, Button, Skeleton, Card, PageHeader, Breadcrumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'container page' },
  templateUrl: './help.page.html',
})
export class HelpPage implements OnInit {
  private readonly api = inject(CONTENT_API);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);

  protected readonly address = HELP_ADDRESS;
  protected readonly state = signal<LoadState<ContentPage>>({ status: 'loading' });
  protected readonly body = parseBody;
  /** The anchors of the answers that are open; the first is open until the person chooses. */
  protected readonly open = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.get('help').subscribe({
      next: (value) => {
        this.state.set({ status: 'loaded', value });
        const fragment = this.route.snapshot.fragment;
        const wanted = value.sections.find((s) => s.anchor === fragment) ?? value.sections[0];
        if (wanted) this.open.set(new Set([wanted.anchor]));
        if (fragment) setTimeout(() => this.document.getElementById(fragment)?.scrollIntoView());
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-CONT-503') }),
    });
  }

  protected toggled(anchor: string, isOpen: boolean): void {
    const next = new Set(this.open());
    if (isOpen) next.add(anchor);
    else next.delete(anchor);
    this.open.set(next);
  }
}
