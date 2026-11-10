import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState, Icon } from 'components';

/** The not-found page (L2-113): an unknown URL, or a resource the API answered 404 for. */
@Component({
  selector: 'jb-not-found-page',
  imports: [RouterLink, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  template: `
    <div class="status-page">
      <div jb-empty-state icon="compass" heading="We can’t find that page" [level]="1">
        The link may be old, or the listing may have been removed. Search for the business by name,
        or start from browse.
        <a slot="actions" class="btn btn--primary" routerLink="/">Back to browse</a>
        <a slot="actions" class="btn" routerLink="/search"
          ><svg jb-icon name="search"></svg>Search</a
        >
      </div>
    </div>
  `,
})
export class NotFoundPage {}
