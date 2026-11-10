import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState, Icon } from 'components';

/** The not-found page (L2-113): an unknown URL, or a resource the API answered 404 for. */
@Component({
  selector: 'jb-not-found-page',
  imports: [RouterLink, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {}
