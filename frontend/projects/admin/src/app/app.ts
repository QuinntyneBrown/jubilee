import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SkipLink, ToastRegion } from 'components';
import { AdminRouteService } from './services/admin-route.service';
import { AdminScreenService } from './services/admin-screen.service';

/**
 * The root of the admin application (L2-188): the skip link and the routed frame, the shell of
 * L2-272 after sign-in or the bare frame before it. It stamps the screen on `<body data-page>`: the
 * route's page, or what the screen found out about itself (not for the role, not found).
 */
@Component({
  selector: 'jb-root',
  imports: [RouterOutlet, SkipLink, ToastRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const document = inject(DOCUMENT);
    const route = inject(AdminRouteService);
    const outcome = inject(AdminScreenService).outcome;
    effect(() => {
      document.body.dataset['page'] =
        outcome() ?? (route.notForRole() ? 'admin-only' : route.data().page);
    });
  }
}
