import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from 'components';

/** The forbidden page (L2-098 AC1): signed in, but not allowed to see this area. */
@Component({
  selector: 'jb-forbidden-page',
  imports: [RouterLink, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './forbidden.page.html',
})
export class ForbiddenPage {}
