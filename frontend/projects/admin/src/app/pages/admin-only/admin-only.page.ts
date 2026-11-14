import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button, StatusPage } from 'components';
import type { StaffRole } from '../../app.routes';

/**
 * A screen shown in place of one the staff member's roles do not reach (L2-188 AC4, L2-284): a table
 * or record the role may not read, or the policies, which need the admin role (L2-247 AC10).
 */
@Component({
  selector: 'jb-admin-only-page',
  imports: [Button, StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-only.page.html',
})
export class AdminOnlyPage {
  /** The role the screen needs, when it is the policies' admin role. */
  readonly role = input<StaffRole | null>(null);
  readonly signOut = output<void>();
}
