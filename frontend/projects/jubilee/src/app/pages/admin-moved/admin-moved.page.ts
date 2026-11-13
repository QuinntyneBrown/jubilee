import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, StatusPage } from 'components';
import { ADMIN_URL } from '../../admin-url';

/** The screens of the admin application an old app link can name (L2-194 AC2). */
const SCREEN = /^\/admin(\/(reports)(\/[A-Za-z0-9-]+)?|\/featured)$/;
/** The old queue and review: they are now the listings (ADR 0057). */
const QUEUE = /^\/admin\/verifications(\/[A-Za-z0-9-]+)?$/;

/**
 * An old link to `/admin/**` (L2-194): the Jubilee team's screens have moved to the admin
 * application. "Open the admin application" goes to the matching screen there, or to its listings.
 */
@Component({
  selector: 'jb-admin-moved-page',
  imports: [RouterLink, Button, StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-moved.page.html',
})
export class AdminMovedPage {
  protected readonly adminLink = adminLinkFor(inject(Router).url, inject(ADMIN_URL));
}

/**
 * `/admin/verifications/:id` opens `/listings/:id` there and `/admin/reports/:id` opens
 * `/reports/:id`; any other `/admin` path opens `/listings`.
 */
export function adminLinkFor(url: string, adminUrl: string): string {
  const path = url.split(/[?#]/)[0];
  const queue = QUEUE.exec(path);
  if (queue) return `${adminUrl}/listings${queue[1] ?? ''}`;
  return adminUrl + (SCREEN.test(path) ? path.slice('/admin'.length) : '/listings');
}
