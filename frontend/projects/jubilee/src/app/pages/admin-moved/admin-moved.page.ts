import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, StatusPage } from 'components';
import { ADMIN_URL } from '../../admin-url';

/** The screens of the admin application an old app link can name (L2-194 AC2). */
const SCREEN = /^\/admin(\/(verifications|reports)(\/[A-Za-z0-9-]+)?|\/featured)$/;

/**
 * An old link to `/admin/**` (L2-194): the verification team's screens have moved to the admin
 * application. "Open the admin application" goes to the same screen there, or to its queue.
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

/** `/admin/verifications/:id` opens `/verifications/:id` there; any other `/admin` path opens `/verifications`. */
export function adminLinkFor(url: string, adminUrl: string): string {
  const path = url.split(/[?#]/)[0];
  return adminUrl + (SCREEN.test(path) ? path.slice('/admin'.length) : '/verifications');
}
