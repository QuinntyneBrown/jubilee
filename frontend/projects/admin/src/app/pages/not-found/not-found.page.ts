import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, StatusPage } from 'components';

/** An address the admin application does not have. */
@Component({
  selector: 'jb-not-found-page',
  imports: [RouterLink, Button, StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {}
