import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthLayout, EmptyState, Button } from 'components';
import { sanitiseReturnUrl } from '../../services/return-url';

/** SessionExpiredPage (L2-010 AC3, L2-116): the session ended; signing in returns to the same page. */
@Component({
  selector: 'jb-session-expired-page',
  imports: [RouterLink, AuthLayout, EmptyState, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-expired.page.html',
})
export class SessionExpiredPage {
  protected readonly signInQuery = {
    returnUrl: sanitiseReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl')),
  };
}
