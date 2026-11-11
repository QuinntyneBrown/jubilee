import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayout, EmptyState, Icon, Button } from 'components';
import { returnTo } from '../../services/navigation-trail';
import { ConnectionService } from '../../services/offline/connection.service';

/**
 * OfflinePage (L2-122): shown in place of a page that cannot load while the device is offline. The
 * address is the one that was asked for; "Try again" asks Jubilee and, when it answers, opens that
 * page again, as does the return of the connection by itself.
 */
@Component({
  selector: 'jb-offline-page',
  imports: [AuthLayout, EmptyState, Icon, RouterLink, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline.page.html',
})
export class OfflinePage {
  private readonly router = inject(Router);
  private readonly connection = inject(ConnectionService);
  private readonly returnUrl = returnTo(
    (this.router.getCurrentNavigation()?.extras.state?.['returnUrl'] as string | undefined) ??
      (history.state?.['returnUrl'] as string | undefined) ??
      null,
  );

  constructor() {
    const seen = this.connection.returned();
    effect(() => {
      if (this.connection.returned() !== seen) this.leave();
    });
  }

  protected async tryAgain(): Promise<void> {
    await this.connection.check();
    if (this.connection.state() !== 'offline') this.leave();
  }

  private leave(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }
}
