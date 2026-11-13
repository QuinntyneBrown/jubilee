import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button, StatusPage } from 'components';
import type { StaffRole } from '../../app.routes';

/**
 * A screen shown in place of one the staff member's roles do not reach: the Jubilee team's
 * screens need the moderator role (L2-188 AC4), the policies the admin role (L2-241 AC10).
 */
@Component({
  selector: 'jb-admin-only-page',
  imports: [Button, StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-only.page.html',
})
export class AdminOnlyPage {
  /** The role the screen needs. */
  readonly role = input.required<StaffRole>();
  readonly signOut = output<void>();
}
