import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeader } from 'components';

/** `/policies/:slug`: the editor of one policy page (L2-226). */
@Component({
  selector: 'jb-admin-policy-page',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-policy.page.html',
})
export class AdminPolicyPage {}
