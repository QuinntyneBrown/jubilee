import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandMark, EmptyState, Icon } from 'components';
import { returnTo } from '../../services/navigation-trail';

/**
 * ServerErrorPage (L2-115): an unhandled failure on a page load. It says the member's work is safe and
 * quotes the reference that leads support to the request's log entries (L2-118 AC3). It shows nothing
 * from the server but that reference.
 */
@Component({
  selector: 'jb-server-error-page',
  imports: [BrandMark, EmptyState, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './server-error.page.html',
})
export class ServerErrorPage {
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  /** The reference from the failed answer; anything that is not one is not shown. */
  protected readonly reference = /^JB-500-[A-Z0-9]{4}$/.test(this.query.get('ref') ?? '')
    ? this.query.get('ref')
    : null;
  private readonly from = returnTo(this.query.get('from'));

  protected tryAgain(): void {
    void this.router.navigateByUrl(this.from);
  }
}
