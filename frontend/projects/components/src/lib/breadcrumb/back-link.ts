import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The one step back above a detail page: `<a jb-back-link routerLink="/">Back to browse</a>`.
 */
@Component({
  selector: 'a[jb-back-link]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'back-link' },
  templateUrl: './back-link.html',
  styleUrl: './back-link.scss',
})
export class BackLink {}
