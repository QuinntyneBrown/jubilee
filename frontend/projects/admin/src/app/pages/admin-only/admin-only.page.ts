import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Button, StatusPage } from 'components';

/** A screen of the Jubilee team, shown to a staff member without the moderator role (L2-188 AC4). */
@Component({
  selector: 'jb-admin-only-page',
  imports: [Button, StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-only.page.html',
})
export class AdminOnlyPage {
  readonly signOut = output<void>();
}
